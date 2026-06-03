"use server";

import { db } from "../db";
import { weeks, trades, portfolios, playbook, dailyJournals, shareTokens, journalFolders, journalTags, journalNotes, noteTags, preMarketPlans, tradeApprovals, riskSettings, preTradeCheckins, dailyReviews } from "../db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../db/auth";

// Compute a full summary from raw trade rows — mirrors the client-side summarize() function
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

export async function getWeeks(portfolioId = null) {
  const user = await getCurrentUser();
  if (!user) return [];

  // Default to Master Portfolio if no ID is specified and portfolios exist
  let targetPortfolioId = portfolioId;
  if (!targetPortfolioId) {
    const userPortfolios = await db.select().from(portfolios).where(eq(portfolios.userId, user.id));
    if (userPortfolios.length > 0) {
      // Find default or first
      targetPortfolioId = userPortfolios[0].id;
    } else {
      // Create a default portfolio if none exist
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

  let allWeeks = await db.select()
    .from(weeks)
    .where(and(eq(weeks.userId, user.id), eq(weeks.portfolioId, targetPortfolioId)))
    .orderBy(weeks.year, weeks.week);

  if (allWeeks.length === 0) {
    const templateWeek = await db.select().from(weeks).where(eq(weeks.id, 'week1')).limit(1);
    if (templateWeek.length > 0) {
      const newWeekId = `seeded-week1-${user.id}`;
      await db.insert(weeks).values({
        id: newWeekId,
        userId: user.id,
        portfolioId: targetPortfolioId,
        week: templateWeek[0].week,
        month: templateWeek[0].month || 'May',
        year: templateWeek[0].year || 2026,
        dateRange: templateWeek[0].dateRange,
        status: templateWeek[0].status,
        sourceType: templateWeek[0].sourceType,
        brokerNet: templateWeek[0].brokerNet,
        screenshots: templateWeek[0].screenshots || {},
        summary: templateWeek[0].summary || {},
        coach: templateWeek[0].coach || {},
      }).onConflictDoNothing();

      const templateTrades = await db.select().from(trades).where(eq(trades.weekId, 'week1'));
      for (const t of templateTrades) {
        await db.insert(trades).values({
          ...t,
          id: `${newWeekId}_${t.tradeId}`,
          weekId: newWeekId,
        }).onConflictDoNothing();
      }

      allWeeks = await db.select()
        .from(weeks)
        .where(and(eq(weeks.userId, user.id), eq(weeks.portfolioId, targetPortfolioId)))
        .orderBy(weeks.year, weeks.week);
    }
  }

  if (allWeeks.length === 0) return [];

  const weekIds = allWeeks.map(w => w.id);
  const allTrades = await db.select().from(trades).where(inArray(trades.weekId, weekIds));

  // Group trades by weekId
  const tradesByWeek = allTrades.reduce((acc, trade) => {
    if (!acc[trade.weekId]) acc[trade.weekId] = [];
    acc[trade.weekId].push({
      ...trade,
      id: trade.id,        // UUID — globally unique, safe as React key
      tradeNum: trade.tradeId, // sequential display number per week
    });
    return acc;
  }, {});

  // Construct the object exactly as the UI expects it
  const formattedWeeks = allWeeks.map((weekRow) => {
    const weekTrades = (tradesByWeek[weekRow.id] || []).sort((a, b) => (a.tradeNum || 0) - (b.tradeNum || 0));
    // Always recompute a full summary from live trade data — never trust partial DB summary
    const fullSummary = computeSummary(weekTrades);
    // Merge DB coach verdict into the computed summary
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

  return formattedWeeks;
}

export async function saveWeek(weekObj, portfolioId = null) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

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

  // Insert the week
  await db.insert(weeks).values({
    id: weekObj.id,
    userId: user.id,
    portfolioId: targetPortfolioId,
    week: weekObj.week,
    month: weekObj.month || null,
    year: weekObj.year || null,
    dateRange: weekObj.dateRange,
    status: weekObj.status,
    sourceType: weekObj.sourceType,
    brokerNet: weekObj.brokerNet,
    screenshots: weekObj.screenshots || {},
    summary: weekObj.summary || {},
    coach: weekObj.coach || {},
  }).onConflictDoUpdate({
    target: weeks.id,
    set: {
      summary: weekObj.summary || {},
      coach: weekObj.coach || {},
      portfolioId: targetPortfolioId,
    }
  });

  // Insert all trades
  if (weekObj.trades && weekObj.trades.length > 0) {
    const tradeRows = weekObj.trades.map((t) => ({
      id: `${weekObj.id}_${t.id}`, // composite unique ID for sqlite
      weekId: weekObj.id,
      tradeId: t.id,
      dateTime: t.dateTime,
      symbol: t.symbol,
      instrument: t.instrument,
      dir: t.dir,
      lot: t.lot,
      entry: t.entry,
      exit: t.exit,
      pnl: t.pnl,
      high: t.high,
      low: t.low,
      grade: t.grade,
      hold: t.hold,
      tag: t.tag,
      h1: t.h1,
      m15: t.m15,
      setupType: t.setupType,
      compliance: t.compliance || null,
      checkedRules: t.checkedRules || null,
    }));

    for (const tr of tradeRows) {
      await db.insert(trades).values(tr).onConflictDoUpdate({
        target: trades.id,
        set: tr
      });
    }
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateWeekData(weekId, updatedSummary, updatedCoach, tradesToUpdate) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Verify ownership
  const existingWeeks = await db.select().from(weeks).where(eq(weeks.id, weekId));
  if (existingWeeks.length === 0 || existingWeeks[0].userId !== user.id) {
    throw new Error("Unauthorized access to this data.");
  }

  await db.update(weeks).set({
    summary: updatedSummary,
    coach: updatedCoach
  }).where(eq(weeks.id, weekId));

  if (tradesToUpdate && tradesToUpdate.length > 0) {
    for (const t of tradesToUpdate) {
       await db.update(trades).set({
          pnl: t.pnl,
          grade: t.grade,
          setupType: t.setupType,
          high: t.high,
          low: t.low,
          tag: t.tag,
          hold: t.hold,
          h1: t.h1,
          m15: t.m15,
          compliance: t.compliance ?? null,
          checkedRules: t.checkedRules ?? null,
       }).where(eq(trades.id, `${weekId}_${t.id}`));
    }
  }
  revalidatePath('/');
}

// Portfolios CRUD Server Actions
export async function getPortfolios() {
  const user = await getCurrentUser();
  if (!user) return [];

  let userPortfolios = await db.select().from(portfolios).where(eq(portfolios.userId, user.id));
  if (userPortfolios.length === 0) {
    const defaultId = `default-${user.id}`;
    const defaultPortfolio = {
      id: defaultId,
      userId: user.id,
      name: "Master Portfolio",
      broker: "Standard",
      accountType: "Live",
      initialBalance: 10000
    };
    await db.insert(portfolios).values(defaultPortfolio).onConflictDoNothing();
    userPortfolios = [defaultPortfolio];
  }
  return userPortfolios;
}

export async function createPortfolio(name, broker, accountType, initialBalance) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const newPortfolio = {
    id: `portfolio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: user.id,
    name,
    broker,
    accountType,
    initialBalance: Number(initialBalance) || 10000
  };

  await db.insert(portfolios).values(newPortfolio);
  revalidatePath('/');
  return newPortfolio;
}

export async function deletePortfolio(portfolioId) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Prevent deleting the last portfolio
  const userPortfolios = await db.select().from(portfolios).where(eq(portfolios.userId, user.id));
  if (userPortfolios.length <= 1) {
    throw new Error("Cannot delete your only portfolio.");
  }

  await db.delete(portfolios).where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, user.id)));
  revalidatePath('/');
  return { success: true };
}

// Playbooks Server Actions
export async function getPlaybookSetups() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(playbook).where(eq(playbook.userId, user.id));
}

export async function savePlaybookSetup(setupObj) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const id = setupObj.id || `playbook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const values = {
    id,
    userId: user.id,
    name: setupObj.name,
    description: setupObj.description || "",
    rules: setupObj.rules || [],
  };

  await db.insert(playbook).values(values).onConflictDoUpdate({
    target: playbook.id,
    set: {
      name: setupObj.name,
      description: setupObj.description || "",
      rules: setupObj.rules || [],
    }
  });

  revalidatePath('/');
  return values;
}

export async function deletePlaybookSetup(setupId) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.delete(playbook).where(and(eq(playbook.id, setupId), eq(playbook.userId, user.id)));
  revalidatePath('/');
  return { success: true };
}

// Daily Journal Server Actions
export async function getDailyJournal(date) {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await db.select().from(dailyJournals).where(and(eq(dailyJournals.userId, user.id), eq(dailyJournals.date, date)));
  return result[0] || null;
}

export async function saveDailyJournal(journalObj) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const id = journalObj.id || `journal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const values = {
    id,
    userId: user.id,
    date: journalObj.date,
    mood: journalObj.mood || "🧘 Calm",
    rating: Number(journalObj.rating) || 5,
    notes: journalObj.notes || "",
    screenshots: journalObj.screenshots || [],
  };

  await db.insert(dailyJournals).values(values).onConflictDoUpdate({
    target: dailyJournals.id,
    set: {
      mood: journalObj.mood || "🧘 Calm",
      rating: Number(journalObj.rating) || 5,
      notes: journalObj.notes || "",
      screenshots: journalObj.screenshots || [],
    }
  });

  revalidatePath('/');
  return values;
}

// Share Token Server Actions
export async function generateShareToken(portfolioId = null) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const existing = await db.select().from(shareTokens).where(
    and(
      eq(shareTokens.userId, user.id),
      portfolioId ? eq(shareTokens.portfolioId, portfolioId) : eq(shareTokens.portfolioId, null)
    )
  );

  if (existing.length > 0) {
    return existing[0].token;
  }

  const token = `share-${crypto.randomUUID().replace(/-/g, '')}`;
  await db.insert(shareTokens).values({
    id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: user.id,
    portfolioId: portfolioId || null,
    token,
    expiresAt: null // Never expires for simplicity
  });

  return token;
}

export async function getShareTokens() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(shareTokens).where(eq(shareTokens.userId, user.id));
}

export async function revokeShareToken(token) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.delete(shareTokens).where(and(eq(shareTokens.token, token), eq(shareTokens.userId, user.id)));
  revalidatePath('/');
  return { success: true };
}

export async function getDailyJournals() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(dailyJournals).where(eq(dailyJournals.userId, user.id)).orderBy(desc(dailyJournals.date));
}

export async function deleteDailyJournal(id) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await db.delete(dailyJournals).where(and(eq(dailyJournals.id, id), eq(dailyJournals.userId, user.id)));
  revalidatePath('/');
  return { success: true };
}

export async function simulateBrokerSync(portfolioId) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const weekId = `week-sync-${Date.now()}`;
  const now = new Date();
  
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}.${m}.${d} ${hh}:${mm}`;
  };

  const symbols = ["XAUUSDm", "BTCUSDm", "USTECm"];
  const directions = ["Buy", "Sell"];
  const mockTrades = [];

  for (let i = 1; i <= 10; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const lot = Math.random() > 0.5 ? 0.02 : 0.01;
    
    let entry = 2000;
    let exit = 2005;
    let pnl = 10;
    
    if (symbol.includes("XAU")) {
      entry = 2000 + Math.random() * 50;
      const diff = (Math.random() - 0.4) * 8;
      exit = entry + (dir === "Buy" ? diff : -diff);
      pnl = Math.round(diff * lot * 100 * 100) / 100;
    } else if (symbol.includes("BTC")) {
      entry = 60000 + Math.random() * 1000;
      const diff = (Math.random() - 0.45) * 400;
      exit = entry + (dir === "Buy" ? diff : -diff);
      pnl = Math.round(diff * lot * 100) / 100;
    } else {
      entry = 15000 + Math.random() * 200;
      const diff = (Math.random() - 0.4) * 50;
      exit = entry + (dir === "Buy" ? diff : -diff);
      pnl = Math.round(diff * lot * 5 * 100) / 100;
    }

    const tradeDate = new Date(now.getTime() - (10 - i) * 3 * 3600 * 1000);
    
    mockTrades.push({
      id: i,
      dateTime: formatDate(tradeDate),
      symbol,
      dir,
      lot,
      entry,
      exit,
      pnl,
      high: Math.max(entry, exit) + (Math.random() * 2),
      low: Math.min(entry, exit) - (Math.random() * 2),
      grade: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
      setupType: "Impulse Pullback",
      tag: "Impulse Pullback",
      hold: "15m",
      compliance: 1.0,
      checkedRules: { "Rule 1": true, "Rule 2": true }
    });
  }

  const weekNum = `Sync-${now.getMonth() + 1}${now.getDate()}-${String(now.getTime()).slice(-4)}`;
  const weekObj = {
    id: weekId,
    week: weekNum,
    month: now.toLocaleString('default', { month: 'long' }),
    year: now.getFullYear(),
    dateRange: `${now.toLocaleDateString()} - Sync`,
    status: "Reviewed",
    sourceType: "BrokerSync",
    brokerNet: mockTrades.reduce((sum, t) => sum + t.pnl, 0),
    trades: mockTrades,
    screenshots: {},
    summary: {},
    coach: { verdict: "Disciplined execution synced via simulated MetaTrader connection." }
  };

  await saveWeek(weekObj, portfolioId);
  return { success: true, weekId };
}

// Notebook (Journal) Server Actions
export async function getJournalFolders() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(journalFolders).where(eq(journalFolders.userId, user.id));
}

export async function createJournalFolder(name, icon = '📁') {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const values = { id, userId: user.id, name, icon };
  await db.insert(journalFolders).values(values);
  revalidatePath('/');
  return values;
}

export async function getJournalNotes() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(journalNotes).where(eq(journalNotes.userId, user.id)).orderBy(desc(journalNotes.updatedAt));
}

export async function saveJournalNote(noteObj) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const id = noteObj.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const values = {
    id,
    userId: user.id,
    folderId: noteObj.folderId || null,
    date: noteObj.date || null,
    title: noteObj.title || "Untitled Note",
    content: noteObj.content || "",
    updatedAt: new Date().toISOString()
  };

  await db.insert(journalNotes).values(values).onConflictDoUpdate({
    target: journalNotes.id,
    set: {
      folderId: values.folderId,
      date: values.date,
      title: values.title,
      content: values.content,
      updatedAt: values.updatedAt
    }
  });
  
  revalidatePath('/');
  return values;
}

export async function deleteJournalNote(noteId) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  await db.delete(journalNotes).where(and(eq(journalNotes.id, noteId), eq(journalNotes.userId, user.id)));
  revalidatePath('/');
  return { success: true };
}

// Pre-market plans Server Actions
export async function getPreMarketPlan(date) {
  const user = await getCurrentUser();
  if (!user) return null;
  const result = await db.select().from(preMarketPlans).where(and(eq(preMarketPlans.userId, user.id), eq(preMarketPlans.date, date))).limit(1);
  return result[0] || null;
}

export async function getAllPreMarketPlans() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(preMarketPlans).where(eq(preMarketPlans.userId, user.id)).orderBy(desc(preMarketPlans.date));
}

export async function savePreMarketPlan(planObj) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const id = planObj.id || `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const values = {
    id,
    userId: user.id,
    date: planObj.date,
    htfBias: planObj.htfBias || "",
    keyLevels: planObj.keyLevels || "",
    liquidityZones: planObj.liquidityZones || "",
    sessionFocus: planObj.sessionFocus || "",
    scenarioA: planObj.scenarioA || "",
    scenarioB: planObj.scenarioB || "",
    scenarioC: planObj.scenarioC || "",
    conditionsNoTrade: planObj.conditionsNoTrade || "",
    maxTrades: Number(planObj.maxTrades) || 3,
    riskLimit: Number(planObj.riskLimit) || 1,
    screenshot: planObj.screenshot || null,
    notes: planObj.notes || "",
  };

  await db.insert(preMarketPlans).values(values).onConflictDoUpdate({
    target: preMarketPlans.id,
    set: {
      htfBias: values.htfBias,
      keyLevels: values.keyLevels,
      liquidityZones: values.liquidityZones,
      sessionFocus: values.sessionFocus,
      scenarioA: values.scenarioA,
      scenarioB: values.scenarioB,
      scenarioC: values.scenarioC,
      conditionsNoTrade: values.conditionsNoTrade,
      maxTrades: values.maxTrades,
      riskLimit: values.riskLimit,
      screenshot: values.screenshot,
      notes: values.notes,
    }
  });

  revalidatePath('/');
  return values;
}

// Trade Approvals Server Actions
export async function getTradeApprovals(date) {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(tradeApprovals).where(and(eq(tradeApprovals.userId, user.id), eq(tradeApprovals.date, date)));
}

export async function saveTradeApproval(approvalObj) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const id = approvalObj.id || `apprv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const values = {
    id,
    userId: user.id,
    date: approvalObj.date,
    time: approvalObj.time,
    symbol: approvalObj.symbol,
    setupType: approvalObj.setupType || "",
    status: approvalObj.status,
    criteria: approvalObj.criteria || "",
    reason: approvalObj.reason || "",
  };

  await db.insert(tradeApprovals).values(values);
  revalidatePath('/');
  return values;
}

// Risk Settings Server Actions
export async function getRiskSettings(portfolioId) {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await db.select().from(riskSettings).where(eq(riskSettings.portfolioId, portfolioId)).limit(1);
  if (result.length > 0) return result[0];

  // Default risk settings if none exist
  const defaults = {
    portfolioId,
    maxDailyLoss: 500,
    maxWeeklyDrawdown: 1500,
    maxTradesPerDay: 3,
    cooldownTimerMinutes: 30,
    emotionalTradeLimit: 2,
    consecutiveLossesLimit: 2,
    lockActiveUntil: null,
    lockReason: null,
  };
  await db.insert(riskSettings).values(defaults).onConflictDoNothing();
  return defaults;
}

export async function saveRiskSettings(settingsObj) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const values = {
    portfolioId: settingsObj.portfolioId,
    maxDailyLoss: Number(settingsObj.maxDailyLoss) || 500,
    maxWeeklyDrawdown: Number(settingsObj.maxWeeklyDrawdown) || 1500,
    maxTradesPerDay: Number(settingsObj.maxTradesPerDay) || 3,
    cooldownTimerMinutes: Number(settingsObj.cooldownTimerMinutes) || 30,
    emotionalTradeLimit: Number(settingsObj.emotionalTradeLimit) || 2,
    consecutiveLossesLimit: Number(settingsObj.consecutiveLossesLimit) || 2,
    lockActiveUntil: settingsObj.lockActiveUntil || null,
    lockReason: settingsObj.lockReason || null,
  };

  await db.insert(riskSettings).values(values).onConflictDoUpdate({
    target: riskSettings.portfolioId,
    set: {
      maxDailyLoss: values.maxDailyLoss,
      maxWeeklyDrawdown: values.maxWeeklyDrawdown,
      maxTradesPerDay: values.maxTradesPerDay,
      cooldownTimerMinutes: values.cooldownTimerMinutes,
      emotionalTradeLimit: values.emotionalTradeLimit,
      consecutiveLossesLimit: values.consecutiveLossesLimit,
      lockActiveUntil: values.lockActiveUntil,
      lockReason: values.lockReason,
      lastUpdated: new Date().toISOString()
    }
  });

  revalidatePath('/');
  return values;
}

// Pre-trade Checkins Server Actions
export async function getPreTradeCheckin(date) {
  const user = await getCurrentUser();
  if (!user) return null;
  const result = await db.select().from(preTradeCheckins).where(and(eq(preTradeCheckins.userId, user.id), eq(preTradeCheckins.date, date))).limit(1);
  return result[0] || null;
}

export async function savePreTradeCheckin(checkinObj) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const id = checkinObj.id || `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const values = {
    id,
    userId: user.id,
    date: checkinObj.date,
    time: checkinObj.time,
    focus: Number(checkinObj.focus) || 5,
    sleep: Number(checkinObj.sleep) || 5,
    patience: Number(checkinObj.patience) || 5,
    urgency: Number(checkinObj.urgency) || 5,
    emotionalStability: Number(checkinObj.emotionalStability) || 5,
    confidence: Number(checkinObj.confidence) || 5,
    frustration: Number(checkinObj.frustration) || 1,
    readinessScore: Number(checkinObj.readinessScore) || 100,
    riskLevel: checkinObj.riskLevel || "Low",
  };

  await db.insert(preTradeCheckins).values(values).onConflictDoUpdate({
    target: preTradeCheckins.id,
    set: {
      time: values.time,
      focus: values.focus,
      sleep: values.sleep,
      patience: values.patience,
      urgency: values.urgency,
      emotionalStability: values.emotionalStability,
      confidence: values.confidence,
      frustration: values.frustration,
      readinessScore: values.readinessScore,
      riskLevel: values.riskLevel,
    }
  });

  revalidatePath('/');
  return values;
}

// Daily Reviews Server Actions
export async function getDailyReview(date) {
  const user = await getCurrentUser();
  if (!user) return null;
  const result = await db.select().from(dailyReviews).where(and(eq(dailyReviews.userId, user.id), eq(dailyReviews.date, date))).limit(1);
  return result[0] || null;
}

export async function saveDailyReview(reviewObj) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const id = reviewObj.id || `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const values = {
    id,
    userId: user.id,
    date: reviewObj.date,
    followedPlan: Number(reviewObj.followedPlan) || 1,
    chased: Number(reviewObj.chased) || 0,
    patient: Number(reviewObj.patient) || 1,
    emotionalTriggers: reviewObj.emotionalTriggers || "",
    improvements: reviewObj.improvements || "",
    disciplineScore: Number(reviewObj.disciplineScore) || 100,
    executionGrade: reviewObj.executionGrade || "A",
    emotionalControlScore: Number(reviewObj.emotionalControlScore) || 100,
  };

  await db.insert(dailyReviews).values(values).onConflictDoUpdate({
    target: dailyReviews.id,
    set: {
      followedPlan: values.followedPlan,
      chased: values.chased,
      patient: values.patient,
      emotionalTriggers: values.emotionalTriggers,
      improvements: values.improvements,
      disciplineScore: values.disciplineScore,
      executionGrade: values.executionGrade,
      emotionalControlScore: values.emotionalControlScore,
    }
  });

  revalidatePath('/');
  return values;
}

export async function getAllDailyReviews() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(dailyReviews).where(eq(dailyReviews.userId, user.id)).orderBy(desc(dailyReviews.date));
}

export async function getAllPreTradeCheckins() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db.select().from(preTradeCheckins).where(eq(preTradeCheckins.userId, user.id)).orderBy(desc(preTradeCheckins.date));
}
