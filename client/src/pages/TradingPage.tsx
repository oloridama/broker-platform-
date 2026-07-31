import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import toast from "react-hot-toast";
import { TrendingUp, TrendingDown, X, Plus, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────
interface Instrument {
  id: string;
  symbol: string;
  name: string;
  type: string;
  spread: string;
  quotes: { bid: string; ask: string }[];
}

interface Order {
  id: string;
  type: string;
  side: string;
  lotSize: string;
  price: string;
  stopLoss: string | null;
  takeProfit: string | null;
  status: string;
  profit: string;
  createdAt: string;
  instrument: { symbol: string; name: string; type: string };
}

interface Position {
  id: string;
  side: string;
  lotSize: string;
  openPrice: string;
  currentPrice: string;
  profit: string;
  isOpen: boolean;
  instrument: { symbol: string; name: string; type: string };
  account: { accountType: string; leverage: number };
}

interface Account {
  id: string;
  accountType: string;
  balance: string;
}

export default function TradingPage() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<"positions" | "orders" | "new">("positions");
  const [orderForm, setOrderForm] = useState({
    accountId: "",
    instrumentId: "",
    type: "MARKET",
    side: "BUY",
    lotSize: 0.01,
    price: "",
    stopLoss: "",
    takeProfit: "",
  });

  const { data: instruments } = useQuery({
    queryKey: ["instruments"],
    queryFn: () => get<Instrument[]>("/trading/instruments"),
  });

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => get<Account[]>("/trading/accounts"),
  });

  const { data: positions, isLoading: posLoading } = useQuery({
    queryKey: ["positions"],
    queryFn: () => get<Position[]>("/trading/positions"),
    refetchInterval: 5000,
  });

  const { data: orders, isLoading: ordLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => get<Order[]>("/trading/orders"),
    refetchInterval: 10000,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: typeof orderForm) => {
      const payload = {
        ...data,
        price: data.price ? parseFloat(data.price) : undefined,
        stopLoss: data.stopLoss ? parseFloat(data.stopLoss) : undefined,
        takeProfit: data.takeProfit ? parseFloat(data.takeProfit) : undefined,
        lotSize: data.lotSize,
      };
      return post("/trading/orders", payload);
    },
    onSuccess: () => {
      toast.success("Order placed!");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      setOrderForm((f) => ({ ...f, price: "", stopLoss: "", takeProfit: "" }));
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to place order";
      toast.error(msg);
    },
  });

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.accountId || !orderForm.instrumentId) {
      toast.error("Select an account and instrument");
      return;
    }
    createOrderMutation.mutate(orderForm);
  };

  const tabs = [
    { key: "positions" as const, label: "Positions" },
    { key: "orders" as const, label: "Orders" },
    { key: "new" as const, label: "New Order" },
  ];

  return (
    <ErrorBoundary>
      <div className="space-y-fluid-4">
        <div>
          <h1 className="text-fluid-3xl font-bold text-white">Trading</h1>
          <p className="text-fluid-sm text-broker-400 mt-1">Manage your trades and positions</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 glass p-1 rounded-lg w-fit" role="tablist">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={selectedTab === key}
              onClick={() => setSelectedTab(key)}
              className={`px-4 py-2 rounded-md text-fluid-sm font-medium transition-all min-h-[40px] ${
                selectedTab === key
                  ? "bg-accent text-white shadow"
                  : "text-broker-400 hover:text-broker-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Positions tab */}
        {selectedTab === "positions" && (
          <div className="glass overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-fluid-sm">
                <thead>
                  <tr className="border-b border-broker-700/50 text-broker-400">
                    <th className="text-left px-4 py-3 font-medium">Symbol</th>
                    <th className="text-right px-4 py-3 font-medium">Side</th>
                    <th className="text-right px-4 py-3 font-medium">Size</th>
                    <th className="text-right px-4 py-3 font-medium">Open</th>
                    <th className="text-right px-4 py-3 font-medium">Current</th>
                    <th className="text-right px-4 py-3 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {posLoading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-broker-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                  ) : positions?.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-broker-400">No open positions</td></tr>
                  ) : positions?.map((p) => (
                    <tr key={p.id} className="border-b border-broker-700/30 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white">{p.instrument.symbol}</span>
                        <span className="text-broker-500 ml-2 text-fluid-xs">{p.instrument.name}</span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className={`inline-flex items-center gap-1 ${p.side === "BUY" ? "text-profit" : "text-loss"}`}>
                          {p.side === "BUY" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {p.side}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 font-mono text-white">{p.lotSize}</td>
                      <td className="text-right px-4 py-3 font-mono text-broker-300">{Number(p.openPrice).toFixed(5)}</td>
                      <td className="text-right px-4 py-3 font-mono text-white">{Number(p.currentPrice).toFixed(5)}</td>
                      <td className={`text-right px-4 py-3 font-mono font-medium ${Number(p.profit) >= 0 ? "text-profit" : "text-loss"}`}>
                        ${Number(p.profit).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders tab */}
        {selectedTab === "orders" && (
          <div className="glass overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-fluid-sm">
                <thead>
                  <tr className="border-b border-broker-700/50 text-broker-400">
                    <th className="text-left px-4 py-3 font-medium">Symbol</th>
                    <th className="text-right px-4 py-3 font-medium">Type</th>
                    <th className="text-right px-4 py-3 font-medium">Side</th>
                    <th className="text-right px-4 py-3 font-medium">Size</th>
                    <th className="text-right px-4 py-3 font-medium">Price</th>
                    <th className="text-right px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ordLoading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-broker-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                  ) : orders?.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-broker-400">No orders yet</td></tr>
                  ) : orders?.map((o) => (
                    <tr key={o.id} className="border-b border-broker-700/30 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{o.instrument.symbol}</td>
                      <td className="text-right px-4 py-3 text-broker-300">{o.type}</td>
                      <td className="text-right px-4 py-3">
                        <span className={o.side === "BUY" ? "text-profit" : "text-loss"}>{o.side}</span>
                      </td>
                      <td className="text-right px-4 py-3 font-mono text-white">{o.lotSize}</td>
                      <td className="text-right px-4 py-3 font-mono text-broker-300">{o.price ? `$${Number(o.price).toFixed(5)}` : "—"}</td>
                      <td className="text-right px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-fluid-xs font-medium ${
                          o.status === "EXECUTED" ? "bg-accent/10 text-accent" :
                          o.status === "PENDING" ? "bg-amber-500/10 text-amber-400" :
                          o.status === "CANCELLED" ? "bg-broker-600 text-broker-400" :
                          "bg-danger/10 text-danger"
                        }`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* New Order tab */}
        {selectedTab === "new" && (
          <form onSubmit={handlePlaceOrder} className="glass p-5 md:p-6 animate-fade-in max-w-xl space-y-4">
            <h3 className="text-fluid-lg font-semibold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-accent" /> New Order
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Account</label>
                <select
                  value={orderForm.accountId}
                  onChange={(e) => setOrderForm((f) => ({ ...f, accountId: e.target.value }))}
                  className="input"
                >
                  <option value="">Select account</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id}>{a.accountType} (${Number(a.balance).toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Instrument</label>
                <select
                  value={orderForm.instrumentId}
                  onChange={(e) => setOrderForm((f) => ({ ...f, instrumentId: e.target.value }))}
                  className="input"
                >
                  <option value="">Select instrument</option>
                  {instruments?.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.symbol} — {inst.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Type</label>
                <select value={orderForm.type} onChange={(e) => setOrderForm((f) => ({ ...f, type: e.target.value }))} className="input">
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                  <option value="STOP">Stop</option>
                </select>
              </div>
              <div>
                <label className="label">Side</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderForm((f) => ({ ...f, side: "BUY" }))}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                      orderForm.side === "BUY" ? "bg-profit text-white" : "bg-broker-800 text-broker-400"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-1" /> Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderForm((f) => ({ ...f, side: "SELL" }))}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                      orderForm.side === "SELL" ? "bg-loss text-white" : "bg-broker-800 text-broker-400"
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 inline mr-1" /> Sell
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Lot Size</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={orderForm.lotSize}
                  onChange={(e) => setOrderForm((f) => ({ ...f, lotSize: parseFloat(e.target.value) || 0.01 }))}
                  className="input"
                />
              </div>
              {orderForm.type !== "MARKET" && (
                <div>
                  <label className="label">Price</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={orderForm.price}
                    onChange={(e) => setOrderForm((f) => ({ ...f, price: e.target.value }))}
                    className="input"
                    placeholder="0.00000"
                  />
                </div>
              )}
              <div>
                <label className="label">Stop Loss</label>
                <input
                  type="number"
                  step="0.00001"
                  value={orderForm.stopLoss}
                  onChange={(e) => setOrderForm((f) => ({ ...f, stopLoss: e.target.value }))}
                  className="input"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="label">Take Profit</label>
                <input
                  type="number"
                  step="0.00001"
                  value={orderForm.takeProfit}
                  onChange={(e) => setOrderForm((f) => ({ ...f, takeProfit: e.target.value }))}
                  className="input"
                  placeholder="Optional"
                />
              </div>
            </div>

            <button type="submit" disabled={createOrderMutation.isPending} className="btn-primary w-full">
              {createOrderMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order...</>
              ) : (
                "Place Order"
              )}
            </button>
          </form>
        )}
      </div>
    </ErrorBoundary>
  );
}
