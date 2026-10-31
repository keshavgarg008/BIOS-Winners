import 'dart:async';
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'database_helper.dart';
import 'session.dart';

class SyncService {
  SyncService._();
  static final SyncService instance = SyncService._();

  final _db = DatabaseHelper.instance;
  bool _running = false;
  bool _again = false;
  StreamSubscription? _netSub;
  Timer? _timer;
  VoidCallback? _writeListener;

  /// true while a sync is in progress (optional for your UI)
  final ValueNotifier<bool> syncing = ValueNotifier<bool>(false);
  final ValueNotifier<DateTime?> lastSynced = ValueNotifier<DateTime?>(null);

  CollectionReference<Map<String, dynamic>> get _col => FirebaseFirestore
      .instance
      .collection('villages')
      .doc(Session.villageId)
      .collection('events');

  void start() {
    stop();
    _netSub = Connectivity().onConnectivityChanged.listen((r) {
      if (!r.contains(ConnectivityResult.none)) syncNow();
    });
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => syncNow());
    _writeListener = () => syncNow();
    _db.localWrites.addListener(_writeListener!);
    _db.refreshPendingCount();
    syncNow();
  }

  void stop() {
    _netSub?.cancel();
    _timer?.cancel();
    if (_writeListener != null) {
      _db.localWrites.removeListener(_writeListener!);
      _writeListener = null;
    }
  }

  Future<void> syncNow() async {
    if (!Session.ready) return;
    if (_running) {
      _again = true; // something was saved mid-sync: go around once more
      return;
    }
    _running = true;
    syncing.value = true;
    try {
      do {
        _again = false;
        await _db.adoptOrphans();
        await _push();
        await _pull();
      } while (_again);
      lastSynced.value = DateTime.now();
    } catch (e) {
      debugPrint('SYNC: will retry later ($e)'); // offline = normal
    } finally {
      _running = false;
      syncing.value = false;
    }
  }

  Future<void> _push() async {
    while (true) {
      final pending = await _db.pendingEvents(limit: 400);
      if (pending.isEmpty) return;

      final batch = FirebaseFirestore.instance.batch();
      for (final e in pending) {
        dynamic payload;
        try {
          payload = jsonDecode(e['payload'] as String);
        } catch (_) {
          payload = {'raw': e['payload']}; // old v1 rows were not JSON
        }
        batch.set(_col.doc(e['id'] as String), {
          'villageId': e['village_id'],
          'type': e['event_type'],
          'payload': payload,
          'deviceId': e['device_id'],
          'authorUid': e['author_uid'] ?? Session.uid,
          'occurredAt': e['occurred_at'] ??
              DateTime.tryParse(e['created_at'] as String)
                  ?.millisecondsSinceEpoch ??
              DateTime.now().millisecondsSinceEpoch,
          'serverTs': FieldValue.serverTimestamp(),
        });
      }
      await batch.commit().timeout(const Duration(seconds: 20));
      await _db.markSynced(pending.map((e) => e['id'] as String).toList());
    }
  }

  Future<void> _pull() async {
    const pageSize = 300;
    var cursor = int.parse(await _db.getMeta('pull_cursor_us') ?? '0');
    var changed = false;

    while (true) {
      final snap = await _col
          .where('serverTs',
              isGreaterThan: Timestamp.fromMicrosecondsSinceEpoch(cursor))
          .orderBy('serverTs')
          .limit(pageSize)
          .get()
          .timeout(const Duration(seconds: 20));

      for (final d in snap.docs) {
        final m = d.data();
        final occurred = (m['occurredAt'] as num?)?.toInt() ??
            DateTime.now().millisecondsSinceEpoch;
        final isNew = await _db.applyRemote({
          'id': d.id,
          'event_type': m['type'],
          'payload': jsonEncode(m['payload']),
          'created_at':
              DateTime.fromMillisecondsSinceEpoch(occurred).toIso8601String(),
          'village_id': m['villageId'],
          'device_id': m['deviceId'],
          'author_uid': m['authorUid'],
          'occurred_at': occurred,
        });
        changed = changed || isNew;
      }

      if (snap.docs.isNotEmpty) {
        final ts = snap.docs.last.data()['serverTs'] as Timestamp?;
        if (ts != null) {
          cursor = ts.microsecondsSinceEpoch;
          await _db.setMeta('pull_cursor_us', cursor.toString());
        }
      }
      if (snap.docs.length < pageSize) break;
    }
    if (changed) _db.revision.value++; // UI reloads with data from other phones
  }
}