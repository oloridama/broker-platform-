// ── Technical indicator engine (MA + RSI) ─────────────
// Real computation against live OHLCV candles from Binance.
// Used by the "MA Crossover + RSI Strategy Bot" on a 5-minute timeframe.

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
}

export interface Signal {
  action: "BUY" | "SELL" | "HOLD";
  price: number;
  reason: string;
  rsi: number;
  ema9: number;
  ema21: number;
}

/**
 * Fetch 5-minute candles for a Binance symbol (e.g. BTCUSDT).
 * Free public endpoint — no API key required.
 */
export async function fetchCandles(
  symbol: string,
  interval: string = "5m",
  limit: number = 100,
): Promise<Candle[]> {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  );
  if (!res.ok) return [];
  const raw = (await res.json()) as (number | string)[][];
  return raw.map((k) => ({
    time: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}

/** Simple exponential moving average. */
export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(seed);
  for (let i = period; i < values.length; i++) {
    seed = values[i] * k + seed * (1 - k);
    out.push(seed);
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(values: number[], period: number = 14): number[] {
  if (values.length <= period) return [];
  const out: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) avgGain += delta;
    else avgLoss -= delta;
  }
  avgGain /= period;
  avgLoss /= period;
  out.push(100 - 100 / (1 + (avgLoss === 0 ? 1e-9 : avgGain / avgLoss)));

  for (let i = period + 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out.push(100 - 100 / (1 + (avgLoss === 0 ? 1e-9 : avgGain / avgLoss)));
  }
  return out;
}

/**
 * Evaluate the MA+RSI signal on the latest candle.
 * Strategy: BUY when EMA9 crosses ABOVE EMA21 and RSI(14) < 70 (not overbought).
 * SELL/exit when EMA9 crosses BELOW EMA21 (or RSI > 75 = overbought).
 */
export function evaluateMaRsi(candles: Candle[]): Signal {
  const closes = candles.map((c) => c.close);
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const rsiVals = rsi(closes, 14);

  const last = candles[candles.length - 1];
  const price = last.close;

  if (ema9.length < 2 || ema21.length < 2 || rsiVals.length === 0) {
    return { action: "HOLD", price, reason: "Insufficient data", rsi: 0, ema9: 0, ema21: 0 };
  }

  const e9 = ema9[ema9.length - 1];
  const e9Prev = ema9[ema9.length - 2];
  const e21 = ema21[ema21.length - 1];
  const e21Prev = ema21[ema21.length - 2];
  const r = rsiVals[rsiVals.length - 1];

  // Bullish crossover: EMA9 crosses above EMA21
  if (e9Prev <= e21Prev && e9 > e21 && r < 70) {
    return {
      action: "BUY",
      price,
      reason: `EMA9 crossed above EMA21 (${e9.toFixed(2)} > ${e21.toFixed(2)}), RSI ${r.toFixed(1)}`,
      rsi: r,
      ema9: e9,
      ema21: e21,
    };
  }

  // Bearish crossover: EMA9 crosses below EMA21, or overbought RSI
  if ((e9Prev >= e21Prev && e9 < e21) || r > 75) {
    return {
      action: "SELL",
      price,
      reason: `EMA9 crossed below EMA21 (${e9.toFixed(2)} < ${e21.toFixed(2)}) or RSI ${r.toFixed(1)} overbought`,
      rsi: r,
      ema9: e9,
      ema21: e21,
    };
  }

  return { action: "HOLD", price, reason: "No crossover — holding", rsi: r, ema9: e9, ema21: e21 };
}
