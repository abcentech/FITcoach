"use client";

import React, { useState, useEffect } from "react";

export default function AuthPage() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  };

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isRegister ? "register" : "login",
          email,
          password,
        }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        setError(result.error || "An error occurred. Please try again.");
        setLoading(false);
      } else {
        // Successful login/register, redirect to dashboard
        window.location.href = "/";
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          title="Toggle Light/Dark Theme"
          className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-xs font-black text-slate-300 shadow-lg backdrop-blur hover:border-amber-400 hover:text-amber-300 transition"
        >
          <span>{theme === "dark" ? "☀️" : "🌙"}</span>
          <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>

      {/* Background Glow */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-md">
        {/* Logo / Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-3xl shadow-lg shadow-amber-500/20">
            ⚡
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-100">
            {isRegister ? "Create Your Account" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-slate-500">
            FITpips Trading Coach
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/15 p-4 text-xs font-bold text-rose-300">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition focus:border-amber-400 focus:bg-slate-950"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition focus:border-amber-400 focus:bg-slate-950"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-amber-400 py-3.5 text-sm font-black text-slate-950 transition hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Please wait..." : isRegister ? "Sign Up" : "Log In"}
          </button>
        </form>

        {/* Toggle between Register/Login */}
        <div className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setIsRegister(false);
                  setError("");
                }}
                className="font-bold text-amber-400 hover:underline"
              >
                Log In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setIsRegister(true);
                  setError("");
                }}
                className="font-bold text-amber-400 hover:underline"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
