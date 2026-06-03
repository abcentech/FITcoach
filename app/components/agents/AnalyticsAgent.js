"use client";

import React, { useMemo, useState } from "react";
import { Panel, Info, KpiCard } from "./ui";
import { 
  n, 
  fmtMoney, 
  fmtPct, 
  pnlColor, 
  getTradeDayAndHour, 
  mapDayIndex, 
  inferSetupType 
} from "./utils";

// 1. HourDayHeatmap (extracted from app/page.js)
export function HourDayHeatmap({ trades }) {
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  const grid = useMemo(() => {
    const data = Array.from({ length: 7 }, () => Array(17).fill(0));
    const counts = Array.from({ length: 7 }, () => Array(17).fill(0));
    (trades || []).forEach(t => {
      const { day, hour } = getTradeDayAndHour(t);
      if (day !== -1 && hour >= 6 && hour <= 22) {
        const dayIdx = mapDayIndex(day);
        const hourIdx = hour - 6;
        data[dayIdx][hourIdx] += n(t.pnl);
        counts[dayIdx][hourIdx] += 1;
      }
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
                      className={`h-9 flex flex-col items-center justify-center rounded text-[10px] transition-all hover:scale-[1.05] hover:ring-1 hover:ring-amber-400/50 ${bg}`}
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
      <div className="mt-3 flex items-center justify-end gap-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-slate-900/40 border border-slate-900"></div> No Trades</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-rose-500/20 border border-rose-500/30"></div> Loss</div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/30"></div> Gain</div>
      </div>
    </Panel>
  );
}

// 2. HourOfDayAnalysis (NEW component requested by user)
export function HourOfDayAnalysis({ trades }) {
  const [hoveredHour, setHoveredHour] = useState(null);

  const hourStats = useMemo(() => {
    const hoursData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      pnl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
    }));

    (trades || []).forEach(t => {
      const { hour } = getTradeDayAndHour(t);
      if (hour >= 0 && hour <= 23) {
        const p = n(t.pnl);
        hoursData[hour].pnl += p;
        hoursData[hour].trades++;
        if (p > 0) {
          hoursData[hour].wins++;
        } else if (p < 0) {
          hoursData[hour].losses++;
        }
      }
    });

    return hoursData.map(h => ({
      ...h,
      winRate: h.trades > 0 ? h.wins / h.trades : 0,
    }));
  }, [trades]);

  const bestHourObj = useMemo(() => {
    let best = null;
    hourStats.forEach(h => {
      if (h.trades > 0) {
        if (!best || h.pnl > best.pnl) {
          best = h;
        }
      }
    });
    return best;
  }, [hourStats]);

  const worstHourObj = useMemo(() => {
    let worst = null;
    hourStats.forEach(h => {
      if (h.trades > 0) {
        if (!worst || h.pnl < worst.pnl) {
          worst = h;
        }
      }
    });
    return worst;
  }, [hourStats]);

  const peakVolumeObj = useMemo(() => {
    let peak = null;
    hourStats.forEach(h => {
      if (h.trades > 0) {
        if (!peak || h.trades > peak.trades) {
          peak = h;
        }
      }
    });
    return peak;
  }, [hourStats]);

  const maxPnL = useMemo(() => {
    const maxVal = Math.max(...hourStats.map(h => Math.abs(h.pnl)));
    return maxVal > 0 ? maxVal * 1.15 : 100; // 15% padding
  }, [hourStats]);

  const maxTrades = useMemo(() => {
    return Math.max(1, ...hourStats.map(h => h.trades));
  }, [hourStats]);

  const w = 800;
  const h = 320;
  const top = 50;
  const bottom = 45;
  const left = 65;
  const right = 65;
  const chartWidth = w - left - right;
  const chartHeight = h - top - bottom;
  const centerY = top + chartHeight / 2;

  const hourToX = (hour) => left + (hour / 23) * chartWidth;
  const pnlToY = (val) => centerY - (val / maxPnL) * (chartHeight / 2);
  const winRateToY = (rate) => h - bottom - rate * chartHeight;

  // Generate path for win rate line
  const winRatePoints = hourStats.filter(h => h.trades > 0);
  const linePathD = useMemo(() => {
    if (winRatePoints.length === 0) return "";
    return winRatePoints
      .map((p, i) => {
        const x = hourToX(p.hour);
        const y = winRateToY(p.winRate);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [winRatePoints]);

  const getSessionForHour = (hour) => {
    if (hour >= 0 && hour < 8) return "Asia";
    if (hour >= 8 && hour < 13) return "London";
    if (hour >= 13 && hour < 17) return "Overlap";
    if (hour >= 17 && hour < 22) return "New York";
    return "Rollover";
  };

  const getSessionColor = (session) => {
    switch (session) {
      case "Asia": return { fill: "rgba(99, 102, 241, 0.04)", stroke: "rgba(99, 102, 241, 0.15)", text: "text-indigo-400" };
      case "London": return { fill: "rgba(20, 184, 166, 0.04)", stroke: "rgba(20, 184, 166, 0.15)", text: "text-teal-400" };
      case "Overlap": return { fill: "rgba(245, 158, 11, 0.04)", stroke: "rgba(245, 158, 11, 0.15)", text: "text-amber-400" };
      case "New York": return { fill: "rgba(14, 165, 233, 0.04)", stroke: "rgba(14, 165, 233, 0.15)", text: "text-sky-400" };
      default: return { fill: "transparent", stroke: "transparent", text: "text-slate-500" };
    }
  };

  // Sessions definitions for rendering (Asia: 0-8, London: 8-13, Overlap: 13-17, NY: 17-22)
  const sessions = [
    { name: "Asia", start: 0, end: 8 },
    { name: "London", start: 8, end: 13 },
    { name: "Overlap", start: 13, end: 17 },
    { name: "New York", start: 17, end: 22 }
  ];

  return (
    <Panel title="Hour of Day Analytics" right={<span className="text-xs text-slate-500">Distribution by Hour</span>}>
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3 mb-6">
        <KpiCard 
          label="Best Trading Hour" 
          value={bestHourObj ? `${String(bestHourObj.hour).padStart(2, '0')}:00` : "—"}
          helper={bestHourObj ? `Net P&L: ${fmtMoney(bestHourObj.pnl)} | WR: ${fmtPct(bestHourObj.winRate)}` : "No trades recorded"}
          tone={bestHourObj && bestHourObj.pnl > 0 ? "green" : "neutral"}
        />
        <KpiCard 
          label="Worst Trading Hour" 
          value={worstHourObj ? `${String(worstHourObj.hour).padStart(2, '0')}:00` : "—"}
          helper={worstHourObj ? `Net P&L: ${fmtMoney(worstHourObj.pnl)} | WR: ${fmtPct(worstHourObj.winRate)}` : "No trades recorded"}
          tone={worstHourObj && worstHourObj.pnl < 0 ? "red" : "neutral"}
        />
        <KpiCard 
          label="Peak Volume Hour" 
          value={peakVolumeObj ? `${String(peakVolumeObj.hour).padStart(2, '0')}:00` : "—"}
          helper={peakVolumeObj ? `${peakVolumeObj.trades} trades | Net P&L: ${fmtMoney(peakVolumeObj.pnl)}` : "No trades recorded"}
          tone={peakVolumeObj ? "blue" : "neutral"}
        />
      </div>

      {/* SVG Chart */}
      <div className="relative bg-slate-950/60 rounded-2xl border border-slate-900 p-4 overflow-hidden mb-6">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[760px]">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto select-none">
              <defs>
                <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.85"/>
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.45"/>
                </linearGradient>
                <linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85"/>
                  <stop offset="100%" stopColor="#be123c" stopOpacity="0.45"/>
                </linearGradient>
                <linearGradient id="winRateGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/>
                </linearGradient>
              </defs>

              {/* Grid Background */}
              <rect x={left} y={top} width={chartWidth} height={chartHeight} fill="var(--slate-950)" opacity="0.4" rx="8"/>

              {/* Session Overlay Backgrounds */}
              {sessions.map(s => {
                const xStart = hourToX(s.start);
                const xEnd = hourToX(s.end);
                const colors = getSessionColor(s.name);
                return (
                  <g key={s.name}>
                    <rect 
                      x={xStart} 
                      y={top} 
                      width={xEnd - xStart} 
                      height={chartHeight} 
                      fill={colors.fill}
                    />
                    <line 
                      x1={xEnd} 
                      y1={top} 
                      x2={xEnd} 
                      y2={h - bottom} 
                      stroke={colors.stroke} 
                      strokeWidth="1.5" 
                      strokeDasharray="4 4"
                    />
                    {/* Session Labels at the top */}
                    <text 
                      x={xStart + (xEnd - xStart) / 2} 
                      y={top - 12} 
                      textAnchor="middle" 
                      className={`text-[9px] font-black uppercase tracking-widest fill-current ${colors.text.replace('text-', 'fill-')}`}
                    >
                      {s.name}
                    </text>
                  </g>
                );
              })}

              {/* X & Y Axis Grid Lines */}
              <line x1={left} y1={centerY} x2={w - right} y2={centerY} stroke="var(--slate-800)" strokeWidth="1"/>
              <line x1={left} y1={top} x2={w - right} y2={top} stroke="var(--slate-800)" strokeWidth="0.5" strokeDasharray="2 2"/>
              <line x1={left} y1={h - bottom} x2={w - right} y2={h - bottom} stroke="var(--slate-800)" strokeWidth="0.5" strokeDasharray="2 2"/>

              {/* Left Y Axis Ticks (P&L) */}
              <text x={left - 10} y={top + 4} textAnchor="end" className="fill-slate-500 text-[9px] font-mono">+{fmtMoney(maxPnL)}</text>
              <text x={left - 10} y={centerY + 3} textAnchor="end" className="fill-slate-500 text-[9px] font-mono">$0.00</text>
              <text x={left - 10} y={h - bottom + 3} textAnchor="end" className="fill-slate-500 text-[9px] font-mono">-{fmtMoney(maxPnL)}</text>

              {/* Right Y Axis Ticks (Win Rate) */}
              <text x={w - right + 10} y={top + 4} textAnchor="start" className="fill-amber-400/80 text-[9px] font-mono">100% WR</text>
              <text x={w - right + 10} y={centerY + 3} textAnchor="start" className="fill-slate-500 text-[9px] font-mono">50% WR</text>
              <text x={w - right + 10} y={h - bottom + 3} textAnchor="start" className="fill-slate-500 text-[9px] font-mono">0% WR</text>

              {/* X Axis Labels (Hours) */}
              {Array.from({ length: 24 }).map((_, i) => {
                const x = hourToX(i);
                const hasData = hourStats[i].trades > 0;
                return (
                  <g key={i}>
                    <line x1={x} y1={h - bottom} x2={x} y2={h - bottom + 4} stroke="var(--slate-700)" strokeWidth="1"/>
                    <text 
                      x={x} 
                      y={h - bottom + 15} 
                      textAnchor="middle" 
                      className={`text-[9px] font-mono ${hasData ? 'fill-slate-200 font-bold' : 'fill-slate-600'}`}
                    >
                      {String(i).padStart(2, '0')}
                    </text>
                  </g>
                );
              })}

              {/* Bars for Net P&L */}
              {hourStats.map((hData) => {
                if (hData.trades === 0 || hData.pnl === 0) return null;
                const x = hourToX(hData.hour);
                const barWidth = 14;
                const isPositive = hData.pnl > 0;
                const pnlHeight = (Math.abs(hData.pnl) / maxPnL) * (chartHeight / 2);
                
                const rectX = x - barWidth / 2;
                const rectY = isPositive ? centerY - pnlHeight : centerY;
                
                return (
                  <g key={`bar-${hData.hour}`}>
                    <rect
                      x={rectX}
                      y={rectY}
                      width={barWidth}
                      height={Math.max(2, pnlHeight)}
                      rx="3"
                      fill={isPositive ? "url(#barGreen)" : "url(#barRed)"}
                      className="transition-all hover:opacity-100 cursor-pointer"
                      opacity={hoveredHour === hData.hour ? "1" : "0.75"}
                      onMouseEnter={() => setHoveredHour(hData.hour)}
                      onMouseLeave={() => setHoveredHour(null)}
                    >
                      <title>{`Hour ${String(hData.hour).padStart(2, '0')}:00 | P&L: ${fmtMoney(hData.pnl)} | Trades: ${hData.trades}`}</title>
                    </rect>
                  </g>
                );
              })}

              {/* Win Rate Line Chart */}
              {linePathD && (
                <path 
                  d={linePathD} 
                  fill="none" 
                  stroke="#fbbf24" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  opacity="0.85"
                />
              )}

              {/* Win Rate Points (Bubbles representing Trade Volume) */}
              {winRatePoints.map((p) => {
                const x = hourToX(p.hour);
                const y = winRateToY(p.winRate);
                
                // Radius based on number of trades
                const minR = 4;
                const maxR = 12;
                const r = minR + (p.trades / maxTrades) * (maxR - minR);

                return (
                  <g key={`point-${p.hour}`} className="cursor-pointer">
                    {/* Outer glow ring on hover */}
                    {hoveredHour === p.hour && (
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={r + 3} 
                        fill="none" 
                        stroke="#fbbf24" 
                        strokeWidth="1.5" 
                        opacity="0.5"
                      />
                    )}
                    {/* Main bubble */}
                    <circle
                      cx={x}
                      cy={y}
                      r={r}
                      fill="#fbbf24"
                      stroke="var(--slate-950)"
                      strokeWidth="1.5"
                      className="transition-all hover:scale-110"
                      onMouseEnter={() => setHoveredHour(p.hour)}
                      onMouseLeave={() => setHoveredHour(null)}
                    >
                      <title>{`Hour ${String(p.hour).padStart(2, '0')}:00 | WR: ${fmtPct(p.winRate)} | Trades: ${p.trades}`}</title>
                    </circle>
                    {/* Small text overlay inside the bubble if it's large enough, or just above it */}
                    {r > 7 && (
                      <text 
                        x={x} 
                        y={y + 3} 
                        textAnchor="middle" 
                        className="fill-slate-950 font-mono font-black text-[7px]"
                        pointerEvents="none"
                      >
                        {p.trades}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-900 pt-4 text-[10px] text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-5 rounded bg-emerald-500/20 border border-emerald-500/40"></div>
              <span>Positive P&L</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-5 rounded bg-rose-500/20 border border-rose-500/40"></div>
              <span>Negative P&L</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-6 bg-amber-400"></div>
              <div className="h-2 w-2 rounded-full bg-amber-400 border border-slate-950"></div>
              <span>Win Rate % & Trade Count (Bubble Size)</span>
            </div>
          </div>
          <div className="text-slate-400 italic">
            * All times are in broker local server time.
          </div>
        </div>
      </div>

      {/* Hourly Detail Breakdown Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Hour</th>
              <th className="px-4 py-2.5">Trading Session</th>
              <th className="px-4 py-2.5 text-center">Trades</th>
              <th className="px-4 py-2.5 text-center">Win Rate</th>
              <th className="px-4 py-2.5 text-right">Net P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {hourStats
              .filter(hData => hData.trades > 0)
              .map(hData => {
                const session = getSessionForHour(hData.hour);
                const colors = getSessionColor(session);
                return (
                  <tr 
                    key={hData.hour} 
                    className={`hover:bg-slate-900/40 transition-colors ${hoveredHour === hData.hour ? 'bg-slate-900/60' : ''}`}
                    onMouseEnter={() => setHoveredHour(hData.hour)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    <td className="px-4 py-2 font-mono font-bold text-slate-200">{String(hData.hour).padStart(2, '0')}:00</td>
                    <td className="px-4 py-2 font-semibold">
                      <span className={`text-[10px] uppercase tracking-wider ${colors.text}`}>
                        {session}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-slate-300 font-medium">{hData.trades}</td>
                    <td className="px-4 py-2 text-center text-slate-300 font-semibold">{fmtPct(hData.winRate)}</td>
                    <td className={`px-4 py-2 text-right font-black ${pnlColor(hData.pnl)}`}>{fmtMoney(hData.pnl)}</td>
                  </tr>
                );
              })}
            {hourStats.filter(hData => hData.trades > 0).length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-500 italic">No trades recorded for the selected period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// 3. SymbolBreakdown (extracted from page.js)
export function SymbolBreakdown({ trades }) {
  const symbolStats = useMemo(() => {
    const groups = {};
    (trades || []).forEach(t => {
      const s = t.symbol || "Unknown";
      if (!groups[s]) {
        groups[s] = { symbol: s, count: 0, pnl: 0, wins: 0, losses: 0, winSum: 0, lossSum: 0, best: -Infinity, worst: Infinity };
      }
      const p = n(t.pnl);
      groups[s].count++;
      groups[s].pnl += p;
      if (p > 0) {
        groups[s].wins++;
        groups[s].winSum += p;
        if (p > groups[s].best) groups[s].best = p;
      } else if (p < 0) {
        groups[s].losses++;
        groups[s].lossSum += Math.abs(p);
        if (p < groups[s].worst) groups[s].worst = p;
      }
    });

    return Object.values(groups).map(g => {
      const avgWin = g.wins > 0 ? g.winSum / g.wins : 0;
      const avgLoss = g.losses > 0 ? g.lossSum / g.losses : 0;
      return {
        ...g,
        winRate: g.count > 0 ? (g.wins / g.count) * 100 : 0,
        avgWin,
        avgLoss,
        best: g.best === -Infinity ? 0 : g.best,
        worst: g.worst === Infinity ? 0 : g.worst
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const maxAbsPnl = useMemo(() => {
    return Math.max(1, ...symbolStats.map(s => Math.abs(s.pnl)));
  }, [symbolStats]);

  return (
    <Panel title="Symbol Breakdown & Performance">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3 text-center">Trades</th>
              <th className="px-4 py-3 text-center">Win Rate</th>
              <th className="px-4 py-3 text-right">Net P&L</th>
              <th className="px-4 py-3 text-right">Avg Win</th>
              <th className="px-4 py-3 text-right">Avg Loss</th>
              <th className="px-4 py-3 text-right">Best</th>
              <th className="px-4 py-3 text-right">Worst</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {symbolStats.map(s => {
              const widthPct = Math.min(100, (Math.abs(s.pnl) / maxAbsPnl) * 100);
              return (
                <tr key={s.symbol} className="hover:bg-slate-900/20">
                  <td className="px-4 py-3 font-bold text-slate-200">{s.symbol}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{s.count}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{s.winRate.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-black">
                    <div className="flex items-center justify-end gap-2">
                      <span className={pnlColor(s.pnl)}>{fmtMoney(s.pnl)}</span>
                      <div className="h-1.5 w-12 rounded bg-slate-900 overflow-hidden hidden sm:block">
                        <div className={`h-full ${s.pnl >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400">{fmtMoney(s.avgWin)}</td>
                  <td className="px-4 py-3 text-right text-rose-400">-{fmtMoney(s.avgLoss)}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{fmtMoney(s.best)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{fmtMoney(s.worst)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// 4. PatternHunter (extracted from page.js)
export function PatternHunter({ summary }) {
  if (!summary.topLeaks || summary.topLeaks.length === 0) return null;
  const biggest = summary.topLeaks[0];
  const improvedPnL = summary.netPnL - biggest.pnl;

  return (
    <Panel title="Behavioral Pattern Hunter" right={<span className="text-amber-400">AI INSIGHT</span>}>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-amber-400/20 bg-amber-500/5 p-5">
          <div className="text-xs font-black uppercase tracking-widest text-amber-500">Biggest Performance Leak</div>
          <div className="mt-3 text-3xl font-black text-slate-100">Avoid {biggest.category === 'hour' ? `Trading at ${biggest.value}:00` : biggest.value}</div>
          <div className="mt-2 text-sm text-slate-300">
            This pattern has cost you <span className="font-bold text-rose-400">{fmtMoney(biggest.pnl)}</span> across {biggest.count} trades. 
            By simply eliminating this one habit, your total P&L would jump to <span className="font-bold text-emerald-400">{fmtMoney(improvedPnL)}</span>.
          </div>
        </div>
        <div className="space-y-3">
          {summary.topLeaks.slice(1, 4).map(leak => (
            <div key={leak.category + leak.value} className="flex items-center justify-between rounded-2xl bg-slate-900 p-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Leak: {leak.category}</div>
                <div className="font-bold text-slate-200">{leak.value}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-rose-400">{fmtMoney(leak.pnl)}</div>
                <div className="text-[10px] text-slate-500">{leak.count} trades</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// 5. SetupLibrary (extracted from page.js)
export function SetupLibrary({ trades, onManagePlaybook }) {
  const setups = useMemo(() => {
    const map = {};
    (trades || []).forEach((t) => {
      const key = t.setupType || inferSetupType(t);
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
    <Panel 
      title="Playbook & Setup Library"
      right={
        onManagePlaybook && (
          <button 
            onClick={onManagePlaybook}
            className="rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400 hover:text-amber-300 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-300 transition"
          >
            ⚙️ Playbook Rules
          </button>
        )
      }
    >
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

// 6. MistakeLeaderboard (extracted from page.js)
export function MistakeLeaderboard({ trades }) {
  const mistakes = useMemo(() => {
    const stats = {};
    (trades || []).forEach((t) => {
      const tag = t.tag || "Needs review";
      if (!stats[tag]) {
        stats[tag] = { count: 0, leakage: 0 };
      }
      stats[tag].count++;
      stats[tag].leakage += n(t.pnl);
    });
    return Object.entries(stats)
      .map(([label, data]) => ({ label, count: data.count, leakage: data.leakage }))
      .sort((a, b) => a.leakage - b.leakage) // Sort from largest loss (most negative) to least
      .slice(0, 5);
  }, [trades]);

  return (
    <Panel title="Behavioral Leakage Leaderboard (Financial Drag)">
      <div className="space-y-3">
        {mistakes.map((m, i) => (
          <div key={m.label} className="flex items-center justify-between rounded-2xl bg-slate-900/40 p-4 border border-slate-900 hover:border-rose-500/20 transition-all duration-300">
            <div>
              <div className="text-[9px] uppercase font-black tracking-widest text-slate-500">#{i + 1} behavioral leak</div>
              <div className="font-bold text-slate-200 text-sm mt-0.5">{m.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{m.count} occurrence{m.count > 1 ? 's' : ''}</div>
            </div>
            <div className="text-right">
              <div className={`font-black text-sm ${m.leakage < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {fmtMoney(m.leakage)}
              </div>
              <div className="text-[9px] text-slate-500">Net Realized Drag</div>
            </div>
          </div>
        ))}
        {mistakes.length === 0 && (
          <div className="py-6 text-center text-slate-500 text-xs italic">No emotional mistake logs found. Clear ledger!</div>
        )}
      </div>
    </Panel>
  );
}
