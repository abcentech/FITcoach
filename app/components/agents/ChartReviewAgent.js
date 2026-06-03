"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Panel, Info, KpiCard } from "./ui";
import { 
  n, 
  fmtMoney, 
  fmtPct, 
  pnlColor, 
  normalizeDateTime, 
  tradingViewLink, 
  reviewTradeStructure, 
  GRADE_SCORE,
  inferSetupType
} from "./utils";
import ExecutionChart from "../TradingViewChart";

// EditTradeModal Component
export function EditTradeModal({ trade, playbookSetups = [], onClose, onSave }) {
  const [pnl, setPnl] = useState(trade.pnl || 0);
  const [grade, setGrade] = useState(trade.grade || "Pending");
  const [setupType, setSetupType] = useState(trade.setupType || "");
  const [tag, setTag] = useState(trade.tag || "Needs review");
  const [hold, setHold] = useState(trade.hold || "Pending chart review");
  const [h1, setH1] = useState(trade.h1 || "Awaiting 1H context");
  const [m15, setM15] = useState(trade.m15 || "Awaiting 15M context");
  const [high, setHigh] = useState(trade.high || "");
  const [low, setLow] = useState(trade.low || "");

  // Load playbook setup details
  const activeSetup = useMemo(() => {
    return playbookSetups.find(s => s.name === setupType);
  }, [setupType, playbookSetups]);

  // Initial checked rules state
  const [checkedRules, setCheckedRules] = useState(() => {
    try {
      return typeof trade.checkedRules === "string" 
        ? JSON.parse(trade.checkedRules) 
        : Array.isArray(trade.checkedRules) 
          ? trade.checkedRules 
          : [];
    } catch {
      return [];
    }
  });

  // Watch setupType change and reset checked rules if setup rules changes
  useEffect(() => {
    if (activeSetup) {
      // Keep only those checked rules that exist in the active setup
      const activeRules = activeSetup.rules || [];
      setCheckedRules(prev => prev.filter(r => activeRules.includes(r)));
    } else {
      setCheckedRules([]);
    }
  }, [setupType, activeSetup]);

  const handleToggleRule = (rule) => {
    setCheckedRules(prev => 
      prev.includes(rule) 
        ? prev.filter(r => r !== rule) 
        : [...prev, rule]
    );
  };

  const handleSave = (e) => {
    e.preventDefault();
    let complianceVal = null;
    if (activeSetup && activeSetup.rules && activeSetup.rules.length > 0) {
      complianceVal = checkedRules.length / activeSetup.rules.length;
    }
    onSave({
      pnl: Number(pnl),
      grade,
      setupType,
      tag,
      hold,
      h1,
      m15,
      high: high === "" ? null : Number(high),
      low: low === "" ? null : Number(low),
      compliance: complianceVal,
      checkedRules: JSON.stringify(checkedRules)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h2 className="text-lg font-black text-slate-100">Edit Trade Details — #{trade.tradeId || trade.id} ({trade.symbol})</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm font-bold">✕ Close</button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase text-slate-500 block mb-1">P&L ($)</label>
              <input 
                type="number" 
                step="0.01"
                value={pnl} 
                onChange={e => setPnl(e.target.value)} 
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400" 
                required
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 block mb-1">Execution Grade</label>
              <select 
                value={grade} 
                onChange={e => setGrade(e.target.value)} 
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
              >
                <option value="A">Grade A (Excellent)</option>
                <option value="B">Grade B (Good execution)</option>
                <option value="C">Grade C (Average)</option>
                <option value="D">Grade D (Suboptimal)</option>
                <option value="F">Grade F (Rule breached)</option>
                <option value="Pending">Pending review</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase text-slate-500 block mb-1">Setup Type / Playbook</label>
              <select 
                value={setupType} 
                onChange={e => setSetupType(e.target.value)} 
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
              >
                <option value="">Unclassified</option>
                {playbookSetups.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 block mb-1">Mistake / Tag</label>
              <select 
                value={tag} 
                onChange={e => setTag(e.target.value)} 
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400" 
              >
                <option value="Needs review">Needs review</option>
                <optgroup label="Setups">
                  <option value="Impulse Pullback">Impulse Pullback</option>
                  <option value="Range Breakout">Range Breakout</option>
                  <option value="Reversal Base">Reversal Base</option>
                  <option value="S/R Rejection">S/R Rejection</option>
                </optgroup>
                <optgroup label="Mistakes">
                  <option value="FOMO entry">FOMO entry</option>
                  <option value="Revenge trading">Revenge trading</option>
                  <option value="Chasing price">Chasing price</option>
                  <option value="Early exit">Early exit</option>
                  <option value="Held too long">Held too long</option>
                </optgroup>
                <optgroup label="Market Conditions">
                  <option value="Trending Market">Trending Market</option>
                  <option value="Choppy Range">Choppy Range</option>
                  <option value="High Volatility News">High Volatility News</option>
                </optgroup>
              </select>
            </div>
          </div>

          {activeSetup && activeSetup.rules && activeSetup.rules.length > 0 && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 space-y-2">
              <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Playbook Setup Checklist Compliance</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {activeSetup.rules.map(rule => (
                  <label key={rule} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={checkedRules.includes(rule)} 
                      onChange={() => handleToggleRule(rule)}
                      className="rounded border-slate-800 bg-slate-950 text-amber-400 focus:ring-amber-400/30"
                    />
                    {rule}
                  </label>
                ))}
              </div>
              <div className="text-[9px] text-slate-500 pt-1">
                Compliance: {activeSetup.rules.length ? `${Math.round((checkedRules.length / activeSetup.rules.length) * 100)}%` : "0%"} ({checkedRules.length}/{activeSetup.rules.length} rules checked)
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase text-slate-500 block mb-1">High Price (For MFE Excursion)</label>
              <input 
                type="number" 
                step="0.00001"
                value={high} 
                onChange={e => setHigh(e.target.value)} 
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400" 
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500 block mb-1">Low Price (For MAE Excursion)</label>
              <input 
                type="number" 
                step="0.00001"
                value={low} 
                onChange={e => setLow(e.target.value)} 
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400" 
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase text-slate-500 block mb-1">Hold Verdict</label>
            <input 
              type="text" 
              value={hold} 
              onChange={e => setHold(e.target.value)} 
              placeholder="e.g. Trail only, close early"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400" 
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-slate-500 block mb-1">1H Context Notes</label>
            <textarea 
              value={h1} 
              onChange={e => setH1(e.target.value)} 
              rows="2"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400" 
            />
          </div>

          <div>
            <label className="text-[10px] uppercase text-slate-500 block mb-1">15M Context Notes</label>
            <textarea 
              value={m15} 
              onChange={e => setM15(e.target.value)} 
              rows="2"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400" 
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-black text-slate-400 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="rounded-xl bg-amber-400 px-6 py-2 text-xs font-black text-slate-950 hover:bg-amber-300"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ChartReviewPanel Component
export function ChartReviewPanel({ trades, selectedTrade, playbookSetups = [], onSelectTrade, onUpdateTrade }) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const review = reviewTradeStructure(selectedTrade || {});
  const tradeDate = normalizeDateTime(selectedTrade?.dateTime);
  const toneClass = review.tone === "green" 
    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200" 
    : review.tone === "amber" 
      ? "border-amber-500/30 bg-amber-500/5 text-amber-200" 
      : "border-rose-500/30 bg-rose-500/5 text-rose-200";

  if (!selectedTrade) {
    return (
      <Panel title="TradingView Chart Review">
        <div className="py-16 text-center text-slate-500">No trades available for chart review.</div>
      </Panel>
    );
  }

  return (
    <Panel 
      title="TradingView Chart Review" 
      right={
        <div className="flex gap-2">
          <button 
            onClick={() => setEditModalOpen(true)} 
            className="rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400 hover:text-amber-300 px-3 py-2 text-xs font-black text-slate-300 transition"
          >
            📝 Edit Trade
          </button>
          <a 
            href={tradingViewLink(selectedTrade.symbol)} 
            target="_blank" 
            rel="noreferrer" 
            className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950"
          >
            Open TradingView
          </a>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[310px_1fr]">
        <div className="space-y-4">
          <div className={`rounded-2xl border p-4 ${toneClass}`}>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Hold Verdict</div>
            <div className="mt-2 text-2xl font-black">{review.verdict}</div>
            <div className="mt-2 text-sm text-slate-300">
              Score {review.score}/10. Use 1H for direction, then make the final decision from 15M confirmation after entry.
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info text="Trade" value={`#${selectedTrade.id}`} />
              <Info 
                text="P&L" 
                value={fmtMoney(selectedTrade.pnl)} 
                good={n(selectedTrade.pnl) >= 0} 
                bad={n(selectedTrade.pnl) < 0} 
              />
              <Info text="Side" value={selectedTrade.dir} />
              <Info 
                text="Entry" 
                value={n(selectedTrade.entry).toFixed(selectedTrade.instrument === "Gold" ? 3 : 2)} 
              />
            </div>
            <div className="mt-4 text-xs leading-5 text-slate-400">
              <div><span className="font-bold text-slate-300">Time:</span> {tradeDate || "Missing timestamp"}</div>
              <div><span className="font-bold text-slate-300">Exit:</span> {n(selectedTrade.exit).toFixed(selectedTrade.instrument === "Gold" ? 3 : 2)}</div>
              <div><span className="font-bold text-slate-300">Mistake:</span> {selectedTrade.tag || "Needs review"}</div>
              <div><span className="font-bold text-slate-300">Sheet note:</span> {selectedTrade.hold || "Awaiting chart notes"}</div>
            </div>
          </div>
          <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {(trades || []).map((trade) => (
              <button 
                key={trade.id} 
                onClick={() => onSelectTrade(trade.id)} 
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  String(trade.id) === String(selectedTrade.id) 
                    ? "border-amber-400 bg-amber-500/10" 
                    : "border-slate-800 bg-slate-950 hover:border-slate-600"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-slate-500">#{trade.id} {trade.symbol}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-200">{normalizeDateTime(trade.dateTime)}</div>
                  </div>
                  <div className={`text-sm font-black ${pnlColor(trade.pnl)}`}>{fmtMoney(trade.pnl)}</div>
                </div>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
                  {trade.dir} | {trade.grade || "Pending"} | {trade.setupType || inferSetupType(trade)}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-900 p-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">1H Direction</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{selectedTrade.h1 || review.h1}</div>
            </div>
            <div className="rounded-2xl bg-slate-900 p-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">15M Confirmation</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{selectedTrade.m15 || review.m15}</div>
            </div>
          </div>
          <div className="mb-4">
            <ExecutionChart trade={selectedTrade} />
          </div>

          <Panel title="Review Checklist">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Info text="1H" value="Trend or range first" />
              <Info text="15M" value="Trigger after level" />
              <Info text="Hold" value="Only if structure continues" />
              <Info 
                text="Exit" 
                value={review.hasExcursion ? `Efficiency ${fmtPct(review.efficiency)}` : "Add high/low for MFE"} 
              />
            </div>
          </Panel>
        </div>
      </div>

      {editModalOpen && (
        <EditTradeModal 
          trade={selectedTrade} 
          playbookSetups={playbookSetups}
          onClose={() => setEditModalOpen(false)} 
          onSave={(fields) => onUpdateTrade(selectedTrade.id, fields)} 
        />
      )}
    </Panel>
  );
}
