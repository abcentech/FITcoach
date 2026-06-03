const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

try {
    console.log("Dropping __new_weeks if exists...");
    db.exec("DROP TABLE IF EXISTS __new_weeks;");

    console.log("Creating users table if not exists...");
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Check if user_id column already exists in weeks
    const columns = db.prepare("PRAGMA table_info(weeks)").all();
    const hasUserId = columns.some(c => c.name === 'user_id');

    if (!hasUserId) {
        console.log("Adding user_id column to weeks table...");
        db.exec("ALTER TABLE weeks ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;");
        console.log("user_id column added successfully.");
    } else {
        console.log("user_id column already exists in weeks.");
    }
    
    console.log("Schema fix completed successfully.");
} catch (e) {
    console.error("Error fixing schema:", e);
}
