"use client";
import React from "react";
import { n, fmtMoney, pnlColor } from "./utils";

export function Panel({ title, children, right }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{title}</div>
        {right && <div className="font-black">{right}</div>}
      </div>
      {children}
    </div>
  );
}

export function Info({ text, value, good, bad }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-3 text-sm text-slate-400">
      {text}:{" "}
      <span className={`font-bold ${good ? "text-emerald-300" : bad ? "text-rose-300" : "text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}

export function KpiCard({ label, value, helper, tone = "neutral" }) {
  const tones = {
    green: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    red: "border-rose-500/30 bg-rose-500/5 text-rose-300",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-300",
    blue: "border-sky-500/30 bg-sky-500/5 text-sky-300",
    neutral: "border-slate-700 bg-slate-900/60 text-slate-100"
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.neutral}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-black leading-tight break-words sm:text-xl xl:text-2xl">{value}</div>
      {helper && <div className="mt-1 text-[10px] text-slate-500">{helper}</div>}
    </div>
  );
}
