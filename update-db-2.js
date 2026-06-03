const db = require('better-sqlite3')('sqlite.db');
db.prepare("UPDATE weeks SET week = 20 WHERE id = 'week2'").run();
