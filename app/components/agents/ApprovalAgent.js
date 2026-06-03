"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Panel } from "./ui";
import { getRiskSettings, getPreMarketPlan, saveTradeApproval, getTradeApprovals } from "../../actions";

export function ApprovalAgent({ trades = [], portfolioId }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [riskSettings, setRiskSettings] = useState(null);
  const [preMarketPlan, setPreMarketPlan] = useState(null);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Bot Form State
  const [symbol, setSymbol] = useState("XAUUSDm");
  const [setupType, setSetupType] = useState("Impulse Pullback");

  const [answers, setAnswers] = useState({
    reachedLevel: null,
    insideSession: null,
    liquidityTaken: null,
    aplusSetup: null,
    enteringEmotionally: null,
    waitedConfirmation: null,
    rrAcceptable: null,
    followingBias: null,
    exceededLimits: null,
  });

  const [result, setResult] = useState(null); // { status, reason }
  const [submitting, setSubmitting] = useState(false);

  const questions = [
    { key: "reachedLevel", q: "Did price reach your planned area/level?", yesLabel: "Yes, at key level", noLabel: "No, chasing price" },
    { key: "insideSession", q: "Is this setup inside your active session?", yesLabel: "Yes, inside session", noLabel: "No, trading quiet hours" },
    { key: "liquidityTaken", q: "Is liquidity taken before entry?", yesLabel: "Yes, liquidity swept", noLabel: "No, entry before sweep" },
    { key: "aplusSetup", q: "Is this an A+ playbook setup?", yesLabel: "Yes, fully compliant", noLabel: "No, random/sub-setup" },
    { key: "enteringEmotionally", q: "Are you entering this trade emotionally?", yesLabel: "Yes, feeling impulsive/fomo", noLabel: "No, calm and analytical" },
    { key: "waitedConfirmation", q: "Did you wait for confirmation candle/retest?", yesLabel: "Yes, trigger candle closed", noLabel: "No, entering prematurely" },
    { key: "rrAcceptable", q: "Is the Reward-to-Risk ratio acceptable (>=1.5)?", yesLabel: "Yes, clear target & invalidation", noLabel: "No, tight room / poor RR" },
    { key: "followingBias", q: "Are you following the high-timeframe bias?", yesLabel: "Yes, trend-aligned", noLabel: "No, counter-trend" },
    { key: "exceededLimits", q: "Have you exceeded daily limits or consecutive loss limits?", yesLabel: "Yes, over limits", noLabel: "No, rules are clean" },
  ];

  const loadContext = async () => {
    setLoading(true);
    try {
      if (portfolioId) {
        const risk = await getRiskSettings(portfolioId);
        setRiskSettings(risk);
      }
      const plan = await getPreMarketPlan(date);
      setPreMarketPlan(plan);

      const history = await getTradeApprovals(date);
      setApprovalHistory(history.reverse());
    } catch (e) {
      console.error("Failed to load context for trade approvals:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContext();
  }, [portfolioId, date]);

  // Today's trades count and PnL calculation
  const todayStats = useMemo(() => {
    const todayTrades = (trades || []).filter(t => {
      const tDate = (t.dateTime || "").split(" ")[0]?.replace(/\./g, "-");
      return tDate === date;
    });

    const count = todayTrades.length;
    const pnl = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const consecutiveLosses = [...todayTrades]
      .sort((a, b) => (a.tradeNum || 0) - (b.tradeNum || 0))
      .reduce((streak, t) => {
        if ((t.pnl || 0) < 0) return streak + 1;
        if ((t.pnl || 0) > 0) return 0;
        return streak;
      }, 0);

    return { count, pnl, consecutiveLosses };
  }, [trades, date]);

  // Active risk lock check
  const activeLock = useMemo(() => {
    if (!riskSettings) return null;
    const now = new Date();
    
    // Check database lockActiveUntil
    if (riskSettings.lockActiveUntil && new Date(riskSettings.lockActiveUntil) > now) {
      return {
        type: "Database Lock",
        reason: riskSettings.lockReason || "Exceeded drawdown or cooldown active.",
        until: new Date(riskSettings.lockActiveUntil)
      };
    }

    // Check dynamic local limits based on todayStats
    if (todayStats.count >= (riskSettings.maxTradesPerDay || 3)) {
      return {
        type: "Max Trades Limit Exceeded",
        reason: `Exceeded daily limit of ${riskSettings.maxTradesPerDay} trades. Go offline.`,
        until: new Date(now.setHours(23, 59, 59, 999))
      };
    }

    if (todayStats.pnl <= -(riskSettings.maxDailyLoss || 500)) {
      return {
        type: "Daily Loss Limit Breached",
        reason: `Daily loss of $${Math.abs(todayStats.pnl).toFixed(2)} exceeded your limit of $${riskSettings.maxDailyLoss}.`,
        until: new Date(now.setHours(23, 59, 59, 999))
      };
    }

    if (todayStats.consecutiveLosses >= (riskSettings.consecutiveLossesLimit || 2)) {
      const cooldownEnd = new Date(Date.now() + (riskSettings.cooldownTimerMinutes || 30) * 60 * 1000);
      return {
        type: "Cooldown Timer Triggered",
        reason: `${todayStats.consecutiveLosses} consecutive losses logged. Mandatory ${riskSettings.cooldownTimerMinutes}-minute pause.`,
        until: cooldownEnd
      };
    }

    return null;
  }, [riskSettings, todayStats]);

  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (activeLock) {
      alert("Trading is locked! Check the risk tab to review lock status.");
      return;
    }

    // Ensure all questions are answered
    const unanswered = Object.entries(answers).some(([_, val]) => val === null);
    if (unanswered) {
      alert("Please answer all pre-trade safety questions.");
      return;
    }

    setSubmitting(true);
    setResult(null);

    // 1. Fast Local Validation Checks
    let localRejected = false;
    let localReason = "";

    if (answers.reachedLevel === false) {
      localRejected = true;
      localReason = "You are entering before price reaches your planned level. Patience protects capital.";
    } else if (answers.insideSession === false) {
      localRejected = true;
      localReason = "This entry is outside of your session hours. Do not chase volume in low-probability times.";
    } else if (answers.enteringEmotionally === true) {
      localRejected = true;
      localReason = "You admitted entering this trade emotionally. Settle down, breathe, and step away.";
    } else if (answers.exceededLimits === true) {
      localRejected = true;
      localReason = "Daily trade limits or loss thresholds are breached. Trading disabled.";
    } else if (answers.aplusSetup === false) {
      localRejected = true;
      localReason = "This is not an A+ setup. Force selective patience: trade only when you have a distinct edge.";
    } else if (answers.waitedConfirmation === false) {
      localRejected = true;
      localReason = "You entering before candle confirmation. Do not jump the gun.";
    }

    if (localRejected) {
      const finalResult = { status: "REJECTED", reason: localReason };
      setResult(finalResult);
      await saveTradeApproval({
        date,
        time: new Date().toLocaleTimeString("en-US", { hour12: false }).slice(0, 5),
        symbol,
        setupType,
        status: "REJECTED",
        criteria: JSON.stringify(answers),
        reason: localReason,
      });
      loadContext();
      setSubmitting(false);
      return;
    }

    // 2. Hybrid AI Review if local rules are satisfied
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Evaluate this pre-trade request:
Symbol: ${symbol}
Setup: ${setupType}
HTF Bias: ${preMarketPlan?.htfBias || "Neutral"}
Today's trades taken: ${todayStats.count}
Pre-trade Answers: ${JSON.stringify(answers)}`,
          chatHistory: [],
          context: {
            summary: {
              netPnL: todayStats.pnl,
              trades: todayStats.count,
            },
            recentTrades: trades.slice(0, 5)
          }
        })
      });
      const data = await res.json();
      let status = "APPROVED";
      let reason = data.reply || "Setup conforms to playbook structures. Trade approved with strict risk limits.";

      // Parse AI response to check for wait/reject recommendations
      const textUpper = String(reason).toUpperCase();
      if (textUpper.includes("REJECT") || textUpper.includes("NO TRADE") || textUpper.includes("DON'T TRADE")) {
        status = "REJECTED";
      } else if (textUpper.includes("WAIT") || textUpper.includes("PATIENT") || textUpper.includes("PAUSE")) {
        status = "WAIT";
      }

      const finalResult = { status, reason };
      setResult(finalResult);

      await saveTradeApproval({
        date,
        time: new Date().toLocaleTimeString("en-US", { hour12: false }).slice(0, 5),
        symbol,
        setupType,
        status,
        criteria: JSON.stringify(answers),
        reason,
      });
      loadContext();
    } catch (e) {
      console.error(e);
      // Fallback
      const fallbackResult = { status: "APPROVED", reason: "Local structural checks passed. Approved with standard leverage profile." };
      setResult(fallbackResult);
      await saveTradeApproval({
        date,
        time: new Date().toLocaleTimeString("en-US", { hour12: false }).slice(0, 5),
        symbol,
        setupType,
        status: "APPROVED",
        criteria: JSON.stringify(answers),
        reason: fallbackResult.reason,
      });
      loadContext();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswers({
      reachedLevel: null,
      insideSession: null,
      liquidityTaken: null,
      aplusSetup: null,
      enteringEmotionally: null,
      waitedConfirmation: null,
      rrAcceptable: null,
      followingBias: null,
      exceededLimits: null,
    });
    setResult(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Risk Lock Banner Overlay */}
      {activeLock && (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-6 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-rose-500 text-slate-950 font-black px-4 py-1.5 text-[10px] uppercase tracking-wider rounded-bl-3xl">
            🔒 TRADING LOCKED
          </div>
          <h3 className="text-xl font-black text-rose-300">Lock Active: {activeLock.type}</h3>
          <p className="mt-2 text-sm text-slate-200">{activeLock.reason}</p>
          <p className="mt-3 text-xs text-slate-400">
            Locked until: <span className="font-mono text-rose-400 font-bold">{activeLock.until.toLocaleTimeString()}</span>
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Columns - Pre-Trade Checklist Form */}
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Trade Approval Bot Wizard" right={
            <button
              onClick={handleReset}
              className="text-[10px] font-black uppercase text-amber-400 hover:text-amber-300"
            >
              Reset Answers
            </button>
          }>
            <form onSubmit={handleEvaluate} className="space-y-6">
              
              {/* Asset & Setup Selector */}
              <div className="grid gap-4 sm:grid-cols-2 border-b border-slate-900 pb-4">
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-black block mb-1">Symbol / Market</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-black block mb-1">Playbook Setup Type</label>
                  <select
                    value={setupType}
                    onChange={(e) => setSetupType(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                  >
                    <option value="Impulse Pullback">Impulse Pullback</option>
                    <option value="Range Breakout">Range Breakout</option>
                    <option value="S/R Rejection">S/R Rejection</option>
                    <option value="Liquidity Sweep Run">Liquidity Sweep Run</option>
                    <option value="Countertrend Scalp">Countertrend Scalp</option>
                  </select>
                </div>
              </div>

              {/* Questions Loop */}
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl bg-slate-900/40 border border-slate-800/40">
                    <span className="text-xs font-semibold text-slate-200">{q.q}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [q.key]: true }))}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          answers[q.key] === true
                            ? "bg-amber-400 text-slate-950 font-black"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {q.yesLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [q.key]: false }))}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          answers[q.key] === false
                            ? "bg-rose-500 text-slate-100 font-black"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {q.noLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting || !!activeLock}
                className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 py-3.5 text-xs font-black uppercase tracking-wider transition shadow-lg shadow-amber-400/10 disabled:opacity-50"
              >
                {submitting ? "Analyzing Metrics..." : "Submit to Risk Manager Bot"}
              </button>

            </form>
          </Panel>
        </div>

        {/* Right Column - Active Verdict & Recent Log */}
        <div className="space-y-6">
          
          {/* Active Approval Verdict Card */}
          <Panel title="Active Evaluation Verdict">
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 font-semibold">Status:</span>
                  <span className={`rounded-xl px-3 py-1 text-xs font-black uppercase ${
                    result.status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : result.status === "WAIT"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}>
                    {result.status}
                  </span>
                </div>
                <div className="rounded-2xl bg-slate-900 border border-slate-800/80 p-4 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                  {result.reason}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                Fill out the wizard checklist to generate an active execution verdict.
              </div>
            )}
          </Panel>

          {/* History Log */}
          <Panel title="Pre-Trade Log (Today)">
            {approvalHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-600 text-xs">No entries logged today.</div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                {approvalHistory.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs flex flex-col justify-between gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] text-slate-500">{item.time}</span>
                      <span className={`text-[9px] font-black rounded px-1.5 py-0.5 uppercase ${
                        item.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : item.status === "WAIT"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline font-bold text-slate-200">
                      <span>{item.symbol}</span>
                      <span className="text-[10px] text-slate-500">{item.setupType}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

        </div>

      </div>

    </div>
  );
}
