import { NextResponse } from 'next/server';

// Fetch real Bitcoin candles from Binance
async function fetchBinanceBtc(startTimeMs, limit = 60) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&startTime=${startTimeMs}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Binance fetch failed");
    const data = await res.json();
    return data.map(item => ({
      time: Math.floor(item[0] / 1000), // convert to unix timestamp in seconds
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
    }));
  } catch (error) {
    console.error("Failed to fetch real BTC candles:", error);
    return null;
  }
}

// Group symbols for Yahoo Finance
function getYahooSymbol(symbol) {
  const s = String(symbol || "").toUpperCase();
  if (s.includes("XAU") || s.includes("GOLD")) {
    return "XAUUSD=X";
  }
  if (s.includes("NAS") || s.includes("USTEC") || s.includes("US100") || s.includes("IXIC") || s.includes("NQ")) {
    return "NQ=F";
  }
  return symbol;
}

// Helper to find closest candle
function findClosestCandleIndex(candles, targetTime) {
  if (!candles || candles.length === 0) return 0;
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < candles.length; i++) {
    const diff = Math.abs(candles[i].time - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  return closestIdx;
}

// Fetch real Forex/Gold/Index candles from Yahoo Finance
async function fetchYahooFinance(symbol, dateTime, limit = 60) {
  try {
    const isGold = String(symbol || "").toUpperCase().includes("XAU") || String(symbol || "").toUpperCase().includes("GOLD");
    const isNasdaq = String(symbol || "").toUpperCase().includes("NAS") || String(symbol || "").toUpperCase().includes("US100") || String(symbol || "").toUpperCase().includes("USTEC");
    
    let yahooSymbol = "XAUUSD=X"; // Default to spot Gold
    if (isGold) {
      yahooSymbol = "XAUUSD=X";
    } else if (isNasdaq) {
      yahooSymbol = "NQ=F"; // Nasdaq Futures
    } else {
      yahooSymbol = String(symbol).toUpperCase().replace(/M$/, "") + "=X"; // e.g. EURUSD=X
    }

    let baseDate = new Date();
    if (dateTime) {
      baseDate = new Date(dateTime.replace(/\./g, '-').replace(' ', 'T'));
    }
    if (isNaN(baseDate.getTime())) baseDate = new Date();

    // Start 12 hours before entry, end 12 hours after entry
    const startTimeSec = Math.floor((baseDate.getTime() - (12 * 60 * 60 * 1000)) / 1000);
    const endTimeSec = Math.floor((baseDate.getTime() + (12 * 60 * 60 * 1000)) / 1000);

    const url = `https://query1.finance.chart.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startTimeSec}&period2=${endTimeSec}&interval=15m`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) throw new Error("Yahoo Finance fetch failed");
    const data = await res.json();
    
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const closes = quotes.close || [];

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (opens[i] !== null && highs[i] !== null && lows[i] !== null && closes[i] !== null) {
        candles.push({
          time: timestamps[i],
          open: parseFloat(opens[i].toFixed(5)),
          high: parseFloat(highs[i].toFixed(5)),
          low: parseFloat(lows[i].toFixed(5)),
          close: parseFloat(closes[i].toFixed(5))
        });
      }
    }

    // Limit/slice the list around the middle to get 60 candles
    if (candles.length > limit) {
      return candles.slice(0, limit);
    }
    return candles.length > 0 ? candles : null;
  } catch (error) {
    console.error("Failed to fetch real historical rates from Yahoo Finance:", error);
    return null;
  }
}

// High-fidelity synthetic candle generator
function generateSyntheticCandles(tradeDetails) {
  const { entry, exit, high, low, dir, dateTime } = tradeDetails;
  
  // Parse trade date or fallback to now
  let baseDate = new Date();
  if (dateTime) {
    baseDate = new Date(dateTime.replace(/\./g, '-').replace(' ', 'T'));
  }
  if (isNaN(baseDate.getTime())) baseDate = new Date();

  const timeSeconds = Math.floor(baseDate.getTime() / 1000);
  const candleInterval = 900; // 15-minute candles in seconds
  
  const candles = [];
  const totalCandles = 60;
  const entryIndex = 25;
  const exitIndex = 35;
  
  const entryVal = Number(entry) || 100;
  const exitVal = Number(exit) || 100;
  
  // If high/low are missing, estimate them based on entry/exit and direction
  let highVal = Number(high);
  let lowVal = Number(low);
  if (!highVal || isNaN(highVal)) {
    highVal = dir === "Buy" ? Math.max(entryVal, exitVal) * 1.002 : Math.max(entryVal, exitVal) * 1.001;
  }
  if (!lowVal || isNaN(lowVal)) {
    lowVal = dir === "Buy" ? Math.min(entryVal, exitVal) * 0.998 : Math.min(entryVal, exitVal) * 0.999;
  }

  // Ensure high is highest, low is lowest
  highVal = Math.max(highVal, entryVal, exitVal);
  lowVal = Math.min(lowVal, entryVal, exitVal);

  let currentPrice = entryVal * 0.995; // start lower for a nice visual buildup

  for (let i = 0; i < totalCandles; i++) {
    const candleTime = timeSeconds + (i - entryIndex) * candleInterval;
    let open, close, cHigh, cLow;

    if (i < entryIndex) {
      // PRE-TRADE BUILDUP
      open = currentPrice;
      const progress = i / entryIndex;
      // Trend towards entry price
      const target = entryVal - (1 - progress) * (entryVal * 0.003) * (dir === "Buy" ? 1 : -1);
      close = target + (Math.random() - 0.5) * (entryVal * 0.0008);
      cHigh = Math.max(open, close) + Math.random() * (entryVal * 0.0005);
      cLow = Math.min(open, close) - Math.random() * (entryVal * 0.0005);
      currentPrice = close;
    } else if (i >= entryIndex && i <= exitIndex) {
      // DURING-TRADE MOVEMENT
      open = currentPrice;
      const progress = (i - entryIndex) / (exitIndex - entryIndex);
      
      // Interpolate towards exit price
      let targetClose = entryVal + (exitVal - entryVal) * progress;
      close = targetClose;

      // Ensure the overall high and low are visited during the trade
      if (i === entryIndex + 2) {
        cLow = lowVal;
        cHigh = Math.max(open, close) + Math.random() * (entryVal * 0.0003);
      } else if (i === entryIndex + 5) {
        cHigh = highVal;
        cLow = Math.min(open, close) - Math.random() * (entryVal * 0.0003);
      } else {
        cHigh = Math.max(open, close) + Math.random() * (entryVal * 0.0005);
        cLow = Math.min(open, close) - Math.random() * (entryVal * 0.0005);
      }
      
      // Clamp highs/lows during trade
      cHigh = Math.min(highVal, Math.max(cHigh, open, close));
      cLow = Math.max(lowVal, Math.min(cLow, open, close));
      currentPrice = close;
    } else {
      // POST-TRADE DECAY
      open = currentPrice;
      const progress = (i - exitIndex) / (totalCandles - exitIndex);
      const target = exitVal + (progress) * (entryVal * 0.002) * (dir === "Buy" ? 0.5 : -0.5);
      close = target + (Math.random() - 0.5) * (entryVal * 0.001);
      cHigh = Math.max(open, close) + Math.random() * (entryVal * 0.0005);
      cLow = Math.min(open, close) - Math.random() * (entryVal * 0.0005);
      currentPrice = close;
    }

    candles.push({
      time: candleTime,
      open: Number(open.toFixed(5)),
      high: Number(cHigh.toFixed(5)),
      low: Number(cLow.toFixed(5)),
      close: Number(close.toFixed(5))
    });
  }

  return candles;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { symbol, dateTime, entry, exit, high, low, dir } = body;

    const isBtc = String(symbol || "").toUpperCase().includes("BTC");
    
    let candles = null;

    if (isBtc && dateTime) {
      let baseDate = new Date(dateTime.replace(/\./g, '-').replace(' ', 'T'));
      if (!isNaN(baseDate.getTime())) {
        // Start 12 hours before trade entry
        const startTimeMs = baseDate.getTime() - (12 * 60 * 60 * 1000);
        candles = await fetchBinanceBtc(startTimeMs, 60);
      }
    } else if (dateTime) {
      candles = await fetchYahooFinance(symbol, dateTime, 60);
    }

    // Fallback or default to high-fidelity synthetic generator
    if (!candles) {
      candles = generateSyntheticCandles({ entry, exit, high, low, dir, dateTime });
    }

    // Determine the exact times for placing markers
    let baseDate = new Date();
    if (dateTime) {
      baseDate = new Date(dateTime.replace(/\./g, '-').replace(' ', 'T'));
    }
    if (isNaN(baseDate.getTime())) baseDate = new Date();
    const entryTimeUnix = Math.floor(baseDate.getTime() / 1000);
    const exitTimeUnix = entryTimeUnix + (10 * 900); // 10 candles after entry index (25 to 35)

    // Locate closest candle times to place markers accurately
    const entryIdx = findClosestCandleIndex(candles, entryTimeUnix);
    const exitIdx = Math.min(candles.length - 1, entryIdx + 10);

    let entryCandleTime = candles[entryIdx]?.time || entryTimeUnix;
    let exitCandleTime = candles[exitIdx]?.time || exitTimeUnix;

    return NextResponse.json({
      candles,
      entryMarker: entry ? {
        time: entryCandleTime,
        price: Number(entry),
        position: 'belowBar',
        color: '#10b981',
        shape: 'arrowUp',
        text: `Buy @ ${entry}`
      } : null,
      exitMarker: exit ? {
        time: exitCandleTime,
        price: Number(exit),
        position: 'aboveBar',
        color: '#f43f5e',
        shape: 'arrowDown',
        text: `Sell @ ${exit}`
      } : null
    });

  } catch (error) {
    console.error("Historical Rates API Error:", error);
    return NextResponse.json({ error: "Failed to load charting data." }, { status: 500 });
  }
}
