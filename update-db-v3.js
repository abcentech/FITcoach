const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

console.log("Starting SQLite database migrations...");

try {
  // Create portfolios table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      broker TEXT,
      account_type TEXT,
      initial_balance REAL DEFAULT 10000,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log("✓ Created 'portfolios' table.");
} catch (e) {
  console.error("Error creating 'portfolios' table:", e.message);
}

try {
  // Create playbook table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS playbook (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      rules TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log("✓ Created 'playbook' table.");
} catch (e) {
  console.error("Error creating 'playbook' table:", e.message);
}

try {
  // Create daily_journals table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS daily_journals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      mood TEXT,
      rating INTEGER,
      notes TEXT,
      screenshots TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log("✓ Created 'daily_journals' table.");
} catch (e) {
  console.error("Error creating 'daily_journals' table:", e.message);
}

try {
  // Create share_tokens table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS share_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      portfolio_id TEXT,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log("✓ Created 'share_tokens' table.");
} catch (e) {
  console.error("Error creating 'share_tokens' table:", e.message);
}

// Add columns to existing tables
try {
  db.prepare(`ALTER TABLE weeks ADD COLUMN portfolio_id TEXT`).run();
  console.log("✓ Added 'portfolio_id' column to 'weeks'.");
} catch (e) {
  if (e.message.includes("duplicate column name")) {
    console.log("ℹ 'portfolio_id' column already exists in 'weeks'.");
  } else {
    console.error("Error adding 'portfolio_id' to 'weeks':", e.message);
  }
}

try {
  db.prepare(`ALTER TABLE trades ADD COLUMN compliance REAL`).run();
  console.log("✓ Added 'compliance' column to 'trades'.");
} catch (e) {
  if (e.message.includes("duplicate column name")) {
    console.log("ℹ 'compliance' column already exists in 'trades'.");
  } else {
    console.error("Error adding 'compliance' to 'trades':", e.message);
  }
}

try {
  db.prepare(`ALTER TABLE trades ADD COLUMN checked_rules TEXT`).run();
  console.log("✓ Added 'checked_rules' column to 'trades'.");
} catch (e) {
  if (e.message.includes("duplicate column name")) {
    console.log("ℹ 'checked_rules' column already exists in 'trades'.");
  } else {
    console.error("Error adding 'checked_rules' to 'trades':", e.message);
  }
}

console.log("SQLite database migrations finished successfully.");
