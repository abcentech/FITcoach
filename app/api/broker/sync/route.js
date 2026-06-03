import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { weeks as weeksTable, trades as tradesTable, portfolios } from "../../../../db/schema";
import { getCurrentUser } from "../../../../db/auth";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { exec } from "child_process";
import path from "path";
import fs from "fs";

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

    const body = await req.json();
    const { login, password, server, terminalPath, portfolioId } = body;

    if (!login || !password || !server) {
      return NextResponse.json({ error: "Missing login, password, or server name." }, { status: 400 });
    }

    let targetPortfolioId = portfolioId;
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

    const scriptPath = path.join(process.cwd(), "scripts", "mt5_sync.py");
    
    // Construct command execution safely
    let cmd = `python "${scriptPath}" --login ${Number(login)} --password "${password.replace(/"/g, '\\"')}" --server "${server.replace(/"/g, '\\"')}" --days 365`;
    if (terminalPath && terminalPath.trim()) {
      cmd += ` --path "${terminalPath.trim().replace(/"/g, '\\"')}"`;
    }

    const executeScript = () => {
      return new Promise((resolve, reject) => {
        // 120s timeout – allows auto-launching and waiting for MT5 terminal startup
        exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
          if (stdout) {
            try {
              const parsed = JSON.parse(stdout.trim());
              if (parsed && (parsed.error || parsed.success)) {
                resolve(stdout);
                return;
              }
            } catch (e) {
              // Not valid JSON, fall through to error check
            }
          }
          if (error) {
            const errMsg = stderr || error.message || "Failed to execute MT5 sync script.";
            console.error("MT5 Sync Execution error:", errMsg);
            reject(new Error(errMsg));
            return;
          }
          resolve(stdout);
        });
      });
    };

    let resultJson;
    try {
      const stdout = await executeScript();
      resultJson = JSON.parse(stdout);
    } catch (err) {
      return NextResponse.json({ error: `MetaTrader 5 Sync failed: ${err.message}` }, { status: 500 });
    }

    if (resultJson.error) {
      return NextResponse.json({ error: resultJson.error }, { status: 500 });
    }

    const trades = resultJson.trades || [];
    const accountBalance = resultJson.balance || 0;
    const accountCurrency = resultJson.currency || "USD";
    if (trades.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No closed trade history found on this account for the last 365 days." });
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

    // Save each week and its trades to the DB
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
        sourceType: "csv", // Treats verified sync data as verified CSV
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

        const date = new Date(gradedTrade.dateTime.replace(/-/g, "/"));
        
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
    return NextResponse.json({ 
      success: true, 
      count: trades.length,
      balance: accountBalance,
      currency: accountCurrency,
      message: `Successfully synced ${trades.length} trades from Exness account ${login}.`
    });
  } catch (error) {
    console.error("Broker Sync Endpoint error:", error);
    return NextResponse.json({ error: "Failed to connect and sync with MetaTrader 5." }, { status: 500 });
  }
}
