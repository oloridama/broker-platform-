import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/lib/api";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  Bot,
  Play,
  Pause,
  Square,
  Trash2,
  Plus,
  Loader2,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-hot-toast";

// ── Types ──────────────────────────────────────────────
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

interface UserBot {
  id: string;
  name: string;
  type: string;
  strategy: string;
  status: string;
  totalProfit: number;
  tradesCount: number;
  uptimeSeconds: number;
  riskLevel: string;
  allocation: number;
  lastRunAt: string | null;
  createdAt: string;
  _count?: { trades: number };
}

interface BotTrade {
  id: string;
  symbol: string;
  side: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  status: string;
  reason: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-profit/10 text-profit border-profit/30",
  PAUSED: "bg-amber-400/10 text-amber-400 border-amber-400/30",
  INACTIVE: "bg-broker-700 text-broker-300 border-broker-600",
};

function fmtMoney(n: number) {
  return (n >= 0 ? "+" : "") + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BotDashboardPage() {
  const queryClient = useQueryClient();
  const [templateIdx, setTemplateIdx] = useState<number>(0);
  const [allocation, setAllocation] = useState("1000");
  const [activeBotId, setActiveBotId] = useState<string | null>(null);

  const { data: templates, isLoading: tplLoading } = useQuery({
    queryKey: ["bot-templates"],
    queryFn: () => get<BotTemplate[]>("/bots/templates"),
    staleTime: 60_000,
  });

  const { data: bots, isLoading: botsLoading } = useQuery({
    queryKey: ["my-bots"],
    queryFn: () => get<UserBot[]>("/bots"),
    refetchInterval: 15000,
  });

  // ── Mutations ────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () => post("/bots", { templateIndex: templateIdx, allocation: parseFloat(allocation) }),
    onSuccess: () => {
      toast.success("Bot created! Activate it to start trading.");
      queryClient.invalidateQueries({ queryKey: ["my-bots"] });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to create bot"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => post(`/bots/${id}/toggle`, { action }),
    onSuccess: () => {
      toast.success("Bot updated");
      queryClient.invalidateQueries({ queryKey: ["my-bots"] });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed"),
  });

  const simulateMut = useMutation({
    mutationFn: (id: string) => post<{ botId: string }>(`/bots/${id}/simulate`),
    onSuccess: (res: { botId: string }) => {
      toast.success("Trade executed!");
      queryClient.invalidateQueries({ queryKey: ["my-bots"] });
      queryClient.invalidateQueries({ queryKey: ["bot-trades", res.botId] });
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      if (msg?.includes("No trade signal")) toast(msg, { icon: "📡" });
      else toast.error(msg || "Failed");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del(`/bots/${id}`),
    onSuccess: () => {
      toast.success("Bot deleted");
      queryClient.invalidateQueries({ queryKey: ["my-bots"] });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed"),
  });

  // ── Trade feed ───────────────────────────────────────
  const { data: trades } = useQuery({
    queryKey: ["bot-trades", activeBotId],
    queryFn: () => get<BotTrade[]>(`/bots/${activeBotId}/trades?limit=30`),
    enabled: !!activeBotId,
    refetchInterval: 10000,
  });

  const totalPnl = bots?.reduce((s, b) => s + Number(b.totalProfit), 0) ?? 0;
  const activeCount = bots?.filter((b) => b.status === "ACTIVE").length ?? 0;

  return (
    <ErrorBoundary>
      <div className="space-y-fluid-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-fluid-3xl font-bold text-white flex items-center gap-2">
              <Bot className="w-7 h-7 text-accent" /> Trading Bots
            </h1>
            <p className="text-fluid-sm text-broker-400 mt-1">
              Real MA+RSI signals (5-min EMA9/21 + RSI14) and strategy simulations, ticking every 5 minutes.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass p-4">
            <p className="text-fluid-xs text-broker-400">Total Bot P&L</p>
            <p className={`text-fluid-2xl font-bold font-mono ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
              ${fmtMoney(totalPnl)}
            </p>
          </div>
          <div className="glass p-4">
            <p className="text-fluid-xs text-broker-400">Active Bots</p>
            <p className="text-fluid-2xl font-bold text-white font-mono">{activeCount} / {bots?.length ?? 0}</p>
          </div>
          <div className="glass p-4">
            <p className="text-fluid-xs text-broker-400">Total Trades</p>
            <p className="text-fluid-2xl font-bold text-white font-mono">
              {bots?.reduce((s, b) => s + Number(b.tradesCount), 0) ?? 0}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-fluid-4">
          {/* Create panel */}
          <div className="glass p-5 space-y-4 h-fit">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent" /> Create New Bot
            </h3>

            {tplLoading ? (
              <div className="py-6 text-center"><Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" /></div>
            ) : (
              <>
                <div>
                  <label className="text-fluid-xs text-broker-400 block mb-1.5">Strategy Template</label>
                  <select
                    value={templateIdx}
                    onChange={(e) => setTemplateIdx(Number(e.target.value))}
                    className="input w-full"
                  >
                    {(templates || []).map((t, i) => (
                      <option key={t.strategy} value={i}>
                        {t.name} ({t.riskLevel} risk)
                      </option>
                    ))}
                  </select>
                  {templates?.[templateIdx] && (
                    <p className="text-fluid-xs text-broker-400 mt-1.5 leading-relaxed">
                      Pairs: {(templates[templateIdx].targetPairs || []).slice(0, 4).join(", ")}
                      {templates[templateIdx].strategy === "ma_rsi_crossover" && (
                        <span className="text-accent"> • LIVE signals (EMA9/21 + RSI14)</span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-fluid-xs text-broker-400 block mb-1.5">Allocation (USD)</label>
                  <input
                    type="number"
                    min={100}
                    max={1000000}
                    value={allocation}
                    onChange={(e) => setAllocation(e.target.value)}
                    className="input w-full"
                  />
                </div>

                <button
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending}
                  className="btn-primary w-full gap-2"
                >
                  {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Create Bot
                </button>
              </>
            )}
          </div>

          {/* Bot list */}
          <div className="lg:col-span-2 space-y-3">
            {botsLoading ? (
              <div className="glass p-8 text-center"><Loader2 className="w-7 h-7 animate-spin text-accent mx-auto" /></div>
            ) : !bots?.length ? (
              <div className="glass p-10 text-center text-broker-400">
                <Bot className="w-10 h-10 mx-auto mb-3 text-broker-500" />
                No bots yet. Create one from the panel to start automated trading.
              </div>
            ) : (
              bots.map((bot) => (
                <div key={bot.id} className="glass p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white">{bot.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${STATUS_STYLES[bot.status] || STATUS_STYLES.INACTIVE}`}>
                          {bot.status}
                        </span>
                        {bot.strategy === "ma_rsi_crossover" && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> LIVE MA+RSI
                          </span>
                        )}
                      </div>
                      <p className="text-fluid-xs text-broker-400 mt-1">
                        {bot.strategy.replace(/_/g, " ")} • ${Number(bot.allocation).toLocaleString()} alloc • {bot.tradesCount} trades
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-fluid-lg font-bold font-mono ${Number(bot.totalProfit) >= 0 ? "text-profit" : "text-loss"}`}>
                        ${fmtMoney(Number(bot.totalProfit))}
                      </p>
                      <p className="text-[10px] text-broker-400">total P&L</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-broker-700/50">
                    {bot.status !== "ACTIVE" ? (
                      <button onClick={() => toggleMut.mutate({ id: bot.id, action: "start" })} className="btn-secondary text-xs py-1.5 px-3 gap-1">
                        <Play className="w-3.5 h-3.5" /> Start
                      </button>
                    ) : (
                      <>
                        <button onClick={() => toggleMut.mutate({ id: bot.id, action: "pause" })} className="btn-secondary text-xs py-1.5 px-3 gap-1">
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </button>
                        <button onClick={() => toggleMut.mutate({ id: bot.id, action: "stop" })} className="btn-secondary text-xs py-1.5 px-3 gap-1 text-loss">
                          <Square className="w-3.5 h-3.5" /> Stop
                        </button>
                        <button
                          onClick={() => simulateMut.mutate(bot.id)}
                          disabled={simulateMut.isPending}
                          className="btn-secondary text-xs py-1.5 px-3 gap-1 text-accent"
                        >
                          {simulateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                          Run Trade Now
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setActiveBotId(activeBotId === bot.id ? null : bot.id)}
                      className={`btn-secondary text-xs py-1.5 px-3 gap-1 ${activeBotId === bot.id ? "text-accent" : ""}`}
                    >
                      <Activity className="w-3.5 h-3.5" /> {activeBotId === bot.id ? "Hide Trades" : "View Trades"}
                    </button>
                    {bot.status !== "ACTIVE" && (
                      <button onClick={() => deleteMut.mutate(bot.id)} className="btn-secondary text-xs py-1.5 px-3 gap-1 text-loss ml-auto">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>

                  {/* Trade feed */}
                  {activeBotId === bot.id && (
                    <div className="mt-3 pt-3 border-t border-broker-700/50">
                      <p className="text-fluid-xs text-broker-400 font-semibold mb-2 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-accent" /> Recent Trades
                      </p>
                      {!trades?.length ? (
                        <p className="text-fluid-xs text-broker-500 py-2">No trades yet — the scheduler ticks every 5 minutes.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-fluid-xs">
                            <thead>
                              <tr className="text-broker-400 border-b border-broker-700/50">
                                <th className="py-1.5 pr-2 font-medium">Symbol</th>
                                <th className="py-1.5 pr-2 font-medium">Side</th>
                                <th className="py-1.5 pr-2 font-medium">Entry</th>
                                <th className="py-1.5 pr-2 font-medium">Exit</th>
                                <th className="py-1.5 pr-2 font-medium">P&L</th>
                                <th className="py-1.5 font-medium">Reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trades.map((t) => (
                                <tr key={t.id} className="border-b border-broker-800">
                                  <td className="py-1.5 pr-2 font-mono text-broker-200">{t.symbol}</td>
                                  <td className="py-1.5 pr-2">
                                    <span className={`inline-flex items-center gap-0.5 ${t.side === "BUY" ? "text-profit" : "text-loss"}`}>
                                      {t.side === "BUY" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                      {t.side}
                                    </span>
                                  </td>
                                  <td className="py-1.5 pr-2 font-mono">{t.entryPrice.toFixed(4)}</td>
                                  <td className="py-1.5 pr-2 font-mono">{t.exitPrice?.toFixed(4)}</td>
                                  <td className={`py-1.5 pr-2 font-mono font-semibold ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                                    ${fmtMoney(t.pnl)}
                                  </td>
                                  <td className="py-1.5 text-broker-400 max-w-[220px] truncate" title={t.reason}>{t.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scheduler note */}
        <div className="flex items-center gap-2 text-fluid-xs text-broker-400 glass p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          The MA+RSI bot uses real 5-minute candles (EMA9/21 crossover + RSI14) from Binance.
          Other strategies run strategy-flavored simulations. All ACTIVE bots tick automatically every 5 minutes.
        </div>
      </div>
    </ErrorBoundary>
  );
}
