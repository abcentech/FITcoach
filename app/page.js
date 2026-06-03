"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { 
  getWeeks, 
  saveWeek, 
  updateWeekData, 
  getPortfolios, 
  createPortfolio, 
  deletePortfolio, 
  getPlaybookSetups, 
  savePlaybookSetup, 
  deletePlaybookSetup, 
  getDailyJournal, 
  saveDailyJournal, 
  getDailyJournals,
  deleteDailyJournal,
  simulateBrokerSync,
  generateShareToken,
  getShareTokens,
  revokeShareToken,
  getPreMarketPlan,
  savePreMarketPlan,
  getAllPreMarketPlans,
  getTradeApprovals,
  saveTradeApproval,
  getRiskSettings,
  saveRiskSettings,
  getPreTradeCheckin,
  savePreTradeCheckin,
  getDailyReview,
  saveDailyReview,
  getAllDailyReviews,
  getAllPreTradeCheckins
} from "./actions";
import ExecutionChart from "./components/TradingViewChart";
import ReplaySimulator from "./components/ReplaySimulator";
import {
  HourDayHeatmap,
  HourOfDayAnalysis,
  SymbolBreakdown,
  PatternHunter,
  SetupLibrary,
  MistakeLeaderboard
} from "./components/agents/AnalyticsAgent";
import { RobustCoachTab } from "./components/agents/CoachAgent";
import { PsychologyJournal } from "./components/agents/PsychologyAgent";
import { RulesTracker } from "./components/agents/RulesAgent";
import { RiskOfRuin } from "./components/agents/RiskAgent";
import { AICoachChat } from "./components/agents/AIAgent";
import { ChartReviewPanel } from "./components/agents/ChartReviewAgent";
import { EquityCurve, StreakTracker, DrawdownMeter, HabitStreaks } from "./components/agents/DashboardAgent";
import { TradeCalendar } from "./components/agents/CalendarAgent";
import { TradeListAgent } from "./components/agents/TradeListAgent";
import { TradezellaHeader } from "./components/agents/TradezellaHeader";
import { JournalAgent } from "./components/agents/JournalAgent";

// New performance modules
import { PreMarketAgent } from "./components/agents/PreMarketAgent";
import { ApprovalAgent } from "./components/agents/ApprovalAgent";
import { EmotionalMonitorAgent } from "./components/agents/EmotionalMonitorAgent";
import { WaitingModeAgent } from "./components/agents/WaitingModeAgent";
import { ReviewAgent } from "./components/agents/ReviewAgent";
// Auth is handled via fetch to /api/me and /api/logout

const STORAGE_KEY = "fitpips_trading_coach_github_v1";
const MAX_WEEKS = 26;
const GRADE_SCORE = { A: 9, B: 7, C: 5, D: 3, F: 1 };

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

function n(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const raw = String(value).trim();
  const negative = raw.includes("-") || (raw.includes("(") && raw.includes(")"));
  const digits = raw.replace(/[^0-9.]/g, "");
  if (!digits) return fallback;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : fallback;
}
function fmtMoney(v) { const x = n(v); return `${x >= 0 ? "+" : "-"}$${Math.abs(x).toFixed(2)}`; }
function fmtPct(v) { return `${(n(v) * 100).toFixed(1)}%`; }
function pnlColor(v) { return n(v) >= 0 ? "text-emerald-400" : "text-rose-400"; }
function normalizeDateTime(value = "") {
  return String(value || "").replace(/\./g, "-").trim();
}
function tradingViewSymbol(symbol = "") {
  const s = String(symbol).toUpperCase();
  if (s.includes("XAU") || s.includes("GOLD")) return "OANDA:XAUUSD";
  if (s.includes("BTC")) return "BITSTAMP:BTCUSD";
  if (s.includes("NAS") || s.includes("USTEC") || s.includes("US100")) return "CAPITALCOM:US100";
  if (s.includes(":")) return s;
  return s.replace(/M$/, "") || "OANDA:XAUUSD";
}
function tradingViewLink(symbol = "") {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tradingViewSymbol(symbol))}`;
}
function instrumentFromSymbol(symbol = "") {
  const s = String(symbol).toUpperCase();
  if (s.includes("BTC")) return "Bitcoin";
  if (s.includes("XAU") || s.includes("GOLD")) return "Gold";
  if (s.includes("NAS") || s.includes("USTEC") || s.includes("US100")) return "Nasdaq";
  return symbol || "Unknown";
}
function direction(value) { return String(value || "").toLowerCase().includes("sell") ? "Sell" : "Buy"; }
function makeId() { try { return crypto.randomUUID(); } catch { return `id-${Date.now()}-${Math.random()}`; } }
function field(row, names) {
  const keys = Object.keys(row || {});
  for (const name of names) {
    const found = keys.find((k) => k.toLowerCase().replace(/\s/g, "") === name.toLowerCase().replace(/\s/g, ""));
    if (found) return row[found];
  }
  return "";
}
function inferSetupType(trade) {
  const text = `${trade.tag || ""} ${trade.hold || ""} ${trade.m15 || ""}`.toLowerCase();
  if (text.includes("runner") || text.includes("impulse") || text.includes("momentum")) return "Impulse Pullback";
  if (text.includes("range") || text.includes("chop") || text.includes("scalp")) return "Range Scalp";
  if (text.includes("reversal") || text.includes("base") || text.includes("bottom")) return "Reversal Base";
  if (text.includes("resistance") || text.includes("support")) return "S/R Rejection";
  if (text.includes("btc")) return "BTC Unverified";
  if (text.includes("counter")) return "Countertrend Entry";
  if (text.includes("late") || text.includes("chase")) return "Chase Trade";
  return "Unclassified";
}
function autoGrade(trade) {
  if (trade.grade && trade.grade !== "Pending") return { ...trade, setupType: trade.setupType || inferSetupType(trade) };
  const pnl = n(trade.pnl);
  if (trade.instrument === "Bitcoin") return { ...trade, grade: "N/A", hold: "BTC needs its own chart review", tag: "BTC restricted", setupType: "BTC Unverified" };
  if (pnl >= 10) return { ...trade, grade: "A", hold: "Runner candidate", tag: "Repeat setup", setupType: inferSetupType({ ...trade, tag: "runner" }) };
  if (pnl > 0) return { ...trade, grade: "B", hold: "Good scalp or partial", tag: "Review exit", setupType: inferSetupType(trade) };
  if (pnl <= -5) return { ...trade, grade: "F", hold: "Should not hold", tag: "Avoid or stop earlier", setupType: inferSetupType(trade) };
  return { ...trade, grade: "D", hold: "Small loss. Check entry quality", tag: "Tighten filter", setupType: inferSetupType(trade) };
}
function normalizeTrade(row, index) {
  const symbol = String(field(row, ["symbol", "pair", "market", "instrument"]) || "XAUUSDm").trim();
  const trade = {
    id: n(field(row, ["id", "#", "trade", "trade #"]), index + 1),
    dateTime: String(field(row, ["dateTime", "date", "time", "date/time"]) || ""),
    symbol,
    instrument: instrumentFromSymbol(symbol),
    dir: direction(field(row, ["dir", "direction", "side", "type"])),
    lot: n(field(row, ["lot", "size", "volume"])),
    entry: n(field(row, ["entry", "open", "open price"])),
    exit: n(field(row, ["exit", "close", "close price"])),
    pnl: n(field(row, ["pnl", "profit", "p&l", "net pnl", "net p/l", "result"])),
    high: field(row, ["high", "high during trade", "mfe high"]) || "",
    low: field(row, ["low", "low during trade", "mae low"]) || "",
    grade: String(field(row, ["grade"]) || "Pending"),
    hold: String(field(row, ["hold", "hold verdict"]) || "Pending chart review"),
    tag: String(field(row, ["tag", "coach tag", "mistake"]) || "Needs review"),
    h1: String(field(row, ["h1", "1h", "1h context"]) || "Awaiting 1H context"),
    m15: String(field(row, ["m15", "15m", "15m context"]) || "Awaiting 15M context"),
    setupType: String(field(row, ["setup", "setup type", "entry type"]) || "")
  };
  return autoGrade(trade);
}
function tradeFromArray(r, i) {
  return autoGrade({
    id: i + 1, dateTime: r[0], symbol: r[1], instrument: instrumentFromSymbol(r[1]), dir: direction(r[2]),
    lot: n(r[3]), entry: n(r[4]), exit: n(r[5]), pnl: n(r[6]), high: "", low: "",
    grade: r[7] || "Pending", hold: r[8] || "Pending chart review", tag: r[9] || "Needs review", m15: r[10] || "Awaiting 15M context", h1: "Awaiting 1H context", setupType: ""
  });
}
function getMfeMae(trade) {
  const entry = n(trade.entry); const exit = n(trade.exit);
  const high = trade.high === "" ? null : n(trade.high, null); const low = trade.low === "" ? null : n(trade.low, null);
  if (high === null || low === null || entry === 0) return { mfe: null, mae: null, efficiency: null };
  const mfe = trade.dir === "Buy" ? Math.max(0, high - entry) : Math.max(0, entry - low);
  const mae = trade.dir === "Buy" ? Math.max(0, entry - low) : Math.max(0, high - entry);
  const move = trade.dir === "Buy" ? exit - entry : entry - exit;
  return { mfe, mae, efficiency: mfe > 0 ? Math.max(-1, Math.min(1, move / mfe)) : null };
}
function reviewTradeStructure(trade = {}) {
  const pnl = n(trade.pnl);
  const mm = getMfeMae(trade);
  const text = `${trade.h1 || ""} ${trade.m15 || ""} ${trade.hold || ""} ${trade.tag || ""} ${trade.setupType || ""}`.toLowerCase();
  const trendAligned = text.includes("runner") || text.includes("momentum") || text.includes("impulse") || text.includes("breakout") || text.includes("continued") || text.includes("continuation");
  const caution = text.includes("range") || text.includes("chop") || text.includes("counter") || text.includes("late") || text.includes("exhaustion") || text.includes("resistance");
  const gradeScore = GRADE_SCORE[trade.grade] || (pnl > 0 ? 5 : 2);
  const directionScore = trendAligned ? 2 : caution ? -2 : 0;
  const resultScore = pnl >= 10 ? 2 : pnl > 0 ? 1 : pnl <= -5 ? -2 : -1;
  const efficiencyScore = mm.efficiency == null ? 0 : mm.efficiency < 0.45 && pnl > 0 ? 1 : mm.efficiency > 0.8 ? -1 : 0;
  const score = Math.max(0, Math.min(10, gradeScore + directionScore + resultScore + efficiencyScore));
  const verdict = score >= 8 ? "Hold runner candidate" : score >= 5 ? "Partial and trail only" : "Scalp or no-hold";
  const tone = score >= 8 ? "green" : score >= 5 ? "amber" : "red";
  const h1 = trendAligned ? "1H bias appears supportive from the trade notes." : caution ? "1H context needs caution before extending the trade." : "1H bias needs manual confirmation on the chart.";
  const m15 = trendAligned ? "15M confirmation likely mattered: look for continuation after entry." : caution ? "15M likely warned against holding: confirm rejection, chop, or exhaustion." : "Use the 15M chart to validate trigger, retest, and follow-through.";
  return { score, verdict, tone, h1, m15, efficiency: mm.efficiency, hasExcursion: mm.efficiency != null };
}
function summarize(trades) {
  const list = trades || [];
  const wins = list.filter((t) => n(t.pnl) > 0);
  const losses = list.filter((t) => n(t.pnl) < 0);
  const grossProfit = wins.reduce((s, t) => s + n(t.pnl), 0);
  const grossLoss = losses.reduce((s, t) => s + n(t.pnl), 0);
  const netPnL = grossProfit + grossLoss;
  
  // Advanced Leaks Analysis for Pattern Hunter
  const leaks = {
    symbol: {}, hour: {}, day: {}, session: {}, dir: {}
  };
  list.forEach(t => {
    const symbol = t.symbol || "Unknown";
    const hour = (t.dateTime || "").split(" ")[1]?.split(":")[0] || "Unknown";
    const dt = String(t.dateTime || "").replace(/\./g, "-").replace(/\s/, "T");
    const day = new Date(dt).toLocaleString('en-us', {weekday:'long'});
    const session = t.session || "Unknown";
    const dir = t.dir || "Unknown";

    [ {k:'symbol', v:symbol}, {k:'hour', v:hour}, {k:'day', v:day}, {k:'session', v:session}, {k:'dir', v:dir} ].forEach(o => {
      if (!leaks[o.k][o.v]) leaks[o.k][o.v] = { pnl: 0, count: 0 };
      leaks[o.k][o.v].pnl += n(t.pnl);
      leaks[o.k][o.v].count++;
    });
  });

  // Find biggest leak in each category
  const topLeaks = Object.entries(leaks).map(([cat, data]) => {
    const worst = Object.entries(data).reduce((a, b) => b[1].pnl < a[1].pnl ? b : a, ["None", {pnl: 0, count: 0}]);
    return { category: cat, value: worst[0], pnl: worst[1].pnl, count: worst[1].count };
  }).filter(l => l.pnl < 0).sort((a, b) => a.pnl - b.pnl);

  const winRate = list.length ? wins.length / list.length : 0;
  const profitFactor = grossLoss ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? 99 : 0;
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(grossLoss / losses.length) : 0;

  const buys = list.filter(t => (t.dir || '').toLowerCase().includes('buy'));
  const sells = list.filter(t => (t.dir || '').toLowerCase().includes('sell'));
  
  const buysWins = buys.filter(t => n(t.pnl) > 0);
  const sellsWins = sells.filter(t => n(t.pnl) > 0);
  
  const buysPnL = buys.reduce((s, t) => s + n(t.pnl), 0);
  const sellsPnL = sells.reduce((s, t) => s + n(t.pnl), 0);

  const buysWinRate = buys.length ? buysWins.length / buys.length : 0;
  const sellsWinRate = sells.length ? sellsWins.length / sells.length : 0;

  // Sharpe Ratio estimation
  const pnlList = list.map(t => n(t.pnl));
  const avgPnL = list.length ? netPnL / list.length : 0;
  const variance = list.length > 1 
    ? pnlList.reduce((s, val) => s + Math.pow(val - avgPnL, 2), 0) / (list.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? avgPnL / stdDev : 0;

  // Expectancy
  const expectancy = list.length
    ? (winRate * avgWin) - ((1 - winRate) * avgLoss)
    : 0;

  const profitRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99 : 0;

  const gradeScores = list.map((t) => GRADE_SCORE[t.grade]).filter(Boolean);
  const avgHoldScore = gradeScores.length ? gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length : 0;
  
  const coachScore = Math.max(0, Math.min(100, 
    (netPnL >= 0 ? 30 : 0) + 
    Math.min(20, profitFactor * 8) + 
    Math.min(20, winRate * 40) + 
    Math.min(30, avgHoldScore * 3) - 
    (list.length > 20 ? (list.length - 20) * 2 : 0)
  ));

  return { 
    trades: list.length, wins: wins.length, losses: losses.length, winRate, netPnL, profitFactor, 
    grossProfit, grossLoss, avgWin, avgLoss,
    topLeaks, coachScore, coachGrade: coachScore >= 80 ? "A" : coachScore >= 65 ? "B" : coachScore >= 50 ? "C" : "F",
    expectancy, profitRatio, sharpeRatio,
    buysCount: buys.length, buysWins: buysWins.length, buysPnL, buysWinRate,
    sellsCount: sells.length, sellsWins: sellsWins.length, sellsPnL, sellsWinRate,
    bestTrade: list.length ? Math.max(...list.map(t => n(t.pnl))) : 0,
    worstTrade: list.length ? Math.min(...list.map(t => n(t.pnl))) : 0
  };
}

function buildCoach(summary) {
  const leaks = summary.topLeaks || [];
  const protocol = summary.winRate < 0.45 ? "Defense Mode" : summary.winRate > 0.6 ? "Growth Mode" : "Stability Mode";
  const focus = leaks.length > 0 ? `ELIMINATE ${leaks[0].value} LEAK` : "Maintain Discipline";
  
  const rules = [
    "Maximum 3 trades per day",
    "Stop after 2 consecutive losses",
    "No runner in range or chop",
    "1H must align with 15M trigger"
  ];
  
  if (summary.winRate < 0.45) rules.push("Reduce position size by 50%");
  if (leaks.find(l => l.category === 'symbol' && l.value.includes('BTC'))) rules.push("Restrict BTC trading to A+ setups only");

  return { 
    verdict: summary.netPnL >= 0 ? "Green period, but watch for over-confidence leaks." : "Red period. Prioritize capital preservation over recovery.",
    protocol,
    focus,
    actionPlan: rules,
    modeRules: [
      { mode: "Runner Mode", trigger: "Impulse + Structure Break", action: "Trail 25% for 3:1" },
      { mode: "Scalp Mode", trigger: "Range/Chop", action: "Exit 100% at next level" },
      { mode: "Defense Mode", trigger: "Win rate < 45%", action: "Tighten stop, half risk" }
    ]
  };
}
function createWeek({ week, dateRange, trades, screenshots = {}, status = "reviewed", sourceType = "sample", brokerNet = null, coach = null }) {
  const summary = summarize(trades);
  return { id: makeId(), week, dateRange: dateRange || `Week ${week}`, status, sourceType, brokerNet, createdAt: new Date().toISOString(), screenshots, trades, summary, coach: coach || buildCoach(summary) };
}
const WEEK_1 = createWeek({ week: 1, dateRange: "May 1 to 8, 2026", trades: RAW_WEEK_1.map(tradeFromArray), brokerNet: 39.86, coach: { ...buildCoach(summarize(RAW_WEEK_1.map(tradeFromArray))), verdict: "Green week, but not clean yet. Gold showed edge while BTC created drag. Main weakness: overtrading and counter-structure entries." } });

function parseCsvLine(line) { const values = []; let current = ""; let quoted = false; for (const ch of line) { if (ch === '"') quoted = !quoted; else if (ch === "," && !quoted) { values.push(current.trim()); current = ""; } else current += ch; } values.push(current.trim()); return values; }
function parseCsv(text) { const lines = String(text || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean); if (lines.length < 2) return []; const headers = parseCsvLine(lines[0]); return lines.slice(1).map((line, index) => { const vals = parseCsvLine(line); const row = {}; headers.forEach((h, i) => { row[h] = vals[i] || ""; }); return normalizeTrade(row, index); }); }
function tradesToCsv(trades) { const headers = ["id", "dateTime", "symbol", "instrument", "dir", "lot", "entry", "exit", "pnl", "high", "low", "grade", "setupType", "hold", "tag", "h1", "m15", "mfe", "mae", "exitEfficiency"]; return [headers.join(","), ...(trades || []).map((t) => { const mm = getMfeMae(t); return headers.map((h) => h === "mfe" ? mm.mfe ?? "" : h === "mae" ? mm.mae ?? "" : h === "exitEfficiency" ? mm.efficiency ?? "" : t[h] ?? "").join(","); })].join("\n"); }
function downloadText(filename, text, type = "text/plain") { const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
async function uploadFileToServer(file) { const formData = new FormData(); formData.append('file', file); const res = await fetch('/api/upload', { method: 'POST', body: formData }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Upload failed'); return data.url; }
async function analyzeWeekWithBackend(payload) { const res = await fetch("/api/analyze-week", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); if (!res.ok) throw new Error("Analyzer endpoint failed"); return res.json(); }
function buildWeekFromPayload(payload, fallbackWeekNumber, screenshots) { const raw = Array.isArray(payload.trades) ? payload.trades : []; return createWeek({ week: n(payload.week, fallbackWeekNumber), dateRange: payload.dateRange || `Week ${fallbackWeekNumber}`, trades: raw.map(normalizeTrade), screenshots, sourceType: "screenshot", brokerNet: payload.brokerNet ?? null, coach: payload.coach || null }); }

function KpiCard({ label, value, helper, tone = "neutral" }) { const tones = { green: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300", red: "border-rose-500/30 bg-rose-500/5 text-rose-300", amber: "border-amber-500/30 bg-amber-500/5 text-amber-300", blue: "border-sky-500/30 bg-sky-500/5 text-sky-300", neutral: "border-slate-700 bg-slate-900/60 text-slate-100" }; return <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.neutral}`}><div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</div><div className="mt-2 text-lg font-black leading-tight break-words sm:text-xl xl:text-2xl">{value}</div>{helper && <div className="mt-1 text-[10px] text-slate-500">{helper}</div>}</div>; }
function UploadBox({ label, value, onChange, required }) { const inputRef = useRef(null); return <button type="button" onClick={() => inputRef.current?.click()} className="group flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-4 text-center transition hover:border-amber-400 hover:bg-slate-900"><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const url = await uploadFileToServer(file); onChange({ name: file.name, dataUrl: url }); }} />{value?.dataUrl ? <img src={value.dataUrl} alt={label} className="mb-3 h-24 w-full rounded-xl object-cover opacity-90" /> : <div className="mb-3 text-4xl">📷</div>}<div className="text-sm font-bold text-slate-200">{label}</div><div className="mt-1 text-xs text-slate-500">{value?.name || (required ? "Required" : "Optional")}</div></button>; }
function getWeekdayName(dateStr) {
  try {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const d = new Date(dateStr + "T00:00:00");
    return days[d.getDay()];
  } catch {
    return "";
  }
}

function WeekPill({ week, active, onClick }) { 
  const summary = week?.summary || {};
  const label = week?.day 
    ? week.day 
    : week?.week 
      ? `Week ${week.week}` 
      : week?.month 
        ? (week?.year ? `${week.month} ${week.year}` : week.month) 
        : "MASTER PORTFOLIO";
  const sublabel = week?.day 
    ? getWeekdayName(week.day)
    : week?.week 
      ? week.dateRange 
      : week?.month 
        ? `${week.weeks?.length || 0} weeks recorded` 
        : `Aggregated across all ${week?.weeks?.length || ""} weeks`;
  const tradesCount = summary.tradesCount || summary.trades || 0;
  const winRate = summary.winRate || 0;
  return (
    <button onClick={onClick} className={`w-full rounded-2xl border p-3 text-left transition ${active ? "border-amber-400 bg-amber-500/10" : "border-slate-800 bg-slate-950 hover:border-slate-600"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
          <div className="mt-1 text-sm font-semibold text-slate-200">{sublabel}</div>
        </div>
        <div className={`text-right text-sm font-black ${pnlColor(summary.netPnL)}`}>{fmtMoney(summary.netPnL)}</div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, Math.max(0, n(winRate) * 100))}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-slate-500">{fmtPct(winRate)} win rate • {tradesCount} trades</div>
    </button>
  );
}
function Panel({ title, children, right }) { return <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5"><div className="mb-4 flex items-center justify-between gap-3"><div className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{title}</div>{right && <div className="font-black">{right}</div>}</div>{children}</div>; }
function Info({ text, value, good, bad }) { return <div className="rounded-2xl bg-slate-900 p-3 text-sm text-slate-400">{text}: <span className={`font-bold ${good ? "text-emerald-300" : bad ? "text-rose-300" : "text-slate-200"}`}>{value}</span></div>; }
function TrafficLight({ week }) { return <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4"><div className="text-xs uppercase tracking-[0.22em] text-emerald-300">🟢 Tradeable</div><div className="mt-2 font-bold text-emerald-100">{week.summary.xauPnL > 0 ? "Gold, A setups only" : "Only clearest setups"}</div></div><div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4"><div className="text-xs uppercase tracking-[0.22em] text-amber-300">🟡 Caution</div><div className="mt-2 font-bold text-amber-100">{week.summary.trades > 15 ? "Overtrading risk active" : "Range/chop requires caution"}</div></div><div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4"><div className="text-xs uppercase tracking-[0.22em] text-rose-300">🔴 Blocked</div><div className="mt-2 font-bold text-rose-100">{week.summary.btcPnL < 0 ? "BTC blocked until chart confirms edge" : "No revenge trade after rule breach"}</div></div></div>; }
function Heatmap({ trades }) { const colors = { A: "bg-emerald-500", B: "bg-lime-500", C: "bg-amber-400", D: "bg-orange-500", F: "bg-rose-500", "N/A": "bg-slate-500" }; return <Panel title="Trade Quality Heatmap"><div className="grid grid-cols-6 gap-2 md:grid-cols-9 xl:grid-cols-12">{(trades || []).map((t) => <div key={t.id} title={`Trade ${t.id} • ${t.grade} • ${t.tag}`} className={`rounded-xl p-3 text-center text-sm font-black text-slate-950 ${colors[t.grade] || "bg-slate-400"}`}>{t.grade}</div>)}</div><div className="mt-3 text-sm text-slate-500">More green means cleaner execution. Orange/red shows weak selection or discipline leaks.</div></Panel>; }
// MistakeLeaderboard is imported from "./components/agents/AnalyticsAgent"
function ReconciliationPanel({ week }) { const brokerNet = week.brokerNet == null ? week.summary.netPnL : n(week.brokerNet); const diff = week.summary.netPnL - brokerNet; const balanced = Math.abs(diff) < 0.01; return <Panel title="Reconciliation Panel" right={<span className={balanced ? "text-emerald-300" : "text-rose-300"}>{balanced ? "BALANCED" : "MISMATCH"}</span>}><div className="grid gap-3 md:grid-cols-6"><KpiCard label="Gross Profit" value={fmtMoney(week.summary.grossProfit)} tone="green"/><KpiCard label="Gross Loss" value={fmtMoney(week.summary.grossLoss)} tone="red"/><KpiCard label="App Net" value={fmtMoney(week.summary.netPnL)} tone={week.summary.netPnL >= 0 ? "green":"red"}/><KpiCard label="Broker Net" value={fmtMoney(brokerNet)} tone={brokerNet >= 0 ? "green":"red"}/><KpiCard label="Difference" value={fmtMoney(diff)} tone={balanced ? "green":"red"}/><KpiCard label="Confidence" value={week.sourceType === "csv" ? "High" : week.sourceType === "screenshot" ? "Medium" : "Manual"} helper={week.sourceType === "csv" ? "CSV source" : "Verify with broker"} tone={week.sourceType === "csv" ? "green":"amber"}/></div></Panel>; }
function CoachVerdictBar({ week, overtradeCount, abRate }) { let verdict = "TRADE NORMALLY", tone = "border-emerald-500/30 bg-emerald-500/5 text-emerald-200", reason = "Process is acceptable. Keep risk controlled."; if (week.summary.coachScore < 55 || week.summary.netPnL < 0 || overtradeCount > 10) { verdict = "STOP & REVIEW"; tone = "border-rose-500/30 bg-rose-500/5 text-rose-200"; reason = "Capital protection first. Review mistakes before another live session."; } else if (week.summary.coachScore < 75 || overtradeCount > 0 || abRate < 0.6) { verdict = "REDUCE RISK"; tone = "border-amber-500/30 bg-amber-500/5 text-amber-200"; reason = "Edge exists, but discipline is not clean enough to scale."; } return <div className={`rounded-3xl border p-5 ${tone}`}><div className="text-xs uppercase tracking-[0.25em] text-slate-500">Coach Verdict</div><div className="mt-2 text-3xl font-black">{verdict}</div><div className="mt-2 text-sm text-slate-300">{reason}</div></div>; }
// SetupLibrary is imported from "./components/agents/AnalyticsAgent"
function DailyDiscipline({ trades }) { const days = useMemo(() => { const map = {}; (trades || []).forEach((t)=>{ const key = (t.dateTime || "Undated").split(" ")[0] || "Undated"; if(!map[key]) map[key]={day:key,trades:0,wins:0,losses:0,pnl:0}; map[key].trades++; map[key].pnl += n(t.pnl); if(n(t.pnl)>0) map[key].wins++; if(n(t.pnl)<0) map[key].losses++; }); return Object.values(map).map((d)=>({ ...d, status: d.losses >=2 || d.trades >=3 ? "STOP" : d.wins >= 2 ? "LOCK PROFIT" : "CONTINUE", reason: d.losses >=2 ? "2 losses reached" : d.trades>=3 ? "3 trades reached" : d.wins>=2 ? "2 wins reached" : "Rules still clean" })); }, [trades]); return <Panel title="Daily Discipline Dashboard"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{days.map((d)=><div key={d.day} className="rounded-2xl bg-slate-900 p-4"><div className="flex justify-between gap-3"><div><div className="text-xs uppercase tracking-wider text-slate-500">{d.day}</div><div className="mt-1 font-bold text-slate-100">{d.trades} trades • {d.wins}W / {d.losses}L</div></div><div className={`rounded-xl px-3 py-2 text-xs font-black ${d.status === "STOP" ? "bg-rose-500/10 text-rose-300" : d.status === "LOCK PROFIT" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{d.status}</div></div><div className={`mt-3 text-xl font-black ${pnlColor(d.pnl)}`}>{fmtMoney(d.pnl)}</div><div className="mt-1 text-xs text-slate-500">{d.reason}</div></div>)}</div></Panel>; }
function ExitIntelligence({ trades }) { const stats = useMemo(()=>{ const c=(trades||[]).map((trade)=>({trade,mm:getMfeMae(trade)})).filter((x)=>x.mm.efficiency !== null); return { total:c.length, closedEarly:c.filter((x)=>x.mm.efficiency < .45).length, good:c.filter((x)=>x.mm.efficiency >= .45 && x.mm.efficiency <= .85).length, held:c.filter((x)=>x.mm.efficiency < 0 && n(x.trade.pnl)<0).length, avg:c.length ? c.reduce((s,x)=>s+x.mm.efficiency,0)/c.length : null}; },[trades]); return <Panel title="Exit Intelligence"><div className="grid gap-3 md:grid-cols-4"><KpiCard label="Reviewed Exits" value={String(stats.total)} helper="MFE/MAE available"/><KpiCard label="Closed Early" value={String(stats.closedEarly)} helper="Captured too little" tone={stats.closedEarly ? "amber":"green"}/><KpiCard label="Good Exits" value={String(stats.good)} helper="Reasonable capture" tone={stats.good ? "green":"neutral"}/><KpiCard label="Held Too Long" value={String(stats.held)} helper={stats.avg == null ? "Need high/low data" : `Avg efficiency ${fmtPct(stats.avg)}`} tone={stats.held ? "red":"neutral"}/></div></Panel>; }
function SixMonthProgress({ weeks }) { const stats = useMemo(()=>{ const best=weeks.reduce((a,b)=>n(b.summary.netPnL)>n(a.summary.netPnL)?b:a,weeks[0]); const worst=weeks.reduce((a,b)=>n(b.summary.netPnL)<n(a.summary.netPnL)?b:a,weeks[0]); const green=weeks.filter((w)=>n(w.summary.netPnL)>=0).length; const avg=weeks.reduce((s,w)=>s+n(w.summary.coachScore),0)/weeks.length; return {best,worst,green,consistency:green/weeks.length,avg};},[weeks]); const maxAbs=Math.max(1,...weeks.map((w)=>Math.abs(n(w.summary.netPnL)))); return <Panel title="6-Month Progress Dashboard"><div className="grid gap-3 md:grid-cols-3"><KpiCard label="Best Week" value={fmtMoney(stats.best.summary.netPnL)} helper={`Week ${stats.best.week}`} tone="green"/><KpiCard label="Worst Week" value={fmtMoney(stats.worst.summary.netPnL)} helper={`Week ${stats.worst.week}`} tone="red"/><KpiCard label="Consistency" value={fmtPct(stats.consistency)} helper={`Avg score ${stats.avg.toFixed(0)}/100`} tone="amber"/></div><div className="mt-5 space-y-3">{weeks.map((w)=><div key={w.id} className="grid grid-cols-[70px_1fr_90px_70px] items-center gap-3 text-sm"><div className="font-bold text-slate-400">W{w.week}</div><div className="h-3 overflow-hidden rounded-full bg-slate-800"><div className={n(w.summary.netPnL) >= 0 ? "h-full bg-emerald-400" : "h-full bg-rose-400"} style={{width:`${Math.max(4,Math.abs(n(w.summary.netPnL))/maxAbs*100)}%`}}/></div><div className={`text-right font-black ${pnlColor(w.summary.netPnL)}`}>{fmtMoney(w.summary.netPnL)}</div><div className="text-right text-slate-500">{Math.round(w.summary.coachScore)}/100</div></div>)}</div></Panel>; }
// PatternHunter is imported from "./components/agents/AnalyticsAgent"


function ScreenshotPanel({ week }) { const items=[["P&L Screenshot", week.screenshots?.pnl],["1H Chart", week.screenshots?.chartH1],["15M Chart", week.screenshots?.chartM15]]; return <Panel title="Screenshot Evidence"><div className="grid gap-4 md:grid-cols-3">{items.map(([label,image])=><div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><div className="mb-2 text-sm font-semibold text-slate-200">{label}</div>{image?.dataUrl ? <img src={image.dataUrl} alt={label} className="h-44 w-full rounded-xl object-cover"/> : <div className="flex h-44 items-center justify-center rounded-xl bg-slate-950 text-sm text-slate-600">No image stored</div>}<div className="mt-2 text-xs text-slate-500">{image?.dataUrl ? "Processed / stored" : "Missing"}</div></div>)}</div></Panel>; }
function NextTradeChecklist({ values, onChange }) { const items=[["h1","1H direction is clear"],["m15","15M confirms the entry"],["level","Price is at a key level"],["rr","Reward/risk is at least 1.5R"],["limit","Fewer than 3 trades today"],["calm","Emotion is calm, not revenge"]]; const yes=items.filter(([k])=>values[k]===true).length; const no=items.filter(([k])=>values[k]===false).length; const allowed=yes>=5 && no===0; return <div className={`rounded-3xl border p-5 ${allowed ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}><div className="mb-4 flex justify-between gap-3"><div><div className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Next Trade Checklist</div><div className="mt-1 text-xs text-slate-500">Pre-trade permission gate.</div></div><div className={`rounded-xl px-4 py-2 text-sm font-black ${allowed ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{allowed ? "✅ TRADE ALLOWED" : "❌ NO TRADE"}</div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map(([key,label])=><div key={key} className="rounded-2xl bg-slate-900 p-4"><div className="font-semibold text-slate-200">{label}</div><div className="mt-3 flex gap-2"><button onClick={()=>onChange(key,true)} className={`rounded-xl px-3 py-2 text-xs font-black ${values[key]===true ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>YES</button><button onClick={()=>onChange(key,false)} className={`rounded-xl px-3 py-2 text-xs font-black ${values[key]===false ? "bg-rose-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>NO</button></div></div>)}</div><div className="mt-4 text-sm text-slate-400">Score: {yes}/6. Need 5 yes answers and zero hard no answers.</div></div>; }


function TradingViewChart({ symbol, interval, label }) {
  const containerRef = useRef(null);
  const tvSymbol = tradingViewSymbol(symbol);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("light"));
    const obs = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains("light"));
    });
    obs.observe(document.documentElement, { attributes: true });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "calc(100% - 28px)";
    widget.style.width = "100%";
    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright text-[10px] text-slate-500";
    copyright.innerHTML = `<a href="${tradingViewLink(symbol)}" rel="noopener nofollow" target="_blank" class="text-amber-300">${tvSymbol}</a> by TradingView`;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval,
      timezone: "Etc/UTC",
      theme: isLight ? "light" : "dark",
      style: "1",
      locale: "en",
      backgroundColor: isLight ? "#ffffff" : "rgba(2, 6, 23, 1)",
      gridColor: isLight ? "rgba(226, 232, 240, 0.8)" : "rgba(51, 65, 85, 0.45)",
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com"
    });
    containerRef.current.appendChild(widget);
    containerRef.current.appendChild(copyright);
    containerRef.current.appendChild(script);
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [tvSymbol, interval, symbol, isLight]);

  return (
    <div className="min-h-[420px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</div>
          <div className="mt-1 text-sm font-bold text-slate-200">{tvSymbol}</div>
        </div>
        <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-amber-300">{interval}</div>
      </div>
      <div ref={containerRef} className="tradingview-widget-container h-[370px] w-full" />
    </div>
  );
}
export default function FITPipsTradingCoachApp() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  const [user, setUser] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState("overall"); // overall as default to show big picture first
  const [tab, setTab] = useState("dashboard");
  const [selectedTradeId, setSelectedTradeId] = useState(null);
  const [tradeFilter, setTradeFilter] = useState("All");
  const [advancedFilters, setAdvancedFilters] = useState({ symbol: "All", dir: "All", session: "All", timeFrom: "", timeTo: "", dateFrom: "", dateTo: "" });
  const [showDateTimeFilters, setShowDateTimeFilters] = useState(false);

  // Custom FITpips extensions state
  const [portfoliosList, setPortfoliosList] = useState([]);
  const [activePortfolioId, setActivePortfolioId] = useState("");
  const [playbookSetups, setPlaybookSetups] = useState([]);
  const [shareTokensList, setShareTokensList] = useState([]);
  const [showPortfolioSettings, setShowPortfolioSettings] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Daily Journal state
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalDate, setJournalDate] = useState("");
  const [journalRating, setJournalRating] = useState(5);
  const [journalMood, setJournalMood] = useState("🧘 Calm");
  const [journalNotes, setJournalNotes] = useState("");
  const [journalLoading, setJournalLoading] = useState(false);
  const [dailyJournalsList, setDailyJournalsList] = useState([]);
  
  // New behavioral operating system states
  const [allDailyReviewsList, setAllDailyReviewsList] = useState([]);
  const [allPreTradeCheckinsList, setAllPreTradeCheckinsList] = useState([]);
  const [allPreMarketPlansList, setAllPreMarketPlansList] = useState([]);
  const [activeRiskSettings, setActiveRiskSettings] = useState(null);
  const [showEquityChart, setShowEquityChart] = useState(false);

  // Portfolio Form fields
  const [newPortName, setNewPortName] = useState("");
  const [newPortBroker, setNewPortBroker] = useState("Standard");
  const [newPortType, setNewPortType] = useState("Live");
  const [newPortBalance, setNewPortBalance] = useState("10000");

  // Playbook Form fields
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [newPlaybookName, setNewPlaybookName] = useState("");
  const [newPlaybookDesc, setNewPlaybookDesc] = useState("");
  const [newPlaybookRules, setNewPlaybookRules] = useState(""); // newline separated

  // MT5 Sync Form fields
  const [syncMethod, setSyncMethod] = useState("file"); // "file" | "mt5"
  const [mt5Login, setMt5Login] = useState("");
  const [mt5Password, setMt5Password] = useState("");
  const [mt5Server, setMt5Server] = useState("");
  const [mt5Path, setMt5Path] = useState("");
  const [mt5AutoSync, setMt5AutoSync] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [autoSyncMessage, setAutoSyncMessage] = useState("");

  const loadData = async (portId = null) => {
    try {
      setIsLoading(true);
      const ports = await getPortfolios();
      setPortfoliosList(ports);
      
      const currentPort = ports.find(p => p.id === portId) || ports[0];
      if (currentPort) {
        setActivePortfolioId(currentPort.id);
        const dbWeeks = await getWeeks(currentPort.id);
        setWeeks(dbWeeks);
        
        const risk = await getRiskSettings(currentPort.id);
        setActiveRiskSettings(risk);
      }
      
      const playbooks = await getPlaybookSetups();
      setPlaybookSetups(playbooks);

      const tokens = await getShareTokens();
      setShareTokensList(tokens);

      const journals = await getDailyJournals();
      setDailyJournalsList(journals || []);

      // Fetch new behavioral coaches records
      const plans = await getAllPreMarketPlans();
      setAllPreMarketPlansList(plans || []);

      const reviews = await getAllDailyReviews();
      setAllDailyReviewsList(reviews || []);

      const checkins = await getAllPreTradeCheckins();
      setAllPreTradeCheckinsList(checkins || []);
      
      setIsLoading(false);
    } catch (e) {
      console.error("Failed to load core dashboard data:", e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/me")
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          window.location.href = "/landing";
          return;
        }
        setUser(data.user);
        loadData();
      })
      .catch(() => {
        window.location.href = "/landing";
      });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMt5Login(localStorage.getItem("mt5_login") || "");
      setMt5Server(localStorage.getItem("mt5_server") || "");
      setMt5Path(localStorage.getItem("mt5_path") || "");
      setMt5Password(localStorage.getItem("mt5_password") || "");
      setMt5AutoSync(localStorage.getItem("mt5_auto_sync") === "true");
    }
  }, []);

  useEffect(() => {
    const triggerAutoSync = async () => {
      if (typeof window === "undefined" || !activePortfolioId || isLoading) return;
      const enabled = localStorage.getItem("mt5_auto_sync") === "true";
      if (!enabled) return;

      const login = localStorage.getItem("mt5_login");
      const server = localStorage.getItem("mt5_server");
      const password = localStorage.getItem("mt5_password");
      const path = localStorage.getItem("mt5_path");
      const lastSyncStr = localStorage.getItem("mt5_last_sync_time");

      if (!login || !server || !password) return;

      // Sync if last sync was > 12 hours ago
      const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
      const twelveHours = 12 * 60 * 60 * 1000;
      if (Date.now() - lastSync < twelveHours) {
        console.log("MT5 Auto-Sync: Already synced recently.");
        return;
      }

      setAutoSyncing(true);
      setAutoSyncMessage("🔄 MetaTrader 5 Auto-Sync active...");
      try {
        const res = await fetch("/api/broker/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            login,
            password,
            server,
            terminalPath: path,
            portfolioId: activePortfolioId,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("mt5_last_sync_time", Date.now().toString());
          setAutoSyncMessage(`✅ Auto-synced! ${data.message || ""}`);
          const freshData = await getWeeks(activePortfolioId);
          setWeeks(freshData);
          setTimeout(() => setAutoSyncMessage(""), 5000);
        } else {
          setAutoSyncMessage(`⚠️ Auto-sync failed: ${data.error || "Connection error"}`);
          setTimeout(() => setAutoSyncMessage(""), 8000);
        }
      } catch (err) {
         setAutoSyncMessage("⚠️ Auto-sync error");
         setTimeout(() => setAutoSyncMessage(""), 5000);
      } finally {
        setAutoSyncing(false);
      }
    };

    triggerAutoSync();
  }, [activePortfolioId, isLoading]);

  useEffect(() => {
    if (tab === "dashboard" || tab === "approval" || tab === "risk") {
      getAllPreMarketPlans().then(plans => setAllPreMarketPlansList(plans || [])).catch(console.error);
      getAllPreTradeCheckins().then(checkins => setAllPreTradeCheckinsList(checkins || [])).catch(console.error);
      if (activePortfolioId) {
        getRiskSettings(activePortfolioId).then(risk => setActiveRiskSettings(risk)).catch(console.error);
      }
      getAllDailyReviews().then(reviews => setAllDailyReviewsList(reviews || [])).catch(console.error);
    }
  }, [tab, activePortfolioId]);

  const handlePortfolioChange = async (portId) => {
    setActivePortfolioId(portId);
    try {
      setIsLoading(true);
      const dbWeeks = await getWeeks(portId);
      setWeeks(dbWeeks);
      const risk = await getRiskSettings(portId);
      setActiveRiskSettings(risk);
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    if (!newPortName.trim()) return;
    try {
      const port = await createPortfolio(newPortName, newPortBroker, newPortType, newPortBalance);
      setNewPortName("");
      await loadData(port.id);
    } catch (err) {
      alert(err.message || "Failed to create portfolio");
    }
  };

  const handleDeletePortfolio = async (portId) => {
    if (!confirm("Are you sure you want to delete this portfolio and all its trades?")) return;
    try {
      await deletePortfolio(portId);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to delete portfolio");
    }
  };

  const handleMt5Sync = async (e) => {
    e.preventDefault();
    if (!mt5Login || !mt5Password || !mt5Server) {
      alert("Please enter Login, Password, and Server.");
      return;
    }
    setBusy(true);
    setStatus("🔗 Connecting to MetaTrader 5... Auto-detecting your Exness terminal. This may take up to 30 seconds if MT5 needs to launch.");
    try {
      const res = await fetch("/api/broker/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: mt5Login,
          password: mt5Password,
          server: mt5Server,
          terminalPath: mt5Path,
          portfolioId: activePortfolioId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sync broker account.");
      }
      const balanceStr = data.balance ? ` | Account Balance: $${Number(data.balance).toFixed(2)} ${data.currency || 'USD'}` : '';
      setStatus(`✅ ${data.message || `Synced ${data.count || 0} trades successfully!`}${balanceStr}`);
      
      if (typeof window !== "undefined") {
        localStorage.setItem("mt5_login", mt5Login);
        localStorage.setItem("mt5_server", mt5Server);
        localStorage.setItem("mt5_path", mt5Path);
        localStorage.setItem("mt5_password", mt5Password);
        localStorage.setItem("mt5_auto_sync", mt5AutoSync ? "true" : "false");
        localStorage.setItem("mt5_last_sync_time", Date.now().toString());
      }

      const freshData = await getWeeks(activePortfolioId);
      setWeeks(freshData);
      setTimeout(() => {
        setUploadOpen(false);
        setStatus("");
      }, 3000);
    } catch (err) {
      setStatus("");
      alert(err.message || "An error occurred during broker sync.");
    } finally {
      setBusy(false);
    }
  };

  const handleSavePlaybook = async (e) => {
    e.preventDefault();
    if (!newPlaybookName.trim()) return;
    const rulesArray = newPlaybookRules.split("\n").map(r => r.trim()).filter(Boolean);
    try {
      await savePlaybookSetup({
        name: newPlaybookName,
        description: newPlaybookDesc,
        rules: rulesArray
      });
      setNewPlaybookName("");
      setNewPlaybookDesc("");
      setNewPlaybookRules("");
      setShowPlaybookModal(false);
      const playbooks = await getPlaybookSetups();
      setPlaybookSetups(playbooks);
    } catch (err) {
      alert("Failed to save playbook setup");
    }
  };

  const handleDeletePlaybook = async (id) => {
    if (!confirm("Delete this playbook setup?")) return;
    try {
      await deletePlaybookSetup(id);
      const playbooks = await getPlaybookSetups();
      setPlaybookSetups(playbooks);
    } catch (err) {
      alert("Failed to delete playbook");
    }
  };

  const handleOpenDailyJournal = async (date) => {
    setJournalDate(date);
    setJournalOpen(true);
    setJournalLoading(true);
    try {
      const entry = await getDailyJournal(date);
      if (entry) {
        setJournalRating(entry.rating || 5);
        setJournalMood(entry.mood || "🧘 Calm");
        setJournalNotes(entry.notes || "");
      } else {
        setJournalRating(5);
        setJournalMood("🧘 Calm");
        setJournalNotes("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setJournalLoading(false);
    }
  };

  const handleSaveDailyJournal = async (e) => {
    e.preventDefault();
    try {
      await saveDailyJournal({
        date: journalDate,
        rating: journalRating,
        mood: journalMood,
        notes: journalNotes
      });
      setJournalOpen(false);
      const journals = await getDailyJournals();
      setDailyJournalsList(journals || []);
    } catch (err) {
      alert("Failed to save daily journal");
    }
  };

  const handleGenerateShareToken = async () => {
    try {
      await generateShareToken(activePortfolioId);
      const tokens = await getShareTokens();
      setShareTokensList(tokens);
    } catch (e) {
      alert("Failed to generate share link");
    }
  };

  const handleRevokeShareToken = async (token) => {
    if (!confirm("Revoke this share link? It will stop working immediately.")) return;
    try {
      await revokeShareToken(token);
      const tokens = await getShareTokens();
      setShareTokensList(tokens);
    } catch (e) {
      alert("Failed to revoke share link");
    }
  };

  // Reset index when switching views to avoid out-of-bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [viewMode]);

  const [nextChecklist, setNextChecklist] = useState({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  // Derived Data
  const allSymbols = useMemo(() => {
    const symbols = weeks.flatMap(w => (w.trades || []).map(t => t.symbol));
    return [...new Set(symbols)].filter(Boolean);
  }, [weeks]);

  const filteredWeeks = useMemo(() => {
    return weeks.map(w => {
      let list = w.trades || [];
      if (tradeFilter !== "All") {
        if (tradeFilter === "Gold") list = list.filter(t => t.instrument === "Gold" || (t.symbol||'').toUpperCase().includes('XAU') || (t.symbol||'').toUpperCase().includes('GOLD'));
        else if (tradeFilter === "BTC") list = list.filter(t => t.instrument === "Bitcoin" || (t.symbol||'').toUpperCase().includes('BTC'));
        else if (tradeFilter === "Nasdaq") list = list.filter(t => t.instrument === "Nasdaq" || (t.symbol||'').toUpperCase().includes('NAS') || (t.symbol||'').toUpperCase().includes('US100') || (t.symbol||'').toUpperCase().includes('USTEC'));
        else if (tradeFilter === "Forex") list = list.filter(t => t.instrument !== "Gold" && t.instrument !== "Bitcoin" && t.instrument !== "Nasdaq" && !['XAU','BTC','NAS','US100','USTEC','GOLD'].some(keyword => (t.symbol||'').toUpperCase().includes(keyword)));
        else if (tradeFilter === "Wins") list = list.filter(t => n(t.pnl) > 0);
        else if (tradeFilter === "Losses") list = list.filter(t => n(t.pnl) < 0);
        else if (tradeFilter === "A/B") list = list.filter(t => t.grade === "A" || t.grade === "B");
      }
      if (advancedFilters.symbol !== "All") list = list.filter(t => t.symbol === advancedFilters.symbol);
      if (advancedFilters.dir !== "All") list = list.filter(t => (t.dir || '').toLowerCase() === advancedFilters.dir.toLowerCase());
      if (advancedFilters.session !== "All") list = list.filter(t => t.session === advancedFilters.session);
      if (advancedFilters.dateFrom) list = list.filter(t => t.dateTime && normalizeDateTime(t.dateTime) >= advancedFilters.dateFrom);
      if (advancedFilters.dateTo) list = list.filter(t => t.dateTime && normalizeDateTime(t.dateTime) <= advancedFilters.dateTo + ' 23:59');
      if (advancedFilters.timeFrom) list = list.filter(t => {
        const time = (t.dateTime || '').split(' ')[1] || '';
        return time >= advancedFilters.timeFrom;
      });
      if (advancedFilters.timeTo) list = list.filter(t => {
        const time = (t.dateTime || '').split(' ')[1] || '';
        return time <= advancedFilters.timeTo;
      });
      const summary = summarize(list);
      const coach = buildCoach(summary);
      return {
        ...w,
        trades: list,
        summary,
        coach
      };
    });
  }, [weeks, tradeFilter, advancedFilters]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const allPortfolioTrades = useMemo(() => {
    return weeks.flatMap(w => w.trades || []);
  }, [weeks]);

  const activeDays = useMemo(() => {
    const dates = new Set();
    dates.add(todayStr);

    allPortfolioTrades.forEach(t => {
      if (t.dateTime) {
        const d = normalizeDateTime(t.dateTime).split(" ")[0];
        if (d && d.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dates.add(d);
        }
      }
    });

    allPreTradeCheckinsList.forEach(c => {
      if (c.date) dates.add(c.date);
    });

    allDailyReviewsList.forEach(r => {
      if (r.date) dates.add(r.date);
    });

    allPreMarketPlansList.forEach(p => {
      if (p.date) dates.add(p.date);
    });

    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [allPortfolioTrades, allPreTradeCheckinsList, allDailyReviewsList, allPreMarketPlansList, todayStr]);

  const daysList = useMemo(() => {
    return activeDays.map(dateStr => {
      const dayTrades = allPortfolioTrades.filter(t => {
        const tDate = normalizeDateTime(t.dateTime).split(" ")[0];
        return tDate === dateStr;
      });
      const summary = summarize(dayTrades);
      const coach = buildCoach(summary);
      return {
        id: dateStr,
        day: dateStr,
        trades: dayTrades,
        summary,
        coach
      };
    });
  }, [activeDays, allPortfolioTrades]);

  const activeDateForEcosystem = useMemo(() => {
    if (viewMode === "day") {
      return daysList[selectedIndex]?.day || todayStr;
    }
    return todayStr;
  }, [viewMode, selectedIndex, daysList, todayStr]);

  const todayPreTradeCheckin = useMemo(() => {
    return allPreTradeCheckinsList.find(c => c.date === activeDateForEcosystem) || null;
  }, [allPreTradeCheckinsList, activeDateForEcosystem]);

  const todayPreMarketPlan = useMemo(() => {
    return allPreMarketPlansList.find(p => p.date === activeDateForEcosystem) || null;
  }, [allPreMarketPlansList, activeDateForEcosystem]);

  const todayDailyReview = useMemo(() => {
    return allDailyReviewsList.find(r => r.date === activeDateForEcosystem) || null;
  }, [allDailyReviewsList, activeDateForEcosystem]);

  const months = useMemo(() => {
    const map = {};
    filteredWeeks.forEach(w => {
      const m = w.month || "Unknown";
      const year = w.year || 2026;
      const mKey = `${m} ${year}`;
      if (!map[mKey]) map[mKey] = { id: mKey, month: m, year: year, weeks: [], trades: [] };
      map[mKey].weeks.push(w);
      map[mKey].trades.push(...(w.trades || []));
    });
    return Object.values(map).map(m => ({ ...m, summary: summarize(m.trades), coach: buildCoach(summarize(m.trades)) }));
  }, [filteredWeeks]);

  const overallStats = useMemo(() => {
    const allTrades = filteredWeeks.flatMap(w => w.trades || []);
    return { trades: allTrades, summary: summarize(allTrades), coach: buildCoach(summarize(allTrades)) };
  }, [filteredWeeks]);

  const activeInitialBalance = useMemo(() => {
    return portfoliosList.find(p => p.id === activePortfolioId)?.initialBalance || 10000;
  }, [portfoliosList, activePortfolioId]);

  const currentViewData = useMemo(() => {
    if (viewMode === "overall") return overallStats;
    if (viewMode === "month") return months[selectedIndex] || months[0] || overallStats;
    if (viewMode === "day") return daysList[selectedIndex] || daysList[0] || overallStats;
    return filteredWeeks[selectedIndex] || filteredWeeks[0] || overallStats;
  }, [viewMode, selectedIndex, filteredWeeks, months, daysList, overallStats]);

  const selectedWeek = currentViewData; // Alias for compatibility with existing components

  const selectedWeekDropdownValue = useMemo(() => {
    if (viewMode === "week") {
      const activeWeek = filteredWeeks[selectedIndex] || filteredWeeks[0];
      return activeWeek ? (activeWeek.week || activeWeek.id) : "All";
    }
    return "All";
  }, [viewMode, selectedIndex, filteredWeeks]);

  const selectedMonthDropdownValue = useMemo(() => {
    if (viewMode === "month") {
      const activeMonth = months[selectedIndex] || months[0];
      return activeMonth ? (activeMonth.month || activeMonth.id) : "All";
    }
    return "All";
  }, [viewMode, selectedIndex, months]);

  const handleSelectWeekGlobal = (val) => {
    if (val === "All") {
      setViewMode("overall");
      setSelectedIndex(0);
    } else {
      setViewMode("week");
      const idx = filteredWeeks.findIndex(w => String(w.week || w.id) === String(val));
      if (idx !== -1) {
        setSelectedIndex(idx);
      }
    }
  };

  const handleSelectMonthGlobal = (val) => {
    if (val === "All") {
      setViewMode("overall");
      setSelectedIndex(0);
    } else {
      setViewMode("month");
      const idx = months.findIndex(m => String(m.month || m.id) === String(val));
      if (idx !== -1) {
        setSelectedIndex(idx);
      }
    }
  };

  const handleResetFiltersGlobal = () => {
    setTradeFilter("All");
    setAdvancedFilters({
      symbol: "All",
      dir: "All",
      session: "All",
      timeFrom: "",
      timeTo: "",
      dateFrom: "",
      dateTo: ""
    });
    setViewMode("overall");
    setSelectedIndex(0);
  };

  const filteredTrades = useMemo(() => {
    const list = [...(selectedWeek.trades || [])];
    list.sort((a, b) => {
      if (a.dateTime && b.dateTime) {
        return a.dateTime.localeCompare(b.dateTime);
      }
      return n(a.id) - n(b.id);
    });
    let cum = 0;
    const mapped = list.map(t => {
      cum += n(t.pnl);
      return { ...t, cumulative: cum };
    });
    return mapped.reverse(); // Latest trades first
  }, [selectedWeek]);

  const filteredSummary = useMemo(() => {
    return selectedWeek.summary || summarize([]);
  }, [selectedWeek]);

  const filteredCoach = useMemo(() => {
    return selectedWeek.coach || buildCoach(summarize([]));
  }, [selectedWeek]);



  const selectedTrade = useMemo(() => {
    const list = selectedWeek.trades || [];
    return list.find((trade) => String(trade.id) === String(selectedTradeId)) || list[0] || null;
  }, [selectedWeek, selectedTradeId]);

  useEffect(() => {
    const list = selectedWeek.trades || [];
    if (list.length && !list.some((trade) => String(trade.id) === String(selectedTradeId))) {
      setSelectedTradeId(list[0].id);
    }
  }, [selectedWeek, selectedTradeId]);

  const sessionStats = useMemo(() => {
    // Use the actual session values stored in the DB
    const map = { Asia: 0, London: 0, Overlap: 0, NY: 0 };
    const labels = { Asia: 'Asia', London: 'London', Overlap: 'London/NY Overlap', NY: 'New York' };
    (filteredTrades || []).forEach(t => { if (map[t.session] !== undefined) map[t.session] += n(t.pnl); });
    // Return with friendly labels for the UI
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [labels[k] || k, v]));
  }, [filteredTrades]);

  const dayStats = useMemo(() => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const map = {};
    (filteredTrades || []).forEach(t => {
      try {
        const dt = String(t.dateTime || '').replace(/\./g, '-').replace(/\s/, 'T');
        const d = days[new Date(dt).getDay()];
        if (d) map[d] = (map[d] || 0) + n(t.pnl);
      } catch {}
    });
    return map;
  }, [filteredTrades]);

  const handleUpdateTrade = async (tradeId, fields) => {
    let weekId = null;
    let targetTrade = null;
    for (const wk of weeks) {
      const found = wk.trades.find(t => String(t.id) === String(tradeId));
      if (found) {
        targetTrade = found;
        weekId = wk.id;
        break;
      }
    }
    if (!targetTrade || !weekId) {
      console.error("Trade or Week not found for update:", tradeId);
      return;
    }

    const updatedTradeForDb = {
      id: targetTrade.tradeId || targetTrade.tradeNum,
      ...fields
    };

    const updatedWeeks = weeks.map(wk => {
      if (wk.id !== weekId) return wk;
      const newTrades = wk.trades.map(t => {
        if (String(t.id) !== String(tradeId)) return t;
        return { ...t, ...fields };
      });
      const newSummary = summarize(newTrades);
      const newCoach = buildCoach(newSummary);
      return {
        ...wk,
        trades: newTrades,
        summary: newSummary,
        coach: newCoach
      };
    });

    setWeeks(updatedWeeks);

    try {
      const targetWeek = updatedWeeks.find(wk => wk.id === weekId);
      await updateWeekData(weekId, targetWeek.summary, targetWeek.coach, [updatedTradeForDb]);
      const freshWeeks = await getWeeks();
      if (freshWeeks && freshWeeks.length > 0) {
        setWeeks(freshWeeks);
      }
    } catch (err) {
      console.error("Error saving trade updates to DB:", err);
      alert("Failed to save changes. Reverting...");
      const freshWeeks = await getWeeks();
      if (freshWeeks && freshWeeks.length > 0) {
        setWeeks(freshWeeks);
      }
    }
  };

  const todayTrades = useMemo(() => {
    return allPortfolioTrades.filter(t => {
      const tDate = normalizeDateTime(t.dateTime).split(" ")[0];
      return tDate === activeDateForEcosystem;
    });
  }, [allPortfolioTrades, activeDateForEcosystem]);

  const todayStats = useMemo(() => {
    const count = todayTrades.length;
    const pnl = todayTrades.reduce((sum, t) => sum + n(t.pnl), 0);
    const consecutiveLosses = [...todayTrades]
      .sort((a, b) => (a.id || 0) - (b.id || 0))
      .reduce((streak, t) => {
        if (n(t.pnl) < 0) return streak + 1;
        if (n(t.pnl) > 0) return 0;
        return streak;
      }, 0);
    return { count, pnl, consecutiveLosses };
  }, [todayTrades]);

  const activeLock = useMemo(() => {
    if (!activeRiskSettings) return null;
    const now = new Date();
    
    // Check database lockActiveUntil
    if (activeRiskSettings.lockActiveUntil && new Date(activeRiskSettings.lockActiveUntil) > now) {
      return {
        type: "Database Lock",
        reason: activeRiskSettings.lockReason || "Exceeded drawdown or cooldown active.",
        until: new Date(activeRiskSettings.lockActiveUntil)
      };
    }

    // Check dynamic local limits based on todayStats
    if (todayStats.count >= (activeRiskSettings.maxTradesPerDay ?? 3)) {
      return {
        type: "Max Trades Limit Exceeded",
        reason: `Exceeded daily limit of ${activeRiskSettings.maxTradesPerDay ?? 3} trades. Go offline.`,
        until: new Date(new Date().setHours(23, 59, 59, 999))
      };
    }

    if (todayStats.pnl <= -(activeRiskSettings.maxDailyLoss ?? 500)) {
      return {
        type: "Daily Loss Limit Breached",
        reason: `Daily loss of $${Math.abs(todayStats.pnl).toFixed(2)} exceeded your limit of $${activeRiskSettings.maxDailyLoss ?? 500}.`,
        until: new Date(new Date().setHours(23, 59, 59, 999))
      };
    }

    if (todayStats.consecutiveLosses >= (activeRiskSettings.consecutiveLossesLimit ?? 2)) {
      const cooldownEnd = new Date(Date.now() + (activeRiskSettings.cooldownTimerMinutes ?? 30) * 60 * 1000);
      return {
        type: "Cooldown Timer Triggered",
        reason: `${todayStats.consecutiveLosses} consecutive losses logged. Mandatory ${activeRiskSettings.cooldownTimerMinutes ?? 30}-minute pause.`,
        until: cooldownEnd
      };
    }

    return null;
  }, [activeRiskSettings, todayStats]);

  const weeklyLosses = useMemo(() => {
    return (filteredTrades || []).filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);
  }, [filteredTrades]);

  const maxWeeklyRisk = activeRiskSettings?.maxWeeklyDrawdown || 1500;
  const weeklyRiskPct = maxWeeklyRisk > 0 ? (weeklyLosses / maxWeeklyRisk) * 100 : 0;
  const weeklyRiskStr = `$${weeklyLosses.toFixed(2)} / $${maxWeeklyRisk.toFixed(0)}`;

  const maxTradesLimit = activeRiskSettings?.maxTradesPerDay || 3;
  const tradesTodayStr = `${todayStats.count} / ${maxTradesLimit}`;

  const emotionalScoreStr = todayPreTradeCheckin ? `${todayPreTradeCheckin.readinessScore}%` : "Needs Check-in";

  const disciplineScoreStr = todayDailyReview ? `${todayDailyReview.disciplineScore}/100` : "Needs Review";

  const winRateStr = filteredSummary ? `${(filteredSummary.winRate * 100).toFixed(1)}%` : "0.0%";
  const expectancyVal = filteredSummary?.expectancy || 0;

  const currentSession = useMemo(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 0 && currentHour < 8) return "Asia";
    if (currentHour >= 8 && currentHour < 12) return "London";
    if (currentHour >= 12 && currentHour < 16) return "Overlap";
    if (currentHour >= 16 && currentHour < 21) return "New York";
    return "Late / Pause";
  }, []);

  const approvedInfo = useMemo(() => {
    if (activeLock) return { status: "LOCKED", tone: "red", reason: activeLock.reason };
    if (!todayPreMarketPlan) return { status: "NO PLAN", tone: "red", reason: "Pre-market plan is missing for today." };
    if (!todayPreTradeCheckin) return { status: "NO CHECK-IN", tone: "amber", reason: "Pre-trade emotional check-in required." };
    if (todayPreTradeCheckin.readinessScore < 50) return { status: "SUSPENDED", tone: "red", reason: "Cognitive readiness too low." };
    return { status: "APPROVED", tone: "green", reason: "All pre-trade gates satisfied." };
  }, [activeLock, todayPreMarketPlan, todayPreTradeCheckin]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400 font-bold">Loading Multi-Period Dashboard...</div>;

  return (
    <div className="h-screen overflow-y-auto bg-slate-950 text-slate-100 neural-ambient-bg relative">
      <div className="scanlines-overlay" />
      <div className="scanline-light" />
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-2xl shadow-lg shadow-amber-500/20">⚡</div>
            <div>
              <div className="text-lg font-black tracking-tight">FITpips Trading Coach</div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Advanced Multi-Period Analytics</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Portfolio Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase text-slate-500 hidden sm:inline">Portfolio:</span>
              <select 
                value={activePortfolioId} 
                onChange={e => handlePortfolioChange(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-black text-slate-200 outline-none focus:border-amber-400"
              >
                {portfoliosList.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.accountType})</option>
                ))}
              </select>
              <button 
                onClick={() => setShowPortfolioSettings(true)}
                className="rounded-xl border border-slate-800 bg-slate-900 p-2 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                title="Portfolio Settings"
              >
                ⚙️
              </button>
            </div>

            <div className="flex rounded-xl bg-slate-900 p-1">
              {["day", "week", "month", "overall"].map(m => (
                <button key={m} onClick={() => { setViewMode(m); setSelectedIndex(0); }} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${viewMode === m ? "bg-amber-400 text-slate-950" : "text-slate-500 hover:text-slate-200"}`}>{m}</button>
              ))}
            </div>
            <button 
              onClick={toggleTheme}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition flex items-center gap-1.5"
              title="Toggle Light/Dark Theme"
            >
              <span>{theme === "dark" ? "☀️" : "🌙"}</span>
              <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <button 
              onClick={() => setShowShareModal(true)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-700 hover:text-slate-100"
              title="Generate Mentor Share Link"
            >
              🔗 Share
            </button>
            <button onClick={() => window.print()} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-700 hover:text-slate-100">📄 Export PDF</button>
            <button onClick={() => setUploadOpen(true)} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-amber-300">＋ Add Data</button>
            <button onClick={async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/landing"; }} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-slate-400 hover:bg-slate-800 hover:text-slate-100">Sign Out</button>
          </div>
        </div>
      </header>

      {autoSyncMessage && (
        <div className="bg-amber-400/10 border-b border-amber-500/25 px-4 py-2 text-center text-xs font-bold text-amber-300 backdrop-blur-sm transition-all duration-300 animate-pulse">
          {autoSyncMessage}
        </div>
      )}

      {(() => {
        const isTechnicalTab = ["trades", "calendar", "analytics", "chartreview"].includes(tab);
        const mainClass = isTechnicalTab 
          ? "mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[285px_1fr]" 
          : "mx-auto max-w-5xl px-4 py-5 space-y-6";

        const activePeriodLabel = viewMode === "overall" 
          ? "All-Time" 
          : viewMode === "month" 
            ? (months[selectedIndex]?.month ? `${months[selectedIndex].month} ${months[selectedIndex].year}` : "Select Month") 
            : viewMode === "day"
              ? (daysList[selectedIndex]?.day ? `${daysList[selectedIndex].day} (${getWeekdayName(daysList[selectedIndex].day)})` : "Select Day")
              : (filteredWeeks[selectedIndex]?.week ? `Week ${filteredWeeks[selectedIndex].week}` : "Select Week");

        return (
          <main className={mainClass}>
            {isTechnicalTab && (
              <aside className="space-y-4 animate-in fade-in duration-300">
                <Panel title="Navigation">
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {viewMode === "overall" && (
                      <WeekPill week={overallStats} active={true} onClick={() => {}} />
                    )}
                    {viewMode === "day" && daysList.map((d, i) => (
                      <WeekPill key={d.id} week={d} active={selectedIndex === i} onClick={() => setSelectedIndex(i)} />
                    ))}
                    {viewMode === "month" && months.map((m, i) => (
                      <WeekPill key={m.id} week={m} active={selectedIndex === i} onClick={() => setSelectedIndex(i)} />
                    ))}
                    {viewMode === "week" && filteredWeeks.map((w, i) => (
                      <WeekPill key={w.id} week={w} active={selectedIndex === i} onClick={() => setSelectedIndex(i)} />
                    ))}
                  </div>
                </Panel>
                <Panel title="Global Filters">
                  <div className="space-y-4">
                    {/* Quick Filter Pills */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Categorization</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {["All", "Gold", "BTC", "Nasdaq", "Forex", "Wins", "Losses", "A/B"].map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setTradeFilter(f)}
                            className={`rounded-xl px-2 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all duration-150 ${
                              tradeFilter === f
                                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/10"
                                : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Symbol/Instrument */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Instrument</div>
                      <select 
                        value={advancedFilters.symbol || "All"} 
                        onChange={(e) => setAdvancedFilters(f => ({ ...f, symbol: e.target.value }))} 
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                      >
                        <option value="All">All Symbols</option>
                        {allSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Direction */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Direction</div>
                      <select 
                        value={advancedFilters.dir || "All"} 
                        onChange={(e) => setAdvancedFilters(f => ({ ...f, dir: e.target.value }))} 
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                      >
                        <option value="All">All Directions</option>
                        <option value="Buy">Buy (Long)</option>
                        <option value="Sell">Sell (Short)</option>
                      </select>
                    </div>

                    {/* Session */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Session</div>
                      <select 
                        value={advancedFilters.session || "All"} 
                        onChange={(e) => setAdvancedFilters(f => ({ ...f, session: e.target.value }))} 
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                      >
                        <option value="All">All Sessions</option>
                        <option value="Asia">Asia</option>
                        <option value="London">London</option>
                        <option value="Overlap">London/NY Overlap</option>
                        <option value="NY">New York</option>
                      </select>
                    </div>

                    {/* Collapsible Date/Time Section */}
                    <div className="border-t border-slate-900 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowDateTimeFilters(!showDateTimeFilters)}
                        className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-200 transition py-1"
                      >
                        <span>📅 Date & Time Limits</span>
                        <span>{showDateTimeFilters ? "▲" : "▼"}</span>
                      </button>

                      {showDateTimeFilters && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">Date From</div>
                            <input
                              type="date"
                              value={advancedFilters.dateFrom || ""}
                              onChange={(e) => setAdvancedFilters(f => ({ ...f, dateFrom: e.target.value }))}
                              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                            />
                          </div>
                          <div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">Date To</div>
                            <input
                              type="date"
                              value={advancedFilters.dateTo || ""}
                              onChange={(e) => setAdvancedFilters(f => ({ ...f, dateTo: e.target.value }))}
                              className="w-full rounded-xl border border-slate-800 bg-slate-955 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                            />
                          </div>
                          <div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">Time From</div>
                            <input
                              type="time"
                              value={advancedFilters.timeFrom || ""}
                              onChange={(e) => setAdvancedFilters(f => ({ ...f, timeFrom: e.target.value }))}
                              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                            />
                          </div>
                          <div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">Time To</div>
                            <input
                              type="time"
                              value={advancedFilters.timeTo || ""}
                              onChange={(e) => setAdvancedFilters(f => ({ ...f, timeTo: e.target.value }))}
                              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Reset button */}
                    <div className="border-t border-slate-900 pt-3">
                      <button
                        type="button"
                        onClick={handleResetFiltersGlobal}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-200 transition"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </div>
                </Panel>
              </aside>
            )}

            <section className="space-y-6 flex-1 min-w-0">
              {/* Back to Hub toolbar when inside detailed sub-agent views */}
              {tab !== "dashboard" && (
                <div className="flex items-center justify-between bg-zinc-950/60 border border-zinc-900 rounded-3xl px-6 py-4 backdrop-blur-md shadow-lg animate-in fade-in duration-300">
                  <button 
                    onClick={() => setTab("dashboard")} 
                    className="flex items-center gap-2 text-xs font-black uppercase text-amber-400 hover:text-amber-300 transition group"
                  >
                    <span className="text-sm transition group-hover:-translate-x-1">←</span>
                    <span>Return to Neuro-OS Hub</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Module: {tab}
                    </span>
                  </div>
                </div>
              )}

              {tab === "dashboard" && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  
                  {/* Period Navigator Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-zinc-950/40 border border-zinc-900 rounded-3xl px-6 py-4 backdrop-blur-sm shadow-md gap-3">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-200 uppercase tracking-wide">
                        FITpips Psychology Neuro-OS
                      </h2>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Core behavioral status for <strong className="text-slate-300">{activePeriodLabel}</strong>
                      </p>
                    </div>
                    
                    {viewMode !== "overall" && (
                      <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between bg-zinc-900/50 border border-zinc-850 px-3 py-1.5 rounded-2xl">
                        <button 
                          disabled={selectedIndex === 0}
                          onClick={() => setSelectedIndex(prev => Math.max(0, prev - 1))}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg transition"
                        >
                          ◀ Prev
                        </button>
                        <span className="text-[11px] font-black uppercase text-slate-200 px-2 min-w-[80px] text-center">
                          {viewMode === "month" 
                            ? `${months[selectedIndex]?.month || "Month"} ${months[selectedIndex]?.year || ""}`
                            : viewMode === "day"
                              ? (daysList[selectedIndex]?.day || "Select Day")
                              : `Week ${filteredWeeks[selectedIndex]?.week || "Week"}`}
                        </span>
                        <button 
                          disabled={selectedIndex === (viewMode === "month" ? months.length - 1 : viewMode === "day" ? daysList.length - 1 : filteredWeeks.length - 1)}
                          onClick={() => setSelectedIndex(prev => Math.min(viewMode === "month" ? months.length - 1 : viewMode === "day" ? daysList.length - 1 : filteredWeeks.length - 1, prev + 1))}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg transition"
                        >
                          Next ▶
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Primary Performance & Behavioral Mainframe */}
                  <div className="grid gap-5 md:grid-cols-4 bg-zinc-950/60 border border-zinc-900 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/[0.01] -z-10" />
                    
                    {/* KPI 1: Net P&L */}
                    <div className="flex flex-col justify-between space-y-2 border-r border-zinc-900/80 pr-4">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Net Realized P&L</span>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black tracking-tight filter drop-shadow-[0_0_12px_rgba(16,185,129,0.2)] ${pnlColor(filteredSummary?.netPnL || 0)}`}>
                          {fmtMoney(filteredSummary?.netPnL || 0)}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500">Gross Return on Capital</span>
                    </div>

                    {/* KPI 2: Win Rate */}
                    <div className="flex flex-col justify-between space-y-2 border-r border-zinc-900/80 px-2 md:px-4">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Edge Win Rate</span>
                      <div>
                        <span className="text-4xl font-black text-slate-100 tracking-tight">
                          {winRateStr}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500">{filteredSummary?.winsCount || 0} Wins vs {filteredSummary?.lossesCount || 0} Losses</span>
                    </div>

                    {/* KPI 3: Behavioral Coach Score */}
                    <div className="flex flex-col justify-between space-y-2 border-r border-zinc-900/80 px-2 md:px-4">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Discipline Compliance</span>
                      <div>
                        <span className={`text-4xl font-black tracking-tight ${
                          (filteredSummary?.avgCompliance || 0) >= 0.8 ? "text-emerald-400" : (filteredSummary?.avgCompliance || 0) >= 0.5 ? "text-amber-400" : "text-rose-400"
                        }`}>
                          {filteredSummary?.avgCompliance !== null ? `${(filteredSummary.avgCompliance * 100).toFixed(0)}%` : "—"}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500">Plan Adherence Rate</span>
                    </div>

                    {/* KPI 4: Expectancy / Efficiency */}
                    <div className="flex flex-col justify-between space-y-2 pl-2 md:pl-4">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Trade Expectancy</span>
                      <div>
                        <span className={`text-4xl font-black tracking-tight ${expectancyVal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {fmtMoney(expectancyVal)}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500">Avg return per execution</span>
                    </div>
                  </div>

                  {/* Coach Verdict Banner */}
                  <div className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/[0.02] -z-10" />
                    <div>
                      <div className="text-[9px] uppercase font-black tracking-widest text-slate-500">Coach System Verdict</div>
                      <p className="mt-2 text-sm leading-relaxed font-bold text-slate-300">
                        {filteredCoach?.verdict || "Compile pre-market plans and checklist diagnostics to fetch active coaching telemetry."}
                      </p>
                    </div>
                  </div>

                  {/* Neurochemical Systems HUD */}
                  <div className="grid gap-5 md:grid-cols-3">
                    
                    {/* 1. Dopamine Card */}
                    <div className="relative group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 backdrop-blur-md shadow-lg shadow-black/20 hover:shadow-amber-500/10 transition-all duration-300 hud-breath-amber float-effect">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/[0.02] group-hover:to-amber-500/[0.04] transition-all duration-300" />
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Anticipation Loop</span>
                          <h3 className="text-sm font-bold text-slate-300 mt-0.5 glitch-text cursor-default">Dopamine Calibration</h3>
                        </div>
                        <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                          {todayStats.count === 0 ? "Optimal" : todayStats.count < maxTradesLimit ? "Calibrated" : "Limit Hit"}
                        </span>
                      </div>
                      
                      <div className="mt-5">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-2xl font-black text-slate-100">{tradesTodayStr}</span>
                          <span className="text-[9px] font-bold text-slate-500">daily trades taken</span>
                        </div>
                        <div className="h-2.5 w-full bg-zinc-900 border border-zinc-800/85 rounded-full overflow-hidden p-[1px]">
                          <div 
                            className="h-full neuro-liquid-dopamine rounded-full transition-all duration-500 shadow-[0_0_8px_#f59e0b]"
                            style={{ width: `${Math.min(100, (todayStats.count / maxTradesLimit) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-3 border-t border-zinc-900/50 pt-2">
                          <span>Expectancy: <strong className={expectancyVal >= 0 ? "text-emerald-400" : "text-rose-400"}>{fmtMoney(expectancyVal)}</strong></span>
                          <span>Win Rate: <strong>{winRateStr}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Serotonin Card */}
                    <div className={`relative group overflow-hidden rounded-3xl border bg-zinc-950/40 p-6 backdrop-blur-md shadow-lg shadow-black/20 hover:shadow-emerald-500/10 transition-all duration-300 float-effect ${
                      todayPreTradeCheckin 
                        ? todayPreTradeCheckin.readinessScore >= 75 ? "hud-breath-green hover:border-emerald-500/30" : "hud-breath-amber hover:border-amber-500/30"
                        : "hud-breath-red hover:border-rose-500/30"
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/[0.02] group-hover:to-emerald-500/[0.04] transition-all duration-300" />
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Satisfaction & Calm</span>
                          <h3 className="text-sm font-bold text-slate-300 mt-0.5 glitch-text cursor-default">Serotonin Balance</h3>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                          todayPreTradeCheckin 
                            ? todayPreTradeCheckin.readinessScore >= 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {todayPreTradeCheckin ? todayPreTradeCheckin.riskLevel : "Pending"}
                        </span>
                      </div>

                      <div className="mt-5">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-2xl font-black text-slate-100">{emotionalScoreStr}</span>
                          <span className="text-[9px] font-bold text-slate-500">readiness score</span>
                        </div>
                        <div className="h-2.5 w-full bg-zinc-900 border border-zinc-800/85 rounded-full overflow-hidden p-[1px]">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              todayPreTradeCheckin 
                                ? todayPreTradeCheckin.readinessScore >= 75 ? "neuro-liquid-serotonin shadow-[0_0_8px_#10b981]" : "neuro-liquid-dopamine shadow-[0_0_8px_#f59e0b]"
                                : "bg-rose-500/20"
                            }`}
                            style={{ width: `${todayPreTradeCheckin ? todayPreTradeCheckin.readinessScore : 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-3 border-t border-zinc-900/50 pt-2">
                          <span>Streaks: <strong className="text-emerald-400">{allDailyReviewsList.filter(r => r.followedPlan === 1).length}d Plan</strong></span>
                          <span>Discipline: <strong>{disciplineScoreStr}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Stress Shield Card */}
                    <div className={`relative group overflow-hidden rounded-3xl border bg-zinc-950/40 p-6 backdrop-blur-md shadow-lg shadow-black/20 hover:shadow-rose-500/10 transition-all duration-300 float-effect ${
                      activeLock ? "hud-breath-red hover:border-rose-500/30" : "hud-breath-green hover:border-emerald-500/30"
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/0 via-rose-500/0 to-rose-500/[0.02] group-hover:to-rose-500/[0.04] transition-all duration-300" />
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Hormonal Defense</span>
                          <h3 className="text-sm font-bold text-slate-300 mt-0.5 glitch-text cursor-default">Risk & Stress Shield</h3>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                          activeLock ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {activeLock ? "Protected" : "Stable"}
                        </span>
                      </div>

                      <div className="mt-5">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-2xl font-black text-slate-100">{weeklyRiskPct.toFixed(0)}%</span>
                          <span className="text-[9px] font-bold text-slate-500">risk limit used</span>
                        </div>
                        <div className="h-2.5 w-full bg-zinc-900 border border-zinc-800/85 rounded-full overflow-hidden p-[1px]">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              weeklyRiskPct > 80 ? "neuro-liquid-stress shadow-[0_0_8px_#ef4444] animate-pulse" : weeklyRiskPct > 50 ? "neuro-liquid-dopamine shadow-[0_0_8px_#f59e0b]" : "neuro-liquid-serotonin shadow-[0_0_8px_#10b981]"
                            }`}
                            style={{ width: `${Math.min(100, weeklyRiskPct)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-3 border-t border-zinc-900/50 pt-2">
                          <span>Cortisol (Losses): <strong className={todayStats.consecutiveLosses > 0 ? "text-rose-400" : "text-emerald-400"}>{todayStats.consecutiveLosses} streak</strong></span>
                          <span>Budget: <strong>${maxWeeklyRisk}</strong></span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Progressive Flow Daily Pipeline */}
                  <div className="rounded-3xl border border-zinc-850 bg-zinc-950/20 p-6 space-y-6 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-900/80 pb-4 gap-2">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Neuro-OS Daily Pipeline</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Progressive checkpoints governing your daily execution</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-wider text-slate-400 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-900">
                        <span>Operational Gate:</span>
                        <span className={approvedInfo.tone === "green" ? "text-emerald-400" : approvedInfo.tone === "amber" ? "text-amber-400" : "text-rose-400"}>
                          {approvedInfo.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-4 relative">
                      {/* Interactive Laser Circuit Connection Channel */}
                      <div className="hidden md:block absolute top-12 left-8 right-8 h-[2px] bg-zinc-900/40 -z-10 overflow-hidden rounded-full">
                        <div className="h-full w-full circuit-line-pulse" />
                      </div>

                      {/* Step 1: Diagnostic */}
                      <div className={`relative bg-zinc-900/20 border p-5 rounded-2xl flex flex-col justify-between min-h-[160px] transition-all duration-300 glass-panel-glow ${
                        !todayPreTradeCheckin 
                          ? "border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.05)] animate-pulse" 
                          : "border-zinc-900 hover:border-emerald-500/30"
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Phase 01</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${
                            todayPreTradeCheckin ? "bg-emerald-400 shadow-[0_0_8px_#34d399] hud-breath-green" : "bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24] hud-breath-amber"
                          }`} />
                        </div>
                        <div className="my-3">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Neural Alignment</h4>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            {todayPreTradeCheckin 
                              ? `Calibrated (Score: ${todayPreTradeCheckin.readinessScore}%)` 
                              : "Pre-session emotional checklist diagnostic pending."}
                          </p>
                        </div>
                        <button 
                          onClick={() => setTab("emotions")}
                          className="w-full text-[10px] font-black uppercase tracking-wider py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all"
                        >
                          {todayPreTradeCheckin ? "Recalibrate" : "Run Diagnostic"}
                        </button>
                      </div>

                      {/* Step 2: Rule Binding */}
                      <div className={`relative bg-zinc-900/20 border p-5 rounded-2xl flex flex-col justify-between min-h-[160px] transition-all duration-300 glass-panel-glow ${
                        todayPreTradeCheckin && !todayPreMarketPlan 
                          ? "border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.05)] animate-pulse" 
                          : "border-zinc-900 hover:border-emerald-500/30"
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Phase 02</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${
                            todayPreMarketPlan ? "bg-emerald-400 shadow-[0_0_8px_#34d399] hud-breath-green" : todayPreTradeCheckin ? "bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e] hud-breath-red" : "bg-zinc-800"
                          }`} />
                        </div>
                        <div className="my-3">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Rule Binding</h4>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            {todayPreMarketPlan 
                              ? "Pre-market plan locked. Rules bound." 
                              : "Thesis and daily focus checklists missing."}
                          </p>
                        </div>
                        <button 
                          onClick={() => setTab("premarket")}
                          className="w-full text-[10px] font-black uppercase tracking-wider py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all"
                        >
                          {todayPreMarketPlan ? "View Thesis" : "Lock Plan"}
                        </button>
                      </div>

                      {/* Step 3: Gatekeeper */}
                      <div className={`relative bg-zinc-900/20 border p-5 rounded-2xl flex flex-col justify-between min-h-[160px] transition-all duration-300 glass-panel-glow ${
                        todayPreTradeCheckin && todayPreMarketPlan && approvedInfo.status !== "APPROVED" 
                          ? "border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.05)] animate-pulse" 
                          : "border-zinc-900 hover:border-emerald-500/30"
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Phase 03</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${
                            approvedInfo.tone === "green" ? "bg-emerald-400 shadow-[0_0_8px_#34d399] hud-breath-green" : approvedInfo.tone === "amber" ? "bg-amber-400 shadow-[0_0_8px_#fbbf24] hud-breath-amber" : "bg-rose-500 shadow-[0_0_8px_#f43f5e] hud-breath-red"
                          }`} />
                        </div>
                        <div className="my-3">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Gatekeeper Lock</h4>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                            {approvedInfo.reason}
                          </p>
                        </div>
                        <button 
                          onClick={() => setTab("approval")}
                          className="w-full text-[10px] font-black uppercase tracking-wider py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all"
                        >
                          Verify Safety
                        </button>
                      </div>

                      {/* Step 4: Review */}
                      <div className={`relative bg-zinc-900/20 border p-5 rounded-2xl flex flex-col justify-between min-h-[160px] transition-all duration-300 glass-panel-glow ${
                        todayPreTradeCheckin && todayPreMarketPlan && approvedInfo.status === "APPROVED" && !todayDailyReview 
                          ? "border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.05)] animate-pulse" 
                          : "border-zinc-900 hover:border-emerald-500/30"
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Phase 04</span>
                          <span className={`h-2.5 w-2.5 rounded-full ${
                            todayDailyReview ? "bg-emerald-400 shadow-[0_0_8px_#34d399] hud-breath-green" : "bg-amber-400 shadow-[0_0_8px_#fbbf24] hud-breath-amber"
                          }`} />
                        </div>
                        <div className="my-3">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Memory Integration</h4>
                          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                            {todayDailyReview 
                              ? `Completed (Grade: ${todayDailyReview.executionGrade})` 
                              : "Journaling and rule verification review pending."}
                          </p>
                        </div>
                        <button 
                          onClick={() => setTab("review")}
                          className="w-full text-[10px] font-black uppercase tracking-wider py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all"
                        >
                          {todayDailyReview ? "View Grade" : "Run Review"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Equity & Performance Chart */}
                  <div className="rounded-3xl border border-zinc-900 bg-zinc-950/40 overflow-hidden transition-all duration-500 shadow-xl">
                    <div 
                      onClick={() => setShowEquityChart(!showEquityChart)}
                      className="flex justify-between items-center px-6 py-5 cursor-pointer hover:bg-zinc-900/30 border-b border-zinc-900/50 select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📈</span>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Equity & Performance Curve</h3>

                          <p className="text-[10px] text-slate-500 mt-0.5">Click to toggle equity curves, metrics & drawdowns</p>
                        </div>
                      </div>
                      <button className="text-xs font-black uppercase text-amber-400 hover:text-amber-300 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl transition">
                        {showEquityChart ? "Hide Details ▲" : "Show Details ▼"}
                      </button>
                    </div>
                    
                    {showEquityChart && (
                      <div className="p-6 space-y-6 bg-zinc-950/60 border-t border-zinc-900/80 animate-in fade-in duration-300">
                        <EquityCurve trades={filteredTrades} initialBalance={activeInitialBalance} />
                        
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-5 text-center">
                          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4">
                            <div className="text-[8px] uppercase tracking-wider font-bold text-slate-500">Win Rate</div>
                            <div className="text-xl font-black text-amber-400 mt-1">{winRateStr}</div>
                          </div>
                          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4">
                            <div className="text-[8px] uppercase tracking-wider font-bold text-slate-500">Best Trade</div>
                            <div className="text-xl font-black text-emerald-400 mt-1">{fmtMoney(filteredSummary?.bestTrade)}</div>
                          </div>
                          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4">
                            <div className="text-[8px] uppercase tracking-wider font-bold text-slate-500">Worst Trade</div>
                            <div className="text-xl font-black text-rose-400 mt-1">{fmtMoney(filteredSummary?.worstTrade)}</div>
                          </div>
                          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4">
                            <div className="text-[8px] uppercase tracking-wider font-bold text-slate-500">Expectancy</div>
                            <div className={`text-xl font-black mt-1 ${(filteredSummary?.expectancy || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {fmtMoney(filteredSummary?.expectancy || 0)}
                            </div>
                          </div>
                          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4">
                            <div className="text-[8px] uppercase tracking-wider font-bold text-slate-500">Sharpe Ratio</div>
                            <div className="text-xl font-black text-slate-200 mt-1">{(filteredSummary?.sharpeRatio || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <Panel title="Session Distribution">
                            <div className="space-y-4">
                              {Object.entries(sessionStats).map(([label, value]) => (
                                <div key={label}>
                                  <div className="mb-1 flex justify-between text-xs">
                                    <span className="text-slate-400">{label}</span>
                                    <span className={pnlColor(value)}>{fmtMoney(value)}</span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
                                    <div className={`h-full ${value >= 0 ? "bg-emerald-400" : "bg-rose-400"}`} style={{ width: `${Math.min(100, Math.abs(value) / (Math.abs(filteredSummary.netPnL) || 1) * 100)}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Panel>
                          <Panel title="Day of Week">
                            <div className="space-y-4">
                              {Object.entries(dayStats).map(([label, value]) => (
                                <div key={label}>
                                  <div className="mb-1 flex justify-between text-xs">
                                    <span className="text-slate-400">{label}</span>
                                    <span className={pnlColor(value)}>{fmtMoney(value)}</span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
                                    <div className={`h-full ${value >= 0 ? "bg-amber-400" : "bg-slate-400"}`} style={{ width: `${Math.min(100, Math.abs(value) / (Math.abs(filteredSummary.netPnL) || 1) * 100)}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Panel>
                        </div>

                        <DrawdownMeter trades={filteredTrades} initialBalance={activeInitialBalance} />
                      </div>
                    )}
                  </div>

                  {/* Supplementary Labs bottom panel */}
                  <div className="rounded-3xl border border-zinc-850 bg-zinc-950/20 p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Compounding & Simulation Utilities</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Supplementary tools for cognitive behavioral growth, logs, and simulations</p>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {[
                        { id: "ai", icon: "🧠", title: "AI Coach Chat", desc: "Process trading stress and overtrading tendencies." },
                        { id: "psychology", icon: "📓", title: "Psychology Journal", desc: "Mental journal, fear registers, and cognitive overrides." },
                        { id: "rules", icon: "📜", title: "Streaks & Habits", desc: "Process rules tracking, daily compliance streaks." },
                        { id: "replay", icon: "🔄", title: "Replay Simulator", desc: "Build screen time on historical ticks without financial risk." },
                        { id: "notebook", icon: "📔", title: "Coach Reports", desc: "Weekly reports, diagnostic logs, and cognitive review files." },
                        { id: "analytics", icon: "📊", title: "Analytics telemetry", desc: "Heatmaps, day-of-week stats, and risk-return curves." },
                        { id: "trades", icon: "💼", title: "Trade Database", desc: "Detailed execution ledger, imports, and execution logs." },
                        { id: "calendar", icon: "📅", title: "Trade Calendar", desc: "Visual calendars tracking daily P&L and grade history." },
                        { id: "risk", icon: "🛡️", title: "Risk & Cooldown Gates", desc: "Configure daily max loss, trade limits, and cooldowns." }
                      ].map(item => (
                        <div 
                          key={item.id}
                          onClick={() => setTab(item.id)}
                          className="group cursor-pointer rounded-2xl p-4 transition-all duration-300 active:scale-[0.97] flex items-start gap-3 glass-panel-glow border border-zinc-900 bg-zinc-950/20 hover:border-amber-500/30 hover:bg-zinc-900/30"
                        >
                          <div className="text-xl bg-zinc-950 p-2 rounded-xl border border-zinc-850 flex items-center justify-center shrink-0 group-hover:scale-110 transition duration-300">
                            {item.icon}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide group-hover:text-amber-400 transition glitch-text">
                              {item.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
              {tab === "calendar" && (
                <Panel title="Performance Calendar">
                  <TradeCalendar 
                    key={`${selectedWeek.id || selectedWeek.month || 'overall'}_${tradeFilter}_${advancedFilters.symbol}_${advancedFilters.session}_${advancedFilters.dir}_${advancedFilters.dateFrom}_${advancedFilters.dateTo}_${advancedFilters.timeFrom}_${advancedFilters.timeTo}`} 
                    selectedWeek={selectedWeek} 
                    trades={filteredTrades} 
                    onOpenDailyJournal={handleOpenDailyJournal}
                    journals={dailyJournalsList}
                  />
                </Panel>
              )}

              {tab === "trades" && (
                <TradeListAgent 
                  filteredTrades={filteredTrades}
                  tradeFilter={tradeFilter}
                  setTradeFilter={setTradeFilter}
                  advancedFilters={advancedFilters}
                  setAdvancedFilters={setAdvancedFilters}
                  setSelectedTradeId={setSelectedTradeId}
                  setTab={setTab}
                  weeks={weeks}
                  months={months}
                  selectedWeek={selectedWeekDropdownValue}
                  selectedMonth={selectedMonthDropdownValue}
                  onSelectWeek={handleSelectWeekGlobal}
                  onSelectMonth={handleSelectMonthGlobal}
                  onResetFilters={handleResetFiltersGlobal}
                />
              )}

              {tab === "chartreview" && (
                <ChartReviewPanel 
                  trades={filteredTrades} 
                  selectedTrade={selectedTrade} 
                  playbookSetups={playbookSetups}
                  onSelectTrade={setSelectedTradeId} 
                  onUpdateTrade={handleUpdateTrade} 
                />
              )}

              {tab === "analytics" && (
                 <div className="space-y-5">
                   <HourDayHeatmap trades={filteredTrades} />
                   <HourOfDayAnalysis trades={filteredTrades} />
                   <SymbolBreakdown trades={filteredTrades} />

                   <Panel title="Advanced Portfolio Metrics (Myfxbook Style)">
                     <div className="grid gap-4 grid-cols-2 md:grid-cols-6 mb-5">
                       <KpiCard label="Expectancy" value={fmtMoney(filteredSummary?.expectancy || 0)} helper="Expected return / trade" tone={(filteredSummary?.expectancy || 0) >= 0 ? "green" : "red"} />
                       <KpiCard label="Sharpe Ratio" value={(filteredSummary?.sharpeRatio || 0).toFixed(2)} helper="Volatility adjusted" tone={(filteredSummary?.sharpeRatio || 0) > 1 ? "green" : "neutral"} />
                       <KpiCard label="Sortino Ratio" value={(filteredSummary?.sortinoRatio || 0).toFixed(2)} helper="Downside deviation" tone={(filteredSummary?.sortinoRatio || 0) > 1 ? "green" : "neutral"} />
                       <KpiCard label="Z-Score Streaks" value={(filteredSummary?.zScore || 0).toFixed(2)} helper="Streak independence test" tone={Math.abs(filteredSummary?.zScore || 0) > 2 ? "amber" : "neutral"} />
                       <KpiCard label="W/L Ratio" value={`${(filteredSummary?.profitRatio || 0).toFixed(2)}:1`} helper="Reward vs Risk profile" tone={(filteredSummary?.profitRatio || 0) >= 1 ? "green" : "red"} />
                       <KpiCard label="Avg Rules Checked" value={filteredSummary?.avgCompliance !== null ? `${(filteredSummary?.avgCompliance * 100).toFixed(0)}%` : "—"} helper="Playbook compliance" tone={filteredSummary?.avgCompliance >= 0.8 ? "green" : filteredSummary?.avgCompliance >= 0.5 ? "amber" : "red"} />
                     </div>
                     <div className="grid gap-5 xl:grid-cols-2">
                       <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800/60">
                         <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Longs (Buys) Performance</div>
                         <div className="flex justify-between items-end">
                           <div>
                             <div className="text-2xl font-black text-slate-200">{filteredSummary?.buysCount || 0} Trades</div>
                             <div className="text-xs text-slate-400">{((filteredSummary?.buysWinRate || 0) * 100).toFixed(1)}% Win Rate</div>
                           </div>
                           <div className="text-right">
                             <div className={`text-xl font-black ${pnlColor(filteredSummary?.buysPnL || 0)}`}>{fmtMoney(filteredSummary?.buysPnL || 0)}</div>
                             <div className="text-[10px] text-slate-500">Net Long Return</div>
                           </div>
                         </div>
                       </div>
                       <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800/60">
                         <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shorts (Sells) Performance</div>
                         <div className="flex justify-between items-end">
                           <div>
                             <div className="text-2xl font-black text-slate-200">{filteredSummary?.sellsCount || 0} Trades</div>
                             <div className="text-xs text-slate-400">{((filteredSummary?.sellsWinRate || 0) * 100).toFixed(1)}% Win Rate</div>
                           </div>
                           <div className="text-right">
                             <div className={`text-xl font-black ${pnlColor(filteredSummary?.sellsPnL || 0)}`}>{fmtMoney(filteredSummary?.sellsPnL || 0)}</div>
                             <div className="text-[10px] text-slate-500">Net Short Return</div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </Panel>

                   <PatternHunter summary={filteredSummary} />
                   <Panel title="Advanced Execution Metrics">
                     <div className="grid gap-6 md:grid-cols-2">
                       <div>
                         <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-500">Best Performing Session</h3>
                         <div className="rounded-2xl bg-slate-900 p-6 text-center">
                           <div className="text-4xl font-black text-amber-400">
                             {Object.entries(sessionStats).reduce((a, b) => b[1] > a[1] ? b : a, ["None", 0])[0]}
                           </div>
                           <div className="mt-2 text-xs text-slate-500">Based on absolute P&L contribution</div>
                         </div>
                       </div>
                       <div>
                         <h3 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-500">Best Trading Day</h3>
                         <div className="rounded-2xl bg-slate-900 p-6 text-center">
                           <div className="text-4xl font-black text-emerald-400">
                             {Object.entries(dayStats).reduce((a, b) => b[1] > a[1] ? b : a, ["None", 0])[0]}
                           </div>
                           <div className="mt-2 text-xs text-slate-500">Consistently profitable day</div>
                         </div>
                       </div>
                     </div>
                   </Panel>
                   <SetupLibrary trades={filteredTrades} onManagePlaybook={() => setShowPlaybookModal(true)} />
                   <MistakeLeaderboard trades={filteredTrades} />
                 </div>
              )}

              {tab === "coach" && <RobustCoachTab summary={filteredSummary} coach={filteredCoach} weekData={{ ...selectedWeek, summary: filteredSummary, coach: filteredCoach }} />}
              {tab === "psychology" && <PsychologyJournal trades={filteredTrades} onJournalsLoaded={setDailyJournalsList} />}
              {tab === "rules" && <RulesTracker trades={filteredTrades} />}
              {tab === "risk" && (
                <RiskOfRuin 
                  summary={filteredSummary} 
                  trades={filteredTrades} 
                  portfolioId={activePortfolioId} 
                  onSettingsSaved={async () => {
                    if (activePortfolioId) {
                      const risk = await getRiskSettings(activePortfolioId);
                      setActiveRiskSettings(risk);
                    }
                    const reviews = await getAllDailyReviews();
                    setAllDailyReviewsList(reviews || []);
                  }}
                />
              )}
              {tab === "ai" && <AICoachChat summary={filteredSummary} trades={filteredTrades} />}
              {tab === "replay" && <ReplaySimulator trades={filteredTrades} initialBalance={activeInitialBalance} />}
              {tab === "notebook" && <JournalAgent weeks={filteredWeeks} />}
              {tab === "premarket" && <PreMarketAgent initialDate={activeDateForEcosystem} />}
              {tab === "emotions" && <EmotionalMonitorAgent initialDate={activeDateForEcosystem} />}
              {tab === "waiting" && <WaitingModeAgent />}
              {tab === "approval" && <ApprovalAgent trades={allPortfolioTrades} portfolioId={activePortfolioId} />}
              {tab === "review" && <ReviewAgent trades={filteredTrades} weeks={weeks} initialDate={activeDateForEcosystem} />}
            </section>
          </main>
        );
      })()}

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6">
            <h2 className="text-xl font-black text-slate-100">Import Trading Data</h2>
            <p className="mt-2 text-sm text-slate-400">Choose your import method to bring closed trade history into the active portfolio.</p>
            
            {/* Tab Selector */}
            <div className="flex gap-2 mt-4 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setSyncMethod("file")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${syncMethod === "file" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"}`}
              >
                📁 Report File Upload
              </button>
              <button
                type="button"
                onClick={() => setSyncMethod("mt5")}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${syncMethod === "mt5" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"}`}
              >
                🔗 MT5 Direct Sync (Live)
              </button>
            </div>

            {syncMethod === "file" ? (
              <div className="mt-6">
                <p className="text-xs text-slate-500 mb-3">Upload your CSV or Excel (XLSX) file containing your trade history. We support Exness Deals exports and standard format sheets.</p>
                <label className="flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/50 hover:border-amber-400 hover:bg-slate-900/70 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <span className="text-3xl mb-2">📁</span>
                    <p className="text-sm font-bold text-slate-200">Click to upload or drag & drop</p>
                    <p className="text-[10px] text-slate-500 mt-1">CSV or XLSX (Max 10MB)</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".csv, .xlsx" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBusy(true);
                      setStatus("Uploading and parsing file...");
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        if (activePortfolioId) {
                          formData.append("portfolioId", activePortfolioId);
                        }
                        const res = await fetch("/api/parse-file", {
                          method: "POST",
                          body: formData,
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data.error || "Failed to parse file.");
                        }
                        setStatus("Data loaded successfully! Refreshing...");
                        const freshData = await getWeeks(activePortfolioId);
                        setWeeks(freshData);
                        setUploadOpen(false);
                      } catch (err) {
                        alert(err.message || "An error occurred during file parsing.");
                      } finally {
                        setBusy(false);
                        setStatus("");
                      }
                    }} 
                  />
                </label>
              </div>
            ) : (
              <form onSubmit={handleMt5Sync} className="mt-6 space-y-4">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                  <p className="text-xs text-slate-300 font-semibold mb-1">🤖 Smart Auto-Detection</p>
                  <p className="text-[11px] text-slate-500">Enter your credentials below. FITpips will automatically find and connect to your Exness MT5 terminal — even launching it if it's not currently running. Syncs the last 365 days of closed trades.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">MT5 Login ID</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 50123456"
                      value={mt5Login}
                      onChange={(e) => setMt5Login(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Broker Server</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Exness-MT5Real"
                      value={mt5Server}
                      onChange={(e) => setMt5Server(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">MT5 Investor/Master Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter account password"
                    value={mt5Password}
                    onChange={(e) => setMt5Password(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">MT5 Terminal Path (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-detects by default (e.g., C:\Program Files\MetaTrader 5\terminal64.exe)"
                    value={mt5Path}
                    onChange={(e) => setMt5Path(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition placeholder:text-slate-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 pb-2">
                  <input
                    type="checkbox"
                    id="mt5AutoSync"
                    checked={mt5AutoSync}
                    onChange={(e) => setMt5AutoSync(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-amber-500 accent-amber-500"
                  />
                  <label htmlFor="mt5AutoSync" className="text-xs text-slate-300 font-semibold cursor-pointer">
                    Enable Daily Auto-Sync on platform open
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 py-3 font-black text-xs uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-amber-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Syncing Live Account...</span>
                    </>
                  ) : (
                    <span>🔗 Sync MT5 Live Account</span>
                  )}
                </button>
              </form>
            )}

            {status && (
              <div className={`mt-4 text-xs font-bold text-center px-3 py-2 rounded-xl ${
                status.startsWith('✅') 
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-amber-400 animate-pulse'
              }`}>
                {status}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button 
                disabled={busy}
                onClick={() => setUploadOpen(false)} 
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-black text-slate-400 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Journal & Debrief Modal */}
      {journalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-100">Daily Journal & Debrief</h2>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-0.5">{journalDate}</p>
              </div>
              <button onClick={() => setJournalOpen(false)} className="text-slate-400 hover:text-slate-200 text-sm font-bold">✕</button>
            </div>

            {journalLoading ? (
              <div className="py-12 text-center text-xs text-amber-400 font-bold animate-pulse">Loading daily journal data...</div>
            ) : (
              <form onSubmit={handleSaveDailyJournal} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-2">Daily Session Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setJournalRating(star)}
                        className={`text-2xl transition hover:scale-110 ${star <= journalRating ? "opacity-100 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "opacity-30"}`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-2">Dominant Emotion / Mood</label>
                  <div className="grid grid-cols-5 gap-2">
                    {["🧘 Calm", "🔥 Excited", "📉 Stressed", "🌪️ Impatient", "💤 Tired"].map((moodOption) => (
                      <button
                        key={moodOption}
                        type="button"
                        onClick={() => setJournalMood(moodOption)}
                        className={`rounded-xl border py-2.5 text-xs font-bold transition text-center ${journalMood === moodOption ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"}`}
                      >
                        <div className="text-lg">{moodOption.split(" ")[0]}</div>
                        <div className="mt-1 text-[9px]">{moodOption.split(" ")[1]}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1.5">Debrief Notes & Psychology Review</label>
                  <textarea
                    value={journalNotes}
                    onChange={(e) => setJournalNotes(e.target.value)}
                    placeholder="Log mistakes, behavior patterns, mental fatigue, rules compliance..."
                    rows="4"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200 outline-none focus:border-amber-400 transition placeholder:text-slate-600"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setJournalOpen(false)}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-black text-slate-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-400/10 transition"
                  >
                    Save Journal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Portfolio Settings / Management Modal */}
      {showPortfolioSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-lg font-black text-slate-100">Portfolio Manager</h2>
              <button onClick={() => setShowPortfolioSettings(false)} className="text-slate-400 hover:text-slate-200 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Your Portfolios</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {portfoliosList.map((p) => (
                    <div key={p.id} className={`rounded-2xl border p-4 flex flex-col justify-between transition ${p.id === activePortfolioId ? "border-amber-400 bg-amber-400/5" : "border-slate-800 bg-slate-900/60"}`}>
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-200 text-sm leading-tight">{p.name}</span>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${p.accountType === 'Live' ? 'bg-emerald-500/10 text-emerald-400' : p.accountType === 'Prop' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
                            {p.accountType}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">Broker: <span className="text-slate-300 font-semibold">{p.broker || "Standard"}</span></div>
                        <div className="text-xs text-slate-500">Starting Balance: <span className="text-slate-300 font-semibold">{fmtMoney(p.initialBalance)}</span></div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/40 flex justify-between items-center">
                        <button
                          onClick={() => { handlePortfolioChange(p.id); setShowPortfolioSettings(false); }}
                          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg transition ${p.id === activePortfolioId ? "bg-amber-400 text-slate-950" : "bg-slate-800 hover:bg-slate-700 text-slate-300"}`}
                        >
                          {p.id === activePortfolioId ? "Active" : "Switch To"}
                        </button>
                        {portfoliosList.length > 1 && (
                          <button
                            onClick={() => handleDeletePortfolio(p.id)}
                            className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest transition"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Create New Account / Portfolio</h3>
                <form onSubmit={handleCreatePortfolio} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Portfolio Name</label>
                      <input
                        type="text"
                        value={newPortName}
                        onChange={(e) => setNewPortName(e.target.value)}
                        placeholder="e.g. FTMO Challenge"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Broker Name</label>
                      <input
                        type="text"
                        value={newPortBroker}
                        onChange={(e) => setNewPortBroker(e.target.value)}
                        placeholder="e.g. Exness, FTMO"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Account Type</label>
                      <select
                        value={newPortType}
                        onChange={(e) => setNewPortType(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                      >
                        <option value="Live">Live Account</option>
                        <option value="Demo">Demo Account</option>
                        <option value="Prop">Prop Firm Account</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Starting Balance ($)</label>
                      <input
                        type="number"
                        value={newPortBalance}
                        onChange={(e) => setNewPortBalance(e.target.value)}
                        placeholder="10000"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPortfolioSettings(false)}
                      className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-black text-slate-400 transition"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-400/10 transition"
                    >
                      Create Portfolio
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-lg font-black text-slate-100">Share Portfolio with Mentor</h2>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-200 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Generate a secure, read-only tokenized link to share the current portfolio dashboard with mentors, coaches, or trading communities. Hides raw credentials while giving complete visual access to trade history, calendar journaling, and stats.
              </p>

              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 mt-3">
                <div className="text-[10px] uppercase text-slate-500 font-black tracking-wider">Current Portfolio</div>
                <div className="mt-1 font-bold text-slate-200 text-sm">
                  {portfoliosList.find(p => p.id === activePortfolioId)?.name || "Master Portfolio"}
                </div>
              </div>

              {shareTokensList.find(t => t.portfolioId === activePortfolioId) ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Mentor Access URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/share?token=${shareTokensList.find(t => t.portfolioId === activePortfolioId)?.token}` : ""}
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-300 font-mono outline-none"
                      />
                      <button
                        onClick={() => {
                          const tok = shareTokensList.find(t => t.portfolioId === activePortfolioId)?.token;
                          if (tok && typeof window !== 'undefined') {
                            navigator.clipboard.writeText(`${window.location.origin}/share?token=${tok}`);
                            alert("Share URL copied to clipboard!");
                          }
                        }}
                        className="rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 px-4 text-xs font-black transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-rose-400 font-bold">Link is active and secure</span>
                    <button
                      onClick={() => handleRevokeShareToken(shareTokensList.find(t => t.portfolioId === activePortfolioId)?.token)}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 text-xs font-black transition"
                    >
                      Revoke Link
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">🔗</div>
                  <div className="text-xs text-slate-500 mb-4">No active share link generated for this account.</div>
                  <button
                    onClick={handleGenerateShareToken}
                    className="rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-2.5 text-xs font-black text-slate-950 transition"
                  >
                    Generate Share Link
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-black text-slate-400 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playbook / Setup Builder Modal */}
      {showPlaybookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-lg font-black text-slate-100">Setup Library & Playbook Builder</h2>
              <button onClick={() => setShowPlaybookModal(false)} className="text-slate-400 hover:text-slate-200 text-sm font-bold">✕</button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Your Playbook Setups</h3>
                {playbookSetups.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80">No setups defined. Create your first playbook entry below.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {playbookSetups.map((setup) => (
                      <div key={setup.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-200 text-sm leading-tight">{setup.name}</span>
                            <button
                              onClick={() => handleDeletePlaybook(setup.id)}
                              className="text-xs text-rose-400 hover:text-rose-300 font-bold transition"
                            >
                              ✕ Delete
                            </button>
                          </div>
                          {setup.description && (
                            <p className="mt-1 text-xs text-slate-400 leading-snug">{setup.description}</p>
                          )}
                          
                          {setup.rules && setup.rules.length > 0 && (
                            <div className="mt-3">
                              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-black mb-1">Checklist Rules</div>
                              <ul className="text-xs text-slate-300 list-disc pl-4 space-y-0.5">
                                {setup.rules.map((rule, idx) => (
                                  <li key={idx}>{rule}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Add Custom Setup Checklist</h3>
                <form onSubmit={handleSavePlaybook} className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Setup Name</label>
                    <input
                      type="text"
                      value={newPlaybookName}
                      onChange={(e) => setNewPlaybookName(e.target.value)}
                      placeholder="e.g. NY session breakout"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Description / Setup Mechanics</label>
                    <input
                      type="text"
                      value={newPlaybookDesc}
                      onChange={(e) => setNewPlaybookDesc(e.target.value)}
                      placeholder="e.g. Entering on retest of London session high or low during NY open"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Compliance Rules checklist (One rule per line)</label>
                    <textarea
                      value={newPlaybookRules}
                      onChange={(e) => setNewPlaybookRules(e.target.value)}
                      placeholder="e.g.&#10;1H bias aligns with entry direction&#10;15M double bottom forms at London low&#10;Risk is strictly under 1%&#10;Target is next major resistance level"
                      rows="4"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200 outline-none focus:border-amber-400 transition placeholder:text-slate-600 font-sans"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPlaybookModal(false)}
                      className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-black text-slate-400 transition"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-400/10 transition"
                    >
                      Save Playbook Setup
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
