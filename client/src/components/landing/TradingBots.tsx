import { Link } from "react-router-dom";
import { Zap, Activity, Radio } from "lucide-react";

const BOTS = [
  {
    id: "0001",
    name: "Perpetual Contract Execution Bot",
    pairs: ["BTCUSDT", "ETHUSDT", "BCHUSDT"],
    yield: "1.00% - 5.00%",
    risk: "Medium",
  },
  {
    id: "0002",
    name: "Spot Grid Trading Bot",
    pairs: ["SKRUSDT", "LABUSDT", "B3USDT", "UNIUSDT", "DOTUSDT"],
    yield: "0.50% - 2.50%",
    risk: "Low",
  },
  {
    id: "0003",
    name: "Futures Scalping Algorithm",
    pairs: ["ONGUSDT", "AIAUSDT", "ARCUSDT", "TRXUSDT"],
    yield: "2.00% - 8.00%",
    risk: "High",
  },
];

const EXCHANGES = ["Binance", "Bybit", "OKX", "KuCoin", "Bitget"];

const PAIRS = ["BTCUSDT", "ETHUSDT", "BCHUSDT", "XRPUSDT", "LTCUSDT", "TRXUSDT"];

export function TradingBots() {
  return (
    <section id="bots" className="border-y border-broker-700/50 bg-broker-800/20 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Automated Execution</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Our Best <span className="text-accent">Trading Bots</span>
          </h2>
          <p className="mt-4 text-lg text-broker-400 max-w-2xl mx-auto">
            Simple, powerful trading bots that work for you 24/7. Watch them trade across the most popular crypto and currency markets.
          </p>
        </div>

        {/* Exchange badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <span className="text-xs text-broker-400">CONNECTED TO 9+ GLOBAL VENUES</span>
          {EXCHANGES.map((ex) => (
            <span key={ex} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-broker-700/50 border border-broker-600/50 text-xs text-broker-200">
              <span className="w-2 h-2 rounded-full bg-accent" /> {ex} <span className="text-accent text-[10px]">ONLINE</span>
            </span>
          ))}
          <span className="text-xs text-accent">+15 MORE</span>
        </div>

        {/* Bot cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {BOTS.map((bot) => (
            <div key={bot.id} className="glass p-5 group hover:border-accent/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-accent font-mono">ID:{bot.id}</span>
                <span className="flex items-center gap-1 text-xs text-accent">
                  <Activity className="w-3 h-3" /> STATUS: OPTIMAL
                </span>
              </div>
              <h3 className="font-semibold text-white mb-2">{bot.name}</h3>
              <p className="text-xs text-broker-400 mb-2">TARGET PAIRS</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {bot.pairs.map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-accent/10 text-accent font-mono">{p}</span>
                ))}
                {bot.pairs.length > 3 && <span className="px-2 py-0.5 rounded text-[10px] bg-broker-700 text-broker-400 font-mono">+{bot.pairs.length - 3}</span>}
              </div>
              <div className="flex justify-between text-xs mb-3">
                <span className="text-broker-400">DAILY YIELD</span>
                <span className="text-accent font-mono">{bot.yield}</span>
              </div>
              <div className="flex justify-between text-xs mb-4">
                <span className="text-broker-400">RISK LEVEL</span>
                <span className={`${
                  bot.risk === "Low" ? "text-profit" : bot.risk === "Medium" ? "text-amber-400" : "text-loss"
                }`}>{bot.risk}</span>
              </div>
              <Link to="/register" className="btn-primary w-full text-xs py-2 gap-1">
                <Zap className="w-3 h-3" /> INITIALIZE BOT
              </Link>
            </div>
          ))}
        </div>

        {/* Live pairs */}
        <div className="glass p-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="w-4 h-4 text-accent" />
            <span className="text-sm text-white font-semibold">Top Markets</span>
            <span className="text-xs text-broker-400 ml-auto">MULTI-ASSET</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PAIRS.map((p) => (
              <span key={p} className="px-3 py-1.5 rounded bg-broker-800/50 border border-broker-700/30 text-xs font-mono text-white">
                {p} <span className="text-accent ml-1">LIVE</span>
              </span>
            ))}
            <span className="px-3 py-1.5 rounded text-xs text-broker-400">+244 MORE PAIRS ...</span>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link to="/trading-bots" className="btn-secondary text-sm gap-2">
            View All Bots →
          </Link>
        </div>
      </div>
    </section>
  );
}
