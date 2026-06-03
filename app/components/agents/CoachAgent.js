"use client";
import React, { useState } from "react";
import { Panel, Info, KpiCard } from "./ui";
import { n, fmtMoney, fmtPct, pnlColor } from "./utils";

// PatternHunter component
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

// ActionPlan component
export function ActionPlan({ coach }) {
  return (
    <Panel title="Next Week Action Plan">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(coach.actionPlan || [coach.focus]).map((item, i) => (
          <div key={item} className="rounded-2xl bg-slate-900 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">Rule {i + 1}</div>
            <div className="mt-2 font-semibold text-slate-200">{item}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// CoachingModules component
export function CoachingModules() {
  const mods = [
    [1, "Reconciliation", "App net vs broker net"],
    [2, "Source of Truth", "CSV = high confidence"],
    [3, "Coach Verdict", "Trade, reduce, or stop"],
    [4, "Trade Filters", "Gold, BTC, wins, losses, A/B, D/F"],
    [5, "Setup Library", "Best/worst setup types"],
    [6, "Daily Discipline", "Daily stop/lock rules"],
    [7, "6-Month Progress", "Weekly trends"],
    [8, "Manual Correction", "Edit P/L, grade, setup, high, low"],
    [10, "Next Trade Checklist", "Pre-entry permission gate"]
  ];
  return (
    <Panel title="Active Coaching Modules" right={<span className="text-emerald-300">9/9 ACTIVE</span>}>
      <div className="grid gap-3 md:grid-cols-3">
        {mods.map(([num, title, desc]) => (
          <div key={title} className="rounded-2xl bg-slate-900 p-4">
            <div className="text-xs font-black text-amber-300">#{num}</div>
            <div className="mt-1 font-bold text-slate-100">{title}</div>
            <div className="mt-1 text-xs text-slate-500">{desc}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// RobustCoachTab component
export function RobustCoachTab({ summary, coach, weekData, onGenerateAIReview }) {
  const [checklist, setChecklist] = useState({
    news: false,
    levels: false,
    mindset: false,
    hydration: false
  });
  const [aiReview, setAiReview] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerateAIReview = async () => {
    if (!weekData || loading) return;
    setLoading(true);
    if (onGenerateAIReview) {
      try {
        const reply = await onGenerateAIReview(weekData);
        setAiReview(reply);
      } catch (e) {
        setAiReview(e.message || "Error generating AI review.");
      } finally {
        setLoading(false);
      }
      return;
    }
    // Fallback to local fetch
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "weekly-review",
          context: {
            weekData: {
              week: weekData.week,
              dateRange: weekData.dateRange,
              summary: weekData.summary
            }
          }
        })
      });
      const data = await res.json();
      if (data.reply) {
        setAiReview(data.reply);
      } else {
        setAiReview(data.error || "Could not generate AI review. Please configure your API key.");
      }
    } catch (e) {
      setAiReview("Network error. AI Coach is currently offline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Grade Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -top-10 -right-10 text-[180px] font-black opacity-5 text-amber-400 select-none">
            {summary.coachGrade}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Execution Grade</div>
            <div className="mt-2 text-7xl font-black text-slate-100">{summary.coachGrade}</div>
          </div>
          <div className="mt-8">
            <div className="text-sm font-bold text-slate-300">Coach Score: {Math.round(summary.coachScore)}/100</div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-900">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${summary.coachScore}%` }} />
            </div>
          </div>
        </div>

        {/* Current Protocol */}
        <div
          className={`rounded-3xl border p-6 flex flex-col justify-between ${
            coach.protocol === "Defense Mode" ? "border-rose-500/30 bg-rose-500/5" : "border-emerald-500/30 bg-emerald-500/5"
          }`}
        >
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Current Protocol</div>
            <div className="mt-2 text-4xl font-black text-slate-100">{coach.protocol}</div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">{coach.verdict}</p>
          </div>
          <div className="mt-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority Focus</div>
            <div className="mt-1 font-bold text-amber-400">{coach.focus}</div>
          </div>
        </div>

        {/* Action Items */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">Hard Rules for Next Session</div>
          <div className="mt-4 space-y-3">
            {coach.actionPlan.map((rule, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-200">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                {rule}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Panel
        title="AI Coaching Diagnostic"
        right={
          <button
            onClick={handleGenerateAIReview}
            disabled={loading}
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 transition disabled:opacity-50"
          >
            {loading ? "Analyzing..." : aiReview ? "Regenerate Review" : "Generate AI Weekly Review"}
          </button>
        }
      >
        {aiReview ? (
          <div className="prose prose-invert max-w-none text-sm text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5">
            {aiReview}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-sm">
            Click the button above to have Coach Pip analyze your performance metrics for {weekData?.dateRange || "this week"}.
          </div>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Market Context Protocols */}
        <Panel title="Market Protocol Matrix">
          <div className="space-y-4">
            {coach.modeRules.map(mode => (
              <div
                key={mode.mode}
                className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 border border-slate-800/50"
              >
                <div>
                  <div className="font-bold text-slate-100">{mode.mode}</div>
                  <div className="text-xs text-slate-500">Trigger: {mode.trigger}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-amber-400 uppercase tracking-widest">Instruction</div>
                  <div className="text-sm font-semibold text-slate-300">{mode.action}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Pre-Session Prep */}
        <Panel title="Pre-Session Checklist">
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "news", label: "Economic Calendar Checked", icon: "📅" },
              { id: "levels", label: "Key 1H Levels Mapped", icon: "📏" },
              { id: "mindset", label: "Mindset Clear (Zero Bias)", icon: "🧠" },
              { id: "hydration", label: "Peak State Verified", icon: "⚡" }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setChecklist(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all ${
                  checklist[item.id] ? "border-emerald-400 bg-emerald-500/10" : "border-slate-800 bg-slate-950 hover:border-slate-700"
                }`}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-[10px] font-black uppercase text-center tracking-widest text-slate-200">
                  {item.label}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {/* Leak Prevention */}
      <PatternHunter summary={summary} />
    </div>
  );
}
