"use client";

import React, { useState, useEffect, useRef } from "react";

// ─── Animated Counter ────────────────────────────────────────────────────────
function Counter({ end, suffix = "", prefix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent = "amber" }) {
  const accents = {
    amber: "border-amber-500/20 bg-amber-500/5 hover:border-amber-400/40",
    emerald: "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-400/40",
    rose: "border-rose-500/20 bg-rose-500/5 hover:border-rose-400/40",
    sky: "border-sky-500/20 bg-sky-500/5 hover:border-sky-400/40",
    violet: "border-violet-500/20 bg-violet-500/5 hover:border-violet-400/40",
    slate: "border-slate-700/50 bg-slate-900/50 hover:border-slate-600/70",
  };
  const iconAccents = {
    amber: "bg-amber-400/15 text-amber-300",
    emerald: "bg-emerald-400/15 text-emerald-300",
    rose: "bg-rose-400/15 text-rose-300",
    sky: "bg-sky-400/15 text-sky-300",
    violet: "bg-violet-400/15 text-violet-300",
    slate: "bg-slate-800 text-slate-300",
  };

  return (
    <div className={`group relative rounded-3xl border p-6 transition-all duration-300 cursor-default ${accents[accent]}`}
      style={{ backdropFilter: "blur(8px)" }}>
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${iconAccents[accent]}`}>
        {icon}
      </div>
      <h3 className="text-base font-black tracking-tight text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────
function StepCard({ num, title, desc, icon }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-3xl shadow-lg shadow-amber-400/20">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-800 text-[10px] font-black text-amber-300">
          {num}
        </div>
      </div>
      <h3 className="text-base font-black text-slate-100">{title}</h3>
      <p className="mt-2 max-w-[220px] text-sm leading-relaxed text-slate-400">{desc}</p>
    </div>
  );
}

// ─── Mini Equity Chart (SVG illustration) ─────────────────────────────────────
function EquityIllustration({ green = true }) {
  const points = green
    ? [0,60, 40,55, 80,40, 120,45, 160,25, 200,20, 240,10]
    : [0,20, 40,25, 80,40, 120,35, 160,50, 200,55, 240,65];

  const pathD = points.reduce((acc, v, i) =>
    i % 2 === 0 ? `${acc}${i === 0 ? "M" : " L"}${v},` : `${acc}${v}`, "");

  const fillPoints = [...points, 240, 80, 0, 80];
  const fillD = fillPoints.reduce((acc, v, i) =>
    i % 2 === 0 ? `${acc}${i === 0 ? "M" : " L"}${v},` : `${acc}${v}`, "") + " Z";

  const color = green ? "#34d399" : "#fb7185";
  const fillColor = green ? "rgba(52,211,153,0.08)" : "rgba(251,113,133,0.08)";

  return (
    <svg viewBox="0 0 240 90" className="w-full" preserveAspectRatio="none">
      <path d={fillD} fill={fillColor} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 40, 80, 120, 160, 200, 240].map((x, i) => {
        const y = points[i * 2 + 1];
        return <circle key={x} cx={x} cy={y} r="3" fill={color} opacity="0.6" />;
      })}
    </svg>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-xl" : "bg-transparent"
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-xl shadow-lg shadow-amber-500/20">
            ⚡
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-slate-100">FITpips</div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400/70">Trading Coach</div>
          </div>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:text-amber-300">Features</a>
          <a href="#how-it-works" className="text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:text-amber-300">How It Works</a>
          <a href="#coach" className="text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:text-amber-300">Coach Protocol</a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/auth"
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            Sign In
          </a>
          <a
            href="/auth"
            id="nav-cta"
            className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-300 shadow-lg shadow-amber-400/20"
          >
            Get Started →
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/8 blur-[120px]" />
          <div className="absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-600/6 blur-[100px]" />
          <div className="absolute top-1/3 -right-40 h-[500px] w-[500px] rounded-full bg-violet-600/6 blur-[100px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: "linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)",
              backgroundSize: "60px 60px"
            }}
          />
        </div>

        <div className="relative z-10 flex max-w-5xl flex-col items-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/8 px-4 py-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">
              Professional Trading Journal · 26-Week Programme
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl xl:text-8xl">
            <span className="text-slate-100">Trade Smarter.</span>
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #d97706 100%)" }}
            >
              Grow Faster.
            </span>
            <br />
            <span className="text-slate-100">Lose Less.</span>
          </h1>

          {/* Subheading */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            FITpips is the coaching dashboard serious traders use to import their data,
            identify behavioural leaks, get an AI grade on every trade, and follow a
            protocol-driven plan — week by week, for 26 weeks.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/auth"
              id="hero-cta-primary"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-amber-400 px-8 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-amber-400/25 transition-all hover:bg-amber-300 hover:scale-[1.02]"
            >
              <span>Start Your 26-Week Journey</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#features"
              id="hero-cta-secondary"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-8 py-4 text-sm font-black text-slate-300 transition-all hover:border-slate-500 hover:text-slate-100"
            >
              <span>Explore Features</span>
            </a>
          </div>

          {/* Trust bar */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold uppercase tracking-widest text-slate-600">
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Free to Use</span>
            <span className="h-3 w-px bg-slate-800" />
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> MT5 CSV Import</span>
            <span className="h-3 w-px bg-slate-800" />
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> AI Coach Grading</span>
            <span className="h-3 w-px bg-slate-800" />
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Mentor Share Links</span>
          </div>
        </div>

        {/* Dashboard Preview Card */}
        <div className="relative z-10 mx-auto mt-16 w-full max-w-5xl">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-3 shadow-2xl backdrop-blur-sm"
            style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(148,163,184,0.05)" }}>
            {/* Fake window chrome */}
            <div className="mb-3 flex items-center gap-2 px-2">
              <div className="h-3 w-3 rounded-full bg-rose-500/60" />
              <div className="h-3 w-3 rounded-full bg-amber-500/60" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
              <div className="ml-3 h-5 flex-1 rounded-lg bg-slate-800/60" />
            </div>
            {/* Mini dashboard grid */}
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                { label: "Net P&L", value: "+$1,847", tone: "text-emerald-400" },
                { label: "Win Rate", value: "63%", tone: "text-amber-400" },
                { label: "Profit Factor", value: "2.1×", tone: "text-sky-400" },
                { label: "Coach Grade", value: "B+", tone: "text-violet-400" },
              ].map(card => (
                <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">{card.label}</div>
                  <div className={`mt-2 text-2xl font-black ${card.tone}`}>{card.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {/* Equity chart illustration */}
              <div className="col-span-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Equity Curve</div>
                <EquityIllustration green={true} />
              </div>
              {/* Trade log illustration */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Recent Trades</div>
                <div className="space-y-2">
                  {[
                    { sym: "XAUUSD", dir: "Sell", pnl: "+$29", grade: "A" },
                    { sym: "BTCUSD", dir: "Buy", pnl: "-$4", grade: "D" },
                    { sym: "XAUUSD", dir: "Buy", pnl: "+$17", grade: "B" },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2">
                      <div className="text-[10px] font-bold text-slate-300">{t.sym}</div>
                      <div className={`text-[9px] font-black rounded px-1.5 py-0.5 ${t.dir === "Buy" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>{t.dir}</div>
                      <div className={`text-[10px] font-black ${t.pnl.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>{t.pnl}</div>
                      <div className="text-[9px] font-black text-amber-400">{t.grade}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Reflection/glow under */}
          <div className="pointer-events-none absolute -bottom-12 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-amber-400/5 blur-3xl" />
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────────────── */}
      <section className="border-y border-slate-800/60 bg-slate-900/30 py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { label: "Trading Weeks Tracked", end: 26, suffix: " weeks" },
              { label: "Data Points Analysed", end: 9, suffix: " modules" },
              { label: "Trade Metrics Captured", end: 18, suffix: "+" },
              { label: "Coaching Protocols", end: 3, suffix: " modes" },
            ].map(({ label, end, suffix }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <div className="text-4xl font-black text-amber-400">
                  <Counter end={end} suffix={suffix} />
                </div>
                <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="relative py-24 px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 h-px w-full max-w-4xl -translate-x-1/2 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-3 inline-block rounded-full border border-amber-400/20 bg-amber-400/8 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
              Built for Serious Traders
            </div>
            <h2 className="text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
              Every tool your trading
              <br />
              <span className="text-amber-400">evolution demands</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
              From raw CSV import to AI-powered weekly review — FITpips wraps your entire
              development cycle into one disciplined system.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="📊"
              accent="amber"
              title="Equity Curve & Drawdown"
              desc="Visualise your account growth with a live equity curve, overlaying peak drawdown to understand risk-of-ruin in real time."
            />
            <FeatureCard
              icon="🧠"
              accent="violet"
              title="AI Weekly Coach Review"
              desc="Every week, your data is sent to an AI coach that diagnoses your execution quality, patterns, and delivers a grade from A to F."
            />
            <FeatureCard
              icon="🔍"
              accent="emerald"
              title="Behavioural Pattern Hunter"
              desc="Pinpoints your single biggest performance leak — be it a symbol, time of day, day of week, or session — and quantifies the cost."
            />
            <FeatureCard
              icon="📅"
              accent="sky"
              title="Trade Calendar & Daily Journal"
              desc="A fully colour-coded P&L calendar with per-day drill-down, mood logging, and session debrief entries linked directly to your trades."
            />
            <FeatureCard
              icon="🎯"
              accent="rose"
              title="Monte Carlo Risk Simulator"
              desc="Run 1,000 simulated paths from your real win rate and R/R to compute your risk of ruin and optimal Kelly position sizing."
            />
            <FeatureCard
              icon="📤"
              accent="slate"
              title="Mentor Share Links"
              desc="Generate tokenised read-only portfolio URLs to share with your mentor or community — zero credentials exposed."
            />
            <FeatureCard
              icon="📖"
              accent="amber"
              title="Playbook & Setup Library"
              desc="Store your A+ trade setups with rules, triggers, and examples. Build a personalised playbook that compounds over time."
            />
            <FeatureCard
              icon="⚖️"
              accent="emerald"
              title="Psychology Journal"
              desc="Track mental state, emotion scores, and decision quality alongside trade data to reveal the human side of your edge."
            />
            <FeatureCard
              icon="🔁"
              accent="sky"
              title="Replay Simulator"
              desc="Re-experience any session in real time using historical candle data. Make simulated trades and measure outcomes against reality."
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative bg-slate-900/30 py-24 px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 border-y border-slate-800/40" />
        </div>
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-3 inline-block rounded-full border border-sky-400/20 bg-sky-400/8 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">
              Simple Workflow
            </div>
            <h2 className="text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
              From raw data to
              <br />
              <span className="text-sky-400">refined execution</span>
            </h2>
          </div>

          <div className="relative grid gap-12 sm:grid-cols-3">
            {/* Connector line */}
            <div className="pointer-events-none absolute top-8 left-[20%] right-[20%] hidden h-px bg-gradient-to-r from-amber-400/20 via-amber-400/40 to-amber-400/20 sm:block" />

            <StepCard
              num="01"
              icon="📥"
              title="Import Your Trades"
              desc="Upload your broker CSV or connect MetaTrader 5 directly. FITpips parses and normalises every trade automatically."
            />
            <StepCard
              num="02"
              icon="⚡"
              title="Coach Analyses Your Data"
              desc="The built-in AI coach scores each trade, identifies behavioural leaks, and generates a week-by-week protocol verdict."
            />
            <StepCard
              num="03"
              icon="📈"
              title="Execute the Protocol"
              desc="Follow your assigned mode — Growth, Stability, or Defense — with clear rules, daily checklists, and mentor oversight."
            />
          </div>
        </div>
      </section>

      {/* ── DATA IMPORT FEATURE SPOTLIGHT ────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-block rounded-full border border-emerald-400/20 bg-emerald-400/8 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
                Zero Manual Entry
              </div>
              <h2 className="text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
                Your broker data,
                <br />
                <span className="text-emerald-400">perfectly imported</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-400">
                Paste in any MetaTrader 5 CSV statement and FITpips instantly normalises every
                trade — parsing dates, symbols, directions, P&L, and session times
                without a single manual edit.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "MT5 CSV report upload with auto-parsing",
                  "Reconciliation panel: app net vs broker net",
                  "Manual P&L correction with full audit trail",
                  "Bulk session and symbol labelling",
                  "JSON backup and portable export",
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-emerald-500/15 text-center text-[10px] leading-5 text-emerald-400">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="/auth" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-400 shadow-lg shadow-emerald-500/20">
                Import Your First Week →
              </a>
            </div>
            {/* Visual: Import panel mock */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Import Trading Data</div>
              <div className="space-y-3">
                {[
                  { date: "2026-05-01 14:48", sym: "XAUUSD", dir: "Sell", pnl: "+$29.02", grade: "A" },
                  { date: "2026-05-01 18:47", sym: "XAUUSD", dir: "Sell", pnl: "+$17.15", grade: "A" },
                  { date: "2026-05-04 15:02", sym: "XAUUSD", dir: "Sell", pnl: "+$8.06", grade: "B" },
                  { date: "2026-05-04 16:51", sym: "XAUUSD", dir: "Buy", pnl: "-$6.77", grade: "D" },
                  { date: "2026-05-05 07:43", sym: "XAUUSD", dir: "Buy", pnl: "+$7.57", grade: "A" },
                ].map((t, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-500">{t.date}</div>
                      <div className="text-xs font-bold text-slate-200">{t.sym}</div>
                    </div>
                    <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase ${t.dir === "Buy" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>{t.dir}</span>
                    <span className={`text-sm font-black ${t.pnl.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>{t.pnl}</span>
                    <span className="rounded-lg bg-amber-400/15 px-2 py-0.5 text-[9px] font-black text-amber-400">{t.grade}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs font-bold text-emerald-400">
                ✓ 5 trades imported · Net +$55.03 · Win rate 80%
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COACH PROTOCOL ───────────────────────────────────────────────── */}
      <section id="coach" className="relative bg-slate-900/30 py-24 px-6">
        <div className="absolute inset-0 border-y border-slate-800/40 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="mb-3 inline-block rounded-full border border-violet-400/20 bg-violet-400/8 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-violet-400">
              Adaptive Intelligence
            </div>
            <h2 className="text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
              Three protocols.
              <br />
              <span className="text-violet-400">One disciplined system.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
              Your coach assigns a market protocol every week based on your actual performance.
              No guesswork. No opinions. Pure data-driven discipline.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                mode: "Growth Mode",
                trigger: "Win rate > 60%",
                color: "emerald",
                icon: "📈",
                rules: ["Trail runners for 3:1", "Size up on A+ setups", "Maximum 5 trades per day", "Review every winner for replication"],
                border: "border-emerald-500/30 bg-emerald-500/5",
                badge: "bg-emerald-400/15 text-emerald-400",
              },
              {
                mode: "Stability Mode",
                trigger: "Win rate 45–60%",
                color: "amber",
                icon: "⚖️",
                rules: ["Normal position sizing", "Max 3 trades per day", "Stop after 2 losses", "1H structure must align with 15M trigger"],
                border: "border-amber-500/30 bg-amber-500/5",
                badge: "bg-amber-400/15 text-amber-400",
              },
              {
                mode: "Defense Mode",
                trigger: "Win rate < 45%",
                color: "rose",
                icon: "🛡️",
                rules: ["Reduce position size 50%", "Stop at first loss", "Gold-only A+ setups", "Daily debrief mandatory"],
                border: "border-rose-500/30 bg-rose-500/5",
                badge: "bg-rose-400/15 text-rose-400",
              },
            ].map(({ mode, trigger, icon, rules, border, badge }) => (
              <div key={mode} className={`rounded-3xl border p-6 ${border}`}>
                <div className={`mb-3 inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${badge}`}>
                  <span>{icon}</span>
                  <span>{mode}</span>
                </div>
                <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Trigger: {trigger}
                </div>
                <ul className="space-y-2">
                  {rules.map(rule => (
                    <li key={rule} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-0.5 text-slate-600">—</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANALYTICS SPOTLIGHT ──────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Visual: Analytics mock */}
            <div className="order-2 lg:order-1 space-y-3">
              {/* Pattern Hunter mock */}
              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">Biggest Performance Leak</div>
                <div className="mt-3 text-3xl font-black text-slate-100">Avoid Trading at 16:00</div>
                <div className="mt-2 text-sm text-slate-400">
                  This pattern has cost you <span className="font-bold text-rose-400">-$47.23</span> across 8 trades.
                  Eliminating it raises your net to <span className="font-bold text-emerald-400">+$101.26</span>.
                </div>
              </div>
              {/* Heatmap row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { cat: "Symbol", val: "BTCUSDm", loss: "-$23" },
                  { cat: "Session", val: "New York", loss: "-$31" },
                  { cat: "Day", val: "Monday", loss: "-$18" },
                ].map(l => (
                  <div key={l.cat} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">Leak: {l.cat}</div>
                    <div className="mt-1 font-bold text-slate-200 text-sm">{l.val}</div>
                    <div className="font-black text-rose-400">{l.loss}</div>
                  </div>
                ))}
              </div>
              {/* Drawdown */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Equity Curve (losing run)</div>
                <EquityIllustration green={false} />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="mb-4 inline-block rounded-full border border-amber-400/20 bg-amber-400/8 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
                Deep Analytics
              </div>
              <h2 className="text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
                Find the leak before
                <br />
                <span className="text-amber-400">it drains your account</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-400">
                Most traders know they have a problem. FITpips tells you exactly what it is, 
                when it happens, and how much it costs — down to the symbol, hour, session, 
                and day of week.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Pattern Hunter identifies your worst performing variable",
                  "Hour-of-day heatmap reveals your danger zones",
                  "Symbol breakdown: Gold vs BTC performance split",
                  "Buy vs Sell win rate differential analysis",
                  "Sharpe ratio and expectancy per R tracking",
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-amber-500/15 text-center text-[10px] leading-5 text-amber-400">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── MENTOR SHARE FEATURE ─────────────────────────────────────────── */}
      <section className="relative bg-slate-900/30 py-24 px-6">
        <div className="absolute inset-0 border-y border-slate-800/40 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-block rounded-full border border-sky-400/20 bg-sky-400/8 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">
            Accountability System
          </div>
          <h2 className="text-4xl font-black tracking-tight text-slate-100 sm:text-5xl">
            Share your portfolio.
            <br />
            <span className="text-sky-400">Own your progress.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
            Generate a secure, tokenised read-only link to your portfolio and share it with your
            mentor, prop firm coach, or trading group. They see everything — you control access.
          </p>

          <div className="mt-12 inline-flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-300">
              <span className="text-amber-400">🔗</span>
              <span className="font-mono text-xs text-slate-400">fitpips.app/share/a3f9b2e1...</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-amber-400/15 border border-amber-400/20 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              Read-Only · Expires in 7 days
            </div>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { icon: "🔒", title: "Zero credentials exposed", desc: "Mentors see your stats — never your login, account number, or broker details." },
              { icon: "⏱️", title: "Expiry control", desc: "Set link lifetimes to maintain full control over who has access and when." },
              { icon: "📋", title: "Full portfolio view", desc: "Equity curve, trade history, journal, coach verdict — everything your mentor needs." },
            ].map(f => (
              <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left">
                <div className="mb-3 text-2xl">{f.icon}</div>
                <div className="text-sm font-black text-slate-100">{f.title}</div>
                <div className="mt-2 text-xs leading-relaxed text-slate-400">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 text-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/6 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-4xl shadow-2xl shadow-amber-500/30">
            ⚡
          </div>
          <h2 className="mt-6 text-5xl font-black tracking-tight text-slate-100 sm:text-6xl">
            The system that grows
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #d97706 100%)" }}
            >
              with every trade
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-slate-400">
            26 weeks. A proven protocol. The only trading journal that tells you exactly
            what to fix — and holds you accountable to it.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/auth"
              id="footer-cta"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-2xl bg-amber-400 px-10 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-amber-400/25 transition-all hover:bg-amber-300 hover:scale-[1.02]"
            >
              <span>Start Your Journey — It&apos;s Free</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-600">No credit card. No trial period. Just your data and a system that works.</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 py-10 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-lg shadow-lg shadow-amber-500/20">
              ⚡
            </div>
            <div>
              <div className="text-sm font-black text-slate-200">FITpips Trading Coach</div>
              <div className="text-[9px] uppercase tracking-widest text-slate-600">26-Week Professional Development System</div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            <a href="/auth" className="transition hover:text-amber-400">Sign In</a>
            <a href="/auth" className="transition hover:text-amber-400">Register</a>
            <span>© 2026 FITpips</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
