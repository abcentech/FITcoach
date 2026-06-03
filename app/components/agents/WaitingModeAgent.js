"use client";
import React, { useState, useEffect } from "react";
import { Panel } from "./ui";

const PATIENCE_QUOTES = [
  "Cash is a position. Protecting capital is trade number one.",
  "No trade is better than an emotional trade. Wait for structure.",
  "Patience protects capital. Impatience compounds losses.",
  "The market is a device for transferring money from the impatient to the patient.",
  "Selectivity is the ultimate trading edge. Settle on your hands.",
  "Do not hunt trades; let the market trigger your pre-planned zones.",
  "Every trade taken out of boredom is a double loss: financial and psychological.",
  "Wait for validation. Confirmed entries have higher mathematical expectancy."
];

export function WaitingModeAgent() {
  // Main Countdown Timer State
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(300);
  const [timerActive, setTimerActive] = useState(false);

  // Breathing Prompts State
  const [breathPhase, setBreathPhase] = useState("Inhale"); // Inhale, Hold, Exhale, Hold
  const [breathCount, setBreathCount] = useState(4);

  // Delayed Entry State
  const [delayedTimer, setDelayedTimer] = useState(0);
  const [delayedActive, setDelayedActive] = useState(false);

  // Chart Lock State
  const [chartLockActive, setChartLockActive] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(120); // default 2 minutes chart lock

  // Rotating Quotes
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Quote rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % PATIENCE_QUOTES.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Main Timer Effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
      alert("⏱️ Patience cooldown completed! Review your levels before entering.");
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  // Breathing Guide Loop (4-4-4-4 Box Breathing)
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathCount((prev) => {
        if (prev <= 1) {
          // Switch phase
          setBreathPhase((currentPhase) => {
            switch (currentPhase) {
              case "Inhale": return "Hold (Full)";
              case "Hold (Full)": return "Exhale";
              case "Exhale": return "Hold (Empty)";
              case "Hold (Empty)": default: return "Inhale";
            }
          });
          return 4; // Reset box count to 4 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Delayed Entry Timer Effect
  useEffect(() => {
    let interval = null;
    if (delayedActive && delayedTimer > 0) {
      interval = setInterval(() => {
        setDelayedTimer((prev) => prev - 1);
      }, 1000);
    } else if (delayedTimer === 0 && delayedActive) {
      setDelayedActive(false);
      alert("✅ Delayed Entry cooldown completed. Verify that setup conditions are still valid.");
    }
    return () => clearInterval(interval);
  }, [delayedActive, delayedTimer]);

  // Chart Lock Effect
  useEffect(() => {
    let interval = null;
    if (chartLockActive && lockTimeLeft > 0) {
      interval = setInterval(() => {
        setLockTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (lockTimeLeft === 0 && chartLockActive) {
      setChartLockActive(false);
      setLockTimeLeft(120); // reset
      alert("🔓 Chart lock released. Proceed with structured planning.");
    }
    return () => clearInterval(interval);
  }, [chartLockActive, lockTimeLeft]);

  // Reset/Trigger Main Timer
  const handleStartTimer = (mins) => {
    setTimerMinutes(mins);
    setTimeLeft(mins * 60);
    setTimerActive(true);
  };

  const handleStartDelayedEntry = () => {
    setDelayedTimer(15);
    setDelayedActive(true);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Chart Lock Overlay Screensaver */}
      {chartLockActive && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 text-center transition-all duration-500">
          <div className="max-w-2xl space-y-8">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">🛡️ CHART LOCK ACTIVE</div>
            
            <div className="text-6xl font-black text-amber-400 font-mono tracking-wider">
              {formatTime(lockTimeLeft)}
            </div>

            <p className="text-xl italic font-semibold text-slate-300 leading-relaxed max-w-xl mx-auto transition-all duration-700">
              "{PATIENCE_QUOTES[quoteIndex]}"
            </p>

            <div className="h-1.5 w-64 bg-slate-900 rounded-full mx-auto overflow-hidden">
              <div 
                className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${(lockTimeLeft / 120) * 100}%` }}
              />
            </div>

            <p className="text-xs text-slate-500">
              Taking a break from price movements stops dopamine loop addiction. Relax and breathe.
            </p>

            <button
              onClick={() => {
                if (confirm("Forcing release breaks protocol and subtracts 5 points from today's discipline score. Proceed?")) {
                  setChartLockActive(false);
                }
              }}
              className="text-[10px] uppercase font-bold text-rose-500/60 hover:text-rose-400 transition"
            >
              Force Release Lock (Penalty)
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Columns: Timers & Tools */}
        <div className="lg:col-span-2 space-y-6">
          
          <Panel title="Patience Training Cooldowns">
            <div className="grid gap-6 sm:grid-cols-2">
              
              {/* Cooldown Timer Card */}
              <div className="rounded-2xl bg-slate-900 p-5 flex flex-col justify-between h-56">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Patience Cooldown Timer</div>
                  <div className="mt-4 text-4xl font-black text-slate-100 font-mono">
                    {formatTime(timeLeft)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Force yourself to step away from screens after a loss or win.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleStartTimer(5)} 
                    className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-bold"
                  >
                    5 Min
                  </button>
                  <button 
                    onClick={() => handleStartTimer(15)} 
                    className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-bold"
                  >
                    15 Min
                  </button>
                  <button 
                    onClick={() => setTimerActive(prev => !prev)} 
                    className={`rounded-lg px-4 py-1.5 text-xs font-black uppercase text-slate-950 transition ${
                      timerActive ? "bg-rose-400 hover:bg-rose-300" : "bg-amber-400 hover:bg-amber-300"
                    }`}
                  >
                    {timerActive ? "Pause" : "Start"}
                  </button>
                </div>
              </div>

              {/* Delayed Entry Card */}
              <div className="rounded-2xl bg-slate-900 p-5 flex flex-col justify-between h-56">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Delayed Entry Buffer (15s)</div>
                  {delayedTimer > 0 ? (
                    <div className="mt-4 text-4xl font-black text-rose-400 font-mono animate-pulse">
                      0:{String(delayedTimer).padStart(2, "0")}
                    </div>
                  ) : (
                    <div className="mt-4 text-4xl font-black text-emerald-400 font-mono">
                      READY
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2">Trigger a mandatory 15-second wait to review bias and parameters before logging a trade.</p>
                </div>

                <button
                  onClick={handleStartDelayedEntry}
                  disabled={delayedActive}
                  className="w-full rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 py-2.5 text-xs font-bold transition disabled:opacity-50"
                >
                  {delayedActive ? "Mandatory Wait Active" : "Trigger Entry Buffer"}
                </button>
              </div>

            </div>
          </Panel>

          {/* Chart Lock Card */}
          <Panel title="Anti-Overtrading Screen Lock">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div>
                <p className="text-xs text-slate-400 max-w-md">
                  Chart Lock blocks your workspace with a fullscreen screensaver for 2 minutes. Use this to physically break chart attachment and FOMO urges.
                </p>
              </div>
              <button
                onClick={() => setChartLockActive(true)}
                className="whitespace-nowrap rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 px-5 py-3 text-xs font-black uppercase tracking-wider transition"
              >
                🔒 Lock Charts (2 Mins)
              </button>
            </div>
          </Panel>

        </div>

        {/* Right Column: Breathing guide */}
        <div>
          <Panel title="Mindful Breathing Guide">
            <div className="space-y-6 text-center flex flex-col items-center">
              
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">Box Breathing (4-4-4-4)</div>
              
              {/* Pulse Breathing circle */}
              <div className="flex h-44 w-44 items-center justify-center rounded-full bg-slate-900 border border-slate-800 relative">
                
                {/* Scale animated aura */}
                <div 
                  className={`absolute inset-4 rounded-full border border-amber-400/35 transition-all duration-1000 ${
                    breathPhase === "Inhale" 
                      ? "scale-[1.3] bg-amber-400/5 opacity-80" 
                      : breathPhase === "Exhale" 
                      ? "scale-[0.8] opacity-10" 
                      : "scale-[1.1] bg-sky-400/5 opacity-50"
                  }`} 
                />

                <div className="z-10">
                  <div className="text-sm font-black text-slate-100 transition-all duration-500">{breathPhase}</div>
                  <div className="text-3xl font-black text-amber-400 font-mono mt-1">{breathCount}s</div>
                </div>
              </div>

              {/* Patient quote quote-box */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-850 p-4 min-h-[100px] flex items-center justify-center">
                <p className="text-xs italic text-slate-400 leading-relaxed font-semibold">
                  "{PATIENCE_QUOTES[quoteIndex]}"
                </p>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                Breathing shifts the nervous system out of sympathetic (flight-fight) mode and back into parasympathetic (logical) control.
              </p>

            </div>
          </Panel>
        </div>

      </div>

    </div>
  );
}
