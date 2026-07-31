import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "@/lib/api";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import toast from "react-hot-toast";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Plus,
  History,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────
interface WalletData {
  id: string;
  currency: string;
  balance: string;
  isDefault: boolean;
  _count: { transactions: number };
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  wallet: { currency: string };
}

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTxHistory, setShowTxHistory] = useState(false);
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: () => get<WalletData[]>("/wallets"),
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => get<Transaction[]>("/wallets/transactions"),
    enabled: showTxHistory,
  });

  const depositMutation = useMutation({
    mutationFn: (data: { walletId: string; amount: number }) =>
      post("/wallets/deposit", { ...data, currency: "USD" }),
    onSuccess: () => {
      toast.success("Deposit successful!");
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      setShowDeposit(false);
      setAmount("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Deposit failed";
      toast.error(msg);
    },
  });

  const withdrawReqMutation = useMutation({
    mutationFn: (data: { walletAddress: string; amount: number }) =>
      post("/admin/withdrawals/request", { ...data, currency: "USD" }),
    onSuccess: () => {
      toast.success("Withdrawal request submitted for admin approval!");
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      setShowWithdraw(false);
      setAmount("");
      setWalletAddress("");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Request failed";
      toast.error(msg);
    },
  });

  const { data: withdrawalRequests } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: () => get<{ id: string; walletAddress: string; amount: string; status: string; createdAt: string }[]>("/admin/withdrawals"),
  });

  const handleDeposit = () => {
    if (!selectedWallet || !amount) {
      toast.error("Select a wallet and enter an amount");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    depositMutation.mutate({ walletId: selectedWallet, amount: numAmount });
  };

  return (
    <ErrorBoundary>
      <div className="space-y-fluid-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-fluid-3xl font-bold text-white">Wallet</h1>
            <p className="text-fluid-sm text-broker-400 mt-1">Manage deposits and withdrawals</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTxHistory(!showTxHistory)} className="btn-secondary gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Transactions</span>
            </button>
            <button onClick={() => { setShowDeposit(true); setShowWithdraw(false); }} className="btn-primary gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Deposit</span>
            </button>
          </div>
        </div>

        {/* Wallet cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="glass p-5 animate-pulse">
                <div className="h-4 bg-broker-600 rounded w-16 mb-3" />
                <div className="h-8 bg-broker-600 rounded w-32" />
              </div>
            ))
          ) : wallets?.map((w) => (
            <div
              key={w.id}
              className={`glass p-5 cursor-pointer transition-all hover:border-accent/30 ${
                selectedWallet === w.id ? "border-accent ring-1 ring-accent/30" : ""
              }`}
              onClick={() => setSelectedWallet(w.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelectedWallet(w.id)}
              aria-pressed={selectedWallet === w.id}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-fluid-sm text-broker-400 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  {w.currency} Wallet
                </span>
                {w.isDefault && (
                  <span className="text-fluid-xs bg-accent/10 text-accent px-2 py-0.5 rounded">Default</span>
                )}
              </div>
              <p className="text-fluid-3xl font-bold text-white font-mono">
                ${Number(w.balance).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Deposit modal */}
        {showDeposit && (
          <div className="glass p-5 md:p-6 max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-fluid-lg font-semibold text-white flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-accent" /> Deposit
              </h3>
              <button onClick={() => setShowDeposit(false)} className="text-broker-400 hover:text-broker-200 min-w-[44px] min-h-[44px] flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Amount (USD)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  className="input"
                />
              </div>
              <button
                onClick={handleDeposit}
                disabled={depositMutation.isPending}
                className="btn-primary w-full"
              >
                {depositMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deposit Funds"}
              </button>
            </div>
          </div>
        )}

        {/* Withdraw modal */}
        {showWithdraw && (
          <div className="glass p-5 md:p-6 max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-fluid-lg font-semibold text-white flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5 text-amber-400" /> Withdraw
              </h3>
              <button onClick={() => setShowWithdraw(false)} className="text-broker-400 hover:text-broker-200 min-w-[44px] min-h-[44px] flex items-center justify-center">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Amount (USD)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50.00"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Wallet Address</label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x... or bc1..."
                  className="input"
                />
                <p className="text-[10px] text-broker-500 mt-1">Enter your crypto wallet address for the withdrawal. Subject to admin approval.</p>
              </div>
              <button
                onClick={() => {
                  if (!walletAddress) { toast.error("Enter a wallet address"); return; }
                  if (!amount) { toast.error("Enter an amount"); return; }
                  withdrawReqMutation.mutate({ walletAddress, amount: parseFloat(amount) });
                }}
                disabled={withdrawReqMutation.isPending}
                className="btn-danger w-full"
              >
                {withdrawReqMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Withdrawal Request"}
              </button>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        {showTxHistory && (
          <div className="glass overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-broker-700/50">
              <h3 className="text-fluid-lg font-semibold text-white">Transaction History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-fluid-sm">
                <thead>
                  <tr className="border-b border-broker-700/50 text-broker-400">
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                    <th className="text-right px-4 py-3 font-medium">Status</th>
                    <th className="text-right px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions?.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-broker-400">No transactions yet</td></tr>
                  ) : transactions?.map((tx) => (
                    <tr key={tx.id} className="border-b border-broker-700/30 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 ${
                          tx.type === "DEPOSIT" ? "text-profit" : "text-loss"
                        }`}>
                          {tx.type === "DEPOSIT" ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 font-mono text-white">
                        {tx.type === "DEPOSIT" ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-fluid-xs ${
                          tx.status === "COMPLETED" ? "bg-accent/10 text-accent" :
                          tx.status === "PENDING" ? "bg-amber-500/10 text-amber-400" :
                          "bg-danger/10 text-danger"
                        }`}>{tx.status}</span>
                      </td>
                      <td className="text-right px-4 py-3 text-broker-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Withdrawal Requests */}
        {withdrawalRequests && withdrawalRequests.length > 0 && (
          <div className="glass overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-broker-700/50">
              <h3 className="text-fluid-lg font-semibold text-white">Withdrawal Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-fluid-sm">
                <thead>
                  <tr className="border-b border-broker-700/50 text-broker-400">
                    <th className="text-left px-4 py-3">Address</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-right px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalRequests.map((wr) => (
                    <tr key={wr.id} className="border-b border-broker-700/30">
                      <td className="px-4 py-3 font-mono text-xs text-broker-300">{wr.walletAddress.slice(0, 14)}...</td>
                      <td className="text-right px-4 py-3 font-mono text-white">${Number(wr.amount).toFixed(2)}</td>
                      <td className="text-right px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${wr.status === "APPROVED" ? "bg-accent/10 text-accent" : wr.status === "PENDING" ? "bg-amber-500/10 text-amber-400" : "bg-danger/10 text-danger"}`}>
                          {wr.status}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-xs text-broker-400">{new Date(wr.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
