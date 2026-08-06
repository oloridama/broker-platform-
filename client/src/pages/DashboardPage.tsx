import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────
interface Quote {
  id: string;
  bid: string;
  ask: string;
  high: string;
  low: string;
  change: string;
  instrument: { symbol: string; name: string; type: string; spread: string };
}

interface Account {
  id: string;
  accountType: string;
  balance: string;
  equity: string;
  currency: string;
  leverage: number;
  _count: { orders: number; positions: number };
}

// ── Mock chart data ────────────────────────────────────
const chartData = Array.from({ length: 30 }, (_, i) => ({
  time: `${i}:00`,
  equity: 10000 + Math.sin(i * 0.5) * 500 + i * 30 + Math.random() * 200,
  balance: 10000 + i * 30,
}));

function StatCard({
  label,
  value,
  change,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  positive?: boolean;
}) {
  return (
    <div className="glass p-4 md:p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-fluid-xs text-broker-400 mb-1">{label}</p>
          <p className="text-fluid-2xl font-bold text-white font-mono">{value}</p>
          {change && (
            <p className={`text-fluid-xs mt-1 flex items-center gap-1 ${positive ? "text-profit" : "text-loss"}`}>
              {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {change}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${positive !== false ? "bg-accent/10" : "bg-danger/10"}`}>
          <Icon className={`w-5 h-5 ${positive !== false ? "text-accent" : "text-danger"}`} />
        </div>
      </div>
    </div>
  );
}

function MarketTicker() {
  // Live prices via WebSocket (no HTTP polling → no rate-limit pressure)
  const live = useLiveQuotes();
  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => get<Quote[]>("/trading/quotes"),
    staleTime: 60_000,
  });

  const liveCount = Object.keys(live).length;

  if (isLoading && liveCount === 0) {
    return (
      <div className="glass p-3 overflow-hidden">
        <div className="flex gap-8 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-16 h-3 bg-broker-600 rounded" />
              <div className="w-20 h-3 bg-broker-600 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Merge: prefer live WS prices, fall back to fetched quotes
  const ticker = (quotes || []).map((q) => {
    const sym = q.instrument.symbol;
    const liveQuote = live[sym];
    return {
      id: q.id,
      symbol: sym,
      bid: liveQuote ? liveQuote.price : Number(q.bid),
      change: liveQuote ? liveQuote.change : Number(q.change),
    };
  });

  return (
    <div className="glass p-3 overflow-hidden">
      <div className="flex gap-8 animate-ticker whitespace-nowrap">
        {ticker.concat(ticker).map((q, i) => (
          <div key={`${q.id}-${i}`} className="flex items-center gap-2 text-fluid-sm">
            <span className="font-semibold text-white">{q.symbol}</span>
            <span className="font-mono text-broker-200">{Number(q.bid).toFixed(4)}</span>
            <span className={Number(q.change) >= 0 ? "text-profit" : "text-loss"}>
              {Number(q.change) >= 0 ? "+" : ""}{Number(q.change).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: accounts, isLoading: accLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => get<Account[]>("/trading/accounts"),
  });

  const totalBalance = accounts?.reduce((sum, a) => sum + Number(a.balance), 0) ?? 0;
  const totalEquity = accounts?.reduce((sum, a) => sum + Number(a.equity), 0) ?? 0;

  return (
    <ErrorBoundary>
      <div className="space-y-fluid-4">
        {/* Page header */}
        <div>
          <h1 className="text-fluid-3xl font-bold text-white">Dashboard</h1>
          <p className="text-fluid-sm text-broker-400 mt-1">Overview of your trading portfolio</p>
        </div>

        {/* Ticker tape */}
        <MarketTicker />

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Balance"
            value={`$${totalBalance.toLocaleString()}`}
            icon={Wallet}
          />
          <StatCard
            label="Total Equity"
            value={`$${totalEquity.toLocaleString()}`}
            change={`+${((totalEquity - totalBalance) / totalBalance * 100).toFixed(2)}%`}
            icon={BarChart3}
            positive
          />
          <StatCard
            label="Open Positions"
            value={accounts?.reduce((sum, a) => sum + a._count.positions, 0).toString() ?? "0"}
            icon={Activity}
          />
          <StatCard
            label="Today's P&L"
            value="+$342.50"
            change="+3.42%"
            icon={TrendingUp}
            positive
          />
        </div>

        {/* Chart */}
        <div className="glass p-5">
          <h3 className="text-fluid-lg font-semibold text-white mb-4">Equity Curve</h3>
          <div className="h-[280px] md:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: "#7485a8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7485a8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #243049",
                    borderRadius: "8px",
                    color: "#d1d8e3",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#7485a8"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Accounts table */}
        <div className="glass overflow-hidden">
          <div className="p-5 border-b border-broker-700/50">
            <h3 className="text-fluid-lg font-semibold text-white">Your Accounts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-fluid-sm" role="table">
              <thead>
                <tr className="border-b border-broker-700/50 text-broker-400">
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-right px-5 py-3 font-medium">Balance</th>
                  <th className="text-right px-5 py-3 font-medium">Equity</th>
                  <th className="text-right px-5 py-3 font-medium">Leverage</th>
                  <th className="text-right px-5 py-3 font-medium">Positions</th>
                </tr>
              </thead>
              <tbody>
                {accLoading ? (
                  Array.from({ length: 2 }, (_, i) => (
                    <tr key={i} className="border-b border-broker-700/30 animate-pulse">
                      {Array.from({ length: 5 }, (_, j) => (
                        <td key={j} className="px-5 py-3"><div className="h-4 bg-broker-600 rounded w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : accounts?.map((acc) => (
                  <tr key={acc.id} className="border-b border-broker-700/30 hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-fluid-xs font-medium ${
                        acc.accountType === "VIP" ? "bg-amber-500/10 text-amber-400" :
                        acc.accountType === "PRO" ? "bg-blue-500/10 text-blue-400" :
                        acc.accountType === "DEMO" ? "bg-purple-500/10 text-purple-400" :
                        "bg-broker-600 text-broker-300"
                      }`}>
                        {acc.accountType}
                      </span>
                    </td>
                    <td className="text-right px-5 py-3 font-mono text-white">
                      ${Number(acc.balance).toLocaleString()}
                    </td>
                    <td className="text-right px-5 py-3 font-mono text-white">
                      ${Number(acc.equity).toLocaleString()}
                    </td>
                    <td className="text-right px-5 py-3 text-broker-300">1:{acc.leverage}</td>
                    <td className="text-right px-5 py-3 text-broker-300">{acc._count.positions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
