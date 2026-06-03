"use client";
import React, { useState, useEffect } from "react";
import { Panel, KpiCard } from "./ui";
import { getPreMarketPlan, savePreMarketPlan } from "../../actions";

export function PreMarketAgent({ initialDate }) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);
  const [id, setId] = useState("");
  const [htfBias, setHtfBias] = useState("Neutral");
  const [keyLevels, setKeyLevels] = useState("");
  const [liquidityZones, setLiquidityZones] = useState("");
  const [sessionFocus, setSessionFocus] = useState("London");
  const [scenarioA, setScenarioA] = useState("");
  const [scenarioB, setScenarioB] = useState("");
  const [scenarioC, setScenarioC] = useState("");
  const [conditionsNoTrade, setConditionsNoTrade] = useState("");
  const [maxTrades, setMaxTrades] = useState(3);
  const [riskLimit, setRiskLimit] = useState(1);
  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadPlan = async (targetDate) => {
    setLoading(true);
    setMessage("");
    try {
      const plan = await getPreMarketPlan(targetDate);
      if (plan) {
        setId(plan.id);
        setHtfBias(plan.htfBias || "Neutral");
        setKeyLevels(plan.keyLevels || "");
        setLiquidityZones(plan.liquidityZones || "");
        setSessionFocus(plan.sessionFocus || "London");
        setScenarioA(plan.scenarioA || "");
        setScenarioB(plan.scenarioB || "");
        setScenarioC(plan.scenarioC || "");
        setConditionsNoTrade(plan.conditionsNoTrade || "");
        setMaxTrades(plan.maxTrades ?? 3);
        setRiskLimit(plan.riskLimit ?? 1);
        setNotes(plan.notes || "");
        setScreenshot(plan.screenshot ? JSON.parse(plan.screenshot) : null);
      } else {
        // Reset fields for new plan
        setId("");
        setHtfBias("Neutral");
        setKeyLevels("");
        setLiquidityZones("");
        setSessionFocus("London");
        setScenarioA("");
        setScenarioB("");
        setScenarioC("");
        setConditionsNoTrade("");
        setMaxTrades(3);
        setRiskLimit(1);
        setNotes("");
        setScreenshot(null);
      }
    } catch (e) {
      console.error(e);
      setMessage("⚠️ Failed to load pre-market plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan(date);
  }, [date]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const saved = await savePreMarketPlan({
        id: id || undefined,
        date,
        htfBias,
        keyLevels,
        liquidityZones,
        sessionFocus,
        scenarioA,
        scenarioB,
        scenarioC,
        conditionsNoTrade,
        maxTrades: Number(maxTrades),
        riskLimit: Number(riskLimit),
        screenshot: screenshot ? JSON.stringify(screenshot) : null,
        notes,
      });
      setId(saved.id);
      setMessage("✅ Pre-market plan saved successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      console.error(e);
      setMessage("⚠️ Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setScreenshot({ name: file.name, dataUrl: data.url });
    } catch (err) {
      alert(err.message || "Failed to upload screenshot");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Select & Load Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950 p-5">
        <div>
          <h2 className="text-lg font-black text-slate-100">Pre-Market Planning Dashboard</h2>
          <p className="text-xs text-slate-400">Establish structural boundaries and execution limits before clicking the charts.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-amber-400 font-bold text-sm">Loading plan for {date}...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            
            {/* Left Side: Parameters, Levels & Constraints */}
            <div className="space-y-6">
              
              <Panel title="Plan Parameters">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">HTF Bias</label>
                    <select
                      value={htfBias}
                      onChange={(e) => setHtfBias(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                    >
                      <option value="Bullish">🐂 Bullish Bias</option>
                      <option value="Bearish">🐻 Bearish Bias</option>
                      <option value="Neutral">🧘 Neutral Range</option>
                      <option value="No-Trade-Day">❌ Restricted / No Trade</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Session Focus</label>
                    <select
                      value={sessionFocus}
                      onChange={(e) => setSessionFocus(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                    >
                      <option value="Asia">Asia Session</option>
                      <option value="London">London Session</option>
                      <option value="NY">New York Session</option>
                      <option value="London-NY-Overlap">London/NY Overlap</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Max Trades Allowed</label>
                    <input
                      type="number"
                      value={maxTrades}
                      onChange={(e) => setMaxTrades(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Risk Limit (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={riskLimit}
                      onChange={(e) => setRiskLimit(Math.max(0.1, Number(e.target.value)))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>
              </Panel>

              <Panel title="Market Structures">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Key Levels (Daily / 4H)</label>
                    <textarea
                      value={keyLevels}
                      onChange={(e) => setKeyLevels(e.target.value)}
                      rows={3}
                      placeholder="e.g. 2350 support, 2380 resistance, Daily imbalance at 2362"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Liquidity Pools / Hunt Zones</label>
                    <textarea
                      value={liquidityZones}
                      onChange={(e) => setLiquidityZones(e.target.value)}
                      rows={3}
                      placeholder="e.g. Sell-stops under 2345 low, buy-stops above Asian high at 2378"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </Panel>

              <Panel title="Strict Invalidation Constraints">
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Conditions for NO TRADE</label>
                  <textarea
                    value={conditionsNoTrade}
                    onChange={(e) => setConditionsNoTrade(e.target.value)}
                    rows={3}
                    placeholder="e.g. High-impact news within 30 minutes, spread > 2 pips, emotional impatience, or price already broke key levels without test"
                    className="w-full rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-slate-200 outline-none focus:border-rose-400"
                  />
                </div>
              </Panel>
            </div>

            {/* Right Side: Scenarios, Screenshot & Notes */}
            <div className="space-y-6">
              
              <Panel title="Hypothetical Scenarios">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase text-emerald-400 font-black tracking-wider block mb-1">Scenario A (Primary Execution)</label>
                    <textarea
                      value={scenarioA}
                      onChange={(e) => setScenarioA(e.target.value)}
                      rows={2}
                      placeholder="Price sweeps liquidity at 2350, shifts structure on 5M, entry trigger."
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 font-black tracking-wider block mb-1">Scenario B (Alternative Play)</label>
                    <textarea
                      value={scenarioB}
                      onChange={(e) => setScenarioB(e.target.value)}
                      rows={2}
                      placeholder="Price opens strong and pushes directly to 2380 rejection zone."
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-rose-400 font-black tracking-wider block mb-1">Scenario C (No-Action Drift)</label>
                    <textarea
                      value={scenarioC}
                      onChange={(e) => setScenarioC(e.target.value)}
                      rows={2}
                      placeholder="Chopping inside Asian range. Settle on hands."
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </Panel>

              <Panel title="HTF Context Visual">
                <div className="space-y-4">
                  {screenshot?.dataUrl ? (
                    <div className="relative group">
                      <img src={screenshot.dataUrl} alt="HTF context" className="w-full h-48 object-cover rounded-2xl opacity-80 group-hover:opacity-100 transition" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setScreenshot(null)}
                          className="bg-rose-500 text-white rounded-lg p-2 text-xs font-bold hover:bg-rose-600 transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/50 hover:border-amber-400 hover:bg-slate-900/70 transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <span className="text-3xl mb-2">📷</span>
                        <p className="text-xs font-bold text-slate-300">Click to upload pre-market chart screenshot</p>
                        <p className="text-[9px] text-slate-500 mt-1">PNG, JPG (Max 5MB)</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
                    </label>
                  )}
                </div>
              </Panel>

              <Panel title="Process Notes">
                <div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Note any mindset observations, physical state, or other notes..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
                  />
                </div>
              </Panel>
            </div>
          </div>

          {/* Messages & Actions */}
          {message && (
            <div className={`rounded-xl border p-4 text-xs font-bold ${message.startsWith("✅") ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-rose-500/20 bg-rose-500/5 text-rose-400"}`}>
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-8 py-3.5 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-amber-400/10 disabled:opacity-50"
            >
              {saving ? "Saving Plan..." : "Lock In Pre-Market Plan"}
            </button>
          </div>

        </form>
      )}
    </div>
  );
}
