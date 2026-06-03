"use client";
import React, { useMemo } from "react";
import { n, fmtMoney, pnlColor } from "./utils";

export function TradezellaHeader({ summary, trades }) {
  const {
    netPnL = 0,
    profitFactor = 0,
    winRate = 0,
    expectancy = 0,
    wins = 0,
    losses = 0,
    trades: totalTrades = 0,
  } = summary || {};

  // Group trades by normalized YYYY-MM-DD
  const last30Days = useMemo(() => {
    const dailyPnL = {};
    const tradeList = trades || [];

    tradeList.forEach((t) => {
      if (!t.dateTime) return;
      const dateStr = t.dateTime.split(" ")[0];
      const normalized = dateStr.replace(/\./g, "-");
      if (!dailyPnL[normalized]) {
        dailyPnL[normalized] = 0;
      }
      dailyPnL[normalized] += n(t.pnl);
    });

    const dates = Object.keys(dailyPnL);
    let latestDate = new Date();
    if (dates.length > 0) {
      const parsedDates = dates
        .map((d) => new Date(d))
        .filter((d) => !isNaN(d.getTime()));
      if (parsedDates.length > 0) {
        latestDate = new Date(Math.max(...parsedDates));
      }
    }

    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(latestDate);
      d.setDate(latestDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const hasTrades = dailyPnL[dateStr] !== undefined;
      const pnl = hasTrades ? dailyPnL[dateStr] : 0;
      const status = hasTrades ? (pnl >= 0 ? "win" : "loss") : "none";
      days.push({ dateStr, status, pnl });
    }
    return days;
  }, [trades]);

  const pnlVal = n(netPnL);
  const expectancyVal = n(expectancy);
  const winRatePercent = Math.round(n(winRate) * 100);

  // SVG parameters for circular gauge
  const radius = 22;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (n(winRate) * circumference);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-black/40">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 items-center">
        {/* Net P&L */}
        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Net P&L</div>
          <div className={`text-3xl font-black tracking-tight ${pnlColor(pnlVal)}`}>
            {fmtMoney(pnlVal)}
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            {totalTrades} trades &bull; {wins}W / {losses}L
          </div>
        </div>

        {/* Profit Factor */}
        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Profit Factor</div>
          <div className="text-3xl font-black tracking-tight text-slate-100">
            {n(profitFactor).toFixed(2)}x
          </div>
          <div className="text-[11px] text-slate-500">Gross profit / Gross loss</div>
        </div>

        {/* Win Rate with Circular Indicator */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r={radius}
                className="stroke-slate-800/60"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                className="stroke-amber-400 transition-all duration-500 ease-out"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-xs font-black text-slate-100">{winRatePercent}%</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Win Rate</div>
            <div className="text-xl font-bold text-slate-200">{winRatePercent}%</div>
            <div className="text-[10px] text-slate-500">Compliant exits</div>
          </div>
        </div>

        {/* Expectancy */}
        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Expectancy</div>
          <div className={`text-2xl font-black tracking-tight ${pnlColor(expectancyVal)}`}>
            {fmtMoney(expectancyVal)}
          </div>
          <div className="text-[11px] text-slate-500">Expected value per trade</div>
        </div>

        {/* Mini Calendar Strip */}
        <div className="space-y-2 lg:col-span-1">
          <div className="flex justify-between items-center">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Last 30 Days</div>
            <div className="flex gap-1.5 text-[8px] uppercase tracking-wider text-slate-600 font-bold">
              <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-emerald-500/80"></span>W</span>
              <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-rose-500/80"></span>L</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 items-center bg-slate-900/40 p-2.5 rounded-2xl border border-slate-900">
            {last30Days.map((day, idx) => {
              let bgClass = "bg-slate-950 border border-slate-800/80 hover:border-slate-700";
              if (day.status === "win") {
                bgClass = "bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.2)] hover:bg-emerald-400";
              } else if (day.status === "loss") {
                bgClass = "bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.2)] hover:bg-rose-400";
              }
              return (
                <div
                  key={idx}
                  className={`w-3 h-3 rounded-sm transition-all duration-200 cursor-pointer ${bgClass}`}
                  title={`${day.dateStr}: ${day.status === "none" ? "No Trades" : fmtMoney(day.pnl)}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
