import { Link } from "react-router-dom";
import { Shield, Clock, TrendingUp } from "lucide-react";

const PORTFOLIOS = [
  { name: "High-Yield SavingsPlus", roi: "3.50%", period: "30 Days", type: "CONSERVATIVE", returnType: "Daily", min: "£50", desc: "Enhanced savings with better rates than traditional banks." },
  { name: "Bitcoin Accumulator", roi: "5.50%", period: "18 Months", type: "GROWTH", returnType: "Monthly", min: "£100", desc: "Strategic Bitcoin accumulation with diversified entry points." },
  { name: "Overnight Liquidity Pool", roi: "2.50%", period: "24 Hours", type: "CONSERVATIVE", returnType: "Hourly", min: "£100", desc: "Short-term liquidity channels producing steady hourly earnings." },
  { name: "Emerging Markets", roi: "15.00%", period: "4 Years", type: "GROWTH", returnType: "Weekly", min: "£200", desc: "High-growth economies in developing nations." },
  { name: "Metaverse Index Fund", roi: "18.00%", period: "2 Years", type: "GROWTH", returnType: "Weekly", min: "£250", desc: "Basket of top metaverse and gaming tokens." },
  { name: "GameFi Development", roi: "16.50%", period: "24 Months", type: "GROWTH", returnType: "Monthly", min: "£250", desc: "Supporting blockchain-based game development." },
];

export function ManagedPortfolios() {
  return (
    <section className="border-y border-broker-700/50 bg-broker-800/20 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Institutional Portfolios</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Managed <span className="text-accent">Intelligence</span>
          </h2>
          <p className="mt-4 text-lg text-broker-400 max-w-2xl mx-auto">
            Access professionally managed investment strategies. We handle the complexity, you secure the returns.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PORTFOLIOS.map((p) => (
            <div key={p.name} className="glass p-5 group hover:border-accent/30 transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  p.type === "CONSERVATIVE" ? "bg-blue-400/10 text-blue-400" : "bg-accent/10 text-accent"
                }`}>
                  {p.type}
                </span>
                <span className="text-xs text-broker-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> SEC v4.2
                </span>
              </div>
              <h3 className="font-semibold text-white mb-2">{p.name}</h3>
              <div className="text-2xl font-bold text-accent font-mono mb-1">{p.roi}</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-broker-400 mb-3">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.period}</span>
                <span>Return: {p.returnType}</span>
                <span>Min: {p.min}</span>
              </div>
              <p className="text-xs text-broker-400 mb-3 leading-relaxed">{p.desc}</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs text-accent">
                  <TrendingUp className="w-3 h-3" /> Strategy Active
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/register" className="btn-primary text-sm gap-2">
            Explore All Portfolios →
          </Link>
        </div>
      </div>
    </section>
  );
}
