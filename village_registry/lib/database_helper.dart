import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

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
    // Creates the offline event queue table
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

  // Called when you tap 'Commit Offline Event'
  Future<void> insertEvent({required String eventType, required Map<String, dynamic> payload}) async {
    final db = await instance.database;
    const uuid = Uuid(); // Generates a unique ID for the offline record
    
    await db.insert(
      'events',
      {
        'id': uuid.v4(),
        'event_type': eventType,
        'payload': payload.toString(),
        'sync_status': 0, // 0 = not synced yet
        'created_at': DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }
}