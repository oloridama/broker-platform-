import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────
export interface TickerPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  logo: string;
  apiId?: string;
}

// ── Live data sources (free, no API key) ──────────────
// Crypto  -> Binance public REST API (real prices, CORS-enabled)
// Forex / Gold / Stocks -> our server proxies Yahoo Finance (/api/markets/live)
//   because Yahoo's chart API does not send CORS headers to browsers.
const SYMBOLS = [
  { symbol: "BTC/USD", name: "Bitcoin", apiId: "BTCUSDT", logo: "₿", type: "crypto" },
  { symbol: "ETH/USD", name: "Ethereum", apiId: "ETHUSDT", logo: "⟠", type: "crypto" },
  { symbol: "SOL/USD", name: "Solana", apiId: "SOLUSDT", logo: "◎", type: "crypto" },
  { symbol: "EUR/USD", name: "Euro", apiId: "", logo: "€", type: "forex" },
  { symbol: "GBP/USD", name: "GBP", apiId: "", logo: "£", type: "forex" },
  { symbol: "XAU/USD", name: "Gold", apiId: "", logo: "🥇", type: "forex" },
  { symbol: "AAPL", name: "Apple", apiId: "", logo: "🍎", type: "stock" },
  { symbol: "NVDA", name: "NVIDIA", apiId: "", logo: "🖥️", type: "stock" },
  { symbol: "TSLA", name: "Tesla", apiId: "", logo: "🚗", type: "stock" },
  { symbol: "MSFT", name: "Microsoft", apiId: "", logo: "🪟", type: "stock" },
  { symbol: "GOOGL", name: "Alphabet", apiId: "", logo: "🔍", type: "stock" },
  { symbol: "AMZN", name: "Amazon", apiId: "", logo: "📦", type: "stock" },
];

// ── Fallback seed values (shown until first live fetch, or if APIs are down) ──
const defaults: Record<string, [number, number]> = {
  BTCUSDT: [63250, 2.34], ETHUSDT: [3125, -0.45], SOLUSDT: [142, 1.8],
  EURUSD: [1.0856, 0.06], GBPUSD: [1.2645, 0.05], XAUUSD: [2350.80, 0.80],
  AAPL: [195.50, -0.56], NVDA: [190.01, -3.55], TSLA: [298.32, -2.97],
  MSFT: [390.54, -0.71], GOOGL: [336.71, 0.90], AMZN: [226.65, -1.82],
};

// ── Helpers ────────────────────────────────────────────
function seedFor(s: (typeof SYMBOLS)[number]): TickerPrice {
  const [price, change] = defaults[s.apiId || s.symbol] || [100, 0];
  return { ...s, price, change, changePercent: change };
}

interface MarketPrice {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
}

async function fetchMarketPrices(): Promise<Map<string, MarketPrice>> {
  const result = new Map<string, MarketPrice>();
  try {
    const res = await fetch("/api/markets/live");
    if (!res.ok) return result;
    const json = (await res.json()) as { success: boolean; data: MarketPrice[] };
    if (json?.success && Array.isArray(json.data)) {
      for (const item of json.data) {
        result.set(item.symbol, item);
      }
    }
  } catch {
    // ignore — fall back to seeds / previous values
  }
  return result;
}

async function fetchBinancePrices(): Promise<Map<string, { price: number; changePercent: number }>> {
  const result = new Map<string, { price: number; changePercent: number }>();
  try {
    const cryptoSymbols = SYMBOLS.filter((s) => s.type === "crypto")
      .map((s) => s.apiId)
      .filter(Boolean);
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(cryptoSymbols)}`,
    );
    if (!res.ok) return result;
    const data = (await res.json()) as { symbol: string; lastPrice: string; priceChangePercent: string }[];
    for (const item of data) {
      result.set(item.symbol, {
        price: parseFloat(item.lastPrice),
        changePercent: parseFloat(item.priceChangePercent),
      });
    }
  } catch {
    // ignore
  }
  return result;
}

export function useLivePrices(refetchMs = 15000) {
  const [prices, setPrices] = useState<TickerPrice[]>(() => SYMBOLS.map(seedFor));
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices() {
      const [binance, market] = await Promise.all([fetchBinancePrices(), fetchMarketPrices()]);
      if (cancelled) return;

      setPrices((prev) =>
        prev.map((p) => {
          const binanceItem = p.apiId ? binance.get(p.apiId) : undefined;
          if (binanceItem) {
            return {
              ...p,
              price: binanceItem.price,
              change: binanceItem.changePercent,
              changePercent: binanceItem.changePercent,
            };
          }
          const marketItem = market.get(p.symbol);
          if (marketItem) {
            const changePercent =
              typeof marketItem.changePercent === "number"
                ? marketItem.changePercent
                : typeof marketItem.change === "number"
                  ? marketItem.change
                  : p.changePercent;
            return {
              ...p,
              price: typeof marketItem.price === "number" ? marketItem.price : p.price,
              change: changePercent,
              changePercent,
            };
          }
          return p;
        }),
      );
    }

    fetchPrices();
    intervalRef.current = setInterval(fetchPrices, refetchMs);

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
    };
  }, [refetchMs]);

  return prices;
}
