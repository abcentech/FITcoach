"use client";
import React, { useState } from "react";
import { Panel } from "./ui";
import { makeId } from "./utils";

export function AICoachChat({ summary, trades }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I am your FITpips AI Trading Coach. I analyze your trade statistics and behaviors to help you trade with professional discipline. Ask me any question about your trading leaks, streaks, risk, or setup performance.", sender: "ai" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    "What's my biggest leak?",
    "Which symbol should I stop trading?",
    "What are my best trading hours?",
    "Am I overtrading?",
    "Rate my risk management"
  ];

  const handleSend = async (textToSend) => {
    if (!textToSend.trim() || loading) return;
    const userMsg = { id: makeId(), text: textToSend, sender: "user" };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          chatHistory: updatedMessages,
          context: {
            summary,
            recentTrades: (trades || []).slice(0, 50)
          }
        })
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { id: makeId(), text: data.reply, sender: "ai" }]);
      } else {
        setMessages(prev => [...prev, { id: makeId(), text: data.error || "I could not analyze your request. Please check that your API key is configured.", sender: "ai" }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: makeId(), text: "Network error. AI Coach is offline.", sender: "ai" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="FITpips AI Trading Coach Chat">
      <div className="flex flex-col h-[520px] justify-between">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 border border-slate-800 bg-slate-950 rounded-2xl mb-4 max-h-[380px]">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${m.sender === 'user' ? 'bg-amber-400 text-slate-950 font-bold rounded-tr-none' : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800/80'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl rounded-tl-none p-4 text-xs flex items-center gap-2">
                <span className="animate-bounce">⚡</span> AI Coach is analyzing your trading data...
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {suggestedQuestions.map(q => (
            <button 
              key={q} 
              onClick={() => handleSend(q)}
              disabled={loading}
              className="rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold px-3 py-1.5 hover:border-amber-400 hover:text-amber-300 transition"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
            disabled={loading}
            placeholder="Ask AI Coach about your metrics, setups, or errors..."
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-200 outline-none focus:border-amber-400"
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-amber-400 px-6 py-3 text-xs font-black text-slate-950 hover:bg-amber-300 transition disabled:opacity-50"
          >
            Ask Coach
          </button>
        </div>
      </div>
    </Panel>
  );
}
