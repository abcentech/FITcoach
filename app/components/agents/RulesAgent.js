"use client";
import React, { useMemo } from "react";
import { Panel, KpiCard } from "./ui";
import { n, fmtMoney, pnlColor, parseToTime } from "./utils";

export function RulesTracker({ trades }) {
  const violations = useMemo(() => {
    const list = [...(trades || [])].sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)));
    const vios = [];
    
    const dayTrades = {};
    list.forEach(t => {
      const day = (t.dateTime || "").split(" ")[0] || "Unknown";
      if (!dayTrades[day]) dayTrades[day] = [];
      dayTrades[day].push(t);
    });

    Object.entries(dayTrades).forEach(([day, dList]) => {
      const daySorted = [...dList].sort((a, b) => parseToTime(a.dateTime) - parseToTime(b.dateTime));
      
      if (daySorted.length > 3) {
        daySorted.slice(3).forEach(t => {
          vios.push({
            tradeId: t.id,
            dateTime: t.dateTime,
            symbol: t.symbol,
            rule: "Over-trading (>3 trades/day)",
            severity: "Medium",
            pnl: n(t.pnl)
          });
        });
      }

      let consecutiveLossCount = 0;
      daySorted.forEach((t, idx) => {
        if (consecutiveLossCount >= 2) {
          vios.push({
            tradeId: t.id,
            dateTime: t.dateTime,
            symbol: t.symbol,
            rule: "Trading after 2 losses",
            severity: "High",
            pnl: n(t.pnl)
          });
        }
        if (n(t.pnl) < 0) {
          consecutiveLossCount++;
        } else if (n(t.pnl) > 0) {
          consecutiveLossCount = 0;
        }
      });
    });

    const sortedAll = [...list].sort((a, b) => parseToTime(a.dateTime) - parseToTime(b.dateTime));
    
    sortedAll.forEach((t, idx) => {
      const pnlVal = n(t.pnl);
      const timeMs = parseToTime(t.dateTime);
      
      if (pnlVal <= -50) {
        vios.push({
          tradeId: t.id,
          dateTime: t.dateTime,
          symbol: t.symbol,
          rule: "No stop loss (> $50 loss)",
          severity: "High",
          pnl: pnlVal
        });
      }

      if (t.grade === "D" || t.grade === "F") {
        vios.push({
          tradeId: t.id,
          dateTime: t.dateTime,
          symbol: t.symbol,
          rule: `Weak Grade (${t.grade}) Entry`,
          severity: "Low",
          pnl: pnlVal
        });
      }

      if (idx > 0) {
        const prev = sortedAll[idx - 1];
        const prevPnl = n(prev.pnl);
        const prevTime = parseToTime(prev.dateTime);
        const diffMins = (timeMs - prevTime) / 60000;
        
        if (prev.symbol === t.symbol && prevPnl < 0 && diffMins > 0 && diffMins <= 30) {
          vios.push({
            tradeId: t.id,
            dateTime: t.dateTime,
            symbol: t.symbol,
            rule: `Revenge trade within ${Math.round(diffMins)}m`,
            severity: "High",
            pnl: pnlVal
          });
        }
      }
    });

    return vios.sort((a, b) => String(b.dateTime).localeCompare(String(a.dateTime)));
  }, [trades]);

  const summary = useMemo(() => {
    if (!trades || !trades.length) return { total: 0, compliance: 100, common: "None", worstDay: "None" };
    
    const violatedTradeIds = new Set(violations.map(v => v.tradeId));
    const compliance = ((trades.length - violatedTradeIds.size) / trades.length) * 100;
    
    const ruleCounts = {};
    violations.forEach(v => {
      ruleCounts[v.rule] = (ruleCounts[v.rule] || 0) + 1;
    });
    const common = Object.entries(ruleCounts).reduce((a, b) => b[1] > a[1] ? b : a, ["None", 0])[0];
    
    const dayVioCounts = {};
    violations.forEach(v => {
      const day = (v.dateTime || "").split(" ")[0] || "Unknown";
      dayVioCounts[day] = (dayVioCounts[day] || 0) + 1;
    });
    const worstDay = Object.entries(dayVioCounts).reduce((a, b) => b[1] > a[1] ? b : a, ["None", 0])[0];
    
    return {
      total: violations.length,
      compliance,
      common,
      worstDay
    };
  }, [violations, trades]);

  const complianceGroups = useMemo(() => {
    const violatedTradeIds = new Set(violations.map(v => v.tradeId));
    
    const compliantTrades = [];
    const nonCompliantTrades = [];
    
    (trades || []).forEach(t => {
      const hasViolation = violatedTradeIds.has(t.id);
      const compVal = t.compliance !== null && t.compliance !== undefined ? Number(t.compliance) : 1.0;
      const isCompliant = !hasViolation && compVal >= 1.0;
      
      if (isCompliant) {
        compliantTrades.push(t);
      } else {
        nonCompliantTrades.push(t);
      }
    });
    
    const calcStats = (list) => {
      if (!list.length) return { total: 0, winRate: 0, avgPnL: 0, totalPnL: 0 };
      const wins = list.filter(t => n(t.pnl) > 0).length;
      const totalPnL = list.reduce((sum, t) => sum + n(t.pnl), 0);
      return {
        total: list.length,
        winRate: (wins / list.length) * 100,
        avgPnL: totalPnL / list.length,
        totalPnL
      };
    };
    
    return {
      compliant: calcStats(compliantTrades),
      nonCompliant: calcStats(nonCompliantTrades)
    };
  }, [violations, trades]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <KpiCard label="Total Violations" value={String(summary.total)} tone={summary.total > 0 ? "red" : "green"} />
        <KpiCard label="Compliance Score" value={`${summary.compliance.toFixed(1)}%`} tone={summary.compliance >= 80 ? "green" : summary.compliance >= 60 ? "amber" : "red"} helper="Trades without violations" />
        <KpiCard label="Top Leak Rule" value={summary.common} tone="amber" />
        <KpiCard label="Worst Discipline Day" value={summary.worstDay} tone="red" />
      </div>

      <Panel title="Rules Compliance Impact Analysis">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Compliant Column */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase text-emerald-400 tracking-wider">100% Compliant Trades</div>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-400 border border-emerald-500/20 uppercase">Disciplined</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Trades</div>
                <div className="mt-1 text-lg font-black text-slate-200">{complianceGroups.compliant.total}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Win Rate</div>
                <div className="mt-1 text-lg font-black text-slate-200">{complianceGroups.compliant.winRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Avg P&L</div>
                <div className={`mt-1 text-lg font-black ${pnlColor(complianceGroups.compliant.avgPnL)}`}>
                  {fmtMoney(complianceGroups.compliant.avgPnL)}
                </div>
              </div>
            </div>
          </div>

          {/* Non-Compliant Column */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase text-rose-400 tracking-wider">Non-Compliant Trades (&lt;100%)</div>
              <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[9px] font-black text-rose-400 border border-rose-500/20 uppercase">Rules Broken</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total Trades</div>
                <div className="mt-1 text-lg font-black text-slate-200">{complianceGroups.nonCompliant.total}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Win Rate</div>
                <div className="mt-1 text-lg font-black text-slate-200">{complianceGroups.nonCompliant.winRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Avg P&L</div>
                <div className={`mt-1 text-lg font-black ${pnlColor(complianceGroups.nonCompliant.avgPnL)}`}>
                  {fmtMoney(complianceGroups.nonCompliant.avgPnL)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Discipline Dividend callout */}
        {complianceGroups.compliant.total > 0 && complianceGroups.nonCompliant.total > 0 && (
          <div className="mt-4 rounded-xl bg-slate-900 p-4 border border-slate-800 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-300">
              💡 <span className="font-bold text-amber-400">Discipline Dividend:</span>{" "}
              {complianceGroups.compliant.avgPnL > complianceGroups.nonCompliant.avgPnL ? (
                <>
                  Following your playbook rules generates an average of{" "}
                  <span className="font-extrabold text-emerald-400">
                    {fmtMoney(complianceGroups.compliant.avgPnL - complianceGroups.nonCompliant.avgPnL)}
                  </span>{" "}
                  more profit per trade compared to undisciplined entries.
                </>
              ) : (
                <>
                  Your compliant trades win rate is{" "}
                  <span className="font-extrabold text-amber-400">
                    {complianceGroups.compliant.winRate.toFixed(1)}%
                  </span>{" "}
                  vs.{" "}
                  <span className="text-slate-400">
                    {complianceGroups.nonCompliant.winRate.toFixed(1)}%
                  </span>{" "}
                  for non-compliant trades. Standardize your rules to maximize consistency.
                </>
              )}
            </div>
            <div className="text-xs font-black uppercase text-amber-400 tracking-widest hidden sm:block">
              Discipline = Profit
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Discipline Violation Log">
          {violations.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">Perfect discipline! No rule violations detected in this period.</div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Rule Broken</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3 text-right">PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {violations.map((v, i) => (
                    <tr key={i} className="hover:bg-slate-900/20">
                      <td className="px-4 py-3 text-xs text-slate-300">{v.dateTime}</td>
                      <td className="px-4 py-3 font-bold text-slate-200">{v.symbol}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-300">{v.rule}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${v.severity === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : v.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400'}`}>{v.severity}</span>
                      </td>
                      <td className={`px-4 py-3 text-right font-black ${pnlColor(v.pnl)}`}>{fmtMoney(v.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Discipline Framework Matrix">
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
              <div className="text-xs font-black uppercase text-rose-400 tracking-wider">High Severity (Fatal)</div>
              <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                Includes Revenge Trading, No-Stop Loss, and Trading After 2 Losses. Violations immediately trigger a "STOP & REVIEW" coach protocol.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="text-xs font-black uppercase text-amber-400 tracking-wider">Medium Severity (Leak)</div>
              <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                Over-trading (more than 3 trades per session). High fee drag, reduces average win metrics, and dilutes edge.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs font-black uppercase text-slate-400 tracking-wider">Low Severity (Warning)</div>
              <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                Trading low-grade (D or F) counter-trend entries. Suggests lack of selective filtering.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
