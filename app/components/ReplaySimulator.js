"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createChart } from "lightweight-charts";

function calculateSimPnL(symbol, dir, entryPrice, currentPrice, lot = 0.01) {
  const diff = dir === "Buy" ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
  const isGold = String(symbol || "").toUpperCase().includes("XAU") || String(symbol || "").toUpperCase().includes("GOLD");
  if (isGold) {
    return diff * lot * 100;
  }
  return diff * lot;
}

export default function ReplaySimulator({ trades = [], initialBalance = 10000 }) {
  const [selectedTradeId, setSelectedTradeId] = useState("");
  const [customSymbol, setCustomSymbol] = useState("XAUUSDm");
  const [customDate, setCustomDate] = useState("2026-05-01");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Candles loaded from API
  const [allCandles, setAllCandles] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sim Trading State
  const [simBalance, setSimBalance] = useState(initialBalance);
  const [lotSize, setLotSize] = useState(0.01);
  const [simPosition, setSimPosition] = useState(null); // { dir, entryPrice, time }
  const [completedTrades, setCompletedTrades] = useState([]);

  // Refs
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const intervalRef = useRef(null);

  // Sync balance when portfolio initialBalance changes
  useEffect(() => {
    setSimBalance(initialBalance);
  }, [initialBalance]);

  // Extract unique trade select options
  const tradeOptions = useMemo(() => {
    return trades.map(t => ({
      id: t.id,
      label: `Trade #${t.id} - ${t.symbol} (${t.dir}) - PnL: $${Number(t.pnl).toFixed(2)} - ${t.dateTime}`
    }));
  }, [trades]);

  // Load candles from API
  const loadReplayData = async () => {
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setSimPosition(null);
    setCompletedTrades([]);
    setSimBalance(initialBalance);
    setCurrentIdx(0);
    if (seriesRef.current) seriesRef.current.setData([]);

    try {
      let payload = {};
      if (selectedTradeId) {
        const trade = trades.find(t => String(t.id) === String(selectedTradeId));
        if (trade) {
          payload = {
            symbol: trade.symbol,
            dateTime: trade.dateTime,
            entry: trade.entry,
            exit: trade.exit,
            high: trade.high,
            low: trade.low,
            dir: trade.dir
          };
        }
      } else {
        payload = {
          symbol: customSymbol,
          dateTime: `${customDate} 12:00`,
        };
      }

      const res = await fetch("/api/historical-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to load historical candles");
      const data = await res.json();

      if (!data.candles || data.candles.length === 0) {
        throw new Error("No candle data returned from historical API feed.");
      }

      setAllCandles(data.candles);
      setCurrentIdx(0);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error fetching rates.");
    } finally {
      setIsLoading(false);
    }
  };

  // Playback Auto-Advance Effect
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIdx(prev => {
          if (prev >= allCandles.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, allCandles]);

  // Build Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartContainerRef.current.innerHTML = "";
    const isLightInit = document.documentElement.classList.contains("light");
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 380,
      layout: {
        background: { color: isLightInit ? "#ffffff" : "#020617" },
        textColor: isLightInit ? "#475569" : "#94a3b8",
      },
      grid: {
        vertLines: { color: isLightInit ? "#e2e8f0" : "#1e293b" },
        horzLines: { color: isLightInit ? "#e2e8f0" : "#1e293b" },
      },
      rightPriceScale: {
        borderColor: isLightInit ? "#cbd5e1" : "#334155",
      },
      timeScale: {
        borderColor: isLightInit ? "#cbd5e1" : "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const updateTheme = () => {
      if (!chart) return;
      const isLight = document.documentElement.classList.contains("light");
      chart.applyOptions({
        layout: {
          background: { color: isLight ? "#ffffff" : "#020617" },
          textColor: isLight ? "#475569" : "#94a3b8",
        },
        grid: {
          vertLines: { color: isLight ? "#e2e8f0" : "#1e293b" },
          horzLines: { color: isLight ? "#e2e8f0" : "#1e293b" },
        },
        rightPriceScale: {
          borderColor: isLight ? "#cbd5e1" : "#334155",
        },
        timeScale: {
          borderColor: isLight ? "#cbd5e1" : "#334155",
        },
      });
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === "class") {
          updateTheme();
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      chart.remove();
    };
  }, []);

  // Update chart series data on step
  useEffect(() => {
    if (!seriesRef.current || allCandles.length === 0) return;

    const visibleCandles = allCandles.slice(0, currentIdx + 1);
    seriesRef.current.setData(visibleCandles);

    // Dynamic marker updates for trades if any
    const markers = [];
    if (selectedTradeId) {
      const trade = trades.find(t => String(t.id) === String(selectedTradeId));
      if (trade) {
        // If entry/exit index fits within visibleCandles, display them
        const baseDate = new Date(trade.dateTime.replace(/\./g, '-').replace(' ', 'T'));
        const entryTimeUnix = Math.floor(baseDate.getTime() / 1000);
        
        let closestEntryIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < allCandles.length; i++) {
          const diff = Math.abs(allCandles[i].time - entryTimeUnix);
          if (diff < minDiff) {
            minDiff = diff;
            closestEntryIdx = i;
          }
        }
        const closestExitIdx = Math.min(allCandles.length - 1, closestEntryIdx + 10);

        if (closestEntryIdx <= currentIdx) {
          markers.push({
            time: allCandles[closestEntryIdx].time,
            price: Number(trade.entry),
            position: 'belowBar',
            color: '#10b981',
            shape: 'arrowUp',
            text: `Original Buy @ ${trade.entry}`
          });
        }
        if (closestExitIdx <= currentIdx) {
          markers.push({
            time: allCandles[closestExitIdx].time,
            price: Number(trade.exit),
            position: 'aboveBar',
            color: '#f43f5e',
            shape: 'arrowDown',
            text: `Original Sell @ ${trade.exit}`
          });
        }
      }
    }

    // Add active sim markers
    if (simPosition) {
      const simEntryIdx = allCandles.findIndex(c => c.time === simPosition.time);
      if (simEntryIdx !== -1 && simEntryIdx <= currentIdx) {
        markers.push({
          time: simPosition.time,
          price: simPosition.entryPrice,
          position: simPosition.dir === "Buy" ? "belowBar" : "aboveBar",
          color: simPosition.dir === "Buy" ? "#34d399" : "#fb7185",
          shape: simPosition.dir === "Buy" ? "arrowUp" : "arrowDown",
          text: `Sim ${simPosition.dir} @ ${simPosition.entryPrice}`
        });
      }
    }

    // Add completed sim markers
    completedTrades.forEach((ct, index) => {
      const simEntryIdx = allCandles.findIndex(c => c.time === ct.entryTime);
      const simExitIdx = allCandles.findIndex(c => c.time === ct.exitTime);

      if (simEntryIdx !== -1 && simEntryIdx <= currentIdx) {
        markers.push({
          time: ct.entryTime,
          price: ct.entryPrice,
          position: ct.dir === "Buy" ? "belowBar" : "aboveBar",
          color: "#94a3b8",
          shape: ct.dir === "Buy" ? "arrowUp" : "arrowDown",
          text: `T${index+1} Entry`
        });
      }
      if (simExitIdx !== -1 && simExitIdx <= currentIdx) {
        markers.push({
          time: ct.exitTime,
          price: ct.exitPrice,
          position: ct.dir === "Buy" ? "aboveBar" : "belowBar",
          color: ct.pnl >= 0 ? "#10b981" : "#f43f5e",
          shape: ct.dir === "Buy" ? "arrowDown" : "arrowUp",
          text: `T${index+1} Close (${ct.pnl >= 0 ? "+" : ""}${ct.pnl.toFixed(2)})`
        });
      }
    });

    if (markers.length > 0) {
      seriesRef.current.setMarkers(markers);
    } else {
      seriesRef.current.setMarkers([]);
    }

    if (chartRef.current) {
      // Auto scroll or fit content
      if (visibleCandles.length < 15) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [currentIdx, allCandles, selectedTradeId, simPosition, completedTrades, trades]);

  // Helper values
  const currentCandle = allCandles[currentIdx];
  const openPnL = useMemo(() => {
    if (!simPosition || !currentCandle) return 0;
    const currentSymbolString = selectedTradeId 
      ? (trades.find(t => String(t.id) === String(selectedTradeId))?.symbol || "XAUUSDm") 
      : customSymbol;
    return calculateSimPnL(currentSymbolString, simPosition.dir, simPosition.entryPrice, currentCandle.close, lotSize);
  }, [simPosition, currentCandle, selectedTradeId, customSymbol, lotSize, trades]);

  const totalCompletedPnL = useMemo(() => {
    return completedTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [completedTrades]);

  // Actions
  const handleBuy = () => {
    if (!currentCandle) return;
    setSimPosition({
      dir: "Buy",
      entryPrice: currentCandle.close,
      time: currentCandle.time
    });
  };

  const handleSell = () => {
    if (!currentCandle) return;
    setSimPosition({
      dir: "Sell",
      entryPrice: currentCandle.close,
      time: currentCandle.time
    });
  };

  const handleClose = () => {
    if (!simPosition || !currentCandle) return;
    const pnl = openPnL;
    setCompletedTrades(prev => [
      ...prev,
      {
        dir: simPosition.dir,
        entryPrice: simPosition.entryPrice,
        exitPrice: currentCandle.close,
        entryTime: simPosition.time,
        exitTime: currentCandle.time,
        pnl
      }
    ]);
    setSimBalance(prev => prev + pnl);
    setSimPosition(null);
  };

  const handleNext = () => {
    if (currentIdx < allCandles.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setIsPlaying(false);
    setSimPosition(null);
    setCompletedTrades([]);
    setSimBalance(initialBalance);
  };

  const symbolToReplay = selectedTradeId 
    ? (trades.find(t => String(t.id) === String(selectedTradeId))?.symbol || "XAUUSDm") 
    : customSymbol;

  return (
    <div className="space-y-6">
      {/* Configuration & Selection */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6">
        <div className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Replay Setup Configurator</div>
        <div className="grid gap-5 md:grid-cols-3 items-end">
          <div>
            <label className="text-[10px] uppercase text-slate-500 block mb-1">Replay from Real Trade</label>
            <select
              value={selectedTradeId}
              onChange={e => {
                setSelectedTradeId(e.target.value);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
            >
              <option value="">-- Custom Date & Symbol --</option>
              {tradeOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {!selectedTradeId && (
            <>
              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Custom Symbol</label>
                <input
                  type="text"
                  value={customSymbol}
                  onChange={e => setCustomSymbol(e.target.value)}
                  placeholder="e.g. XAUUSD=X"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-500 block mb-1">Date</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-amber-400"
                />
              </div>
            </>
          )}

          <button
            onClick={loadReplayData}
            disabled={isLoading}
            className="w-full rounded-xl bg-amber-400 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 transition disabled:opacity-50"
          >
            {isLoading ? "Sourcing historical data..." : "Load Replay Chart"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400 font-bold">
          ⚠️ {error}
        </div>
      )}

      {allCandles.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-[1fr_310px]">
          {/* Simulator Main Body */}
          <div className="space-y-4">
            {/* Playback Controls & Chart Panel */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-4">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-black text-slate-100">{symbolToReplay}</div>
                  <div className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-slate-500 font-bold uppercase">15M Interval</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`rounded-xl px-4 py-2 text-xs font-black uppercase transition-all ${isPlaying ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                  >
                    {isPlaying ? "⏸️ Pause" : "▶️ Play"}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={isPlaying || currentIdx >= allCandles.length - 1}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-all"
                  >
                    Step Candle ➡️
                  </button>
                  <button
                    onClick={handleReset}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-slate-400 hover:text-rose-400 transition-all"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Chart Mount Container */}
              <div ref={chartContainerRef} className="w-full min-h-[380px]" />

              {/* Playback Progression Slider */}
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <span>Progress: {currentIdx + 1} / {allCandles.length} candles</span>
                <input
                  type="range"
                  min={0}
                  max={allCandles.length - 1}
                  value={currentIdx}
                  onChange={e => setCurrentIdx(Number(e.target.value))}
                  disabled={isPlaying}
                  className="flex-1 accent-amber-400 cursor-pointer h-1 rounded-full bg-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Sim execution panel */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
              <div className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Simulated Account Terminal</div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Sim Lot Size</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={lotSize}
                      onChange={e => setLotSize(Math.max(0.01, Number(e.target.value)))}
                      className="w-20 rounded-xl border border-slate-800 bg-slate-900 p-2 text-xs text-slate-200 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-end gap-2 h-full pt-4">
                    <button
                      onClick={handleBuy}
                      disabled={!!simPosition}
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2.5 disabled:opacity-40 transition-all"
                    >
                      Buy Sim
                    </button>
                    <button
                      onClick={handleSell}
                      disabled={!!simPosition}
                      className="rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs px-5 py-2.5 disabled:opacity-40 transition-all"
                    >
                      Sell Sim
                    </button>
                    <button
                      onClick={handleClose}
                      disabled={!simPosition}
                      className="rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-5 py-2.5 disabled:opacity-40 transition-all"
                    >
                      Close Sim
                    </button>
                  </div>
                </div>

                {simPosition && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 px-4 py-2 flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Position:</span>{" "}
                      <span className={`font-bold uppercase ${simPosition.dir === "Buy" ? "text-emerald-400" : "text-rose-400"}`}>{simPosition.dir}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Entry Price:</span>{" "}
                      <span className="font-bold text-slate-200">{simPosition.entryPrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Current Price:</span>{" "}
                      <span className="font-bold text-slate-200">{currentCandle?.close}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Open Profit:</span>{" "}
                      <span className={`font-black ${openPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {openPnL >= 0 ? "+" : ""}${openPnL.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Simulator Metrics Sidebar */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 space-y-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Sim Account Summary</div>
              
              <div className="rounded-2xl bg-slate-900 p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Account Balance</div>
                <div className="text-2xl font-black text-slate-100 mt-1">
                  ${simBalance.toFixed(2)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Sim Trade Profit</div>
                <div className={`text-2xl font-black mt-1 ${totalCompletedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalCompletedPnL >= 0 ? "+" : ""}${totalCompletedPnL.toFixed(2)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Trades Executed</div>
                <div className="text-xl font-bold text-slate-200 mt-1">
                  {completedTrades.length} Trades
                </div>
              </div>
            </div>

            {/* List of sim trades */}
            {completedTrades.length > 0 && (
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 space-y-3">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Sim Session Trades</div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {completedTrades.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center rounded-xl bg-slate-900 p-3 text-xs border border-slate-800/50">
                      <div>
                        <div className="font-bold text-slate-200 uppercase tracking-wider">#{idx+1} {t.dir}</div>
                        <div className="text-[9px] text-slate-500">{t.entryPrice.toFixed(2)} ➡️ {t.exitPrice.toFixed(2)}</div>
                      </div>
                      <div className={`font-black ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {allCandles.length === 0 && !isLoading && (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 py-20 text-center text-slate-500 text-sm font-semibold">
          Select a trade from the dropdown or input a custom date and symbol to begin candle replay simulation.
        </div>
      )}
    </div>
  );
}
