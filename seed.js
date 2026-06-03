const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const db = new Database(dbPath);

const RAW_WEEK_1 = [
  ["2026-05-01 14:48","BTCUSDm","Sell",0.02,77757.34,78324.12,-11.33],
  ["2026-05-01 15:00","BTCUSDm","Buy",0.01,78370.45,78269.32,-1.05],
  ["2026-05-01 15:00","BTCUSDm","Buy",0.01,78301.20,78272.82,-0.28],
  ["2026-05-01 15:00","BTCUSDm","Buy",0.01,78215.58,78302.06,0.86],
  ["2026-05-01 15:37","XAUUSDm","Sell",0.01,4637.666,4639.864,-2.19,"B","Manage with trailer","Runner candidate","Bearish selloff after rejection"],
  ["2026-05-01 15:50","BTCUSDm","Buy",0.01,78605.77,78502.60,-1.03],
  ["2026-05-01 15:52","BTCUSDm","Buy",0.01,78252.63,78260.83,0.08],
  ["2026-05-01 15:52","BTCUSDm","Buy",0.01,78317.53,78258.71,-0.59],
  ["2026-05-01 15:52","BTCUSDm","Buy",0.01,78278.61,78176.26,-1.03],
  ["2026-05-01 18:47","XAUUSDm","Sell",0.01,4639.832,4622.683,17.15,"A","Should hold runner","Runner trade","15M lower highs continued"],
  ["2026-05-01 20:14","BTCUSDm","Buy",0.01,78271.99,78280.68,0.09],
  ["2026-05-01 20:18","BTCUSDm","Buy",0.01,78179.40,78188.71,0.10],
  ["2026-05-01 20:36","XAUUSDm","Sell",0.01,4642.906,4613.891,29.02,"A","Should hold runner","Runner trade","Best sell follow-through"],
  ["2026-05-04 08:23","BTCUSDm","Buy",0.03,79778.21,79634.58,-4.31],
  ["2026-05-04 10:02","BTCUSDm","Buy",0.01,79743.38,79536.80,-2.06],
  ["2026-05-04 10:02","BTCUSDm","Buy",0.02,79792.60,79545.10,-4.95],
  ["2026-05-04 15:02","XAUUSDm","Sell",0.01,4573.427,4565.371,8.06,"B","Hold only with trailer","Late trend","Sell worked but near exhaustion"],
  ["2026-05-04 15:06","XAUUSDm","Sell",0.01,4575.362,4561.765,13.59,"B","Hold only with trailer","Late trend","Trail aggressively"],
  ["2026-05-04 15:46","XAUUSDm","Buy",0.01,4528.393,4527.176,-1.21,"C","Do not hold unless reversal confirms","Early bottom fish","Bottom forming but not confirmed"],
  ["2026-05-04 16:51","XAUUSDm","Buy",0.01,4515.173,4508.399,-6.77,"D","Do not hold unless reversal confirms","Early bottom fish","Bottom forming but not confirmed"],
  ["2026-05-04 17:00","XAUUSDm","Sell",0.01,4507.745,4513.106,-5.36,"F","Should not hold","Avoid or no-hold","Sold exhaustion low"],
  ["2026-05-05 06:37","XAUUSDm","Sell",0.01,4547.344,4547.092,0.25,"C","Do not hold shorts","Counter-reversal sell","Base or reversal area"],
  ["2026-05-05 06:41","XAUUSDm","Sell",0.01,4545.469,4547.089,-1.62,"D","Do not hold shorts","Counter-reversal sell","Base or reversal area"],
  ["2026-05-05 07:43","XAUUSDm","Buy",0.01,4546.186,4553.763,7.57,"A","Should hold runner","Runner trade","Base-to-breakout reversal"],
  ["2026-05-05 08:13","XAUUSDm","Sell",0.01,4547.730,4551.924,-4.19,"D","Do not hold shorts","Counter-reversal sell","Base or reversal area"],
  ["2026-05-05 08:14","XAUUSDm","Sell",0.01,4548.691,4553.449,-4.76,"D","Do not hold shorts","Counter-reversal sell","Base or reversal area"],
  ["2026-05-05 08:53","XAUUSDm","Sell",0.01,4551.083,4554.843,-3.76,"D","Do not hold shorts","Counter-reversal sell","Base or reversal area"],
  ["2026-05-05 14:01","XAUUSDm","Buy",0.01,4575.424,4577.790,2.37,"B","Should hold small runner","Continuation buy","Higher-low continuation"],
  ["2026-05-06 04:29","BTCUSDm","Buy",0.01,81552.35,81432.63,-1.19],
  ["2026-05-06 08:18","XAUUSDm","Sell",0.01,4550.275,4552.426,-2.15,"F","Should not hold short","Counter impulse","Impulse reversal risk"],
  ["2026-05-06 09:01","XAUUSDm","Buy",0.01,4673.763,4701.600,27.84,"A","Should hold runner","Runner trade","Momentum buy after structure break"],
  ["2026-05-06 09:59","BTCUSDm","Buy",0.01,81579.30,81976.25,3.97],
  ["2026-05-07 04:56","XAUUSDm","Buy",0.01,4696.306,4694.747,-1.56,"D","Scalp only","Range or chop","High range or chop"],
  ["2026-05-07 05:30","XAUUSDm","Sell",0.01,4700.276,4699.241,1.04,"C","Scalp only","Range or chop","High range or chop"],
  ["2026-05-07 05:45","XAUUSDm","Buy",0.01,4704.692,4702.813,-1.88,"D","Scalp only","Range or chop","High range or chop"],
  ["2026-05-07 05:57","XAUUSDm","Buy",0.01,4704.677,4701.901,-2.78,"D","Scalp only","Range or chop","High range or chop"],
  ["2026-05-08 07:13","XAUUSDm","Buy",0.01,4723.968,4717.891,-6.08,"F","Should not hold","Avoid or no-hold","Late buy at resistance"]
];

function instrumentFromSymbol(symbol = "") {
  const s = String(symbol).toUpperCase();
  if (s.includes("BTC")) return "Bitcoin";
  if (s.includes("XAU") || s.includes("GOLD")) return "Gold";
  return symbol || "Unknown";
}
function direction(value) { return String(value || "").toLowerCase().includes("sell") ? "Sell" : "Buy"; }

const trades = RAW_WEEK_1.map((r, i) => ({
  id: `week1_${i+1}`,
  weekId: 'week1',
  tradeId: i+1,
  dateTime: r[0],
  symbol: r[1],
  instrument: instrumentFromSymbol(r[1]),
  dir: direction(r[2]),
  lot: Number(r[3]),
  entry: Number(r[4]),
  exit: Number(r[5]),
  pnl: Number(r[6]),
  grade: r[7] || "Pending",
  hold: r[8] || "Pending chart review",
  tag: r[9] || "Needs review",
  setupType: r[10] || "",
  h1: "Awaiting 1H context",
  m15: "Awaiting 15M context"
}));

db.prepare(`INSERT OR REPLACE INTO weeks (id, week, dateRange, status, sourceType, brokerNet, summary, coach, screenshots) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
  'week1', 1, 'May 1 to 8, 2026', 'reviewed', 'screenshot', 39.86, 
  JSON.stringify({
    netPnL: 39.86, trades: 37, wins: 11, losses: 26, winRate: 11/37, profitFactor: 1.2, grossProfit: 135.25, grossLoss: -95.39, xauPnL: 85.34, btcPnL: -45.48, bestTrade: 29.02, worstTrade: -11.33, avgHoldScore: 6.5, coachScore: 68, coachGrade: 'B'
  }),
  JSON.stringify({
    verdict: "Green week, but not clean yet. Gold showed edge while BTC created drag. Main weakness: overtrading and counter-structure entries.",
    primaryRule: "1H gives direction. 15M gives permission. No permission, no entry.",
    focus: "Keep only the best setup. Do not increase lot size until discipline is stable.",
    actionPlan: ["Gold first", "BTC restricted unless chart confirms", "Max 3 trades per day", "Stop after 2 wins or 2 losses"],
    modeRules: [
        { mode: "Runner Mode", trigger: "1H and 15M align in impulse", action: "Partial close, hold 25 to 30 percent runner" }
    ]
  }),
  JSON.stringify({})
);

const insertTrade = db.prepare(`INSERT OR REPLACE INTO trades (id, week_id, trade_id, dateTime, symbol, instrument, dir, lot, entry, exit, pnl, grade, hold, tag, setupType, h1, m15) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

trades.forEach(t => {
  insertTrade.run(t.id, t.weekId, t.tradeId, t.dateTime, t.symbol, t.instrument, t.dir, t.lot, t.entry, t.exit, t.pnl, t.grade, t.hold, t.tag, t.setupType, t.h1, t.m15);
});

console.log("Database seeded successfully with the uploaded screenshot data!");
