import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import 'package:uuid/uuid.dart';
import 'session.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;
  DatabaseHelper._init();

  /// Events waiting to be uploaded (sync_status = 0). Your UI listens to this.
  final ValueNotifier<int> pendingCount = ValueNotifier<int>(0);

  /// Bumped whenever the events table changes, so screens reload.
  final ValueNotifier<int> revision = ValueNotifier<int>(0);

  /// Bumped only on LOCAL saves; SyncService listens to trigger an upload.
  final ValueNotifier<int> localWrites = ValueNotifier<int>(0);

  Future<Database> get database async =>
      _database ??= await _initDB('village_registry.db');

  Future<Database> _initDB(String file) async {
    final path = join(await getDatabasesPath(), file);
    return openDatabase(path,
        version: 2, onCreate: _createDB, onUpgrade: _upgradeDB);
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        sync_status INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        village_id TEXT,
        device_id TEXT,
        author_uid TEXT,
        occurred_at INTEGER
      )''');
    await db.execute(
        'CREATE INDEX idx_events_pending ON events(sync_status, created_at)');
    await db.execute('CREATE TABLE sync_meta (key TEXT PRIMARY KEY, value TEXT)');
  }

  // v1 -> v2: keeps all existing rows
  Future _upgradeDB(Database db, int oldV, int newV) async {
    if (oldV < 2) {
      for (final col in [
        'village_id TEXT',
        'device_id TEXT',
        'author_uid TEXT',
        'occurred_at INTEGER'
      ]) {
        await db.execute('ALTER TABLE events ADD COLUMN $col');
      }
      await db.execute(
          'CREATE INDEX IF NOT EXISTS idx_events_pending ON events(sync_status, created_at)');
      await db.execute(
          'CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT)');
    }
  }

  // ---------------- API USED BY YOUR UI (unchanged names) ----------------

  Future<void> insertEvent({
    required String eventType,
    required Map<String, dynamic> payload,
  }) async {
    final db = await database;
    final now = DateTime.now();
    await db.insert(
      'events',
      {
        'id': const Uuid().v4(),
        'event_type': eventType,
        // real JSON now (was payload.toString(), which could not be parsed back)
        'payload': jsonEncode(payload, toEncodable: (o) => o.toString()),
        'sync_status': 0,
        'created_at': now.toIso8601String(),
        'village_id': Session.villageId.isEmpty ? null : Session.villageId,
        'device_id': Session.deviceId.isEmpty ? null : Session.deviceId,
        'author_uid': Session.uid.isEmpty ? null : Session.uid,
        'occurred_at': now.millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.ignore, // event log is append-only
    );
    await refreshPendingCount();
    revision.value++;
    localWrites.value++; // tells SyncService to upload
  }

  Future<List<Map<String, Object?>>> getEvents() async {
    final db = await database;
    return db.query('events', orderBy: 'created_at DESC');
  }

  Future<void> refreshPendingCount() async {
    final db = await database;
    final r = await db
        .rawQuery('SELECT COUNT(*) AS c FROM events WHERE sync_status = 0');
    pendingCount.value = (r.first['c'] as int?) ?? 0;
  }

  // ---------------- SYNC HELPERS ----------------

  /// Events saved before login/profile load have no village: claim them.
  Future<void> adoptOrphans() async {
    if (!Session.ready) return;
    final db = await database;
    await db.update(
      'events',
      {
        'village_id': Session.villageId,
        'author_uid': Session.uid,
        'device_id': Session.deviceId,
      },
      where: 'village_id IS NULL OR village_id = ?',
      whereArgs: [''],
    );
  }

  Future<List<Map<String, Object?>>> pendingEvents({int limit = 400}) async {
    final db = await database;
    return db.query('events',
        where: 'sync_status = 0 AND village_id = ?',
        whereArgs: [Session.villageId],
        orderBy: 'created_at ASC',
        limit: limit);
  }

  Future<void> markSynced(List<String> ids) async {
    final db = await database;
    final b = db.batch();
    for (final id in ids) {
      b.update('events', {'sync_status': 1}, where: 'id = ?', whereArgs: [id]);
    }
    await b.commit(noResult: true);
    await refreshPendingCount();
    revision.value++;
  }

  /// Insert an event pulled from Firestore. Returns true if it was new.
  Future<bool> applyRemote(Map<String, Object?> e) async {
    final db = await database;
    final id = await db.insert('events', {...e, 'sync_status': 1},
        conflictAlgorithm: ConflictAlgorithm.ignore);
    return id > 0;
  }

  Future<String?> getMeta(String k) async {
    final db = await database;
    final r = await db.query('sync_meta', where: 'key = ?', whereArgs: [k]);
    return r.isEmpty ? null : r.first['value'] as String;
  }

  Future<void> setMeta(String k, String v) async {
    final db = await database;
    await db.insert('sync_meta', {'key': k, 'value': v},
        conflictAlgorithm: ConflictAlgorithm.replace);
  }
}