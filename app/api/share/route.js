import { NextResponse } from 'next/server';
import { db } from '../../../db';
import { shareTokens, portfolios, weeks, trades, playbook, dailyJournals } from '../../../db/schema';
import { eq, inArray, and } from 'drizzle-orm';

function computeSummary(tradeList) {
  const list = tradeList || [];
  const wins = list.filter(t => (t.pnl || 0) > 0);
  const losses = list.filter(t => (t.pnl || 0) < 0);
  const grossProfit = wins.reduce((s, t) => s + (t.pnl || 0), 0);
  const grossLoss = losses.reduce((s, t) => s + (t.pnl || 0), 0);
  const netPnL = grossProfit + grossLoss;
  const winRate = list.length ? wins.length / list.length : 0;
  const profitFactor = grossLoss ? grossProfit / Math.abs(grossLoss) : (grossProfit > 0 ? 99 : 0);
  const pnlValues = list.map(t => t.pnl || 0);
  const bestTrade = pnlValues.length ? Math.max(...pnlValues) : 0;
  const worstTrade = pnlValues.length ? Math.min(...pnlValues) : 0;
  return {
    trades: list.length,
    tradesCount: list.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    netPnL,
    profitFactor,
    grossProfit,
    grossLoss,
    bestTrade,
    worstTrade,
  };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Resolve share token
    const tokenRows = await db.select().from(shareTokens).where(eq(shareTokens.token, token));
    if (tokenRows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired share token' }, { status: 404 });
    }

    const shareToken = tokenRows[0];
    const userId = shareToken.userId;
    let portfolioId = shareToken.portfolioId;

    // Fetch the target portfolio
    let activePortfolio = null;
    if (portfolioId) {
      const ports = await db.select().from(portfolios).where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)));
      if (ports.length > 0) activePortfolio = ports[0];
    } else {
      // Default to first user portfolio if none was specific
      const ports = await db.select().from(portfolios).where(eq(portfolios.userId, userId));
      if (ports.length > 0) {
        activePortfolio = ports[0];
        portfolioId = activePortfolio.id;
      }
    }

    if (!activePortfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Fetch weeks in portfolio
    const allWeeks = await db.select()
      .from(weeks)
      .where(and(eq(weeks.userId, userId), eq(weeks.portfolioId, portfolioId)))
      .orderBy(weeks.week);

    let formattedWeeks = [];
    if (allWeeks.length > 0) {
      const weekIds = allWeeks.map(w => w.id);
      const allTrades = await db.select().from(trades).where(inArray(trades.weekId, weekIds));

      const tradesByWeek = allTrades.reduce((acc, trade) => {
        if (!acc[trade.weekId]) acc[trade.weekId] = [];
        acc[trade.weekId].push({
          ...trade,
          id: trade.id,
          tradeNum: trade.tradeId,
        });
        return acc;
      }, {});

      formattedWeeks = allWeeks.map((weekRow) => {
        const weekTrades = (tradesByWeek[weekRow.id] || []).sort((a, b) => (a.tradeNum || 0) - (b.tradeNum || 0));
        const fullSummary = computeSummary(weekTrades);
        const dbCoach = weekRow.coach || {};
        return {
          id: weekRow.id,
          week: weekRow.week,
          month: weekRow.month,
          year: weekRow.year,
          dateRange: weekRow.dateRange,
          status: weekRow.status,
          sourceType: weekRow.sourceType,
          brokerNet: weekRow.brokerNet,
          screenshots: weekRow.screenshots || {},
          summary: fullSummary,
          coach: dbCoach,
          trades: weekTrades,
          portfolioId: weekRow.portfolioId,
        };
      });
    }

    // Fetch playbook setups
    const setups = await db.select().from(playbook).where(eq(playbook.userId, userId));

    // Fetch daily journals
    const journals = await db.select().from(dailyJournals).where(eq(dailyJournals.userId, userId));

    return NextResponse.json({
      portfolio: activePortfolio,
      weeks: formattedWeeks,
      playbook: setups,
      dailyJournals: journals,
    });
  } catch (error) {
    console.error('Share Route Error:', error);
    return NextResponse.json({ error: 'Server error resolving share token' }, { status: 500 });
  }
}
