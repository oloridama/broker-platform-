import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { Zap, Activity, ArrowRight, Loader2 } from "lucide-react";

interface BotTemplate {
  name: string;
  type: string;
  strategy: string;
  dailyYieldMin: number;
  dailyYieldMax: number;
  riskLevel: string;
  targetPairs: string[];
  exchanges: string[];
}

const EXCHANGES = ["Binance", "Bybit", "OKX", "KuCoin", "Bitget"];

export default function TradingBotsPage() {
  const { data: bots, isLoading } = useQuery({
    queryKey: ["bot-templates"],
    queryFn: () => get<BotTemplate[]>("/bots/templates"),
    staleTime: 60_000,
  });
  return (
    <div className="min-h-screen bg-broker-900">
      <PublicNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Automated Execution</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Trading <span className="text-accent">Bots</span>
          </h1>
          <p className="mt-2 text-broker-400 max-w-2xl">
            Simple, powerful trading bots that work for you 24/7. Watch them trade across the most popular crypto, forex, and commodity markets with total transparency.
          </p>
        </div>

        {/* Exchange status bar */}
        <div className="glass p-4 mb-8 flex flex-wrap items-center gap-3">
          <span className="text-xs text-broker-400 font-semibold">CONNECTED TO 9+ GLOBAL VENUES</span>
          {EXCHANGES.map((ex) => (
            <span key={ex} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-broker-700/50 border border-broker-600/30 text-xs text-broker-200">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              {ex} <span className="text-accent text-[10px]">ONLINE</span>
            </span>
          ))}
          <span className="text-xs text-accent ml-auto">+15 MORE</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { value: "12,482", label: "Bots Active Today" },
            { value: "$847M", label: "Total Volume (24h)" },
            { value: "98.7%", label: "Uptime (30d)" },
            { value: "6", label: "Bot Strategies" },
          ].map((s) => (
            <div key={s.label} className="glass p-4 text-center">
              <div className="text-xl md:text-2xl font-bold text-white font-mono">{s.value}</div>
              <div className="text-xs text-broker-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bot cards */}
        {isLoading ? (
          <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(bots || []).map((bot, idx) => (
            <div key={bot.name} className="glass p-5 group hover:border-accent/30 transition-all duration-300">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-accent font-mono">ID:{String(idx + 1).padStart(4, "0")}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  bot.type === "CRYPTO" ? "bg-amber-400/10 text-amber-400" :
                  bot.type === "FOREX" ? "bg-blue-400/10 text-blue-400" :
                  "bg-purple-400/10 text-purple-400"
                }`}>{bot.type}</span>
              </div>

              <h3 className="font-semibold text-white mb-2">{bot.name}</h3>
              <p className="text-xs text-broker-400 leading-relaxed mb-4">
                Automated {bot.type.toLowerCase()} trading bot using {bot.strategy.replace(/_/g, " ")} strategy.
              </p>

              {/* Pairs */}
              <div className="mb-3">
                <p className="text-[10px] text-broker-500 uppercase mb-1.5">Target Pairs</p>
                <div className="flex flex-wrap gap-1">
                  {bot.targetPairs.slice(0, 4).map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-accent/10 text-accent font-mono">{p}</span>
                  ))}
                  {bot.targetPairs.length > 4 && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-broker-700 text-broker-400 font-mono">+{bot.targetPairs.length - 4}</span>
                  )}
                </div>
              </div>

              {/* Exchanges */}
              <div className="mb-3">
                <p className="text-[10px] text-broker-500 uppercase mb-1.5">Liquidity Venues</p>
                <div className="flex flex-wrap gap-1">
                  {bot.exchanges.slice(0, 4).map((ex) => (
                    <span key={ex} className="px-2 py-0.5 rounded text-[10px] bg-broker-700/50 text-broker-300">{ex}</span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-broker-700/50">
                <div>
                  <p className="text-[10px] text-broker-500">Daily Yield</p>
                  <p className="text-sm font-mono text-accent font-semibold">
                    {bot.dailyYieldMin.toFixed(2)}% – {bot.dailyYieldMax.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-broker-500">Risk Level</p>
                  <p className={`text-sm font-semibold ${
                    bot.riskLevel === "Low" ? "text-profit" : bot.riskLevel === "High" ? "text-loss" : "text-amber-400"
                  }`}>{bot.riskLevel}</p>
                </div>
              </div>

              {/* CTA */}
              <Link to="/register" className="btn-primary w-full text-xs py-2.5 gap-1 group">
                <Zap className="w-3.5 h-3.5" /> Initialize Bot
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <div className="glass inline-block p-6 md:p-8 max-w-lg">
            <h3 className="text-xl font-bold text-white mb-2">Ready to Start Bot Trading?</h3>
            <p className="text-sm text-broker-400 mb-4">Pick a bot, set your preferences, and start trading in under 2 minutes. No technical skills required.</p>
            <Link to="/register" className="btn-primary gap-2 group">
              Get Started <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="mt-3 text-xs text-broker-500 flex items-center justify-center gap-1">
              <Activity className="w-3 h-3 text-accent" /> 12,482 bots active right now
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
