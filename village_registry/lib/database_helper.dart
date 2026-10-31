import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  // Singleton pattern to ensure only one instance exists
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('village_registry.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    // Get the protected native Android database directory
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    // Open the database and create tables if it doesn't exist
    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // 1. THE IMMUTABLE EVENT LOG
    // Never update or delete rows here. Only INSERT.
    await db.execute('''
      CREATE TABLE events (
        event_id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        domain TEXT NOT NULL,           -- 'healthcare' or 'education'
        field_name TEXT NOT NULL,       -- e.g., 'blood_pressure', 'attendance'
        new_value TEXT,                 -- Stored as JSON string
        author_id TEXT NOT NULL,        -- The worker's ID
        timestamp TEXT NOT NULL,        -- ISO 8601 string
        known_parent_ids TEXT NOT NULL, -- JSON array of causal parents
        approval_status TEXT DEFAULT 'auto_approved',
        approval_proof BLOB             -- Used later for audio consent
      )
    ''');
    
    // Index to make loading a patient's history incredibly fast
    await db.execute('CREATE INDEX idx_events_record ON events(record_id)');

    // 2. THE MATERIALIZED VIEW
    // The calculated, clean dashboard cache for the UI to read
    await db.execute('''
      CREATE TABLE record_state (
        record_id TEXT PRIMARY KEY,
        record_type TEXT NOT NULL,      -- 'patient' or 'student'
        domain TEXT NOT NULL,
        current_data TEXT NOT NULL,     -- The merged JSON data
        has_unresolved_conflict INTEGER DEFAULT 0
      )
    ''');

    // 3. THE QUARANTINE ZONE
    // Where conflicting events wait for the Principal/Doctor to resolve them
    await db.execute('''
      CREATE TABLE conflicts (
        conflict_id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        event_id_a TEXT NOT NULL,
        event_id_b TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY(event_id_a) REFERENCES events(event_id),
        FOREIGN KEY(event_id_b) REFERENCES events(event_id)
      )
    ''');
  }

  // Helper method to completely clear the DB (Useful for logging out)
  Future close() async {
    final db = await instance.database;
    db.close();
  }
}