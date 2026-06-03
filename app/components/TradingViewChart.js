"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

export default function TradingViewChart({ trade }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!trade || !chartContainerRef.current) return;

    let isMounted = true;
    let chartInstance = null;

    async function loadChartData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch candle history and markers from backend
        const res = await fetch("/api/historical-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: trade.symbol,
            dateTime: trade.dateTime,
            entry: trade.entry,
            exit: trade.exit,
            high: trade.high,
            low: trade.low,
            dir: trade.dir,
          }),
        });

        if (!res.ok) throw new Error("Failed to fetch historical rates");
        const data = await res.json();

        if (!isMounted) return;
        setLoading(false);

        if (!data.candles || data.candles.length === 0) {
          setError("No price feed available for this trade.");
          return;
        }

        // Initialize Lightweight Chart with theme support
        const isLightInit = document.documentElement.classList.contains("light");
        chartInstance = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 280,
          layout: {
            background: { color: isLightInit ? "#ffffff" : "#020617" }, // slate-950 to match theme
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

        chartRef.current = chartInstance;

        // Apply dynamic updates on theme toggles
        const updateTheme = () => {
          if (!chartInstance) return;
          const isLight = document.documentElement.classList.contains("light");
          chartInstance.applyOptions({
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

        // Add Candlestick Series
        const candlestickSeries = chartInstance.addCandlestickSeries({
          upColor: "#10b981",
          downColor: "#f43f5e",
          borderUpColor: "#10b981",
          borderDownColor: "#f43f5e",
          wickUpColor: "#10b981",
          wickDownColor: "#f43f5e",
        });

        candlestickSeries.setData(data.candles);

        // Plot entry/exit markers
        const markers = [];
        if (data.entryMarker) markers.push(data.entryMarker);
        if (data.exitMarker) markers.push(data.exitMarker);

        if (markers.length > 0) {
          candlestickSeries.setMarkers(markers);
        }

        // Fit content on the chart scale
        chartInstance.timeScale().fitContent();

        // Handle window resizing
        const handleResize = () => {
          if (chartContainerRef.current && chartInstance) {
            chartInstance.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };
        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
          observer.disconnect();
        };
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Could not load chart. Check your connection.");
          setLoading(false);
        }
      }
    }

    loadChartData();

    return () => {
      isMounted = false;
      if (chartInstance) {
        chartInstance.remove();
      }
    };
  }, [trade]);

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
        <span>Execution Chart ({trade.symbol || "XAUUSD"})</span>
        <span className="text-[10px] text-slate-500">15M Interval</span>
      </div>

      {loading && (
        <div className="flex h-[280px] items-center justify-center text-sm font-semibold text-slate-500">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent"></div>
          Sourcing price candles...
        </div>
      )}

      {error && (
        <div className="flex h-[280px] items-center justify-center text-sm font-semibold text-rose-400/80">
          ⚠️ {error}
        </div>
      )}

      <div
        ref={chartContainerRef}
        className="w-full"
        style={{ display: loading || error ? "none" : "block" }}
      />
    </div>
  );
}
