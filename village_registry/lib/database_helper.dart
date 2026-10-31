import 'package:flutter/foundation.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  /// Number of events still waiting to be uploaded (sync_status = 0).
  final ValueNotifier<int> pendingCount = ValueNotifier<int>(0);

  /// Bumped every time the events table changes so screens can reload.
  final ValueNotifier<int> revision = ValueNotifier<int>(0);

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('village_registry.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);
    return await openDatabase(path, version: 1, onCreate: _createDB);
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        sync_status INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    ''');
  }

  Future<void> insertEvent({
    required String eventType,
    required Map<String, dynamic> payload,
  }) async {
    final db = await instance.database;
    const uuid = Uuid();
    await db.insert(
      'events',
      {
        'id': uuid.v4(),
        'event_type': eventType,
        'payload': payload.toString(),
        'sync_status': 0,
        'created_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    await refreshPendingCount();
    revision.value++;
  }

  Future<List<Map<String, Object?>>> getEvents() async {
    final db = await instance.database;
    return db.query('events', orderBy: 'created_at DESC');
  }

  Future<void> refreshPendingCount() async {
    final db = await instance.database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) AS c FROM events WHERE sync_status = 0',
    );
    pendingCount.value = (result.first['c'] as int?) ?? 0;
  }
}