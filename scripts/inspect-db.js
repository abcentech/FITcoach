const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("Tables:", tables);
    for (const t of tables) {
        const info = db.prepare(`PRAGMA table_info(${t.name})`).all();
        console.log(`Table ${t.name} info:`, info);
        const sql = db.prepare(`SELECT sql FROM sqlite_master WHERE name='${t.name}'`).get();
        console.log(`Table ${t.name} SQL:`, sql);
    }
} catch (e) {
    console.error(e);
}
