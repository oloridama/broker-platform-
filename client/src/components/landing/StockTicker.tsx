import { useEffect, useState } from "react";
import { useLivePrices } from "@/hooks/useLivePrices";

export function StockTicker() {
  const prices = useLivePrices(12000);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const doubled = [...prices, ...prices];

  return (
    <section className="border-y border-broker-700/50 bg-broker-800/30 overflow-hidden py-3" aria-label="Live market ticker">
      <div className={`flex gap-8 ${mounted ? "animate-ticker" : ""} whitespace-nowrap`}>
        {doubled.map((p, i) => (
          <div key={`${p.symbol}-${i}`} className="flex items-center gap-2 text-sm shrink-0">
            <span className="text-base" aria-hidden="true">{p.logo}</span>
            <span className="font-semibold text-white">{p.symbol}</span>
            <span className="font-mono text-broker-200">
              ${p.price < 1 ? p.price.toFixed(4) : p.price < 100 ? p.price.toFixed(2) : p.price.toLocaleString()}
            </span>
            <span className={`text-xs font-medium ${p.changePercent >= 0 ? "text-profit" : "text-loss"}`}>
              {p.changePercent >= 0 ? "+" : ""}{p.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
