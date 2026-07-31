import { useState } from "react";
import { Calculator, TrendingUp, Shield, ArrowRight } from "lucide-react";

const STRATEGIES = [
  { name: "High-Yield SavingsPlus", roi: 3.50, min: 50, max: 20000 },
  { name: "Bitcoin Accumulator", roi: 5.50, min: 100, max: 50000 },
  { name: "Overnight Liquidity Pool", roi: 2.50, min: 100, max: 10000 },
  { name: "Emerging Markets", roi: 15.00, min: 200, max: 100000 },
  { name: "Metaverse Index Fund", roi: 18.00, min: 250, max: 50000 },
];

export function RoiCalculator() {
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [amount, setAmount] = useState(50);
  const selected = STRATEGIES.find((s) => s.name === strategy.name) || STRATEGIES[0];

  const profit = (amount * selected.roi) / 100;
  const total = amount + profit;

  return (
    <section id="calculator" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center mb-12">
        <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Precision Forecasting</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Project Your <span className="text-accent">Financial Growth</span>
        </h2>
        <p className="mt-4 text-lg text-broker-400 max-w-2xl mx-auto">
          Calculate your potential earnings in seconds. Select a strategy and visualize your institutional-grade returns.
        </p>
      </div>

      <div className="glass max-w-lg mx-auto p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-5 h-5 text-accent" />
          <span className="text-white font-semibold">ROI Simulator</span>
        </div>

        {/* Strategy selector */}
        <div className="mb-5">
          <label className="label">Select Strategy</label>
          <select
            value={strategy.name}
            onChange={(e) => {
              const s = STRATEGIES.find((x) => x.name === e.target.value);
              if (s) { setStrategy(s); setAmount(s.min); }
            }}
            className="input"
          >
            {STRATEGIES.map((s) => (
              <option key={s.name} value={s.name}>{s.name} ({s.roi}%)</option>
            ))}
          </select>
        </div>

        {/* Amount slider */}
        <div className="mb-6">
          <label className="label flex justify-between">
            <span>Investment Amount</span>
            <span className="text-broker-400 text-xs">Min: £{selected.min} • Max: £{selected.max.toLocaleString()}</span>
          </label>
          <input
            type="range"
            min={selected.min}
            max={selected.max}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-broker-700 accent-accent"
          />
          <div className="text-center mt-2">
            <span className="text-2xl font-bold text-white font-mono">£ {amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-broker-800/50 rounded-lg p-4 text-center">
            <p className="text-xs text-broker-400 mb-1">Total Profit</p>
            <p className="text-xl font-bold text-accent font-mono">£{profit.toFixed(2)}</p>
          </div>
          <div className="bg-broker-800/50 rounded-lg p-4 text-center">
            <p className="text-xs text-broker-400 mb-1">Net Payout</p>
            <p className="text-xl font-bold text-white font-mono">£{total.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-broker-400 mb-4">
          <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-accent" /> Compound Optimized</div>
          <div className="flex items-center gap-1"><Shield className="w-3 h-3 text-accent" /> Capital Security</div>
        </div>

        <button className="btn-primary w-full gap-2 group">
          Commit to Strategy
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  );
}
