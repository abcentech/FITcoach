import { NextResponse } from "next/server";
import { db } from "../../../db";
import { weeks as weeksTable, trades as tradesTable, portfolios } from "../../../db/schema";
import { getCurrentUser } from "../../../db/auth";
import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

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

export async function POST(req) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }

    let targetPortfolioId = formData.get("portfolioId");
    if (!targetPortfolioId) {
      const userPortfolios = await db.select().from(portfolios).where(eq(portfolios.userId, user.id));
      if (userPortfolios.length > 0) {
        targetPortfolioId = userPortfolios[0].id;
      } else {
        const defaultId = `default-${user.id}`;
        await db.insert(portfolios).values({
          id: defaultId,
          userId: user.id,
          name: "Master Portfolio",
          broker: "Standard",
          accountType: "Live",
          initialBalance: 10000
        }).onConflictDoNothing();
        targetPortfolioId = defaultId;
      }
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let trades = [];

    // ─── 1. Detect Exness Deals Export ───────────────────────────────────────
    const dealsHeaderIdx = rawData.findIndex((row) =>
      Array.isArray(row) && row.includes("Deals")
    );

    // ─── 2. Detect Darwinex / MT5 History Export ────────────────────────────
    // Signature: Row 0 has headers like: Time, Position, Symbol, Type, Volume,
    //   Price, S / L, T / P, Time, Price, Commission, Swap, Profit
    const isMT5History = (() => {
      const h = rawData[0];
      if (!h || !Array.isArray(h)) return false;
      const lower = h.map(c => String(c).toLowerCase().trim());
      return (
        lower.includes("symbol") &&
        lower.includes("type") &&
        lower.includes("volume") &&
        lower.includes("commission") &&
        lower.includes("profit") &&
        lower.filter(c => c === "time").length >= 2
      );
    })();

    if (dealsHeaderIdx !== -1) {
      // ── Exness Deals Export ────────────────────────────────────────────────
      const headers = rawData[dealsHeaderIdx + 1];
      const dealsData = rawData.slice(dealsHeaderIdx + 2);

      const col = (name) => headers.indexOf(name);
      const idxTime    = col("Time");
      const idxSymbol  = col("Symbol");
      const idxType    = col("Type");
      const idxDir     = col("Direction");
      const idxComm    = col("Commission");
      const idxSwap    = col("Swap");
      const idxProfit  = col("Profit");
      const idxVolume  = col("Volume");
      const idxPrice   = col("Price");

      for (const row of dealsData) {
        if (!row[idxTime] || row[idxTime] === "Time" || String(row[idxTime]).includes("Summary")) break;

        const type      = String(row[idxType]).toLowerCase();
        const direction = String(row[idxDir]).toLowerCase();
        if (type === "balance") continue;
        if (direction !== "out" && direction !== "in/out") continue;

        const dateStr = String(row[idxTime]).replace(/\./g, "/");
        const date    = new Date(dateStr);
        if (isNaN(date.getTime())) continue;

        const pnl          = parseFloat(row[idxProfit] || 0);
        const comm         = parseFloat(row[idxComm] || 0);
        const swap         = parseFloat(row[idxSwap] || 0);
        const netTradePnl  = pnl + comm + swap;

        trades.push({
          symbol: row[idxSymbol] || "UNK",
          dir:    type.includes("buy") ? "Buy" : "Sell",
          lot:    parseFloat(row[idxVolume] || 0),
          entry:  parseFloat(row[idxPrice] || 0),
          exit:   parseFloat(row[idxPrice] || 0),
          pnl:    netTradePnl,
          dateTime:      String(row[idxTime]).replace(/\./g, "-"),
          session:       getSession(date),
          executionTime: String(row[idxTime]).split(" ")[1] || "",
        });
      }

    } else if (isMT5History) {
      // ── Darwinex / MT5 History Report ──────────────────────────────────────
      // Columns (0-indexed): 0=OpenTime, 1=Position, 2=Symbol, 3=Type,
      //   4=Volume, 5=OpenPrice, 6=SL, 7=TP, 8=CloseTime, 9=ClosePrice,
      //   10=Commission, 11=Swap, 12=Profit
      const dataRows = rawData.slice(1); // skip header row

      for (const row of dataRows) {
        if (!row || row.length < 13) continue;

        const openTimeRaw = String(row[0] || "").trim();
        // Stop at summary/total rows (empty first cell or non-date value)
        if (!openTimeRaw || openTimeRaw.toLowerCase().includes("total") || openTimeRaw.toLowerCase().includes("balance")) continue;

        // Parse date: Darwinex uses "YYYY.MM.DD HH:mm:ss"
        const openDateStr  = openTimeRaw.replace(/\./g, "-").replace(" ", "T");
        const closeTimeRaw = String(row[8] || "").trim();
        const closeDateStr = closeTimeRaw.replace(/\./g, "-").replace(" ", "T");

        const openDate = new Date(openDateStr);
        if (isNaN(openDate.getTime())) continue;

        const symbol  = String(row[2] || "UNK").trim();
        const typeStr = String(row[3] || "").toLowerCase().trim();
        const dir     = typeStr.includes("sell") ? "Sell" : "Buy";
        const lot     = parseFloat(row[4]) || 0;
        const entry   = parseFloat(row[5]) || 0;
        const exit    = parseFloat(row[9]) || 0;
        const comm    = parseFloat(row[10]) || 0;
        const swap    = parseFloat(row[11]) || 0;
        const profit  = parseFloat(row[12]) || 0;
        const netPnl  = profit + comm + swap;

        // Use close time as the trade's dateTime (trade is complete at close)
        const closeDate = new Date(closeDateStr);
        const tradeDate = isNaN(closeDate.getTime()) ? openDate : closeDate;

        trades.push({
          symbol,
          dir,
          lot,
          entry,
          exit,
          pnl:           netPnl,
          dateTime:      openTimeRaw.replace(/\./g, "-").substring(0, 16),
          session:       getSession(openDate),
          executionTime: openTimeRaw.split(" ")[1]?.substring(0, 5) || "",
        });
      }

    } else {
      // ── Generic CSV / XLSX Format ──────────────────────────────────────────
      let headersRowIdx = 0;
      let headers = [];
      for (let i = 0; i < Math.min(rawData.length, 10); i++) {
        const row = rawData[i];
        if (row && row.some(cell =>
          typeof cell === "string" &&
          ["symbol", "pair", "pnl", "profit"].includes(cell.toLowerCase())
        )) {
          headersRowIdx = i;
          headers = row.map(h => String(h).toLowerCase().trim().replace(/[\s_]+/g, ""));
          break;
        }
      }

      if (headers.length === 0 && rawData.length > 0) {
        headers = rawData[0].map(h => String(h).toLowerCase().trim().replace(/[\s_]+/g, ""));
      }

      const colIdx = (aliases) => headers.findIndex((h) => aliases.includes(h));

      const idxSymbol = colIdx(["symbol", "pair", "market", "instrument", "asset"]);
      const idxPnl    = colIdx(["pnl", "profit", "p&l", "netpnl", "netp/l", "result", "gain"]);
      const idxTime   = colIdx(["datetime", "date", "time", "date/time", "opened", "closed"]);
      const idxDir    = colIdx(["dir", "direction", "side", "type", "buy/sell"]);
      const idxLot    = colIdx(["lot", "lots", "size", "volume", "amount"]);
      const idxEntry  = colIdx(["entry", "open", "openprice", "entryprice"]);
      const idxExit   = colIdx(["exit", "close", "closeprice", "exitprice"]);

      const rows = rawData.slice(headersRowIdx + 1);

      for (const row of rows) {
        if (!row || row.length === 0 || row[idxSymbol] === undefined) continue;

        const dateStr = idxTime !== -1 && row[idxTime]
          ? String(row[idxTime]).replace(/\./g, "/")
          : new Date().toISOString();
        const date = new Date(dateStr);
        const pnl  = idxPnl !== -1 ? parseFloat(row[idxPnl] || 0) : 0;

        trades.push({
          symbol: idxSymbol !== -1 ? String(row[idxSymbol]) : "XAUUSDm",
          dir:    idxDir !== -1 && String(row[idxDir]).toLowerCase().includes("sell") ? "Sell" : "Buy",
          lot:    idxLot !== -1 ? parseFloat(row[idxLot] || 0) : 0.01,
          entry:  idxEntry !== -1 ? parseFloat(row[idxEntry] || 0) : 0,
          exit:   idxExit !== -1 ? parseFloat(row[idxExit] || 0) : 0,
          pnl,
          dateTime:      String(dateStr).replace(/\//g, "-").replace("T", " ").substring(0, 16),
          session:       isNaN(date.getTime()) ? "Asia" : getSession(date),
          executionTime: isNaN(date.getTime()) ? "" : date.toTimeString().split(" ")[0].substring(0, 5),
        });
      }
    }

    if (trades.length === 0) {
      return NextResponse.json({ error: "Could not extract any trades from the file." }, { status: 400 });
    }

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

    // Save each week and its trades to the DB (better-sqlite3 is sync, no async transactions)
    for (const weekKey in tradesByWeek) {
      const w = tradesByWeek[weekKey];
      const weekId = crypto.randomUUID();

      const net     = w.trades.reduce((s, t) => s + t.pnl, 0);
      const wins    = w.trades.filter((t) => t.pnl > 0).length;
      const winRate = w.trades.length > 0 ? wins / w.trades.length : 0;

      const summary = { netPnL: net, tradesCount: w.trades.length, winRate, bestAsset: "N/A" };
      const coach   = buildCoach(summary, net, winRate);

      // Insert week
      await db.insert(weeksTable).values({
        id: weekId,
        userId: user.id,
        portfolioId: targetPortfolioId,
        week: w.weekNumber,
        month: w.month,
        year: w.year,
        dateRange: `Week ${w.weekNumber} (${w.startDate})`,
        status: "reviewed",
        sourceType: "csv",
        brokerNet: net,
        summary,
        coach,
      });

      // Insert trades
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

        await db.insert(tradesTable).values({
          id:            `${weekId}_${seqId}`,
          weekId:        weekId,
          tradeId:       seqId++,
          dateTime:      gradedTrade.dateTime,
          executionTime: gradedTrade.executionTime,
          session:       gradedTrade.session,
          symbol:        gradedTrade.symbol,
          instrument,
          dir:           gradedTrade.dir,
          lot:           gradedTrade.lot,
          entry:         gradedTrade.entry,
          exit:          gradedTrade.exit,
          pnl:           gradedTrade.pnl,
          grade:         gradedTrade.grade,
          hold:          gradedTrade.hold,
          tag:           gradedTrade.tag,
          setupType:     gradedTrade.setupType,
        });
      }
    }

    revalidatePath("/");
    return NextResponse.json({ success: true, count: trades.length });
  } catch (error) {
    console.error("API Parse File error:", error);
    return NextResponse.json({ error: "Failed to parse trade file. Please check file format." }, { status: 500 });
  }
}
