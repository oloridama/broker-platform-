import { Link } from "react-router-dom";
import { TrendingUp, Banknote, Globe, BarChart3, Shield, Layers, Zap, Coins } from "lucide-react";

const PLANS = [
  { icon: Banknote, title: "Fixed Return Investment", desc: "Guaranteed Returns, Institutional Stability. Diverse portfolio allocation with automated monthly yields.", color: "border-blue-400/30 bg-blue-400/5", href: "/register" },
  { icon: Coins, title: "Crypto Trading", desc: "Next-Gen Perpetual Futures. Up to 100x leverage with professional charting tools and ultra-fast execution.", color: "border-amber-400/30 bg-amber-400/5", href: "/register" },
  { icon: Globe, title: "Forex Trading", desc: "The Global Currency Hub. Raw spreads from 0.0 pips across 50+ currency pairs.", color: "border-green-400/30 bg-green-400/5", href: "/register" },
  { icon: TrendingUp, title: "Global Stocks", desc: "Own the World's Leaders. Fractional shares in Apple, Tesla, Amazon with instant settlement.", color: "border-purple-400/30 bg-purple-400/5", href: "/register" },
  { icon: Shield, title: "Sovereign Bonds", desc: "Safe Haven Assets. Government and corporate debt securities for wealth preservation.", color: "border-yellow-400/30 bg-yellow-400/5", href: "/register" },
  { icon: Layers, title: "Diversified ETFs", desc: "The Power of Indexation. Technology, Energy, & Finance ETFs with automatic rebalancing.", color: "border-red-400/30 bg-red-400/5", href: "/register" },
  { icon: Zap, title: "Margin Trading", desc: "Amplify Your Potential. Cross and Isolated margin with flexible liquidation buffers.", color: "border-cyan-400/30 bg-cyan-400/5", href: "/register" },
  { icon: BarChart3, title: "Hard Commodities", desc: "Tangible Wealth. Gold, Silver, Crude Oil — protect against inflation with global resources.", color: "border-orange-400/30 bg-orange-400/5", href: "/register" },
];

export function InvestmentPlans() {
  return (
    <section id="plans" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center mb-12">
        <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Investment Ecosystem</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Diversify Across <span className="text-accent">Every Asset</span>
        </h2>
        <p className="mt-4 text-lg text-broker-400 max-w-2xl mx-auto">
          From high-yield corporate bonds to the world's most liquid stocks and crypto assets. Build your ultimate portfolio.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(({ icon: Icon, title, desc, color, href }) => (
          <Link
            key={title}
            to={href}
            className={`glass p-5 border ${color} group hover:-translate-y-1 transition-all duration-300`}
          >
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
              <Icon className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1.5">{title}</h3>
            <p className="text-xs text-broker-400 leading-relaxed">{desc}</p>
            <span className="inline-block mt-3 text-xs text-accent font-medium group-hover:underline">
              Start Trading →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
