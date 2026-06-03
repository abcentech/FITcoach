const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const crypto = require('crypto');

// Parse command line arguments
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = process.argv[i + 1];
      if (val && !val.startsWith('--')) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs();

if (!args.login || !args.password || !args.server) {
  console.error('Error: Missing required arguments.');
  console.log('\nUsage: node scripts/sync_db.js --login <LOGIN> --password <PASSWORD> --server <SERVER> [--days <DAYS>] [--user-email <EMAIL>] [--path <TERMINAL_PATH>]\n');
  process.exit(1);
}

const login = Number(args.login);
const password = args.password;
const server = args.server;
const days = args.days ? Number(args.days) : 30;
const terminalPath = args.path || null;
const userEmail = args.user_email || null;

// Helper to calculate trading session
function getSession(date) {
  const hour = date.getHours();
  if (hour >= 0 && hour < 8) return "Asia";
  if (hour >= 8 && hour < 13) return "London";
  if (hour >= 13 && hour < 17) return "Overlap";
  if (hour >= 17 && hour < 22) return "NY";
  return "Asia";
}

// Inferred setup type
function inferSetupType(trade) {
  const text = `${trade.symbol || ""} ${trade.dir || ""}`.toLowerCase();
  if (text.includes("btc")) return "BTC Unverified";
  return "Unclassified";
}

// Auto grade
function autoGrade(trade) {
  const pnl = Number(trade.pnl || 0);
  if (trade.symbol?.toUpperCase().includes("BTC")) {
    return {
      ...trade,
      grade: "N/A",
      hold: "BTC needs its own chart review",
      tag: "BTC restricted",
      setupType: "BTC Unverified",
    };
  }
  if (pnl >= 10) return { ...trade, grade: "A", hold: "Runner candidate", tag: "Repeat setup", setupType: "Impulse Pullback" };
  if (pnl > 0) return { ...trade, grade: "B", hold: "Good scalp or partial", tag: "Review exit", setupType: "Range Scalp" };
  if (pnl <= -5) return { ...trade, grade: "F", hold: "Should not hold", tag: "Avoid or stop earlier", setupType: "Chase Trade" };
  return { ...trade, grade: "D", hold: "Small loss. Check entry quality", tag: "Tighten filter", setupType: "Range Scalp" };
}

// Simple coach builder for database persistence
function buildCoach(summary, netPnL, winRate) {
  return {
    verdict: netPnL >= 0 
      ? `Excellent week! You maintained a positive edge with a ${(winRate * 100).toFixed(1)}% win rate.`
      : `Challenging period with a net of ${netPnL.toFixed(2)}. Review your entries and avoid overtrading.`,
    protocol: winRate < 0.45 ? "Defense Mode" : winRate > 0.6 ? "Growth Mode" : "Stability Mode",
    focus: "Maintain Discipline",
    actionPlan: [
      "Maximum 3 trades per day",
      "Stop after 2 consecutive losses",
      "No runner in range or chop",
      "1H must align with 15M trigger"
    ],
    modeRules: [
      { mode: "Runner Mode", trigger: "Impulse + Structure Break", action: "Trail 25% for 3:1" },
      { mode: "Scalp Mode", trigger: "Range/Chop", action: "Exit 100% at next level" },
      { mode: "Defense Mode", trigger: "Win rate < 45%", action: "Tighten stop, half risk" }
    ]
  };
}

async function runSync() {
  const dbFile = path.join(process.cwd(), 'sqlite.db');
  if (!fs.existsSync(dbFile)) {
    console.error(`Error: sqlite.db not found at ${dbFile}`);
    process.exit(1);
  }

  const db = new Database(dbFile);

  // 1. Resolve User
  let user;
  if (userEmail) {
    user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(userEmail);
    if (!user) {
      console.error(`Error: User with email "${userEmail}" not found in database.`);
      process.exit(1);
    }
  } else {
    // Default to the first user found in database
    user = db.prepare('SELECT id, email FROM users LIMIT 1').get();
    if (!user) {
      console.error('Error: No users found in database. Please log in or register via the web UI first.');
      process.exit(1);
    }
  }

  console.log(`Syncing for user: ${user.email} (ID: ${user.id})`);

  // 2. Resolve/Create Portfolio
  let portfolio = db.prepare('SELECT id FROM portfolios WHERE user_id = ? LIMIT 1').get(user.id);
  let portfolioId;
  if (portfolio) {
    portfolioId = portfolio.id;
  } else {
    portfolioId = `default-${user.id}`;
    db.prepare(`
      INSERT OR IGNORE INTO portfolios (id, user_id, name, broker, account_type, initial_balance)
      VALUES (?, ?, 'Master Portfolio', 'Standard', 'Live', 10000.0)
    `).run(portfolioId, user.id);
  }

  // 3. Execute python mt5_sync.py
  const scriptPath = path.join(process.cwd(), 'scripts', 'mt5_sync.py');
  const pythonArgs = [
    scriptPath,
    '--login', login.toString(),
    '--password', password,
    '--server', server,
    '--days', days.toString()
  ];
  if (terminalPath) {
    pythonArgs.push('--path', terminalPath);
  }

  console.log(`Executing: python ${scriptPath} --login ${login} --server "${server}" --days ${days}...`);
  
  const pyProcess = spawnSync('python', pythonArgs, { 
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
  });

  if (pyProcess.error) {
    console.error('Error executing python sync script:', pyProcess.error.message);
    process.exit(1);
  }

  if (pyProcess.status !== 0) {
    console.error('Python sync script failed with exit code:', pyProcess.status);
    console.error('Stderr:', pyProcess.stderr);
    console.error('Stdout:', pyProcess.stdout);
    process.exit(1);
  }

  let resultJson;
  try {
    resultJson = JSON.parse(pyProcess.stdout.trim());
  } catch (e) {
    console.error('Failed to parse JSON output from python sync script. Raw stdout:');
    console.log(pyProcess.stdout);
    process.exit(1);
  }

  if (resultJson.error) {
    console.error('Sync error returned from MT5:', resultJson.error);
    process.exit(1);
  }

  const trades = resultJson.trades || [];
  const accountBalance = resultJson.balance || 0;
  const accountCurrency = resultJson.currency || "USD";

  if (trades.length === 0) {
    console.log(`Success: Connection established. No closed trades found in the last ${days} days.`);
    process.exit(0);
  }

  console.log(`Fetched ${trades.length} closed trades. Inserting into database...`);

  // Group trades by week (year-WweekNum)
  const tradesByWeek = {};
  for (const t of trades) {
    const dateStr = t.dateTime.replace(/-/g, "/").split(" ")[0];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((date - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
    const monthName = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    const weekKey = `${year}-W${weekNum}`;

    if (!tradesByWeek[weekKey]) {
      tradesByWeek[weekKey] = {
        weekNumber: weekNum,
        month: monthName,
        year: year,
        startDate: t.dateTime.split(" ")[0],
        trades: [],
      };
    }
    tradesByWeek[weekKey].trades.push(t);
  }

  // Insert weeks and trades in transaction
  const insertWeeksStmt = db.prepare(`
    INSERT INTO weeks (id, user_id, portfolio_id, week, month, year, dateRange, status, sourceType, brokerNet, summary, coach)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'reviewed', 'csv', ?, ?, ?)
  `);

  const insertTradesStmt = db.prepare(`
    INSERT INTO trades (id, week_id, trade_id, dateTime, executionTime, session, symbol, instrument, dir, lot, entry, exit, pnl, grade, hold, tag, setupType)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteExistingTradesStmt = db.prepare(`
    DELETE FROM trades WHERE week_id IN (
      SELECT id FROM weeks WHERE user_id = ? AND portfolio_id = ? AND week = ? AND year = ?
    )
  `);

  const deleteExistingWeeksStmt = db.prepare(`
    DELETE FROM weeks WHERE user_id = ? AND portfolio_id = ? AND week = ? AND year = ?
  `);

  const transaction = db.transaction(() => {
    for (const weekKey in tradesByWeek) {
      const w = tradesByWeek[weekKey];
      
      // Clean up previous sync for this specific week to prevent duplicates
      deleteExistingTradesStmt.run(user.id, portfolioId, w.weekNumber, w.year);
      deleteExistingWeeksStmt.run(user.id, portfolioId, w.weekNumber, w.year);

      const weekId = crypto.randomUUID();
      const net = w.trades.reduce((s, t) => s + t.pnl, 0);
      const wins = w.trades.filter((t) => t.pnl > 0).length;
      const winRate = w.trades.length > 0 ? wins / w.trades.length : 0;

      const summary = { netPnL: net, tradesCount: w.trades.length, winRate, bestAsset: "N/A" };
      const coach = buildCoach(summary, net, winRate);

      insertWeeksStmt.run(
        weekId,
        user.id,
        portfolioId,
        w.weekNumber,
        w.month,
        w.year,
        `Week ${w.weekNumber} (${w.startDate})`,
        net,
        JSON.stringify(summary),
        JSON.stringify(coach)
      );

      let seqId = 1;
      for (const t of w.trades) {
        const gradedTrade = autoGrade(t);
        const sym = (gradedTrade.symbol || "").toUpperCase();
        const instrument = (() => {
          if (sym.includes("BTC") || sym.includes("XBT")) return "Bitcoin";
          if (sym.includes("XAU") || sym.includes("GOLD")) return "Gold";
          if (sym.includes("ETH")) return "Ethereum";
          if (sym.includes("NAS") || sym.includes("US100") || sym.includes("USTEC")) return "Nasdaq";
          if (sym.includes("SPX") || sym.includes("US500")) return "S&P500";
          if (sym.includes("OIL") || sym.includes("WTI") || sym.includes("BRENT")) return "Oil";
          if (sym.length === 6 || sym.length === 7) return sym;
          return sym || "Unknown";
        })();

        // Resolve trading session
        const tradeDateStr = gradedTrade.dateTime.replace(/-/g, "/");
        const tradeDate = new Date(tradeDateStr);
        const session = isNaN(tradeDate.getTime()) ? "Asia" : getSession(tradeDate);

        insertTradesStmt.run(
          `${weekId}_${seqId}`,
          weekId,
          seqId++,
          gradedTrade.dateTime,
          gradedTrade.executionTime,
          session,
          gradedTrade.symbol,
          instrument,
          gradedTrade.dir,
          gradedTrade.lot,
          gradedTrade.entry,
          gradedTrade.exit,
          gradedTrade.pnl,
          gradedTrade.grade,
          gradedTrade.hold,
          gradedTrade.tag,
          gradedTrade.setupType
        );
      }
    }
  });

  transaction();
  
  console.log(`\n🎉 Success! Synced ${trades.length} trades.`);
  console.log(`Account Balance: $${accountBalance.toFixed(2)} ${accountCurrency}`);
  db.close();
}

runSync().catch(err => {
  console.error('Fatal sync execution error:', err);
  process.exit(1);
});
