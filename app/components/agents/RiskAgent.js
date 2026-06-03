"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Panel } from "./ui";
import { n, fmtMoney } from "./utils";
import { getRiskSettings, saveRiskSettings, saveDailyReview } from "../../actions";

export function RiskOfRuin({ summary, trades = [], portfolioId, onSettingsSaved }) {
  const wr = summary?.winRate || 0.5;
  const aw = summary?.avgWin || 20;
  const al = summary?.avgLoss || 20;
  const rr = al > 0 ? aw / al : 1;
  
  const [startingCapital, setStartingCapital] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const [inputWinRate, setInputWinRate] = useState(Math.round(wr * 100));
  const [inputAvgWin, setInputAvgWin] = useState(Math.round(aw));
  const [inputAvgLoss, setInputAvgLoss] = useState(Math.round(al));
  const [numSimulations, setNumSimulations] = useState(1000);
  const [simResults, setSimResults] = useState(null);

  // Sub-tab selection: "simulator" | "locks"
  const [subTab, setSubTab] = useState("simulator");

  // Risk Settings Form State
  const [maxDailyLoss, setMaxDailyLoss] = useState(500);
  const [maxWeeklyDrawdown, setMaxWeeklyDrawdown] = useState(1500);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState(3);
  const [cooldownTimerMinutes, setCooldownTimerMinutes] = useState(30);
  const [emotionalTradeLimit, setEmotionalTradeLimit] = useState(2);
  const [consecutiveLossesLimit, setConsecutiveLossesLimit] = useState(2);
  
  const [lockActiveUntil, setLockActiveUntil] = useState(null);
  const [lockReason, setLockReason] = useState(null);
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState("");

  const loadDbSettings = async () => {
    if (!portfolioId) return;
    try {
      const s = await getRiskSettings(portfolioId);
      if (s) {
        setMaxDailyLoss(s.maxDailyLoss ?? 500);
        setMaxWeeklyDrawdown(s.maxWeeklyDrawdown ?? 1500);
        setMaxTradesPerDay(s.maxTradesPerDay ?? 3);
        setCooldownTimerMinutes(s.cooldownTimerMinutes ?? 30);
        setEmotionalTradeLimit(s.emotionalTradeLimit ?? 2);
        setConsecutiveLossesLimit(s.consecutiveLossesLimit ?? 2);
        setLockActiveUntil(s.lockActiveUntil);
        setLockReason(s.lockReason);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDbSettings();
  }, [portfolioId]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg("");
    try {
      await saveRiskSettings({
        portfolioId,
        maxDailyLoss: Number(maxDailyLoss),
        maxWeeklyDrawdown: Number(maxWeeklyDrawdown),
        maxTradesPerDay: Number(maxTradesPerDay),
        cooldownTimerMinutes: Number(cooldownTimerMinutes),
        emotionalTradeLimit: Number(emotionalTradeLimit),
        consecutiveLossesLimit: Number(consecutiveLossesLimit),
        lockActiveUntil,
        lockReason,
      });
      setSettingsMsg("✅ Risk settings saved successfully.");
      setTimeout(() => setSettingsMsg(""), 3000);
      await loadDbSettings();
      if (onSettingsSaved) await onSettingsSaved();
    } catch (err) {
      console.error(err);
      setSettingsMsg("⚠️ Failed to save risk settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleForceUnlock = async () => {
    if (!confirm("Forcing release breaks protocol. This will immediately deduct 15 points from today's discipline score and log a severe violation. Proceed?")) return;
    setSavingSettings(true);
    try {
      await saveRiskSettings({
        portfolioId,
        maxDailyLoss,
        maxWeeklyDrawdown,
        maxTradesPerDay,
        cooldownTimerMinutes,
        emotionalTradeLimit,
        consecutiveLossesLimit,
        lockActiveUntil: null,
        lockReason: null,
      });

      const dateStr = new Date().toISOString().split("T")[0];
      await saveDailyReview({
        date: dateStr,
        followedPlan: 0,
        chased: 1,
        patient: 0,
        emotionalTriggers: "Lock Bypass, Revenge Override",
        improvements: "Lock breached. Urgent session lockout override occurred.",
        disciplineScore: 50,
        executionGrade: "F",
        emotionalControlScore: 30,
      });

      alert("🔓 Cooldown lock bypassed. Penalty applied to today's review score.");
      await loadDbSettings();
      if (onSettingsSaved) await onSettingsSaved();
    } catch (e) {
      console.error(e);
      alert("Failed to unlock.");
    } finally {
      setSavingSettings(false);
    }
  };

  const kellyPct = useMemo(() => {
    if (rr <= 0 || wr <= 0) return 0;
    const k = wr - (1 - wr) / rr;
    return Math.max(0, k * 100);
  }, [wr, rr]);

  const riskOfRuinPct = useMemo(() => {
    if (wr <= 0 || wr >= 1 || al <= 0) return 100;
    const base = (1 - wr) / wr;
    if (base >= 1) return 100;
    const exponent = startingCapital / al;
    const ror = Math.pow(base, exponent) * 100;
    return Math.min(100, Math.max(0, ror));
  }, [wr, al, startingCapital]);

  const handleRunSimulation = () => {
    const wrSim = inputWinRate / 100;
    const awSim = inputAvgWin;
    const alSim = inputAvgLoss;
    const simCount = 200;
    const numTrades = 100;
    
    let bustCount = 0;
    const finalEquities = [];
    const simulatedPaths = [];

    for (let s = 0; s < simCount; s++) {
      let balance = startingCapital;
      const path = [balance];
      let wentBust = false;

      for (let t = 0; t < numTrades; t++) {
        const tradeRisk = balance * (riskPct / 100);
        const winAmount = tradeRisk * (awSim / alSim);
        const lossAmount = tradeRisk;

        if (Math.random() < wrSim) {
          balance += winAmount;
        } else {
          balance -= lossAmount;
        }

        path.push(balance);
        if (balance <= 0) {
          wentBust = true;
          balance = 0;
        }
      }
      if (wentBust) bustCount++;
      finalEquities.push(balance);
      simulatedPaths.push(path);
    }

    const minFinal = Math.min(...finalEquities);
    const maxFinal = Math.max(...finalEquities);
    const numBuckets = 10;
    const bucketSize = (maxFinal - minFinal) / numBuckets;
    const buckets = Array(numBuckets).fill(0);
    finalEquities.forEach(eq => {
      const idx = Math.min(numBuckets - 1, Math.floor((eq - minFinal) / (bucketSize || 1)));
      buckets[idx]++;
    });

    setSimResults({
      bustRate: (bustCount / simCount) * 100,
      avgFinal: finalEquities.reduce((a, b) => a + b, 0) / simCount,
      bestCase: maxFinal,
      worstCase: minFinal,
      buckets,
      minFinal,
      maxFinal,
      bucketSize
    });
  };

  const isLocked = lockActiveUntil && new Date(lockActiveUntil) > new Date();

  return (
    <div className="space-y-6">
      
      {/* Sub-tab Switcher */}
      <div className="flex justify-between items-center rounded-3xl border border-slate-800 bg-slate-950 p-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab("simulator")}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
              subTab === "simulator" ? "bg-amber-400 text-slate-950" : "text-slate-500 hover:text-slate-200"
            }`}
          >
            📊 Kelly & Monte Carlo
          </button>
          <button
            onClick={() => setSubTab("locks")}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
              subTab === "locks" ? "bg-amber-400 text-slate-950" : "text-slate-500 hover:text-slate-200"
            }`}
          >
            ⚙️ Risk Limits & Locks
          </button>
        </div>
        {isLocked && (
          <div className="flex items-center gap-3 pr-2 text-xs font-black text-rose-400 animate-pulse">
            ⚠️ ACCOUNT LOCKED
          </div>
        )}
      </div>

      {subTab === "simulator" && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Auto-Calculated Portfolio Risk (Kelly Criterion)">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-900 p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Optimal Kelly Position Size</div>
                    <div className="mt-2 text-2xl font-black text-emerald-400">{kellyPct.toFixed(1)}%</div>
                    <div className="text-[9px] text-slate-500 mt-1">Full Kelly (Aggressive)</div>
                  </div>
                  <div className="rounded-2xl bg-slate-900 p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Half-Kelly Size (Recommended)</div>
                    <div className="mt-2 text-2xl font-black text-sky-400">{(kellyPct / 2).toFixed(1)}%</div>
                    <div className="text-[9px] text-slate-500 mt-1">Safer volatility control</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Risk of Ruin (Kelly Prob)</div>
                    <div className="mt-1 text-xs text-slate-400">Probability of account depletion based on current edge.</div>
                  </div>
                  <div className={`text-2xl font-black ${riskOfRuinPct > 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {riskOfRuinPct.toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                  <div className="text-xs font-black uppercase text-amber-400 tracking-wider">Coach Risk Recommendations</div>
                  <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                    <li>Your current win rate is <span className="font-bold text-amber-300">{(wr * 100).toFixed(1)}%</span> and R:R is <span className="font-bold text-amber-300">{rr.toFixed(1)}R</span>.</li>
                    <li>Your maximum safe risk per trade is <span className="font-bold text-sky-300">{Math.min(2.0, Math.max(0.5, kellyPct / 4)).toFixed(1)}%</span>.</li>
                    <li>Never risk more than 2% per trade, regardless of positive mathematical expectancy.</li>
                  </ul>
                </div>
              </div>
            </Panel>

            <Panel title="Monte Carlo Simulator Configuration">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 block mb-1">Starting Capital ($)</label>
                    <input 
                      type="number" 
                      value={startingCapital} 
                      onChange={e => setStartingCapital(Number(e.target.value))} 
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 block mb-1">Risk Per Trade (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={riskPct} 
                      onChange={e => setRiskPct(Number(e.target.value))} 
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 block mb-1">Simulated Win Rate (%)</label>
                    <input 
                      type="number" 
                      value={inputWinRate} 
                      onChange={e => setInputWinRate(Number(e.target.value))} 
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 block mb-1">Simulated Avg Win ($)</label>
                    <input 
                      type="number" 
                      value={inputAvgWin} 
                      onChange={e => setInputAvgWin(Number(e.target.value))} 
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 block mb-1">Simulated Avg Loss ($)</label>
                    <input 
                      type="number" 
                      value={inputAvgLoss} 
                      onChange={e => setInputAvgLoss(Number(e.target.value))} 
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 block mb-1">Simulations</label>
                    <select 
                      value={numSimulations} 
                      onChange={e => setNumSimulations(Number(e.target.value))} 
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none"
                    >
                      <option value={500}>500 paths</option>
                      <option value={1000}>1000 paths</option>
                      <option value={2000}>2000 paths</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleRunSimulation} className="w-full rounded-xl bg-amber-400 py-3 text-sm font-black text-slate-950 hover:bg-amber-300">Run Monte Carlo Simulation</button>
              </div>
            </Panel>
          </div>

          {simResults && (
            <Panel title="Monte Carlo Simulation Results (200 Paths, 100 Trades Each)" right={<span className="text-sky-400">PROBABILITY DENSITY</span>}>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-900 p-4">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">Bust Rate (Account &lt; 0)</div>
                      <div className={`text-2xl font-black mt-1 ${simResults.bustRate > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {simResults.bustRate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-4">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">Average Final Capital</div>
                      <div className="text-2xl font-black mt-1 text-slate-200">
                        {fmtMoney(simResults.avgFinal)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-4">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">Best Case Final Capital</div>
                      <div className="text-2xl font-black mt-1 text-emerald-400">
                        {fmtMoney(simResults.bestCase)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-4">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">Worst Case Final Capital</div>
                      <div className={`text-2xl font-black mt-1 ${simResults.worstCase <= 0 ? 'text-rose-500' : 'text-rose-400'}`}>
                        {fmtMoney(simResults.worstCase)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 p-4 flex flex-col justify-between">
                  <div className="text-[10px] font-black uppercase text-slate-500 mb-2">Final Equity Distribution</div>
                  <div className="flex items-end gap-1 h-32">
                    {simResults.buckets.map((val, idx) => {
                      const maxCount = Math.max(1, ...simResults.buckets);
                      const heightPct = (val / maxCount) * 100;
                      const rangeStart = simResults.minFinal + idx * simResults.bucketSize;
                      const rangeEnd = rangeStart + simResults.bucketSize;
                      return (
                        <div 
                          key={idx} 
                          title={`Final equity between ${fmtMoney(rangeStart)} and ${fmtMoney(rangeEnd)}: ${val} simulations`}
                          className="flex-1 bg-amber-400/20 rounded-t border-t border-amber-400/40 hover:bg-amber-400/40 transition-all cursor-help"
                          style={{ height: `${heightPct}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-[8px] text-slate-500">
                    <span>{fmtMoney(simResults.minFinal)}</span>
                    <span>Distribution of 200 paths</span>
                    <span>{fmtMoney(simResults.maxFinal)}</span>
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      )}

      {subTab === "locks" && (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Settings form column */}
          <div className="lg:col-span-2">
            <Panel title="Broker & Behavioral Limits">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black block mb-1">Max Daily Loss ($)</label>
                    <input
                      type="number"
                      value={maxDailyLoss}
                      onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black block mb-1">Max Weekly Drawdown ($)</label>
                    <input
                      type="number"
                      value={maxWeeklyDrawdown}
                      onChange={(e) => setMaxWeeklyDrawdown(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black block mb-1">Max Trades Per Day</label>
                    <input
                      type="number"
                      value={maxTradesPerDay}
                      onChange={(e) => setMaxTradesPerDay(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black block mb-1">Mandatory Cooldown (Mins)</label>
                    <input
                      type="number"
                      value={cooldownTimerMinutes}
                      onChange={(e) => setCooldownTimerMinutes(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black block mb-1">Emotional Trade Limit (per day)</label>
                    <input
                      type="number"
                      value={emotionalTradeLimit}
                      onChange={(e) => setEmotionalTradeLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black block mb-1">Consecutive Losses Limit</label>
                    <input
                      type="number"
                      value={consecutiveLossesLimit}
                      onChange={(e) => setConsecutiveLossesLimit(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                {settingsMsg && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-bold text-emerald-400">
                    {settingsMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 py-3.5 text-xs font-black uppercase tracking-wider transition"
                >
                  {savingSettings ? "Saving Settings..." : "Save Risk Limits"}
                </button>

              </form>
            </Panel>
          </div>

          {/* Active locks diagnostics column */}
          <div>
            <Panel title="Active Risk Lock Status">
              <div className="space-y-6 text-center">
                
                {isLocked ? (
                  <div className="space-y-4">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-3xl">
                      🔒
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lock reason</div>
                      <p className="text-xs font-bold text-rose-300 mt-1">{lockReason || "Exceeded limits"}</p>
                      <p className="text-[10px] text-slate-500 mt-1">Locked until: {new Date(lockActiveUntil).toLocaleTimeString()}</p>
                    </div>

                    <button
                      onClick={handleForceUnlock}
                      className="w-full rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-slate-950 text-rose-400 py-3 text-xs font-black uppercase tracking-wider transition"
                    >
                      Bypass & Force Unlock
                    </button>
                    <span className="text-[9px] text-slate-500 leading-normal block">
                      ⚠️ WARNING: Unlocking deducts 15 points from today's discipline score immediately.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4 py-8">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-3xl">
                      🟢
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-bold">Trading Mode Active</div>
                      <p className="text-xs text-slate-400 mt-2">All locks are cleared. Trade selectively based on pre-market parameters.</p>
                    </div>
                  </div>
                )}

              </div>
            </Panel>
          </div>

        </div>
      )}

    </div>
  );
}
