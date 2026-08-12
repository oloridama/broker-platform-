import { Request, Response } from "express";
import { fetchAllMarketPrices } from "../services/market.service";

// ── In-memory cache (30s TTL) ─────────────────────────
// The client polls every 10-15s; caching avoids hammering the upstream APIs.
let cache: { data: { success: boolean; data: unknown[] } | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL_MS = 30_000;

/**
 * GET /api/markets/live
 * Returns real-time prices for crypto/forex/gold/stocks.
 * Yahoo's chart API does not send CORS headers, so it is proxied server-side.
 */
export async function getLiveMarketPrices(_req: Request, res: Response): Promise<void> {
  if (cache.data && Date.now() < cache.expiresAt) {
    res.json(cache.data);
    return;
  }

  const data = await fetchAllMarketPrices();
  const payload = { success: true, data };
  cache = { data: payload, expiresAt: Date.now() + CACHE_TTL_MS };
  res.json(payload);
}
