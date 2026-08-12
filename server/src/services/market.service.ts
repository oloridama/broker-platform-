// ── Real market price service ─────────────────────────
// Shared by the HTTP endpoint (/api/markets/live) and the WebSocket price feed,
// so the floating ticker shows the SAME real prices as the markets page.
//
// Sources:
//  - Crypto  -> Binance public REST API (real prices, CORS-enabled for server)
//  - Forex/Gold/Stocks -> Yahoo Finance chart API (server-side, CORS-free)

interface SymbolDef {
  symbol: string;
  yahoo?: string;
  binance?: string;
}

const SYMBOLS: SymbolDef[] = [
  { symbol: "BTC/USD", binance: "BTCUSDT" },
  { symbol: "ETH/USD", binance: "ETHUSDT" },
  { symbol: "SOL/USD", binance: "SOLUSDT", yahoo: "SOL-USD" },
  { symbol: "EUR/USD", yahoo: "EURUSD=X" },
  { symbol: "GBP/USD", yahoo: "GBPUSD=X" },
  { symbol: "USD/JPY", yahoo: "JPY=X" },
  { symbol: "XAU/USD", yahoo: "GC=F" },
  { symbol: "US30", yahoo: "^DJI" },
  { symbol: "AAPL", yahoo: "AAPL" },
  { symbol: "NVDA", yahoo: "NVDA" },
  { symbol: "TSLA", yahoo: "TSLA" },
  { symbol: "MSFT", yahoo: "MSFT" },
  { symbol: "GOOGL", yahoo: "GOOGL" },
  { symbol: "AMZN", yahoo: "AMZN" },
];

export interface MarketPrice {
  symbol: string;
  price: number;
  change: number; // change percent
  updatedAt: string;
}

interface YahooMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
}

async function fetchBinancePrices(): Promise<Map<string, { price: number; change: number }>> {
  const result = new Map<string, { price: number; change: number }>();
  const symbols = SYMBOLS.map((s) => s.binance).filter(Boolean) as string[];
  if (!symbols.length) return result;
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${JSON.stringify(symbols)}`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return result;
    const data = (await res.json()) as {
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
    }[];
    for (const item of data) {
      result.set(item.symbol, {
        price: parseFloat(item.lastPrice),
        change: parseFloat(item.priceChangePercent),
      });
    }
  } catch {
    // ignore
  }
  return result;
}

async function fetchYahooPrices(): Promise<Map<string, { price: number; change: number }>> {
  const result = new Map<string, { price: number; change: number }>();
  const yahooSymbols = SYMBOLS.filter((s) => s.yahoo);
  const batchSize = 5;
  for (let i = 0; i < yahooSymbols.length; i += batchSize) {
    const batch = yahooSymbols.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (s) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${s.yahoo}?interval=1d&range=1d`,
            { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } },
          );
          if (!res.ok) return;
          const json = (await res.json()) as { chart?: { result?: { meta?: YahooMeta }[] } };
          const meta = json.chart?.result?.[0]?.meta;
          if (!meta || typeof meta.regularMarketPrice !== "number") return;
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose;
          const change = prev && prev > 0 ? ((price - prev) / prev) * 100 : 0;
          result.set(s.symbol as string, { price, change });
        } catch {
          // ignore individual failures
        }
      }),
    );
  }
  return result;
}

/**
 * Fetch real prices for all tracked symbols.
 * Crypto via Binance, forex/gold/stocks via Yahoo.
 */
export async function fetchAllMarketPrices(): Promise<MarketPrice[]> {
  const [binance, yahoo] = await Promise.all([fetchBinancePrices(), fetchYahooPrices()]);

  const out: MarketPrice[] = [];
  for (const s of SYMBOLS) {
    const bin = s.binance ? binance.get(s.binance) : undefined;
    const yah = s.yahoo ? yahoo.get(s.symbol) : undefined;
    const src = bin || yah;
    if (src) {
      out.push({
        symbol: s.symbol,
        price: src.price,
        change: Number(src.change.toFixed(2)),
        updatedAt: new Date().toISOString(),
      });
    }
  }
  return out;
}
