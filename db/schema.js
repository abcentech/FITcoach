import { pgTable, text, integer, real, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const portfolios = pgTable('portfolios', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  broker: text('broker'),
  accountType: text('account_type'), // e.g. "Live", "Demo", "Prop"
  initialBalance: real('initial_balance').default(10000),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const weeks = pgTable('weeks', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  portfolioId: text('portfolio_id').references(() => portfolios.id, { onDelete: 'cascade' }),
  week: integer('week').notNull(),
  month: text('month'), // e.g., 'January'
  year: integer('year'), // e.g., 2026
  dateRange: text('dateRange').notNull(),
  status: text('status').notNull().default('reviewed'),
  sourceType: text('sourceType').notNull().default('sample'),
  brokerNet: real('brokerNet'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  screenshots: jsonb('screenshots'), // Native JSONB in Postgres
  summary: jsonb('summary'), 
  coach: jsonb('coach'), 
});

export const playbook = pgTable('playbook', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  rules: jsonb('rules'), 
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const dailyJournals = pgTable('daily_journals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  mood: text('mood'),
  rating: integer('rating'), // 1-5 stars
  notes: text('notes'),
  screenshots: jsonb('screenshots'), 
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const shareTokens = pgTable('share_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  portfolioId: text('portfolio_id').references(() => portfolios.id, { onDelete: 'cascade' }), // optional
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at'), // timestamp
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const trades = pgTable('trades', {
  id: text('id').primaryKey(),
  weekId: text('week_id').notNull().references(() => weeks.id, { onDelete: 'cascade' }),
  tradeId: integer('trade_id').notNull(), // The sequential ID # in the UI
  dateTime: text('dateTime'),
  executionTime: text('executionTime'), // Time of day (HH:mm)
  session: text('session'), // London, NY, Asia, etc.
  symbol: text('symbol'),
  instrument: text('instrument'),
  dir: text('dir'),
  lot: real('lot'),
  entry: real('entry'),
  exit: real('exit'),
  pnl: real('pnl'),
  high: real('high'),
  low: real('low'),
  grade: text('grade').default('Pending'),
  hold: text('hold').default('Pending chart review'),
  tag: text('tag').default('Needs review'),
  h1: text('h1').default('Awaiting 1H context'),
  m15: text('m15').default('Awaiting 15M context'),
  setupType: text('setupType'),
  month: text('month'),
  year: integer('year'),
  compliance: real('compliance'), // Rule compliance percentage (0 to 1)
  checkedRules: jsonb('checked_rules'), 
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
});

export const journalFolders = pgTable('journal_folders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  icon: text('icon'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const journalTags = pgTable('journal_tags', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
});

export const journalNotes = pgTable('journal_notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  folderId: text('folder_id').references(() => journalFolders.id, { onDelete: 'cascade' }),
  date: text('date'), // YYYY-MM-DD
  title: text('title').notNull().default('Untitled Note'),
  content: text('content'), // HTML string
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const noteTags = pgTable('note_tags', {
  noteId: text('note_id').notNull().references(() => journalNotes.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => journalTags.id, { onDelete: 'cascade' }),
});

export const preMarketPlans = pgTable('pre_market_plans', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  htfBias: text('htf_bias'),
  keyLevels: text('key_levels'),
  liquidityZones: text('liquidity_zones'),
  sessionFocus: text('session_focus'),
  scenarioA: text('scenario_a'),
  scenarioB: text('scenario_b'),
  scenarioC: text('scenario_c'),
  conditionsNoTrade: text('conditions_no_trade'),
  maxTrades: integer('max_trades').default(3),
  riskLimit: real('risk_limit').default(1),
  screenshot: text('screenshot'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tradeApprovals = pgTable('trade_approvals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  time: text('time').notNull(),
  symbol: text('symbol').notNull(),
  setupType: text('setup_type'),
  status: text('status').notNull(),
  criteria: text('criteria'),
  reason: text('reason'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const riskSettings = pgTable('risk_settings', {
  portfolioId: text('portfolio_id').primaryKey().references(() => portfolios.id, { onDelete: 'cascade' }),
  maxDailyLoss: real('max_daily_loss').default(500),
  maxWeeklyDrawdown: real('max_weekly_drawdown').default(1500),
  maxTradesPerDay: integer('max_trades_per_day').default(3),
  cooldownTimerMinutes: integer('cooldown_timer_minutes').default(30),
  emotionalTradeLimit: integer('emotional_trade_limit').default(2),
  consecutiveLossesLimit: integer('consecutive_losses_limit').default(2),
  lockActiveUntil: text('lock_active_until'),
  lockReason: text('lock_reason'),
  lastUpdated: text('last_updated').default(sql`CURRENT_TIMESTAMP`),
});

export const preTradeCheckins = pgTable('pre_trade_checkins', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  time: text('time').notNull(),
  focus: integer('focus').default(5),
  sleep: integer('sleep').default(5),
  patience: integer('patience').default(5),
  urgency: integer('urgency').default(5),
  emotionalStability: integer('emotional_stability').default(5),
  confidence: integer('confidence').default(5),
  frustration: integer('frustration').default(1),
  readinessScore: real('readiness_score').default(100),
  riskLevel: text('risk_level').default('Low'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const dailyReviews = pgTable('daily_reviews', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  followedPlan: integer('followed_plan').default(1),
  chased: integer('chased').default(0),
  patient: integer('patient').default(1),
  emotionalTriggers: text('emotional_triggers'),
  improvements: text('improvements'),
  disciplineScore: real('discipline_score').default(100),
  executionGrade: text('execution_grade').default('A'),
  emotionalControlScore: real('emotional_control_score').default(100),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
