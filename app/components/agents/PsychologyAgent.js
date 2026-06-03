"use client";
import React, { useState, useMemo } from "react";
import { Panel, Info, KpiCard } from "./ui";
import { n, fmtMoney, pnlColor } from "./utils";

export function PsychologyJournal({ 
  trades = [], 
  journals = [], 
  onSaveJournal, 
  onDeleteJournal 
}) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mood, setMood] = useState("🧘 Calm");
  const [stars, setStars] = useState(5);
  const [note, setNote] = useState("");

  const moods = [
    { label: "😤 FOMO", value: "😤 FOMO" },
    { label: "😡 Revenge", value: "😡 Revenge" },
    { label: "😴 Bored", value: "😴 Bored" },
    { label: "😰 Anxious", value: "😰 Anxious" },
    { label: "😎 Confident", value: "😎 Confident" },
    { label: "🧘 Calm", value: "🧘 Calm" }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSaveJournal) return;
    try {
      await onSaveJournal({
        date,
        mood,
        rating: stars,
        notes: note
      });
      setNote("");
    } catch (err) {
      console.error(err);
      alert("Failed to save journal entry");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this journal entry?")) return;
    if (!onDeleteJournal) return;
    try {
      await onDeleteJournal(id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete journal entry");
    }
  };

  const moodPnLStats = useMemo(() => {
    const datePnL = {};
    (trades || []).forEach(t => {
      const tDate = (t.dateTime || "").split(" ")[0] || "";
      if (tDate) {
        const normDate = tDate.replace(/\./g, '-');
        datePnL[normDate] = (datePnL[normDate] || 0) + n(t.pnl);
      }
    });

    const moodSums = {};
    const moodCounts = {};
    (journals || []).forEach(e => {
      const pnl = datePnL[e.date] || 0;
      moodSums[e.mood] = (moodSums[e.mood] || 0) + pnl;
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });

    return Object.keys(moodCounts).map(m => {
      const count = moodCounts[m];
      const sum = moodSums[m];
      return {
        mood: m,
        count,
        avgPnL: sum / count,
        totalPnL: sum
      };
    }).sort((a,b) => a.avgPnL - b.avgPnL);
  }, [journals, trades]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Log Trading Psychology Session">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200 outline-none" 
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Session Rating</label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(starNum => (
                    <button 
                      key={starNum} 
                      type="button" 
                      onClick={() => setStars(starNum)}
                      className="text-xl transition-all"
                    >
                      {starNum <= stars ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-slate-500 block mb-1">Dominant Emotional State</label>
              <div className="grid grid-cols-3 gap-2">
                {moods.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={`rounded-xl border p-2.5 text-xs font-bold transition-all ${mood === m.value ? 'border-amber-400 bg-amber-500/10 text-amber-200' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase text-slate-500 block mb-1">Notes / Journal Entry</label>
              <textarea 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                rows="4" 
                placeholder="How did you feel during entries? Did you chase? Did you hold trades correctly?" 
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200 outline-none"
                required
              />
            </div>

            <button type="submit" className="w-full rounded-xl bg-amber-400 py-3 text-sm font-black text-slate-950 hover:bg-amber-300">Save Journal Entry</button>
          </form>
        </Panel>

        <Panel title="Mood & P&L Insights" right={<span className="text-amber-400">DATA ANALYSIS</span>}>
          <div className="space-y-4">
            {moodPnLStats.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Log entries with dates matching your trades to unlock psychological P&L correlations.
              </div>
            ) : (
              <div className="space-y-3">
                {moodPnLStats.map(stat => (
                  <div key={stat.mood} className="flex items-center justify-between rounded-xl bg-slate-900 p-4 border border-slate-800/50">
                    <div>
                      <div className="font-bold text-slate-200 text-base">{stat.mood} Days</div>
                      <div className="text-xs text-slate-500">{stat.count} logged sessions</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-base font-black ${pnlColor(stat.avgPnL)}`}>Avg: {fmtMoney(stat.avgPnL)}</div>
                      <div className={`text-xs ${pnlColor(stat.totalPnL)} opacity-80`}>Total: {fmtMoney(stat.totalPnL)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-xs text-slate-500 leading-relaxed">
              * The app automatically aligns your psychology entries with daily trade performance to identify emotional biases.
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Past Journal Entries">
        {journals.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No entries logged yet. Start logging your sessions above.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {journals.map(e => (
              <div key={e.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-400 tracking-wider">{e.date}</span>
                    <span className="text-sm">{"⭐".repeat(e.rating || 5)}</span>
                  </div>
                  <div className="mt-2 text-sm font-bold text-slate-200 flex items-center gap-2">
                    <span>Emotion:</span>
                    <span className="rounded bg-slate-900 px-2 py-0.5 border border-slate-800">{e.mood}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{e.notes}</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <button onClick={() => handleDelete(e.id)} className="text-[10px] uppercase font-bold text-rose-400 hover:text-rose-300">Delete Entry</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
