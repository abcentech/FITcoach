const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

console.log("Starting SQLite database migrations (v4)...");

try {
  // Create pre_market_plans table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS pre_market_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      htf_bias TEXT,
      key_levels TEXT,
      liquidity_zones TEXT,
      session_focus TEXT,
      scenario_a TEXT,
      scenario_b TEXT,
      scenario_c TEXT,
      conditions_no_trade TEXT,
      max_trades INTEGER DEFAULT 3,
      risk_limit REAL DEFAULT 1,
      screenshot TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log("✓ Created 'pre_market_plans' table.");
} catch (e) {
  console.error("Error creating 'pre_market_plans' table:", e.message);
}

try {
  // Create trade_approvals table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS trade_approvals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      symbol TEXT NOT NULL,
      setup_type TEXT,
      status TEXT NOT NULL,
      criteria TEXT,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log("✓ Created 'trade_approvals' table.");
} catch (e) {
  console.error("Error creating 'trade_approvals' table:", e.message);
}

try {
  // Create risk_settings table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS risk_settings (
      portfolio_id TEXT PRIMARY KEY,
      max_daily_loss REAL DEFAULT 500,
      max_weekly_drawdown REAL DEFAULT 1500,
      max_trades_per_day INTEGER DEFAULT 3,
      cooldown_timer_minutes INTEGER DEFAULT 30,
      emotional_trade_limit INTEGER DEFAULT 2,
      consecutive_losses_limit INTEGER DEFAULT 2,
      lock_active_until TEXT,
      lock_reason TEXT,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log("✓ Created 'risk_settings' table.");
} catch (e) {
  console.error("Error creating 'risk_settings' table:", e.message);
}

try {
  // Create pre_trade_checkins table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS pre_trade_checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      focus INTEGER DEFAULT 5,
      sleep INTEGER DEFAULT 5,
      patience INTEGER DEFAULT 5,
      urgency INTEGER DEFAULT 5,
      emotional_stability INTEGER DEFAULT 5,
      confidence INTEGER DEFAULT 5,
      frustration INTEGER DEFAULT 1,
      readiness_score REAL DEFAULT 100,
      risk_level TEXT DEFAULT 'Low',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log("✓ Created 'pre_trade_checkins' table.");
} catch (e) {
  console.error("Error creating 'pre_trade_checkins' table:", e.message);
}

try {
  // Create daily_reviews table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS daily_reviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      followed_plan INTEGER DEFAULT 1,
      chased INTEGER DEFAULT 0,
      patient INTEGER DEFAULT 1,
      emotional_triggers TEXT,
      improvements TEXT,
      discipline_score REAL DEFAULT 100,
      execution_grade TEXT DEFAULT 'A',
      emotional_control_score REAL DEFAULT 100,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  console.log("✓ Created 'daily_reviews' table.");
} catch (e) {
  console.error("Error creating 'daily_reviews' table:", e.message);
}

console.log("SQLite database migrations (v4) finished successfully.");
