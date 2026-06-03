const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

db.prepare("DELETE FROM trades").run();
db.prepare("DELETE FROM weeks").run();
console.log("Database reset successfully.");
