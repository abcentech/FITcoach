export const GRADE_SCORE = { A: 9, B: 7, C: 5, D: 3, F: 1 };

export function n(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const raw = String(value).trim();
  const negative = raw.includes("-") || (raw.includes("(") && raw.includes(")"));
  const digits = raw.replace(/[^0-9.]/g, "");
  if (!digits) return fallback;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : fallback;
}

export function fmtMoney(v) {
  const x = n(v);
  return `${x >= 0 ? "+" : "-"}$${Math.abs(x).toFixed(2)}`;
}

export function fmtPct(v) {
  return `${(n(v) * 100).toFixed(1)}%`;
}

export function pnlColor(v) {
  return n(v) >= 0 ? "text-emerald-400" : "text-rose-400";
}

export function normalizeDateTime(value = "") {
  return String(value || "").replace(/\./g, "-").trim();
}

export function tradingViewSymbol(symbol = "") {
  const s = String(symbol).toUpperCase();
  if (s.includes("XAU") || s.includes("GOLD")) return "OANDA:XAUUSD";
  if (s.includes("BTC")) return "BITSTAMP:BTCUSD";
  if (s.includes("NAS") || s.includes("USTEC") || s.includes("US100")) return "CAPITALCOM:US100";
  if (s.includes(":")) return s;
  return s.replace(/M$/, "") || "OANDA:XAUUSD";
}

export function tradingViewLink(symbol = "") {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tradingViewSymbol(symbol))}`;
}

export function instrumentFromSymbol(symbol = "") {
  const s = String(symbol).toUpperCase();
  if (s.includes("BTC")) return "Bitcoin";
  if (s.includes("XAU") || s.includes("GOLD")) return "Gold";
  if (s.includes("NAS") || s.includes("USTEC") || s.includes("US100")) return "Nasdaq";
  return symbol || "Unknown";
}

export function direction(value) {
  return String(value || "").toLowerCase().includes("sell") ? "Sell" : "Buy";
}

export function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random()}`;
  }
}

export function field(row, names) {
  const keys = Object.keys(row || {});
  for (const name of names) {
    const found = keys.find((k) => k.toLowerCase().replace(/\s/g, "") === name.toLowerCase().replace(/\s/g, ""));
    if (found) return row[found];
  }
  return "";
}

export function inferSetupType(trade) {
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

export function autoGrade(trade) {
  if (trade.grade && trade.grade !== "Pending") return { ...trade, setupType: trade.setupType || inferSetupType(trade) };
  const pnl = n(trade.pnl);
  if (trade.instrument === "Bitcoin") return { ...trade, grade: "N/A", hold: "BTC needs its own chart review", tag: "BTC restricted", setupType: "BTC Unverified" };
  if (pnl >= 10) return { ...trade, grade: "A", hold: "Runner candidate", tag: "Repeat setup", setupType: inferSetupType({ ...trade, tag: "runner" }) };
  if (pnl > 0) return { ...trade, grade: "B", hold: "Good scalp or partial", tag: "Review exit", setupType: inferSetupType(trade) };
  if (pnl <= -5) return { ...trade, grade: "F", hold: "Should not hold", tag: "Avoid or stop earlier", setupType: inferSetupType(trade) };
  return { ...trade, grade: "D", hold: "Small loss. Check entry quality", tag: "Tighten filter", setupType: inferSetupType(trade) };
}

export function normalizeTrade(row, index) {
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

export function tradeFromArray(r, i) {
  return autoGrade({
    id: i + 1, dateTime: r[0], symbol: r[1], instrument: instrumentFromSymbol(r[1]), dir: direction(r[2]),
    lot: n(r[3]), entry: n(r[4]), exit: n(r[5]), pnl: n(r[6]), high: "", low: "",
    grade: r[7] || "Pending", hold: r[8] || "Pending chart review", tag: r[9] || "Needs review", m15: r[10] || "Awaiting 15M context", h1: "Awaiting 1H context", setupType: ""
  });
}

export function getMfeMae(trade) {
  const entry = n(trade.entry);
  const exit = n(trade.exit);
  const high = trade.high === "" ? null : n(trade.high, null);
  const low = trade.low === "" ? null : n(trade.low, null);
  if (high === null || low === null || entry === 0) return { mfe: null, mae: null, efficiency: null };
  const mfe = trade.dir === "Buy" ? Math.max(0, high - entry) : Math.max(0, entry - low);
  const mae = trade.dir === "Buy" ? Math.max(0, entry - low) : Math.max(0, high - entry);
  const move = trade.dir === "Buy" ? exit - entry : entry - exit;
  return { mfe, mae, efficiency: mfe > 0 ? Math.max(-1, Math.min(1, move / mfe)) : null };
}

export function reviewTradeStructure(trade = {}) {
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

export function summarize(trades) {
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

  // Additional stats for portfolio view support
  const xauTrades = list.filter(t => (t.symbol||'').toUpperCase().includes('XAU'));
  const xauPnL = xauTrades.reduce((s, t) => s + n(t.pnl), 0);
  const btcTrades = list.filter(t => (t.symbol||'').toUpperCase().includes('BTC'));
  const btcPnL = btcTrades.reduce((s, t) => s + n(t.pnl), 0);

  return { 
    trades: list.length, wins: wins.length, losses: losses.length, winRate, netPnL, profitFactor, 
    grossProfit, grossLoss, avgWin, avgLoss,
    topLeaks, coachScore, coachGrade: coachScore >= 80 ? "A" : coachScore >= 65 ? "B" : coachScore >= 50 ? "C" : "F",
    expectancy, profitRatio, sharpeRatio,
    buysCount: buys.length, buysWins: buysWins.length, buysPnL, buysWinRate,
    sellsCount: sells.length, sellsWins: sellsWins.length, sellsPnL, sellsWinRate,
    bestTrade: list.length ? Math.max(...list.map(t => n(t.pnl))) : 0,
    worstTrade: list.length ? Math.min(...list.map(t => n(t.pnl))) : 0,
    xauPnL,
    btcPnL
  };
}

export function buildCoach(summary) {
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

export function createWeek({ week, dateRange, trades, screenshots = {}, status = "reviewed", sourceType = "sample", brokerNet = null, coach = null }) {
  const summary = summarize(trades);
  return { id: makeId(), week, dateRange: dateRange || `Week ${week}`, status, sourceType, brokerNet, createdAt: new Date().toISOString(), screenshots, trades, summary, coach: coach || buildCoach(summary) };
}

export function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else current += ch;
  }
  values.push(current.trim());
  return values;
}

export function parseCsv(text) {
  const lines = String(text || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line, index) => {
    const vals = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] || "";
    });
    return normalizeTrade(row, index);
  });
}

export function tradesToCsv(trades) {
  const headers = ["id", "dateTime", "symbol", "instrument", "dir", "lot", "entry", "exit", "pnl", "high", "low", "grade", "setupType", "hold", "tag", "h1", "m15", "mfe", "mae", "exitEfficiency"];
  return [headers.join(","), ...(trades || []).map((t) => {
    const mm = getMfeMae(t);
    return headers.map((h) => h === "mfe" ? mm.mfe ?? "" : h === "mae" ? mm.mae ?? "" : h === "exitEfficiency" ? mm.efficiency ?? "" : t[h] ?? "").join(",");
  })].join("\n");
}

export function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const getTradeDayAndHour = (t) => {
  try {
    const raw = String(t.dateTime || "").replace(/\./g, "-").trim();
    const parts = raw.split(" ");
    if (parts.length < 2) return { day: -1, hour: -1 };
    const dateParts = parts[0].split("-");
    const timeParts = parts[1].split(":");
    if (dateParts.length < 3 || timeParts.length < 2) return { day: -1, hour: -1 };
    const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
    const day = d.getDay();
    const hour = Number(timeParts[0]);
    return { day, hour };
  } catch (e) {
    return { day: -1, hour: -1 };
  }
};

export const mapDayIndex = (day) => {
  if (day === 0) return 6;
  return day - 1;
};

export const parseToTime = (dtStr) => {
  try {
    const raw = String(dtStr || "").replace(/\./g, "-").trim();
    const parts = raw.split(" ");
    if (parts.length < 2) return 0;
    const dateParts = parts[0].split("-");
    const timeParts = parts[1].split(":");
    return new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), Number(timeParts[0]), Number(timeParts[1])).getTime();
  } catch (e) {
    return 0;
  }
};
