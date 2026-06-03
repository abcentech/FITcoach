const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log("No DATABASE_URL set. Skipping schema initialization.");
  process.exit(0);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function init() {
  console.log("Initializing PostgreSQL database schema on Neon...");
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS portfolios (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          broker TEXT,
          account_type TEXT,
          initial_balance REAL DEFAULT 10000,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS weeks (
          id TEXT PRIMARY KEY,
          user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
          portfolio_id TEXT REFERENCES portfolios(id) ON DELETE CASCADE,
          week INTEGER NOT NULL,
          month TEXT,
          year INTEGER,
          "dateRange" TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'reviewed',
          "sourceType" TEXT NOT NULL DEFAULT 'sample',
          "brokerNet" REAL,
          "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
          screenshots JSONB,
          summary JSONB,
          coach JSONB
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS playbook (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT,
          rules JSONB,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS daily_journals (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date TEXT NOT NULL,
          mood TEXT,
          rating INTEGER,
          notes TEXT,
          screenshots JSONB,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS share_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          portfolio_id TEXT REFERENCES portfolios(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          expires_at INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS trades (
          id TEXT PRIMARY KEY,
          week_id TEXT NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
          trade_id INTEGER NOT NULL,
          "dateTime" TEXT,
          "executionTime" TEXT,
          session TEXT,
          symbol TEXT,
          instrument TEXT,
          dir TEXT,
          lot REAL,
          entry REAL,
          exit REAL,
          pnl REAL,
          high REAL,
          low REAL,
          grade TEXT DEFAULT 'Pending',
          hold TEXT DEFAULT 'Pending chart review',
          tag TEXT DEFAULT 'Needs review',
          h1 TEXT DEFAULT 'Awaiting 1H context',
          m15 TEXT DEFAULT 'Awaiting 15M context',
          "setupType" TEXT,
          month TEXT,
          year INTEGER,
          compliance REAL,
          checked_rules JSONB
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TEXT NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS journal_folders (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          icon TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS journal_tags (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          color TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS journal_notes (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          folder_id TEXT REFERENCES journal_folders(id) ON DELETE CASCADE,
          date TEXT,
          title TEXT NOT NULL DEFAULT 'Untitled Note',
          content TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS note_tags (
          note_id TEXT NOT NULL REFERENCES journal_notes(id) ON DELETE CASCADE,
          tag_id TEXT NOT NULL REFERENCES journal_tags(id) ON DELETE CASCADE,
          PRIMARY KEY (note_id, tag_id)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS pre_market_plans (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS trade_approvals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        symbol TEXT NOT NULL,
        setup_type TEXT,
        status TEXT NOT NULL,
        criteria TEXT,
        reason TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS risk_settings (
        portfolio_id TEXT PRIMARY KEY REFERENCES portfolios(id) ON DELETE CASCADE,
        max_daily_loss REAL DEFAULT 500,
        max_weekly_drawdown REAL DEFAULT 1500,
        max_trades_per_day INTEGER DEFAULT 3,
        cooldown_timer_minutes INTEGER DEFAULT 30,
        emotional_trade_limit INTEGER DEFAULT 2,
        consecutive_losses_limit INTEGER DEFAULT 2,
        lock_active_until TEXT,
        lock_reason TEXT,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS pre_trade_checkins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS daily_reviews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      );
    `;
    console.log("✓ All PostgreSQL tables initialized successfully.");
    process.exit(0);
  } catch (err) {
    console.error("⚠️ Failed to initialize schema:", err.message);
    process.exit(1);
  }
}

init();
