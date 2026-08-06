import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { useLivePrices } from "@/hooks/useLivePrices";
import { ArrowUpRight, ArrowDownRight, Radio, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function MarketsPage() {
  const prices = useLivePrices(10000);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = prices.filter((p) => {
    const matchSearch = p.symbol.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ||
      (filter === "crypto" && (p.symbol.includes("BTC") || p.symbol.includes("ETH") || p.symbol.includes("SOL"))) ||
      (filter === "forex" && (p.symbol.includes("EUR") || p.symbol.includes("GBP") || p.symbol.includes("XAU"))) ||
      (filter === "stocks" && ["AAPL", "NVDA", "TSLA", "MSFT", "GOOGL", "AMZN"].includes(p.symbol));
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-broker-900">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Live Markets</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Global <span className="text-accent">Price Feed</span></h1>
          <p className="mt-2 text-broker-400">Real-time prices from Binance and global exchanges. Updates every 10 seconds.</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-broker-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol..."
              className="input pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "crypto", "forex", "stocks"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                  filter === f ? "bg-accent text-white" : "bg-broker-800 text-broker-300 hover:bg-broker-700"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 mb-4 text-xs text-accent">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>Live • {prices.length} instruments</span>
        </div>

        {/* Price grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <Link
              key={p.symbol}
              to="/register"
              className="glass p-4 hover:border-accent/30 transition-all group hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{p.logo}</span>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${
                  p.changePercent >= 0 ? "text-profit" : "text-loss"
                }`}>
                  {p.changePercent >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {p.changePercent >= 0 ? "+" : ""}{p.changePercent.toFixed(2)}%
                </span>
              </div>
              <p className="font-semibold text-white text-sm">{p.symbol}</p>
              <p className="text-xs text-broker-400 mb-1">{p.name}</p>
              <p className="font-mono text-lg font-bold text-white">
                ${p.price < 1 ? p.price.toFixed(4) : p.price < 100 ? p.price.toFixed(2) : p.price.toLocaleString()}
              </p>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-broker-400">
            No instruments match your search.
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
