"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Panel } from "./ui";
import { getDailyReview, saveDailyReview } from "../../actions";

export function ReviewAgent({ trades = [], weeks = [], initialDate }) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);
  const [id, setId] = useState("");

  // Sub-tabs: "daily" | "weekly"
  const [activeSubTab, setActiveSubTab] = useState("daily");

  // Daily Review Form State
  const [followedPlan, setFollowedPlan] = useState(true);
  const [chased, setChased] = useState(false);
  const [patient, setPatient] = useState(true);
  const [emotionalTriggers, setEmotionalTriggers] = useState("");
  const [improvements, setImprovements] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadReview = async (targetDate) => {
    try {
      const review = await getDailyReview(targetDate);
      if (review) {
        setId(review.id);
        setFollowedPlan(review.followedPlan === 1);
        setChased(review.chased === 1);
        setPatient(review.patient === 1);
        setEmotionalTriggers(review.emotionalTriggers || "");
        setImprovements(review.improvements || "");
      } else {
        setId("");
        setFollowedPlan(true);
        setChased(false);
        setPatient(true);
        setEmotionalTriggers("");
        setImprovements("");
      }
    } catch (e) {
      console.error("Failed to load daily review:", e);
    }
  };

  useEffect(() => {
    loadReview(date);
  }, [date]);

  // Derived Daily Review stats
  const dailyReviewStats = useMemo(() => {
    let disciplineScore = 100;
    if (!followedPlan) disciplineScore -= 25;
    if (chased) disciplineScore -= 25;
    if (!patient) disciplineScore -= 20;

    // Emotional control score
    let emotionalControlScore = 100;
    if (!patient) emotionalControlScore -= 30;
    if (chased) emotionalControlScore -= 30;
    if (emotionalTriggers.trim().length > 3) {
      // Deduct slightly for triggers logged
      const count = emotionalTriggers.split(",").length;
      emotionalControlScore -= Math.min(40, count * 15);
    }

    let executionGrade = "A";
    if (disciplineScore >= 90) executionGrade = "A";
    else if (disciplineScore >= 75) executionGrade = "B";
    else if (disciplineScore >= 60) executionGrade = "C";
    else if (disciplineScore >= 50) executionGrade = "D";
    else executionGrade = "F";

    return { disciplineScore, executionGrade, emotionalControlScore };
  }, [followedPlan, chased, patient, emotionalTriggers]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await saveDailyReview({
        id: id || undefined,
        date,
        followedPlan: followedPlan ? 1 : 0,
        chased: chased ? 1 : 0,
        patient: patient ? 1 : 0,
        emotionalTriggers,
        improvements,
        disciplineScore: dailyReviewStats.disciplineScore,
        executionGrade: dailyReviewStats.executionGrade,
        emotionalControlScore: dailyReviewStats.emotionalControlScore,
      });

      setMessage("✅ Daily review locked in.");
      setTimeout(() => setMessage(""), 3000);
      loadReview(date);
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Failed to save review.");
    } finally {
      setSaving(false);
    }
  };

  // Aggregated Weekly Review Stats
  const weeklySummaryStats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        tradeCount: 0,
        pnl: 0,
        winRate: 0,
        strengths: "No trading data logged for aggregation.",
        recurringMistakes: "None",
        behavioralPatterns: "Selectivity level cannot be computed.",
        riskConsistency: "Normal"
      };
    }

    const tradeCount = trades.length;
    const wins = trades.filter(t => (t.pnl || 0) > 0);
    const losses = trades.filter(t => (t.pnl || 0) < 0);
    const pnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = tradeCount ? Math.round((wins.length / tradeCount) * 100) : 0;

    // Recurring mistakes parser (using trade tags)
    const mistakeCounts = {};
    trades.forEach(t => {
      if (t.tag && t.tag !== "Needs review" && t.tag !== "None") {
        mistakeCounts[t.tag] = (mistakeCounts[t.tag] || 0) + 1;
      }
    });
    const worstMistake = Object.entries(mistakeCounts).reduce((a, b) => b[1] > a[1] ? b : a, ["None", 0]);
    const recurringMistakes = worstMistake[0] !== "None" ? `${worstMistake[0]} (${worstMistake[1]} instances)` : "None detected this week. Excellent discipline!";

    // Sizing/Risk consistency
    const lotSizes = trades.map(t => t.lot || 0).filter(Boolean);
    const maxLot = Math.max(...lotSizes, 0);
    const minLot = Math.min(...lotSizes, 9999);
    const riskConsistency = maxLot && minLot && maxLot / minLot > 2
      ? "Suboptimal. Sudden lot size increases suggest emotional recovery attempts (revenge trading)."
      : "Excellent. Lot sizes kept strictly uniform across setups.";

    // Strengths
    const rulesCheckedList = trades.map(t => {
      try {
        return t.checkedRules ? JSON.parse(t.checkedRules) : {};
      } catch {
        return {};
      }
    });
    const totalCompliant = trades.filter(t => t.compliance && Number(t.compliance) >= 1).length;
    const complianceRate = tradeCount ? Math.round((totalCompliant / tradeCount) * 105) : 0;

    const strengths = complianceRate >= 80
      ? `Strong selective rules compliance (${complianceRate}% of trades fully compliant). Sticking to pre-market plans.`
      : "Selective execution requires improvement. Focus on patience buffers.";

    // Behavioral Patterns
    let behavioralPatterns = "";
    if (tradeCount > 12) {
      behavioralPatterns = "High overtrading frequency. Your discipline decreases as trade count increases.";
    } else if (wins.length > 0 && losses.length > 0) {
      behavioralPatterns = "Structured consistency. Trades are restricted to planned sessions.";
    } else {
      behavioralPatterns = "Low frequency, clean execution. Excellent capital preservation behavior.";
    }

    return { tradeCount, pnl, winRate, strengths, recurringMistakes, behavioralPatterns, riskConsistency };
  }, [trades]);

  return (
    <div className="space-y-6">
      
      {/* Tab Switcher */}
      <div className="flex justify-between items-center rounded-3xl border border-slate-800 bg-slate-950 p-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("daily")}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
              activeSubTab === "daily" ? "bg-amber-400 text-slate-950" : "text-slate-500 hover:text-slate-200"
            }`}
          >
            ☀️ Daily Review
          </button>
          <button
            onClick={() => setActiveSubTab("weekly")}
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
              activeSubTab === "weekly" ? "bg-amber-400 text-slate-950" : "text-slate-500 hover:text-slate-200"
            }`}
          >
            📊 Weekly behavioral summary
          </button>
        </div>

        {activeSubTab === "daily" && (
          <div className="flex items-center gap-3 pr-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500">Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 outline-none focus:border-amber-400"
            />
          </div>
        )}
      </div>

      {/* Daily Review Tab */}
      {activeSubTab === "daily" && (
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Daily Checklist Form */}
          <div className="lg:col-span-2">
            <Panel title="Process & Execution Checklist">
              <form onSubmit={handleSave} className="space-y-6">
                
                <div className="space-y-4">
                  {/* Followed Plan? */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-slate-800/40">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Did you follow your pre-market plan today?</span>
                      <span className="text-[10px] text-slate-500">Only traded planned levels and scenarios</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFollowedPlan(true)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          followedPlan ? "bg-emerald-400 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFollowedPlan(false)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          !followedPlan ? "bg-rose-500 text-slate-100 font-black" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Chased? */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-slate-800/40">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Did you chase any trades today?</span>
                      <span className="text-[10px] text-slate-500">Entering late due to fear of missing out</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setChased(true)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          chased ? "bg-rose-500 text-slate-100 font-black" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setChased(false)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          !chased ? "bg-emerald-400 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Patient? */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-slate-800/40">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Were you patient during setups?</span>
                      <span className="text-[10px] text-slate-500">Waited for clean invalidation / confirmation</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPatient(true)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          patient ? "bg-emerald-400 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setPatient(false)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          !patient ? "bg-rose-500 text-slate-100 font-black" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {/* Triggers */}
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Emotional Triggers logged</label>
                    <input
                      type="text"
                      value={emotionalTriggers}
                      onChange={(e) => setEmotionalTriggers(e.target.value)}
                      placeholder="e.g. FOMO, Revenge urge, Greed, Boredom, Fear of Loss"
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-slate-200 outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Tomorrow's Focus */}
                  <div>
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-wider block mb-1">Key improvement focus for tomorrow</label>
                    <textarea
                      value={improvements}
                      onChange={(e) => setImprovements(e.target.value)}
                      rows={3}
                      placeholder="e.g. Keep trade sizes small, wait 15 seconds before hitting entries, turn off screen after 2 wins."
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {message && (
                  <div className={`rounded-xl border p-4 text-xs font-bold ${message.startsWith("✅") ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" : "border-rose-500/20 bg-rose-500/5 text-rose-400"}`}>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 py-3.5 text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
                >
                  {saving ? "Locking in review..." : "Submit daily review & score"}
                </button>

              </form>
            </Panel>
          </div>

          {/* Daily Review Diagnostics */}
          <div>
            <Panel title="EOD Performance Grade">
              <div className="space-y-6 text-center">
                
                {/* Grade Banner */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Execution Grade</div>
                  <div className="text-7xl font-black text-slate-100 my-2">{dailyReviewStats.executionGrade}</div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden mt-3">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        dailyReviewStats.disciplineScore >= 90 
                          ? "bg-emerald-400" 
                          : dailyReviewStats.disciplineScore >= 75 
                          ? "bg-amber-400" 
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${dailyReviewStats.disciplineScore}%` }}
                    />
                  </div>
                </div>

                {/* Score Split */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-900 p-3">
                    <div className="text-[8px] uppercase tracking-wider text-slate-500 font-black">Discipline Score</div>
                    <div className="text-xl font-black text-slate-200 mt-1">{dailyReviewStats.disciplineScore}/100</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-3">
                    <div className="text-[8px] uppercase tracking-wider text-slate-500 font-black">Emotional Control</div>
                    <div className="text-xl font-black text-slate-200 mt-1">{dailyReviewStats.emotionalControlScore}/100</div>
                  </div>
                </div>

                <div className="text-left text-xs text-slate-500 leading-relaxed border-t border-slate-900 pt-4 p-2">
                  <span className="font-bold text-slate-400 block mb-1">Discipline Framework Notes:</span>
                  <p>• Not following plan: -25 points</p>
                  <p>• Chasing trades: -25 points</p>
                  <p>• Impatience behavior: -20 points</p>
                  <p>• Force Unlocks: -15 points (deducted in Dashboard streaks)</p>
                </div>

              </div>
            </Panel>
          </div>

        </div>
      )}

      {/* Weekly Review Tab */}
      {activeSubTab === "weekly" && (
        <div className="space-y-6">
          
          {/* Numerical highlights */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Panel title="Trades Taken">
              <div className="text-3xl font-black text-slate-100">{weeklySummaryStats.tradeCount}</div>
            </Panel>
            <Panel title="Net return">
              <div className={`text-3xl font-black ${weeklySummaryStats.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {weeklySummaryStats.pnl >= 0 ? "+" : "-"}${Math.abs(weeklySummaryStats.pnl).toFixed(2)}
              </div>
            </Panel>
            <Panel title="Win rate">
              <div className="text-3xl font-black text-amber-400">{weeklySummaryStats.winRate}%</div>
            </Panel>
            <Panel title="Sizing Profile">
              <div className="text-xs font-bold text-slate-300 mt-1">Conservative leverage</div>
            </Panel>
          </div>

          {/* Text Summaries */}
          <div className="grid gap-6 md:grid-cols-2">
            
            <Panel title="Strengths & Playbook adherence">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs text-slate-200 leading-relaxed">{weeklySummaryStats.strengths}</p>
              </div>
            </Panel>

            <Panel title="Recurring mistakes & triggers">
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                <p className="text-xs text-slate-200 leading-relaxed">{weeklySummaryStats.recurringMistakes}</p>
              </div>
            </Panel>

            <Panel title="Behavioral Patterns identified">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                <p className="text-xs text-slate-300 leading-relaxed">{weeklySummaryStats.behavioralPatterns}</p>
              </div>
            </Panel>

            <Panel title="Risk consistency verdict">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4">
                <p className="text-xs text-slate-300 leading-relaxed">{weeklySummaryStats.riskConsistency}</p>
              </div>
            </Panel>

          </div>

        </div>
      )}

    </div>
  );
}
