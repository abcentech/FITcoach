"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Panel } from "./ui";
import { getPreTradeCheckin, savePreTradeCheckin } from "../../actions";

export function EmotionalMonitorAgent({ initialDate }) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);
  const [id, setId] = useState("");
  
  // Sliders state (1 to 10)
  const [focus, setFocus] = useState(5);
  const [sleep, setSleep] = useState(5);
  const [patience, setPatience] = useState(5);
  const [urgency, setUrgency] = useState(5);
  const [emotionalStability, setEmotionalStability] = useState(5);
  const [confidence, setConfidence] = useState(5);
  const [frustration, setFrustration] = useState(1);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadCheckin = async (targetDate) => {
    try {
      const entry = await getPreTradeCheckin(targetDate);
      if (entry) {
        setId(entry.id);
        setFocus(entry.focus ?? 5);
        setSleep(entry.sleep ?? 5);
        setPatience(entry.patience ?? 5);
        setUrgency(entry.urgency ?? 5);
        setEmotionalStability(entry.emotionalStability ?? 5);
        setConfidence(entry.confidence ?? 5);
        setFrustration(entry.frustration ?? 1);
      } else {
        setId("");
        setFocus(5);
        setSleep(5);
        setPatience(5);
        setUrgency(5);
        setEmotionalStability(5);
        setConfidence(5);
        setFrustration(1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCheckin(date);
  }, [date]);

  // Derived readiness score & risk level
  const checkinStats = useMemo(() => {
    // Focus, sleep, patience, stability, confidence are positive (high = good)
    // Urgency, frustration are negative (high = bad)
    const scoreSum = focus + sleep + patience + (11 - urgency) + emotionalStability + confidence + (11 - frustration);
    const readinessScore = Math.round((scoreSum / 70) * 100);

    let riskLevel = "Low";
    let recommendation = "";
    let tone = "green";

    if (readinessScore >= 75) {
      riskLevel = "Low Risk";
      recommendation = "Full sizing approved. Stick to pre-market plans and execute selectively.";
      tone = "green";
    } else if (readinessScore >= 50) {
      riskLevel = "Medium Risk";
      recommendation = "Caution advised. Suggest reducing position sizing by 50% for today's sessions.";
      tone = "amber";
    } else {
      riskLevel = "High Risk";
      recommendation = "HIGH EMOTIONAL RISK. Recommended: DO NOT TRADE today. Protect capital.";
      tone = "red";
    }

    return { readinessScore, riskLevel, recommendation, tone };
  }, [focus, sleep, patience, urgency, emotionalStability, confidence, frustration]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const now = new Date();
      const time = now.toLocaleTimeString("en-US", { hour12: false }).slice(0, 5);

      await savePreTradeCheckin({
        id: id || undefined,
        date,
        time,
        focus,
        sleep,
        patience,
        urgency,
        emotionalStability,
        confidence,
        frustration,
        readinessScore: checkinStats.readinessScore,
        riskLevel: checkinStats.riskLevel,
      });

      setMessage("✅ Pre-trade emotional check-in logged.");
      setTimeout(() => setMessage(""), 3000);
      loadCheckin(date);
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Failed to save emotional check-in.");
    } finally {
      setSaving(false);
    }
  };

  const sliderFields = [
    { label: "Focus / Mental Alertness", desc: "Clarity of thought vs fatigue/distraction", value: focus, setter: setFocus, minLabel: "Foggy/Tired", maxLabel: "Sharp/Laser" },
    { label: "Sleep Quality", desc: "Restfulness of last night's sleep", value: sleep, setter: setSleep, minLabel: "Restless", maxLabel: "Deep Rest" },
    { label: "Patience Level", desc: "Ability to wait for planned levels without anxiety", value: patience, setter: setPatience, minLabel: "Jittery", maxLabel: "Calm/Waiting" },
    { label: "Urgency to Trade", desc: "Feeling the need to execute immediately (bad)", value: urgency, setter: setUrgency, minLabel: "Calm Hands", maxLabel: "Itchy Finger" },
    { label: "Emotional Stability", desc: "Calmness and resilience vs anger or anxiety", value: emotionalStability, setter: setEmotionalStability, minLabel: "Agitated", maxLabel: "Zen-like" },
    { label: "Confidence", desc: "Belief in your system and statistics", value: confidence, setter: setConfidence, minLabel: "Hesitant", maxLabel: "Structured" },
    { label: "Frustration Level", desc: "Current agitation or revenge seeking (bad)", value: frustration, setter: setFrustration, minLabel: "Relaxed", maxLabel: "Angry/Anxious" },
  ];

  const getBarColor = (val, isNegative = false) => {
    if (isNegative) {
      return val > 7 ? "bg-rose-500" : val > 4 ? "bg-amber-400" : "bg-emerald-400";
    }
    return val > 7 ? "bg-emerald-400" : val > 4 ? "bg-amber-400" : "bg-rose-500";
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950 p-5">
        <div>
          <h2 className="text-lg font-black text-slate-100">Pre-Trade Emotional Monitor</h2>
          <p className="text-xs text-slate-400">Perform an emotional check-in to compute your cognitive readiness and position sizing limits.</p>
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

      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Sliders Form */}
        <div className="lg:col-span-2">
          <Panel title="Mental State Ratings">
            <form onSubmit={handleSave} className="space-y-6">
              
              <div className="space-y-5">
                {sliderFields.map((field) => {
                  const isNegative = field.label.includes("Urgency") || field.label.includes("Frustration");
                  return (
                    <div key={field.label} className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="text-xs font-bold text-slate-200">{field.label}</span>
                          <span className="text-[10px] text-slate-500 block">{field.desc}</span>
                        </div>
                        <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                          isNegative 
                            ? field.value > 6 ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10"
                            : field.value > 6 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                        }`}>{field.value}/10</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-500 w-16">{field.minLabel}</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={field.value}
                          onChange={(e) => field.setter(Number(e.target.value))}
                          className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                        />
                        <span className="text-[10px] text-slate-500 w-16 text-right">{field.maxLabel}</span>
                      </div>
                    </div>
                  );
                })}
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
                {saving ? "Logging Ratings..." : "Save Emotional Check-in"}
              </button>

            </form>
          </Panel>
        </div>

        {/* Readiness Outcome Card */}
        <div>
          <Panel title="Readiness Diagnostic">
            <div className="space-y-6 text-center">
              
              {/* Score Circle */}
              <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950 relative">
                {/* Score Fill indicator */}
                <div className={`absolute inset-0.5 rounded-full opacity-5 ${
                  checkinStats.tone === "green" 
                    ? "bg-emerald-500" 
                    : checkinStats.tone === "amber" 
                    ? "bg-amber-400" 
                    : "bg-rose-500"
                }`} style={{ clipPath: `inset(${100 - checkinStats.readinessScore}% 0px 0px 0px)` }} />
                
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Readiness</div>
                  <div className={`text-4xl font-black mt-1 ${
                    checkinStats.tone === "green" 
                      ? "text-emerald-400" 
                      : checkinStats.tone === "amber" 
                      ? "text-amber-400" 
                      : "text-rose-400"
                  }`}>
                    {checkinStats.readinessScore}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-bold">{checkinStats.riskLevel}</div>
                </div>
              </div>

              {/* Recommendation Box */}
              <div className={`rounded-2xl border p-5 text-left ${
                checkinStats.tone === "green" 
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300" 
                  : checkinStats.tone === "amber" 
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-300" 
                  : "border-rose-500/30 bg-rose-500/5 text-rose-300"
              }`}>
                <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Protocol Recommendation</div>
                <p className="text-xs leading-relaxed text-slate-200">{checkinStats.recommendation}</p>
              </div>

              {/* Tips for Improvement */}
              <div className="text-left text-xs text-slate-500 space-y-2 leading-relaxed p-2">
                <span className="font-bold text-slate-400 block">Behavioral Tips:</span>
                {checkinStats.readinessScore < 75 ? (
                  <>
                    <p>• Avoid looking at the charts for 15 minutes before the London open.</p>
                    <p>• Review your trade rules: wait for a structural candle close before entry triggers.</p>
                    <p>• If feeling urgency, remember that capital preservation is a valid trade position.</p>
                  </>
                ) : (
                  <>
                    <p>• Mindset is optimal. Focus purely on structural levels mapped in pre-market.</p>
                    <p>• Execute with patience. Do not let over-confidence turn into impulsive setups.</p>
                  </>
                )}
              </div>

            </div>
          </Panel>
        </div>

      </div>

    </div>
  );
}
