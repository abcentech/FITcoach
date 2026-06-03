"use client";
import React, { useState, useMemo } from "react";
import { Panel, Info, KpiCard } from "./ui";
import { n, fmtMoney, pnlColor, fmtPct } from "./utils";

export function EquityCurve({ trades, initialBalance = 10000 }) {
  const [showDrawdown, setShowDrawdown] = useState(true);
  const [showDisciplinePotential, setShowDisciplinePotential] = useState(true);

  const points = useMemo(() => {
    let c = 0;
    let cDiscipline = 0;
    const list = [...(trades || [])].sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)));
    return list.map((t, i) => {
      const pnlVal = n(t.pnl);
      c += pnlVal;
      
      const isBreach = ["D", "F"].includes(t.grade) || 
                       String(t.tag || "").toLowerCase().includes("avoid") ||
                       String(t.tag || "").toLowerCase().includes("chase") ||
                       String(t.tag || "").toLowerCase().includes("mistake") ||
                       String(t.tag || "").toLowerCase().includes("late");
                       
      if (!isBreach) {
        cDiscipline += pnlVal;
      }
      return { 
        x: i, 
        y: c, 
        yDiscipline: cDiscipline,
        pnl: pnlVal,
        isBreach
      };
    });
  }, [trades]);

  if (!points.length) {
    return (
      <Panel title="Cognitive Equity Mainframe">
        <div className="flex h-52 items-center justify-center text-slate-500">No trades yet</div>
      </Panel>
    );
  }

  const minY = Math.min(0, ...points.map((p) => p.y), ...points.map((p) => p.yDiscipline));
  const maxY = Math.max(1, ...points.map((p) => p.y), ...points.map((p) => p.yDiscipline));
  const w = 760, h = 240, pad = 22;

  const path = [];
  let runningMaxY = -Infinity;
  
  points.forEach((p, idx) => {
    const sx = pad + (points.length === 1 ? 0 : (p.x / (points.length - 1)) * (w - pad * 2));
    const sy = h - pad - ((p.y - minY) / Math.max(1, maxY - minY)) * (h - pad * 2);
    const syDiscipline = h - pad - ((p.yDiscipline - minY) / Math.max(1, maxY - minY)) * (h - pad * 2);
    
    if (p.y > runningMaxY) {
      runningMaxY = p.y;
    }
    const peakSy = h - pad - ((runningMaxY - minY) / Math.max(1, maxY - minY)) * (h - pad * 2);

    path.push({ ...p, sx, sy, syDiscipline, peakSy });
  });

  const d = path.map((p, i) => `${i ? "L" : "M"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");
  const dDiscipline = path.map((p, i) => `${i ? "L" : "M"}${p.sx.toFixed(1)},${p.syDiscipline.toFixed(1)}`).join(" ");

  const drawdownPathPoints = [];
  path.forEach(p => {
    drawdownPathPoints.push(`${p.sx.toFixed(1)},${p.sy.toFixed(1)}`);
  });
  for (let i = path.length - 1; i >= 0; i--) {
    drawdownPathPoints.push(`${path[i].sx.toFixed(1)},${path[i].peakSy.toFixed(1)}`);
  }
  const drawdownD = "M" + drawdownPathPoints.join(" L") + " Z";

  const win = path.reduce((a, b) => b.pnl > a.pnl ? b : a, path[0]);
  const loss = path.reduce((a, b) => b.pnl < a.pnl ? b : a, path[0]);
  
  const finalEquity = points.at(-1).y;
  const finalDisciplineEquity = points.at(-1).yDiscipline;
  const emotionalTax = finalDisciplineEquity - finalEquity;
  
  let maxDDVal = 0;
  let runningPeak = initialBalance;
  let bal = initialBalance;
  points.forEach(p => {
    bal += p.pnl;
    if (bal > runningPeak) runningPeak = bal;
    const dd = runningPeak - bal;
    if (dd > maxDDVal) maxDDVal = dd;
  });
  const maxDDPct = runningPeak > 0 ? (maxDDVal / runningPeak) * 100 : 0;

  return (
    <Panel 
      title="Cognitive Equity Mainframe" 
      right={
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowDrawdown(!showDrawdown)} 
            className={`rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border transition ${showDrawdown ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}
          >
            Drawdown: {showDrawdown ? "ON" : "OFF"}
          </button>
          <button 
            onClick={() => setShowDisciplinePotential(!showDisciplinePotential)} 
            className={`rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border transition ${showDisciplinePotential ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}
          >
            Discipline Curve: {showDisciplinePotential ? "ON" : "OFF"}
          </button>
          <span className={`font-black text-sm px-2.5 py-1 rounded-xl bg-zinc-950 border border-zinc-900 ${pnlColor(finalEquity)}`}>
            {fmtMoney(finalEquity)}
          </span>
        </div>
      }
    >
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-64 w-full select-none">
          <rect width={w} height={h} rx="18" fill="rgba(10, 14, 28, 0.4)"/>
          <line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} stroke="var(--slate-800)" strokeWidth="0.5"/>
          
          {showDrawdown && path.length > 1 && (
            <path d={drawdownD} fill="rgba(244, 63, 94, 0.05)" stroke="rgba(244, 63, 94, 0.15)" strokeWidth="1" />
          )}
          
          {/* Discipline Potential Curve (Dotted Gold) */}
          {showDisciplinePotential && path.length > 1 && (
            <path d={dDiscipline} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6,4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
          )}

          {/* Actual Equity Curve */}
          <path d={d} fill="none" stroke={finalEquity >= 0 ? "#10b981" : "#ef4444"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          
          <circle cx={win.sx} cy={win.sy} r="4" fill="#10b981"/>
          <circle cx={loss.sx} cy={loss.sy} r="4" fill="#ef4444"/>
        </svg>

        {/* Legend Overlay */}
        <div className="absolute top-4 left-4 flex gap-4 text-[9px] text-slate-500 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-900/55 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Actual Realized Curve</span>
          </div>
          {showDisciplinePotential && (
            <div className="flex items-center gap-1">
              <span className="h-2 w-4 border-t-2 border-dashed border-amber-400" />
              <span>Disciplined Potential Curve</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Info text="Largest Profit Trade" value={fmtMoney(win.pnl)} good/>
        <Info text="Largest Loss Trade" value={fmtMoney(loss.pnl)} bad/>
        <Info text="Maximum Drawdown" value={`-${maxDDPct.toFixed(2)}%`} bad={maxDDPct > 5} good={maxDDPct <= 5} />
        <Info 
          text="Emotional Leakage Tax" 
          value={emotionalTax > 0 ? `${fmtMoney(emotionalTax)}` : "$0.00"} 
          bad={emotionalTax > 0} 
          good={emotionalTax <= 0} 
        />
      </div>
    </Panel>
  );
}

export function StreakTracker({ trades }) {
  const stats = useMemo(() => {
    const sorted = [...(trades || [])].sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)));
    if (!sorted.length) return { currentStreak: "0", winStreak: 0, lossStreak: 0, consistency: "0%", maxTradesDay: 0 };
    
    let currentStreak = 0;
    let streakType = null;
    let winStreak = 0;
    let lossStreak = 0;
    
    let tempWin = 0;
    let tempLoss = 0;
    
    sorted.forEach(t => {
      const pnlVal = n(t.pnl);
      if (pnlVal > 0) {
        tempWin++;
        tempLoss = 0;
        if (tempWin > winStreak) winStreak = tempWin;
      } else if (pnlVal < 0) {
        tempLoss++;
        tempWin = 0;
        if (tempLoss > lossStreak) lossStreak = tempLoss;
      }
    });

    for (let i = sorted.length - 1; i >= 0; i--) {
      const pnlVal = n(sorted[i].pnl);
      if (pnlVal === 0) continue;
      const type = pnlVal > 0 ? "win" : "loss";
      if (streakType === null) {
        streakType = type;
        currentStreak = 1;
      } else if (streakType === type) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    const dayPnL = {};
    const dayCounts = {};
    sorted.forEach(t => {
      const day = (t.dateTime || "").split(" ")[0] || "Unknown";
      dayPnL[day] = (dayPnL[day] || 0) + n(t.pnl);
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    
    const days = Object.keys(dayPnL);
    const profitableDays = days.filter(d => dayPnL[d] > 0).length;
    const consistency = days.length ? `${((profitableDays / days.length) * 100).toFixed(0)}%` : "0%";
    
    const maxTradesDay = Math.max(0, ...Object.values(dayCounts));
    
    const currentStreakStr = currentStreak > 0 
      ? `${currentStreak} ${streakType === "win" ? "Wins" : "Losses"}` 
      : "0";
      
    return {
      currentStreak: currentStreakStr,
      winStreak,
      lossStreak,
      consistency,
      maxTradesDay,
      streakType
    };
  }, [trades]);

  return (
    <Panel title="Streaks & Consistency">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <KpiCard label="Current Streak" value={stats.currentStreak} tone={stats.streakType === "win" ? "green" : stats.streakType === "loss" ? "red" : "neutral"} />
        <KpiCard label="Max Win Streak" value={`${stats.winStreak} Wins`} tone="green" />
        <KpiCard label="Max Loss Streak" value={`${stats.lossStreak} Losses`} tone="red" />
        <KpiCard label="Consistency Score" value={stats.consistency} tone="amber" helper="Profitable days / active days" />
        <KpiCard label="Max Daily Trades" value={String(stats.maxTradesDay)} tone={stats.maxTradesDay > 3 ? "red" : "neutral"} helper="Overtrading indicator" />
      </div>
    </Panel>
  );
}

export function DrawdownMeter({ trades, initialBalance = 10000 }) {
  const stats = useMemo(() => {
    const sorted = [...(trades || [])].sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)));
    const startBalance = initialBalance;
    let balance = startBalance;
    let peak = startBalance;
    let maxDD = 0;
    
    sorted.forEach(t => {
      balance += n(t.pnl);
      if (balance > peak) {
        peak = balance;
      }
      const dd = peak - balance;
      if (dd > maxDD) {
        maxDD = dd;
      }
    });
    
    const netPnL = balance - startBalance;
    const currentDD = peak - balance;
    const currentDDPct = peak > 0 ? (currentDD / peak) * 100 : 0;
    const maxDDPct = peak > 0 ? (maxDD / peak) * 100 : 0;
    const recoveryFactor = maxDD > 0 ? Math.abs(netPnL) / maxDD : 0;
    
    return {
      currentDD,
      currentDDPct,
      maxDD,
      maxDDPct,
      recoveryFactor,
      netPnL
    };
  }, [trades]);

  const ddProgress = stats.maxDD > 0 ? (stats.currentDD / stats.maxDD) * 100 : 0;

  return (
    <Panel title="Drawdown & Recovery Meter">
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl bg-slate-900 p-5 flex flex-col justify-center items-center text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Drawdown</div>
          <div className={`mt-3 text-4xl font-black ${stats.currentDD > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            -{stats.currentDDPct.toFixed(2)}%
          </div>
          <div className="mt-1 text-xs text-slate-400">-{fmtMoney(stats.currentDD)}</div>
        </div>
        <div className="flex flex-col justify-between py-2">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Max Drawdown</div>
              <div className="mt-1 text-lg font-bold text-rose-300">-{stats.maxDDPct.toFixed(2)}%</div>
              <div className="text-[9px] text-slate-500">-{fmtMoney(stats.maxDD)}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Net Profit</div>
              <div className={`mt-1 text-lg font-bold ${pnlColor(stats.netPnL)}`}>{fmtMoney(stats.netPnL)}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recovery Factor</div>
              <div className="mt-1 text-lg font-bold text-sky-300">{stats.recoveryFactor.toFixed(2)}</div>
              <div className="text-[9px] text-slate-500">netPnL / maxDD</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[9px] text-slate-500 mb-1">
              <span>Current DD: {fmtMoney(stats.currentDD)}</span>
              <span>Max DD: {fmtMoney(stats.maxDD)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${ddProgress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function HabitStreaks({ dailyReviews = [], preTradeCheckins = [], trades = [], riskSettings }) {
  const streaks = useMemo(() => {
    const reviewsMap = {};
    (dailyReviews || []).forEach(r => { reviewsMap[r.date] = r; });
    
    const checkinsMap = {};
    (preTradeCheckins || []).forEach(c => { checkinsMap[c.date] = c; });

    const tradesMap = {};
    (trades || []).forEach(t => {
      const dateStr = (t.dateTime || "").split(" ")[0]?.replace(/\./g, "-");
      if (dateStr) {
        if (!tradesMap[dateStr]) tradesMap[dateStr] = [];
        tradesMap[dateStr].push(t);
      }
    });

    const maxTradesLimit = riskSettings?.maxTradesPerDay || 3;
    const maxDailyLossLimit = riskSettings?.maxDailyLoss || 500;

    const dates = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }

    let emotionalStreak = 0;
    let riskStreak = 0;
    let planStreak = 0;

    let emotionalBroken = false;
    let riskBroken = false;
    let planBroken = false;

    dates.forEach(dateStr => {
      const review = reviewsMap[dateStr];
      const checkin = checkinsMap[dateStr];
      const dayTrades = tradesMap[dateStr] || [];
      const hasTraded = dayTrades.length > 0 || review || checkin;

      if (hasTraded) {
        if (!planBroken) {
          if (review && review.followedPlan === 1) {
            planStreak++;
          } else if (review && review.followedPlan === 0) {
            planBroken = true;
          }
        }

        if (!emotionalBroken) {
          const isEmotional = (review && (review.chased === 1 || String(review.emotionalTriggers).toLowerCase().includes("revenge") || String(review.emotionalTriggers).toLowerCase().includes("fomo"))) || 
                              (checkin && (checkin.frustration > 4 || checkin.urgency > 4));
          if (isEmotional) {
            emotionalBroken = true;
          } else if (review || checkin) {
            emotionalStreak++;
          }
        }

        if (!riskBroken) {
          const dayLoss = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
          const isRiskBreached = dayTrades.length > maxTradesLimit || dayLoss <= -maxDailyLossLimit;
          if (isRiskBreached) {
            riskBroken = true;
          } else if (dayTrades.length > 0) {
            riskStreak++;
          }
        }
      }
    });

    return { emotionalStreak, riskStreak, planStreak };
  }, [dailyReviews, preTradeCheckins, trades, riskSettings]);

  return (
    <Panel title="Habit & Process Streaks">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
          <div className="text-3xl font-black text-emerald-400">🔥 {streaks.planStreak} Days</div>
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-2">Following Pre-Market Plan</div>
          <p className="text-[9px] text-slate-500 mt-1">Traded only planned levels & scenarios.</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center">
          <div className="text-3xl font-black text-amber-400">🔥 {streaks.emotionalStreak} Days</div>
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-2">No Emotional Trades</div>
          <p className="text-[9px] text-slate-500 mt-1">Zero chased entries or FOMO urges logged.</p>
        </div>
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 text-center">
          <div className="text-3xl font-black text-sky-400">🔥 {streaks.riskStreak} Days</div>
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mt-2">Respecting Risk Limits</div>
          <p className="text-[9px] text-slate-500 mt-1">Kept under daily trade count & drawdown limits.</p>
        </div>
      </div>
    </Panel>
  );
}
