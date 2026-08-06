import { Request, Response } from "express";

// Symbols proxied to Yahoo Finance (free, no key). Kept server-side because
// Yahoo's chart API does not send CORS headers, so the browser cannot call it directly.
const SYMBOLS = [
  { symbol: "EUR/USD", yahoo: "EURUSD=X" },
  { symbol: "GBP/USD", yahoo: "GBPUSD=X" },
  { symbol: "XAU/USD", yahoo: "GC=F" },
  { symbol: "AAPL", yahoo: "AAPL" },
  { symbol: "NVDA", yahoo: "NVDA" },
  { symbol: "TSLA", yahoo: "TSLA" },
  { symbol: "MSFT", yahoo: "MSFT" },
  { symbol: "GOOGL", yahoo: "GOOGL" },
  { symbol: "AMZN", yahoo: "AMZN" },
  { symbol: "SOL/USD", yahoo: "SOL-USD" },
];

interface YahooMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  regularMarketTime?: number;
}

// ── In-memory cache (30s TTL) ─────────────────────────
// The client polls every 10-15s; caching avoids hammering Yahoo on every call.
let cache: { data: { success: boolean; data: unknown[] } | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL_MS = 30_000;

/**
 * GET /api/markets/live
 * Returns real-time prices for forex/gold/stocks fetched server-side from Yahoo Finance.
 * Yahoo's chart API does not send CORS headers, so it must be proxied server-side.
 */
export async function getLiveMarketPrices(_req: Request, res: Response): Promise<void> {
  if (cache.data && Date.now() < cache.expiresAt) {
    res.json(cache.data);
    return;
  }

  const results: {
    symbol: string;
    price: number;
    changePercent: number;
    updatedAt: string;
  }[] = [];

  // Fetch in small concurrent batches to be kind to the free API
  const batchSize = 5;
  for (let i = 0; i < SYMBOLS.length; i += batchSize) {
    const batch = SYMBOLS.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (s) => {
        try {
          const upstream = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${s.yahoo}?interval=1d&range=1d`,
            { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } },
          );
          if (!upstream.ok) return;
          const json = (await upstream.json()) as {
            chart?: { result?: { meta?: YahooMeta }[] };
          };
          const meta = json.chart?.result?.[0]?.meta;
          if (!meta || typeof meta.regularMarketPrice !== "number") return;
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose;
          const changePercent =
            prev && prev > 0 ? ((price - prev) / prev) * 100 : 0;
          results.push({
            symbol: s.symbol,
            price,
            changePercent: Number(changePercent.toFixed(2)),
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // ignore individual failures — partial results are fine
        }
      }),
    );
  }

  const payload = { success: true, data: results };
  cache = { data: payload, expiresAt: Date.now() + CACHE_TTL_MS };
  res.json(payload);
}
