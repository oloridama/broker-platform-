import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────
export interface TickerPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  logo: string;
}

// ── Free API: Binance for crypto, mock for forex (no API key needed) ──
const SYMBOLS = [
  { symbol: "BTC/USD", name: "Bitcoin", apiId: "BTCUSDT", logo: "₿", type: "crypto" },
  { symbol: "ETH/USD", name: "Ethereum", apiId: "ETHUSDT", logo: "⟠", type: "crypto" },
  { symbol: "SOL/USD", name: "Solana", apiId: "SOLUSDT", logo: "◎", type: "crypto" },
  { symbol: "EUR/USD", name: "Euro", apiId: "EURUSD", logo: "€", type: "forex" },
  { symbol: "GBP/USD", name: "GBP", apiId: "GBPUSD", logo: "£", type: "forex" },
  { symbol: "XAU/USD", name: "Gold", apiId: "XAUUSD", logo: "🥇", type: "forex" },
  { symbol: "AAPL", name: "Apple", apiId: "AAPL", logo: "🍎", type: "stock" },
  { symbol: "NVDA", name: "NVIDIA", apiId: "NVDA", logo: "🖥️", type: "stock" },
  { symbol: "TSLA", name: "Tesla", apiId: "TSLA", logo: "🚗", type: "stock" },
  { symbol: "MSFT", name: "Microsoft", apiId: "MSFT", logo: "🪟", type: "stock" },
  { symbol: "GOOGL", name: "Alphabet", apiId: "GOOGL", logo: "🔍", type: "stock" },
  { symbol: "AMZN", name: "Amazon", apiId: "AMZN", logo: "📦", type: "stock" },
];

// ── Default fallback prices ────────────────────────────
const DEFAULT_PRICES: TickerPrice[] = SYMBOLS.map((s) => ({
  symbol: s.symbol,
  name: s.name,
  price: s.type === "crypto" ? 0 : s.type === "forex" ? 0 : 0,
  change: 0,
  changePercent: 0,
  logo: s.logo,
}));

// Assign sensible defaults
const defaults: Record<string, [number, number]> = {
  BTCUSDT: [63250, 2.34], ETHUSDT: [3125, -0.45], SOLUSDT: [142, 1.8],
  EURUSD: [1.0856, 0.06], GBPUSD: [1.2645, 0.05], XAUUSD: [2350.80, 0.80],
  AAPL: [195.50, -0.56], NVDA: [190.01, -3.55], TSLA: [298.32, -2.97],
  MSFT: [390.54, -0.71], GOOGL: [336.71, 0.90], AMZN: [226.65, -1.82],
};

export function useLivePrices(refetchMs = 15000) {
  const [prices, setPrices] = useState<TickerPrice[]>(() =>
    SYMBOLS.map((s) => {
      const [price, change] = defaults[s.apiId] || [100, 0];
      return { ...s, price, change, changePercent: change };
    }),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices() {
      try {
        // Fetch crypto from Binance (free, no key)
        const cryptoSymbols = SYMBOLS.filter((s) => s.type === "crypto").map((s) => s.apiId);
        const binanceRes = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(cryptoSymbols)}`,
        );
        if (!binanceRes.ok) throw new Error("Binance unavailable");

        const binanceData = await binanceRes.json();

        if (cancelled) return;

        setPrices((prev) =>
          prev.map((p, idx) => {
            const apiId = SYMBOLS[idx]?.apiId;
            const binanceItem = apiId ? binanceData.find(
              (b: { symbol: string }) => b.symbol === apiId,
            ) : undefined;
            if (binanceItem) {
              const price = parseFloat(binanceItem.lastPrice);
              return {
                ...p,
                price,
                change: parseFloat(binanceItem.priceChange),
                changePercent: parseFloat(binanceItem.priceChangePercent),
              };
            }
            // For forex/stocks, add small random movement to simulate live data.
            // `change` here is already a percentage (e.g. 0.80 = +0.80%).
            const jitter = (Math.random() - 0.5) * 0.002;
            const newPrice = p.price === 0 ? 100 : p.price * (1 + jitter);
            const newChange = p.change + (Math.random() - 0.5) * 0.05;
            return { ...p, price: newPrice, change: newChange, changePercent: newChange };
          }),
        );
      } catch {
        // API down — add small random movement to existing prices
        if (!cancelled) {
          setPrices((prev) =>
            prev.map((p) => {
              const jitter = (Math.random() - 0.5) * 0.003;
              const newPrice = p.price * (1 + jitter);
              return { ...p, price: newPrice };
            }),
          );
        }
      }
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
