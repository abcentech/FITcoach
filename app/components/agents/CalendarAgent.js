"use client";
import React, { useState, useMemo } from "react";
import { Panel, Info, KpiCard } from "./ui";
import { n, fmtMoney, pnlColor } from "./utils";

export function TradeCalendar({ selectedWeek, trades, onOpenDailyJournal, journals = [] }) {
  const allTrades = trades || [];

  let safeDefault = new Date();
  if (allTrades[0] && allTrades[0].dateTime) {
    const cleaned = String(allTrades[0].dateTime || '').replace(/\./g, '-').replace(' ', 'T');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) safeDefault = d;
  } else if (selectedWeek?.year && selectedWeek?.month) {
    const d = new Date(`${selectedWeek.month} 1, ${selectedWeek.year}`);
    if (!isNaN(d.getTime())) safeDefault = d;
  } else if (selectedWeek?.dateRange) {
    const match = selectedWeek.dateRange.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (match) {
      const d = new Date(`${match[1]}-${match[2]}-${match[3]}`);
      if (!isNaN(d.getTime())) safeDefault = d;
    } else {
      const parts = selectedWeek.dateRange.split(/\s+to\s+/i);
      if (parts.length > 1) {
        const firstPart = parts[0];
        const yearMatch = selectedWeek.dateRange.match(/\d{4}/);
        if (yearMatch) {
          const d = new Date(`${firstPart}, ${yearMatch[0]}`);
          if (!isNaN(d.getTime())) safeDefault = d;
        }
      } else {
        const d = new Date(selectedWeek.dateRange);
        if (!isNaN(d.getTime())) safeDefault = d;
      }
    }
  }

  if (isNaN(safeDefault.getTime())) safeDefault = new Date();

  const [viewYear, setViewYear] = useState(safeDefault.getFullYear());
  const [viewMonth, setViewMonth] = useState(safeDefault.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(null);

  // Build day stats map: "YYYY-MM-DD" -> { pnl, trades, wins }
  const dayMap = useMemo(() => {
    const map = {};
    allTrades.forEach(t => {
      try {
        const raw = String(t.dateTime || '').replace(/\./g, '-').replace(' ', 'T');
        const d = new Date(raw);
        if (isNaN(d)) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!map[key]) map[key] = { pnl: 0, count: 0, wins: 0, losses: 0, trades: [] };
        map[key].pnl += n(t.pnl);
        map[key].count++;
        if (n(t.pnl) > 0) map[key].wins++;
        if (n(t.pnl) < 0) map[key].losses++;
        map[key].trades.push(t);
      } catch {}
    });
    return map;
  }, [allTrades]);

  // Calendar grid math
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long' });
  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null); // empty leading cells
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); setSelectedDay(null); };

  const selKey = selectedDay ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` : null;
  const selData = selKey ? dayMap[selKey] : null;

  // Summary for this month
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthStats = useMemo(() => {
    let pnl = 0, count = 0, greenDays = 0, redDays = 0;
    Object.entries(dayMap).forEach(([k, v]) => {
      if (k.startsWith(monthKey)) { pnl += v.pnl; count += v.count; if (v.pnl > 0) greenDays++; else if (v.pnl < 0) redDays++; }
    });
    return { pnl, count, greenDays, redDays };
  }, [dayMap, monthKey]);

  return (
    <div className="space-y-4">
      {/* Month Nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-slate-400 hover:bg-slate-800 hover:text-slate-100">← Prev</button>
        <div className="text-center">
          <div className="text-2xl font-black text-slate-100">{monthName} {viewYear}</div>
          <div className="mt-1 flex justify-center gap-4 text-xs text-slate-500">
            <span className="text-emerald-400">{monthStats.greenDays} green days</span>
            <span className="text-rose-400">{monthStats.redDays} red days</span>
            <span className={`font-bold ${pnlColor(monthStats.pnl)}`}>{fmtMoney(monthStats.pnl)}</span>
            <span>{monthStats.count} trades</span>
          </div>
        </div>
        <button onClick={nextMonth} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-slate-400 hover:bg-slate-800 hover:text-slate-100">Next →</button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1.5">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-20 rounded-2xl bg-slate-900/20" />;
          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const data = dayMap[key];
          const isSelected = selectedDay === day;
          const isToday = new Date().getDate() === day && new Date().getMonth() === viewMonth && new Date().getFullYear() === viewYear;
          const dayJournal = journals.find(j => j.date === key);

          let cellBg = 'bg-slate-900/40 border-slate-800/50';
          if (data) {
            if (data.pnl > 0) cellBg = 'bg-emerald-500/15 border-emerald-500/30';
            else if (data.pnl < 0) cellBg = 'bg-rose-500/15 border-rose-500/30';
            else cellBg = 'bg-slate-800/60 border-slate-700';
          }
          if (isSelected) cellBg += ' ring-2 ring-amber-400';

          return (
            <button
              key={key}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative h-20 rounded-2xl border p-2 text-left transition-all hover:scale-[1.02] hover:ring-1 hover:ring-amber-400/50 ${cellBg}`}
            >
              <div className="flex items-center justify-between">
                <div className={`text-[10px] font-black ${isToday ? 'text-amber-400' : 'text-slate-500'}`}>{day}</div>
                {dayJournal && (
                  <span className="text-[10px]" title={`Journal logged: ${dayJournal.mood}`}>
                    {dayJournal.mood ? dayJournal.mood.split(" ")[0] : "📝"}
                  </span>
                )}
              </div>
              {data ? (
                <>
                  <div className={`mt-1 text-sm font-black leading-tight ${data.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {Math.abs(data.pnl) >= 1000
                      ? `${data.pnl >= 0 ? '+' : '-'}$${(Math.abs(data.pnl) / 1000).toFixed(1)}K`
                      : fmtMoney(data.pnl)}
                  </div>
                  <div className="mt-0.5 text-[9px] text-slate-500">{data.count} trade{data.count !== 1 ? 's' : ''}</div>
                </>
              ) : (
                <div className="mt-2 text-[9px] text-slate-700">—</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Detail */}
      {selData && (
        <div className="rounded-3xl border border-amber-400/20 bg-amber-500/5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-amber-400">{monthName} {selectedDay}, {viewYear}</div>
              <div className={`mt-1 text-3xl font-black ${pnlColor(selData.pnl)}`}>{fmtMoney(selData.pnl)}</div>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
              <button 
                onClick={() => onOpenDailyJournal && onOpenDailyJournal(selKey)}
                className="rounded-xl bg-amber-400 text-slate-950 font-black text-[10px] px-3 py-2 hover:bg-amber-300 transition"
              >
                📝 Daily Debrief
              </button>
              <div className="text-right">
                <div className="text-sm text-slate-400">{selData.count} trades</div>
                <div className="text-xs text-slate-500">{selData.wins}W / {selData.losses}L</div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {selData.trades.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${(t.dir || '').toLowerCase() === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{t.dir}</span>
                  <span className="font-bold text-slate-200">{t.symbol}</span>
                  <span className="text-xs text-slate-500">{(t.dateTime || '').split(' ')[1] || ''}</span>
                  <span className="text-xs text-slate-600">{t.session}</span>
                </div>
                <span className={`font-black ${pnlColor(t.pnl)}`}>{fmtMoney(t.pnl)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
