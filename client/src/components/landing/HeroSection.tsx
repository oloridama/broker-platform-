import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Star, Clock } from "lucide-react";

const ROTATING_WORDS = ["Stocks", "Forex", "Crypto", "Bonds", "ETFs", "Commodities"];

export function HeroSection() {
  const [wordIdx, setWordIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setWordIdx((i) => (i + 1) % ROTATING_WORDS.length), 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.06),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              The All-In-One Financial Ecosystem
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              <span className="text-white">One Platform.</span>{" "}
              <span className="inline-block text-accent min-w-[120px] text-left transition-all duration-500">
                {ROTATING_WORDS[wordIdx]}
                <span className="inline-block w-[2px] h-[1em] bg-accent ml-0.5 align-middle animate-pulse">|</span>
              </span>
            </h1>

            <p className="mt-6 text-lg text-broker-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
              From safe government bonds to high-leverage crypto futures. Master the markets
              with institutional-grade tools and securities.
            </p>

            {/* Stats row */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center lg:justify-start text-sm">
              {[
                { label: "Countries", value: "150+" },
                { label: "Volume", value: "$10B+" },
                { label: "Commission", value: "0%" },
                { label: "Support", value: "24/7" },
              ].map((s) => (
                <div key={s.label} className="text-center px-3">
                  <div className="font-bold text-white font-mono">{s.value}</div>
                  <div className="text-xs text-broker-400">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/register" className="btn-primary text-base px-8 py-3.5 gap-2 group">
                Start Investing
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/register" className="btn-secondary text-base px-8 py-3.5">
                Pro Terminal
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 justify-center lg:justify-start text-xs text-broker-400">
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-accent" /> SEC Verified</span>
              <span className="text-broker-600">|</span>
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" /> 4.8 Rating</span>
              <span className="text-broker-600">|</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-accent" /> 24/7 Support</span>
            </div>
          </div>

          {/* Hero visual */}
          <div className={`hidden lg:block ${mounted ? "animate-slide-in-right" : "opacity-0"}`}>
            <div className="glass p-4 space-y-3">
              {/* Terminal widget */}
              <div className="flex items-center gap-2 pb-2 border-b border-broker-700/50">
                <span className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-accent/60" />
                </span>
                <span className="text-[10px] text-broker-500 font-mono ml-2">TRADING TERMINAL — LIVE</span>
              </div>
              <div className="font-mono text-xs space-y-2 text-broker-300">
                <div className="flex justify-between">
                  <span className="text-broker-500">BTC/USDT</span>
                  <span className="text-white">65,174.30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-accent">▲ 24h Change</span>
                  <span className="text-profit">+2.25%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-broker-500">Volume (24h)</span>
                  <span className="text-white">$7.5B</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-broker-500">Session</span>
                  <span className="text-accent">CONNECTED</span>
                </div>
              </div>
              {/* Mini bars */}
              <div className="flex items-end gap-0.5 h-20">
                {[40, 55, 35, 70, 45, 60, 30, 80, 50, 65, 40, 75, 55, 85, 45, 70, 50, 90, 60, 78, 42, 68, 52, 82, 48]
                  .map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-accent/40" style={{ height: `${h}%` }} />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
