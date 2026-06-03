const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const postgres = require('postgres');

// 1. Resolve Neon database connection string
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, 'utf8');
    const match = envContent.match(/^DATABASE_URL=(.+)$/m);
    if (match) {
      connectionString = match[1].trim();
    }
  }
}

if (!connectionString) {
  console.error("❌ Error: DATABASE_URL not found in environment or .env.local");
  process.exit(1);
}

// 2. Open SQLite Database
const dbPath = path.join(__dirname, '..', 'sqlite.db');
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Error: Local sqlite.db not found at ${dbPath}`);
  process.exit(1);
}
const sqlite = new Database(dbPath);

// 3. Connect to Postgres (Neon)
console.log("Connecting to Neon PostgreSQL...");
const sql = postgres(connectionString, { ssl: 'require' });

// Safe JSON parser helper
function safeParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

async function migrate() {
  console.log("🚀 Starting database migration from SQLite to Neon PostgreSQL...");

  try {
    console.log("Wiping existing database entries on Neon to prevent unique constraints conflicts...");
    await sql`TRUNCATE TABLE users CASCADE`;

    // ---- USERS ----
    console.log("Migrating users...");
    const sqliteUsers = sqlite.prepare("SELECT * FROM users").all();
    for (const u of sqliteUsers) {
      await sql`
        INSERT INTO users (id, email, password_hash, created_at)
        VALUES (${u.id}, ${u.email}, ${u.password_hash}, ${u.created_at})
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash
      `;
    }
    console.log(`✓ Migrated ${sqliteUsers.length} users.`);

    // ---- PORTFOLIOS ----
    console.log("Migrating portfolios...");
    const sqlitePortfolios = sqlite.prepare("SELECT * FROM portfolios").all();
    for (const p of sqlitePortfolios) {
      await sql`
        INSERT INTO portfolios (id, user_id, name, broker, account_type, initial_balance, created_at)
        VALUES (${p.id}, ${p.user_id}, ${p.name}, ${p.broker}, ${p.account_type}, ${p.initial_balance}, ${p.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqlitePortfolios.length} portfolios.`);

    // ---- WEEKS ----
    console.log("Migrating weeks in batches...");
    const sqliteWeeks = sqlite.prepare("SELECT * FROM weeks").all();
    const weekChunkSize = 50;
    for (let i = 0; i < sqliteWeeks.length; i += weekChunkSize) {
      const chunk = sqliteWeeks.slice(i, i + weekChunkSize);
      const values = [];
      const args = [];
      for (let j = 0; j < chunk.length; j++) {
        const w = chunk[j];
        args.push(
          w.id, w.user_id, w.portfolio_id || null, w.week, w.month, w.year, 
          w.dateRange, w.status, w.sourceType, w.brokerNet, w.createdAt, 
          JSON.stringify(safeParse(w.screenshots)), JSON.stringify(safeParse(w.summary)), JSON.stringify(safeParse(w.coach))
        );
        const offset = j * 14;
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}::jsonb, $${offset + 13}::jsonb, $${offset + 14}::jsonb)`);
      }
      await sql.unsafe(`
        INSERT INTO weeks (id, user_id, portfolio_id, week, month, year, "dateRange", status, "sourceType", "brokerNet", "createdAt", screenshots, summary, coach)
        VALUES ${values.join(', ')}
        ON CONFLICT (id) DO NOTHING
      `, args);
    }
    console.log(`✓ Migrated ${sqliteWeeks.length} weeks.`);

    // ---- PLAYBOOK ----
    console.log("Migrating playbook...");
    const sqlitePlaybook = sqlite.prepare("SELECT * FROM playbook").all();
    for (const pl of sqlitePlaybook) {
      await sql`
        INSERT INTO playbook (id, user_id, name, description, rules, created_at)
        VALUES (${pl.id}, ${pl.user_id}, ${pl.name}, ${pl.description}, ${sql.json(safeParse(pl.rules))}, ${pl.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqlitePlaybook.length} playbook entries.`);

    // ---- DAILY JOURNALS ----
    console.log("Migrating daily journals...");
    const sqliteJournals = sqlite.prepare("SELECT * FROM daily_journals").all();
    for (const j of sqliteJournals) {
      await sql`
        INSERT INTO daily_journals (id, user_id, date, mood, rating, notes, screenshots, created_at)
        VALUES (${j.id}, ${j.user_id}, ${j.date}, ${j.mood}, ${j.rating}, ${j.notes}, ${sql.json(safeParse(j.screenshots))}, ${j.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteJournals.length} daily journals.`);

    // ---- SHARE TOKENS ----
    console.log("Migrating share tokens...");
    const sqliteTokens = sqlite.prepare("SELECT * FROM share_tokens").all();
    for (const t of sqliteTokens) {
      // Map text / timestamp to integer if needed
      const expiresAt = t.expires_at ? Number(t.expires_at) : null;
      await sql`
        INSERT INTO share_tokens (id, user_id, portfolio_id, token, expires_at, created_at)
        VALUES (${t.id}, ${t.user_id}, ${t.portfolio_id}, ${t.token}, ${expiresAt}, ${t.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteTokens.length} share tokens.`);

    // ---- TRADES ----
    console.log("Migrating trades in batches...");
    const sqliteTrades = sqlite.prepare("SELECT * FROM trades").all();
    const tradeChunkSize = 100;
    for (let i = 0; i < sqliteTrades.length; i += tradeChunkSize) {
      const chunk = sqliteTrades.slice(i, i + tradeChunkSize);
      const values = [];
      const args = [];
      for (let j = 0; j < chunk.length; j++) {
        const tr = chunk[j];
        args.push(
          tr.id, tr.week_id, tr.trade_id, tr.dateTime, tr.executionTime, tr.session, tr.symbol, tr.instrument, tr.dir,
          tr.lot, tr.entry, tr.exit, tr.pnl, tr.high, tr.low, tr.grade, tr.hold, tr.tag, tr.h1, tr.m15,
          tr.setupType, tr.month, tr.year, tr.compliance, JSON.stringify(safeParse(tr.checkedRules))
        );
        const offset = j * 25;
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}::jsonb)`);
      }
      await sql.unsafe(`
        INSERT INTO trades (
          id, week_id, trade_id, "dateTime", "executionTime", session, symbol, instrument, dir, 
          lot, entry, exit, pnl, high, low, grade, hold, tag, h1, m15, "setupType", month, year, compliance, checked_rules
        )
        VALUES ${values.join(', ')}
        ON CONFLICT (id) DO NOTHING
      `, args);
    }
    console.log(`✓ Migrated ${sqliteTrades.length} trades.`);

    // ---- SESSIONS (SKIP OR EMPTY) ----
    console.log("Skipping session tokens migration (users will just log in fresh)...");

    // ---- JOURNAL FOLDERS ----
    console.log("Migrating journal folders...");
    const sqliteFolders = sqlite.prepare("SELECT * FROM journal_folders").all();
    for (const f of sqliteFolders) {
      await sql`
        INSERT INTO journal_folders (id, user_id, name, icon, created_at)
        VALUES (${f.id}, ${f.user_id}, ${f.name}, ${f.icon}, ${f.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteFolders.length} journal folders.`);

    // ---- JOURNAL TAGS ----
    console.log("Migrating journal tags...");
    const sqliteTags = sqlite.prepare("SELECT * FROM journal_tags").all();
    for (const tg of sqliteTags) {
      await sql`
        INSERT INTO journal_tags (id, user_id, name, color)
        VALUES (${tg.id}, ${tg.user_id}, ${tg.name}, ${tg.color})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteTags.length} journal tags.`);

    // ---- JOURNAL NOTES ----
    console.log("Migrating journal notes...");
    const sqliteNotes = sqlite.prepare("SELECT * FROM journal_notes").all();
    for (const n of sqliteNotes) {
      await sql`
        INSERT INTO journal_notes (id, user_id, folder_id, date, title, content, created_at, updated_at)
        VALUES (${n.id}, ${n.user_id}, ${n.folder_id}, ${n.date}, ${n.title}, ${n.content}, ${n.created_at}, ${n.updated_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteNotes.length} journal notes.`);

    // ---- NOTE TAGS ----
    console.log("Migrating note tags...");
    const sqliteNoteTags = sqlite.prepare("SELECT * FROM note_tags").all();
    for (const nt of sqliteNoteTags) {
      await sql`
        INSERT INTO note_tags (note_id, tag_id)
        VALUES (${nt.note_id}, ${nt.tag_id})
        ON CONFLICT (note_id, tag_id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteNoteTags.length} note-to-tag relationships.`);

    // ---- PRE-MARKET PLANS ----
    console.log("Migrating pre-market plans...");
    const sqlitePlans = sqlite.prepare("SELECT * FROM pre_market_plans").all();
    for (const pln of sqlitePlans) {
      await sql`
        INSERT INTO pre_market_plans (
          id, user_id, date, htf_bias, key_levels, liquidity_zones, session_focus, scenario_a, scenario_b, scenario_c, conditions_no_trade, max_trades, risk_limit, screenshot, notes, created_at
        )
        VALUES (
          ${pln.id}, ${pln.user_id}, ${pln.date}, ${pln.htf_bias}, ${pln.key_levels}, ${pln.liquidity_zones}, ${pln.session_focus}, ${pln.scenario_a}, ${pln.scenario_b}, ${pln.scenario_c}, ${pln.conditions_no_trade}, ${pln.max_trades}, ${pln.risk_limit}, ${pln.screenshot}, ${pln.notes}, ${pln.created_at}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqlitePlans.length} pre-market plans.`);

    // ---- TRADE APPROVALS ----
    console.log("Migrating trade approvals...");
    const sqliteApprovals = sqlite.prepare("SELECT * FROM trade_approvals").all();
    for (const ap of sqliteApprovals) {
      await sql`
        INSERT INTO trade_approvals (id, user_id, date, time, symbol, setup_type, status, criteria, reason, created_at)
        VALUES (${ap.id}, ${ap.user_id}, ${ap.date}, ${ap.time}, ${ap.symbol}, ${ap.setup_type}, ${ap.status}, ${ap.criteria}, ${ap.reason}, ${ap.created_at})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteApprovals.length} trade approvals.`);

    // ---- RISK SETTINGS ----
    console.log("Migrating risk settings...");
    const sqliteRisk = sqlite.prepare("SELECT * FROM risk_settings").all();
    for (const r of sqliteRisk) {
      await sql`
        INSERT INTO risk_settings (
          portfolio_id, max_daily_loss, max_weekly_drawdown, max_trades_per_day, cooldown_timer_minutes, emotional_trade_limit, consecutive_losses_limit, lock_active_until, lock_reason, last_updated
        )
        VALUES (
          ${r.portfolio_id}, ${r.max_daily_loss}, ${r.max_weekly_drawdown}, ${r.max_trades_per_day}, ${r.cooldown_timer_minutes}, ${r.emotional_trade_limit}, ${r.consecutive_losses_limit}, ${r.lock_active_until}, ${r.lock_reason}, ${r.last_updated}
        )
        ON CONFLICT (portfolio_id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteRisk.length} risk settings.`);

    // ---- PRE-TRADE CHECKINS ----
    console.log("Migrating pre-trade checkins...");
    const sqliteCheckins = sqlite.prepare("SELECT * FROM pre_trade_checkins").all();
    for (const ck of sqliteCheckins) {
      await sql`
        INSERT INTO pre_trade_checkins (
          id, user_id, date, time, focus, sleep, patience, urgency, emotional_stability, confidence, frustration, readiness_score, risk_level, created_at
        )
        VALUES (
          ${ck.id}, ${ck.user_id}, ${ck.date}, ${ck.time}, ${ck.focus}, ${ck.sleep}, ${ck.patience}, ${ck.urgency}, ${ck.emotional_stability}, ${ck.confidence}, ${ck.frustration}, ${ck.readiness_score}, ${ck.risk_level}, ${ck.created_at}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteCheckins.length} pre-trade checkins.`);

    // ---- DAILY REVIEWS ----
    console.log("Migrating daily reviews...");
    const sqliteReviews = sqlite.prepare("SELECT * FROM daily_reviews").all();
    for (const rv of sqliteReviews) {
      await sql`
        INSERT INTO daily_reviews (
          id, user_id, date, followed_plan, chased, patient, emotional_triggers, improvements, discipline_score, execution_grade, emotional_control_score, created_at
        )
        VALUES (
          ${rv.id}, ${rv.user_id}, ${rv.date}, ${rv.followed_plan}, ${rv.chased}, ${rv.patient}, ${rv.emotional_triggers}, ${rv.improvements}, ${rv.discipline_score}, ${rv.execution_grade}, ${rv.emotional_control_score}, ${rv.created_at}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log(`✓ Migrated ${sqliteReviews.length} daily reviews.`);

    console.log("🎉 SUCCESS! Database migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("⚠️ Migration failed with error:", err);
    process.exit(1);
  }
}

migrate();
