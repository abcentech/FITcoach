"use client";
import React, { useState, useMemo, useEffect } from "react";
import { n, fmtMoney, pnlColor, tradingViewSymbol } from "./utils";
import { Panel } from "./ui";

export function TradeListAgent({
  filteredTrades = [],
  tradeFilter = "All",
  setTradeFilter,
  advancedFilters = {},
  setAdvancedFilters,
  setSelectedTradeId,
  setTab,
  weeks = [],
  months = [],
  selectedWeek = "All",
  selectedMonth = "All",
  onSelectWeek,
  onSelectMonth,
  onResetFilters
}) {
  const displayTrades = filteredTrades;
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === "class") {
          setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const handleReset = () => {
    setTradeFilter("All");
    setAdvancedFilters({
      symbol: "All",
      dir: "All",
      session: "All",
      timeFrom: "",
      timeTo: "",
      dateFrom: "",
      dateTo: ""
    });
    if (onResetFilters) {
      onResetFilters();
    }
  };

  const allSymbols = useMemo(() => {
    const symbols = weeks.flatMap((w) => (w.trades || []).map((t) => t.symbol));
    return [...new Set(symbols)].filter(Boolean);
  }, [weeks]);

  return (
    <Panel title="Historical Records">
      {/* Quick Filter Pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["All", "Gold", "BTC", "Nasdaq", "Forex", "Wins", "Losses", "A/B"].map((f) => (
          <button
            key={f}
            onClick={() => setTradeFilter(f)}
            className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
              tradeFilter === f
                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/10"
                : "bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-900/60 p-4 md:grid-cols-4 lg:grid-cols-8">
        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Direction</div>
          <select
            value={advancedFilters.dir || "All"}
            onChange={(e) => setAdvancedFilters((f) => ({ ...f, dir: e.target.value }))}
            className="w-full rounded-xl border border-slate-800 bg-slate-955 px-2 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
          >
            <option value="All">All</option>
            <option value="Buy">Buy (Long)</option>
            <option value="Sell">Sell (Short)</option>
          </select>
        </div>

        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Symbol</div>
          <select
            value={advancedFilters.symbol || "All"}
            onChange={(e) => setAdvancedFilters((f) => ({ ...f, symbol: e.target.value }))}
            className="w-full rounded-xl border border-slate-800 bg-slate-955 px-2 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
          >
            <option value="All">All</option>
            {allSymbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Session</div>
          <select
            value={advancedFilters.session || "All"}
            onChange={(e) => setAdvancedFilters((f) => ({ ...f, session: e.target.value }))}
            className="w-full rounded-xl border border-slate-800 bg-slate-955 px-2 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
          >
            <option value="All">All Sessions</option>
            <option value="Asia">Asia (00:00–08:00)</option>
            <option value="London">London (08:00–13:00)</option>
            <option value="Overlap">London/NY Overlap (13:00–17:00)</option>
            <option value="NY">New York (17:00–22:00)</option>
          </select>
        </div>

        {/* Week Dropdown */}
        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Week</div>
          <select
            value={selectedWeek}
            onChange={(e) => onSelectWeek && onSelectWeek(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-905 px-2 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
          >
            <option value="All">All Weeks</option>
            {weeks.map((w) => {
              const label = w.week ? `Week ${w.week}` : w.dateRange || `Week ${w.id}`;
              return (
                <option key={w.id} value={w.week || w.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Month Dropdown */}
        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Month</div>
          <select
            value={selectedMonth}
            onChange={(e) => onSelectMonth && onSelectMonth(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-955 px-2 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
          >
            <option value="All">All Months</option>
            {months.map((m) => {
              const label = m.month || `Month ${m.id}`;
              return (
                <option key={m.id} value={m.month || m.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Time From</div>
          <input
            type="time"
            value={advancedFilters.timeFrom || ""}
            onChange={(e) => setAdvancedFilters((f) => ({ ...f, timeFrom: e.target.value }))}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
          />
        </div>

        <div>
          <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">Time To</div>
          <input
            type="time"
            value={advancedFilters.timeTo || ""}
            onChange={(e) => setAdvancedFilters((f) => ({ ...f, timeTo: e.target.value }))}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 transition"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleReset}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-3 text-xs text-slate-500">{displayTrades.length} trades matching filters</div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Dir</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3 text-right">P&L</th>
              <th className="px-4 py-3 text-right">Cumulative</th>
              <th className="px-4 py-3 text-right">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {displayTrades.slice(0, 150).map((t) => (
              <React.Fragment key={t.id}>
                <tr className="hover:bg-slate-900/30 transition-colors duration-150">
                  <td className="px-4 py-3">
                    <div className="text-slate-300">{(t.dateTime || "").split(" ")[0]}</div>
                    <div className="text-[10px] text-slate-500">{(t.dateTime || "").split(" ")[1] || ""}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-200">{t.symbol}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                        (t.dir || "").toLowerCase() === "buy"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {t.dir}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{t.session}</td>
                  <td className={`px-4 py-3 text-right font-black ${pnlColor(t.pnl)}`}>{fmtMoney(t.pnl)}</td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${
                      n(t.cumulative) >= 0 ? "text-slate-300" : "text-rose-400/70"
                    }`}
                  >
                    {fmtMoney(t.cumulative)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedTradeId(t.id);
                        setTab("review");
                      }}
                      className="rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition-all"
                    >
                      &rarr;
                    </button>
                  </td>
                </tr>
                <tr>
                  <td colSpan="7" className="px-4 pb-4">
                    <div className="h-32 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-955">
                      <iframe
                        src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_762ae&symbol=${tradingViewSymbol(
                          t.symbol
                        )}&interval=15&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme=${theme}&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${
                          t.symbol
                        }`}
                        className="h-full w-full opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                        style={{ border: "none" }}
                      />
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {displayTrades.length > 150 && (
          <div className="p-4 text-center text-xs text-slate-600">
            Showing 150 of {displayTrades.length} trades. Use filters to narrow down.
          </div>
        )}
      </div>
    </Panel>
  );
}
