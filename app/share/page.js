"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createChart } from "lightweight-charts";

const GRADE_SCORE = { A: 9, B: 7, C: 5, D: 3, F: 1 };

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
function normalizeDateTime(value = "") { return String(value || "").replace(/\./g, "-").trim(); }

function KpiCard({ label, value, helper, tone = "neutral" }) {
  const tones = {
    green: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    red: "border-rose-500/30 bg-rose-500/5 text-rose-300",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    blue: "border-sky-500/30 bg-sky-500/5 text-sky-300",
    neutral: "border-slate-700 bg-slate-900/60 text-slate-100"
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.neutral}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-black leading-tight break-words sm:text-xl xl:text-2xl">{value}</div>
      {helper && <div className="mt-1 text-[10px] text-slate-500">{helper}</div>}
    </div>
  );
}

function Panel({ title, children, right }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{title}</div>
        {right && <div className="font-black">{right}</div>}
      </div>
      {children}
    </div>
  );
}

function Info({ text, value, good, bad }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-3 text-sm text-slate-400">
      {text}: <span className={`font-bold ${good ? "text-emerald-300" : bad ? "text-rose-300" : "text-slate-200"}`}>{value}</span>
    </div>
  );
}

function WeekPill({ week, active, onClick }) {
  const summary = week?.summary || {};
  const label = week?.week ? `Week ${week.week}` : week?.month ? week.month : "PORTFOLIO SUMMARY";
  const sublabel = week?.dateRange || (week?.year ? `${week.month} ${week.year}` : `Aggregated across weeks`);
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

// Drawdown Graph using SVG
function EquityCurve({ trades }) {
  const [showDrawdown, setShowDrawdown] = useState(true);

  const points = useMemo(() => {
    let c = 0;
    const list = [...(trades || [])].sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)));
    return list.map((t, i) => ({ x: i, y: (c += n(t.pnl)), pnl: n(t.pnl) }));
  }, [trades]);

  if (!points.length) {
    return (
      <Panel title="Equity Curve">
        <div className="flex h-52 items-center justify-center text-slate-500">No trades recorded</div>
      </Panel>
    );
  }

  const minY = Math.min(0, ...points.map((p) => p.y));
  const maxY = Math.max(1, ...points.map((p) => p.y));
  const w = 760, h = 240, pad = 22;

  const path = [];
  let runningMaxY = -Infinity;
  
  points.forEach((p, idx) => {
    const sx = pad + (points.length === 1 ? 0 : (p.x / (points.length - 1)) * (w - pad * 2));
    const sy = h - pad - ((p.y - minY) / Math.max(1, maxY - minY)) * (h - pad * 2);
    
    if (p.y > runningMaxY) {
      runningMaxY = p.y;
    }
    const peakSy = h - pad - ((runningMaxY - minY) / Math.max(1, maxY - minY)) * (h - pad * 2);

    path.push({ ...p, sx, sy, peakSy });
  });

  const d = path.map((p, i) => `${i ? "L" : "M"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");

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
  
  let maxDDVal = 0;
  let runningPeak = 10000;
  let bal = 10000;
  points.forEach(p => {
    bal += p.pnl;
    if (bal > runningPeak) runningPeak = bal;
    const dd = runningPeak - bal;
    if (dd > maxDDVal) maxDDVal = dd;
  });
  const maxDDPct = runningPeak > 0 ? (maxDDVal / runningPeak) * 100 : 0;

  return (
    <Panel 
      title="Equity Curve & Drawdown" 
      right={
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowDrawdown(!showDrawdown)} 
            className={`rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border transition ${showDrawdown ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-slate-800 bg-slate-900 text-slate-400'}`}
          >
            Drawdown Overlay: {showDrawdown ? "ON" : "OFF"}
          </button>
          <span className={pnlColor(finalEquity)}>{fmtMoney(finalEquity)}</span>
        </div>
      }
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="h-64 w-full select-none">
        <rect width={w} height={h} rx="18" fill="var(--slate-900)"/>
        <line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} stroke="var(--slate-800)"/>
        
        {showDrawdown && path.length > 1 && (
          <path d={drawdownD} fill="rgba(244, 63, 94, 0.12)" stroke="rgba(244, 63, 94, 0.3)" strokeWidth="1" />
        )}
        
        <path d={d} fill="none" stroke={finalEquity >= 0 ? "#34d399" : "#fb7185"} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        
        <circle cx={win.sx} cy={win.sy} r="4" fill="#34d399"/>
        <circle cx={loss.sx} cy={loss.sy} r="4" fill="#fb7185"/>
      </svg>
      <div className="grid gap-3 md:grid-cols-3 mt-3">
        <Info text="Largest Win" value={fmtMoney(win.pnl)} good/>
        <Info text="Largest Loss" value={fmtMoney(loss.pnl)} bad/>
        <Info text="Peak Drawdown" value={`-${maxDDPct.toFixed(2)}%`} bad={maxDDPct > 5} good={maxDDPct <= 5} />
      </div>
    </Panel>
  );
}

// Hourly Heatmap
function HourDayHeatmap({ trades }) {
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  const grid = useMemo(() => {
    const data = Array.from({ length: 7 }, () => Array(17).fill(0));
    const counts = Array.from({ length: 7 }, () => Array(17).fill(0));
    (trades || []).forEach(t => {
      try {
        const raw = String(t.dateTime || "").replace(/\./g, "-").trim();
        const parts = raw.split(" ");
        if (parts.length < 2) return;
        const dateParts = parts[0].split("-");
        const timeParts = parts[1].split(":");
        if (dateParts.length < 3 || timeParts.length < 2) return;
        
        const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
        let day = d.getDay();
        const hour = Number(timeParts[0]);
        
        // Map day 0 (Sun) to 6, else day - 1
        const dayIdx = day === 0 ? 6 : day - 1;
        
        if (hour >= 6 && hour <= 22) {
          const hourIdx = hour - 6;
          data[dayIdx][hourIdx] += n(t.pnl);
          counts[dayIdx][hourIdx] += 1;
        }
      } catch {}
    });
    return { data, counts };
  }, [trades]);

  return (
    <Panel title="Hourly P&L Heatmap (6:00 - 22:00)">
      <div className="overflow-x-auto custom-scrollbar pb-2">
        <div className="min-w-[640px] select-none">
          <div className="grid grid-cols-[50px_repeat(17,1fr)] gap-1 text-center">
            <div className="text-[10px] font-black text-slate-500 uppercase">Day</div>
            {hours.map(h => (
              <div key={h} className="text-[10px] font-black text-slate-500">{h}h</div>
            ))}
            
            {days.map((dayName, dayIdx) => (
              <React.Fragment key={dayName}>
                <div className="text-left text-xs font-bold text-slate-400 flex items-center">{dayName}</div>
                {hours.map((h, hourIdx) => {
                  const val = grid.data[dayIdx][hourIdx];
                  const count = grid.counts[dayIdx][hourIdx];
                  let bg = "bg-slate-900/40 text-slate-600 border border-slate-900";
                  if (count > 0) {
                    if (val > 0) {
                      bg = "bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30";
                    } else if (val < 0) {
                      bg = "bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30";
                    } else {
                      bg = "bg-slate-800 text-slate-300 border border-slate-700";
                    }
                  }
                  return (
                    <div 
                      key={h} 
                      title={`${dayName} at ${h}:00: ${count} trades, Net: ${fmtMoney(val)}`}
                      className={`h-9 flex flex-col items-center justify-center rounded text-[10px] transition-all ${bg}`}
                    >
                      <span>{count > 0 ? (val === 0 ? "0" : val > 0 ? `+${Math.round(val)}` : Math.round(val)) : ""}</span>
                      {count > 0 && <span className="text-[8px] opacity-65">{count}x</span>}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// Setup library
function SetupLibrary({ trades, playbookSetups }) {
  const setups = useMemo(() => {
    const map = {};
    (trades || []).forEach((t) => {
      const key = t.setupType || "Unclassified";
      if (!map[key]) {
        map[key] = {
          setup: key,
          trades: 0,
          pnl: 0,
          wins: 0,
          losses: 0,
          grossProfit: 0,
          grossLoss: 0,
          totalCompliance: 0,
          complianceCount: 0
        };
      }
      const p = n(t.pnl);
      map[key].trades++;
      map[key].pnl += p;
      if (p > 0) {
        map[key].wins++;
        map[key].grossProfit += p;
      } else {
        map[key].losses++;
        map[key].grossLoss += p;
      }
      if (t.compliance !== null && t.compliance !== undefined) {
        map[key].totalCompliance += Number(t.compliance);
        map[key].complianceCount++;
      }
    });

    return Object.values(map).map(s => {
      const winRate = s.trades > 0 ? s.wins / s.trades : 0;
      const avgWin = s.wins > 0 ? s.grossProfit / s.wins : 0;
      const avgLoss = s.losses > 0 ? Math.abs(s.grossLoss) / s.losses : 0;
      const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
      const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 99 : 0);
      const avgCompliance = s.complianceCount > 0 ? (s.totalCompliance / s.complianceCount) * 100 : null;
      return {
        ...s,
        winRate,
        avgWin,
        avgLoss,
        expectancy,
        winLossRatio,
        avgCompliance
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  return (
    <Panel title="Playbook & Setup Library">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {setups.map((s) => (
          <div key={s.setup} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="font-bold text-slate-100 text-sm leading-snug">{s.setup}</div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${s.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {s.pnl >= 0 ? 'Profitable' : 'Negative'}
                </span>
              </div>
              <div className={`mt-3 text-2xl font-black ${pnlColor(s.pnl)}`}>
                {fmtMoney(s.pnl)}
              </div>
              <div className="mt-1 text-[10px] text-slate-400 font-medium">
                {s.trades} trades • {fmtPct(s.winRate)} win rate
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-left">
              <div>
                <div className="text-[8px] uppercase tracking-widest text-slate-500">Expectancy</div>
                <div className={`text-xs font-bold ${pnlColor(s.expectancy)}`}>{fmtMoney(s.expectancy)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-widest text-slate-500">W/L Ratio</div>
                <div className="text-xs font-bold text-slate-300">{s.winLossRatio.toFixed(2)}:1</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-widest text-slate-500">Avg Rules</div>
                <div className="text-xs font-bold text-amber-300">{s.avgCompliance !== null ? `${s.avgCompliance.toFixed(0)}%` : "—"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function MentorDashboardView() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

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
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState("overall"); // overall, month, week
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tk = params.get("token");
    if (!tk) {
      setError("No share token provided. Please verify the link URL.");
      setLoading(false);
      return;
    }
    setToken(tk);

    fetch(`/api/share?token=${tk}`)
      .then(res => {
        if (!res.ok) throw new Error("Invalid or expired share link.");
        return res.json();
      })
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to connect to server.");
        setLoading(false);
      });
  }, []);

  // Reset selected week/month index when swapping views
  useEffect(() => {
    setSelectedIndex(0);
  }, [viewMode]);

  // Calculations & Aggregations
  const weeksList = data?.weeks || [];
  
  const months = useMemo(() => {
    const map = {};
    weeksList.forEach(w => {
      const m = w.month || "Unknown";
      if (!map[m]) map[m] = { id: m, month: m, year: w.year, weeks: [], trades: [] };
      map[m].weeks.push(w);
      map[m].trades.push(...(w.trades || []));
    });
    return Object.values(map).map(m => {
      const winCount = m.trades.filter(t => n(t.pnl) > 0).length;
      return {
        ...m,
        summary: {
          netPnL: m.trades.reduce((s, t) => s + n(t.pnl), 0),
          tradesCount: m.trades.length,
          trades: m.trades.length,
          winRate: m.trades.length ? winCount / m.trades.length : 0,
        }
      };
    });
  }, [weeksList]);

  const overallStats = useMemo(() => {
    const allTrades = weeksList.flatMap(w => w.trades || []);
    const winCount = allTrades.filter(t => n(t.pnl) > 0).length;
    const lossCount = allTrades.filter(t => n(t.pnl) < 0).length;
    const grossProfit = allTrades.filter(t => n(t.pnl) > 0).reduce((s, t) => s + n(t.pnl), 0);
    const grossLoss = allTrades.filter(t => n(t.pnl) < 0).reduce((s, t) => s + n(t.pnl), 0);
    const netPnL = grossProfit + grossLoss;
    
    // Sharpe Ratio
    const pnlList = allTrades.map(t => n(t.pnl));
    const avgPnL = allTrades.length ? netPnL / allTrades.length : 0;
    const variance = allTrades.length > 1 
      ? pnlList.reduce((s, val) => s + Math.pow(val - avgPnL, 2), 0) / (allTrades.length - 1)
      : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgPnL / stdDev : 0;

    // Expectancy
    const winRate = allTrades.length ? winCount / allTrades.length : 0;
    const avgWin = winCount ? grossProfit / winCount : 0;
    const avgLoss = lossCount ? Math.abs(grossLoss / lossCount) : 0;
    const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
    
    return {
      trades: allTrades,
      summary: {
        netPnL,
        tradesCount: allTrades.length,
        trades: allTrades.length,
        wins: winCount,
        losses: lossCount,
        winRate,
        profitFactor: grossLoss ? grossProfit / Math.abs(grossLoss) : 99,
        bestTrade: allTrades.length ? Math.max(...pnlList) : 0,
        worstTrade: allTrades.length ? Math.min(...pnlList) : 0,
        sharpeRatio,
        expectancy,
        avgWin,
        avgLoss
      }
    };
  }, [weeksList]);

  const currentViewData = useMemo(() => {
    if (viewMode === "overall") return overallStats;
    if (viewMode === "month") return months[selectedIndex] || months[0] || overallStats;
    return weeksList[selectedIndex] || weeksList[0] || overallStats;
  }, [viewMode, selectedIndex, weeksList, months, overallStats]);

  const activeTrades = currentViewData.trades || [];
  const activeSummary = currentViewData.summary || {};

  // Custom Statistics calculations for Z-score and Sortino
  const mathStats = useMemo(() => {
    const list = [...activeTrades].sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)));
    if (list.length < 5) return { zScore: 0, sortino: 0, avgDrawdown: 0, maxDDDuration: "0 days" };

    const pnlList = list.map(t => n(t.pnl));
    const net = pnlList.reduce((s, t) => s + t, 0);

    // Z-Score calculation
    let runs = 1;
    for (let i = 1; i < pnlList.length; i++) {
      const prev = pnlList[i - 1] >= 0 ? 1 : 0;
      const curr = pnlList[i] >= 0 ? 1 : 0;
      if (prev !== curr) runs++;
    }
    const nTotal = pnlList.length;
    const nWins = pnlList.filter(v => v > 0).length;
    const nLosses = nTotal - nWins;
    let zScore = 0;
    if (nWins > 0 && nLosses > 0) {
      const numerator = nTotal * (runs - 0.5) - 2 * nWins * nLosses;
      const denominator = Math.sqrt((2 * nWins * nLosses * (2 * nWins * nLosses - nTotal)) / (nTotal - 1));
      zScore = denominator > 0 ? numerator / denominator : 0;
    }

    // Sortino calculation
    const avg = net / nTotal;
    const downsideDiffs = pnlList.map(v => v < 0 ? Math.pow(v - avg, 2) : 0);
    const downsideVar = downsideDiffs.reduce((a, b) => a + b, 0) / nTotal;
    const downsideStdDev = Math.sqrt(downsideVar);
    const sortino = downsideStdDev > 0 ? avg / downsideStdDev : 0;

    // Drawdowns
    let balance = 10000;
    let peak = 10000;
    let currentDD = 0;
    const dds = [];
    
    list.forEach(t => {
      balance += n(t.pnl);
      if (balance > peak) {
        peak = balance;
      }
      currentDD = peak - balance;
      if (currentDD > 0) dds.push(currentDD);
    });
    
    const avgDrawdown = dds.length ? dds.reduce((a,b)=>a+b,0)/dds.length : 0;

    return {
      zScore,
      sortino,
      avgDrawdown
    };
  }, [activeTrades]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-amber-400 font-bold">
        Connecting to FITpips secure data link...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-4 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-black text-rose-400">Secure Access Error</h1>
        <p className="mt-2 text-sm text-slate-400 max-w-md">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 hover:border-amber-400 text-xs font-bold text-slate-300">Retry Connection</button>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-2xl shadow-lg shadow-amber-500/20">⚡</div>
            <div>
              <div className="text-lg font-black tracking-tight">FITpips Coach Link</div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Read-Only Mentor Console</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition flex items-center gap-1.5"
              title="Toggle Light/Dark Theme"
            >
              <span>{theme === "dark" ? "☀️" : "🌙"}</span>
              <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <span className="rounded-full bg-amber-400/10 border border-amber-400/20 px-3 py-1 text-[9px] font-black uppercase text-amber-300 tracking-widest animate-pulse">🔒 Mentor View</span>
            <div className="flex rounded-xl bg-slate-900 p-1">
              {["week", "month", "overall"].map(m => (
                <button 
                  key={m} 
                  onClick={() => { setViewMode(m); }} 
                  className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${viewMode === m ? "bg-amber-400 text-slate-950" : "text-slate-500 hover:text-slate-200"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[285px_1fr]">
        <aside className="space-y-4">
          <Panel title="Shared Journal">
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {viewMode === "overall" && (
                <WeekPill week={overallStats} active={true} onClick={() => {}} />
              )}
              {viewMode === "month" && months.map((m, i) => (
                <WeekPill key={m.id} week={m} active={selectedIndex === i} onClick={() => setSelectedIndex(i)} />
              ))}
              {viewMode === "week" && weeksList.map((w, i) => (
                <WeekPill key={w.id} week={w} active={selectedIndex === i} onClick={() => setSelectedIndex(i)} />
              ))}
            </div>
          </Panel>
        </aside>

        <section className="space-y-5">
          <div className={`rounded-3xl border p-6 ${activeSummary.netPnL >= 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Student Account Performance</div>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-100">
                  {viewMode === "overall" ? `${data?.portfolio?.name || "Master"} Dashboard` : 
                   viewMode === "month" ? `${currentViewData?.month || "Unknown"} ${currentViewData?.year || ""}` : 
                   `Week ${currentViewData?.week || "..."} Statistics`}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  {currentViewData?.coach?.verdict || "Coach notes not registered for this logging period."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <KpiCard label="Total Net" value={fmtMoney(activeSummary.netPnL)} tone={n(activeSummary.netPnL) >= 0 ? "green":"red"}/>
                <KpiCard label="Win Rate" value={fmtPct(activeSummary.winRate)} tone="amber" helper={`${activeSummary.wins ?? 0}W / ${activeSummary.losses ?? 0}L`}/>
                <KpiCard label="Profit Factor" value={`${n(activeSummary.profitFactor).toFixed(2)}x`} tone="blue"/>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["dashboard", "trades", "analytics", "psychology"].map(t => (
                <button 
                  key={t} 
                  onClick={() => setTab(t)} 
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition ${tab === t ? "bg-amber-400 text-slate-950" : "text-slate-500 hover:text-slate-200 hover:bg-slate-900"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {tab === "dashboard" && (
            <div className="space-y-5">
              <EquityCurve trades={activeTrades} />
              
              <div className="grid gap-5 xl:grid-cols-4">
                <KpiCard label="Best Trade" value={fmtMoney(activeSummary.bestTrade)} tone="green"/>
                <KpiCard label="Worst Trade" value={fmtMoney(activeSummary.worstTrade)} tone="red"/>
                <KpiCard label="Avg Win" value={fmtMoney(activeSummary.avgWin)} tone="emerald"/>
                <KpiCard label="Avg Loss" value={fmtMoney(activeSummary.avgLoss)} tone="rose"/>
              </div>
              
              <Panel title="Student Discipline Protocol">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Coach Protocol</div>
                    <div className="text-xl font-bold text-amber-300 mt-1">{currentViewData?.coach?.protocol || "Stability Mode"}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discipline Actions</div>
                    <ul className="text-xs text-slate-300 mt-2 list-disc pl-4 space-y-1">
                      {(currentViewData?.coach?.actionPlan || []).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {tab === "trades" && (
            <Panel title="Historical Records">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Dir</th>
                      <th className="px-4 py-3">Size</th>
                      <th className="px-4 py-3 text-right">Entry</th>
                      <th className="px-4 py-3 text-right">Exit</th>
                      <th className="px-4 py-3 text-right">P&L</th>
                      <th className="px-4 py-3">Playbook</th>
                      <th className="px-4 py-3 text-center">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {activeTrades.map(t => (
                      <tr key={t.id} className="hover:bg-slate-900/30">
                        <td className="px-4 py-3 text-xs text-slate-300">{t.dateTime}</td>
                        <td className="px-4 py-3 font-bold text-slate-200">{t.symbol}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${ (t.dir||'').toLowerCase() === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{t.dir}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{t.lot} lots</td>
                        <td className="px-4 py-3 text-right">{n(t.entry).toFixed(4)}</td>
                        <td className="px-4 py-3 text-right">{n(t.exit).toFixed(4)}</td>
                        <td className={`px-4 py-3 text-right font-black ${pnlColor(t.pnl)}`}>{fmtMoney(t.pnl)}</td>
                        <td className="px-4 py-3 text-xs text-slate-300 font-semibold">{t.setupType || "Unclassified"}</td>
                        <td className="px-4 py-3 text-center text-xs font-black text-amber-300">
                          {t.compliance !== null ? `${(Number(t.compliance) * 100).toFixed(0)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {tab === "analytics" && (
            <div className="space-y-5">
              <HourDayHeatmap trades={activeTrades} />
              
              <Panel title="Advanced Analytical Statistics (Myfxbook Style)">
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-5">
                  <KpiCard label="Trade Expectancy" value={fmtMoney(activeSummary.expectancy || 0)} helper="Expected return per trade" tone={(activeSummary.expectancy || 0) >= 0 ? "green" : "red"} />
                  <KpiCard label="Sharpe Ratio" value={(activeSummary.sharpeRatio || 0).toFixed(2)} helper="Risk-adjusted return" tone={(activeSummary.sharpeRatio || 0) > 1 ? "green" : "neutral"} />
                  <KpiCard label="Sortino Ratio" value={mathStats.sortino.toFixed(2)} helper="Downside-adjusted return" tone={mathStats.sortino > 1 ? "green" : "neutral"} />
                  <KpiCard label="Z-Score Streaks" value={mathStats.zScore.toFixed(2)} helper="Winning streaks dependency" tone={Math.abs(mathStats.zScore) > 2 ? "amber" : "neutral"} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Info text="Average Drawdown" value={fmtMoney(mathStats.avgDrawdown)} bad />
                  <Info text="Independence Test" value={Math.abs(mathStats.zScore) > 1.96 ? "Streak Pattern Detected (Behavioral bias)" : "Random Distribution (Independent trades)"} good={Math.abs(mathStats.zScore) <= 1.96} bad={Math.abs(mathStats.zScore) > 1.96} />
                </div>
              </Panel>

              <SetupLibrary trades={activeTrades} playbookSetups={data?.playbook} />
            </div>
          )}

          {tab === "psychology" && (
            <div className="space-y-5">
              <Panel title="Student Shared Journal Entries">
                {(data?.dailyJournals || []).length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">No daily debrief entries shared.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {(data?.dailyJournals || []).map(e => (
                      <div key={e.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-amber-400 tracking-wider">{e.date}</span>
                          <span className="text-sm">{"⭐".repeat(e.rating)}</span>
                        </div>
                        <div className="mt-2 text-sm font-bold text-slate-200 flex items-center gap-2">
                          <span>Dominant Emotion:</span>
                          <span className="rounded bg-slate-900 px-2 py-0.5 border border-slate-800">{e.mood}</span>
                        </div>
                        <p className="mt-3 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{e.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
