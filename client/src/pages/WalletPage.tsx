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

interface DepositMethod {
  id: string;
  type: string;
  name: string;
  description: string | null;
  minAmount: number;
  maxAmount: number;
  config: {
    custodianAddress?: string;
    network?: string;
    instructions?: string;
    bankName?: string;
    iban?: string;
    swift?: string;
  };
}

interface PendingDeposit {
  id: string;
  amount: number;
  currency: string;
  status: string;
  custodianAddress?: string;
  txHash?: string | null;
  createdAt: string;
  method: { name: string; type: string };
}

interface DepositResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
  custodianAddress: string;
  network?: string;
  instructions?: string;
  createdAt: string;
}

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTxHistory, setShowTxHistory] = useState(false);
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(null);
  const [createdDeposit, setCreatedDeposit] = useState<DepositResponse | null>(null);

  const { data: wallets, isLoading } = useQuery({
    queryKey: ["wallets"],
    queryFn: () => get<WalletData[]>("/wallets"),
  });

  const { data: depositMethods } = useQuery({
    queryKey: ["deposit-methods"],
    queryFn: () => get<DepositMethod[]>("/deposits/methods"),
  });

  const { data: pendingDeposits } = useQuery({
    queryKey: ["pending-deposits"],
    queryFn: () => get<PendingDeposit[]>("/deposits/history"),
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => get<Transaction[]>("/wallets/transactions"),
    enabled: showTxHistory,
  });

  const createDepositMutation = useMutation({
    mutationFn: (data: { methodId: string; amount: number; currency: string }) =>
      post<DepositResponse>("/deposits", data),
    onSuccess: (data) => {
      setCreatedDeposit(data);
      queryClient.invalidateQueries({ queryKey: ["pending-deposits"] });
      toast.success("Deposit request created! Send funds to the address shown.");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to create deposit";
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

  const handleCreateDeposit = () => {
    if (!selectedMethod) { toast.error("Select a deposit method"); return; }
    if (!amount) { toast.error("Enter an amount"); return; }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) { toast.error("Enter a valid amount"); return; }
    if (numAmount < selectedMethod.minAmount) { toast.error(`Minimum deposit is $${selectedMethod.minAmount}`); return; }
    if (numAmount > selectedMethod.maxAmount) { toast.error(`Maximum deposit is $${selectedMethod.maxAmount.toLocaleString()}`); return; }
    createDepositMutation.mutate({ methodId: selectedMethod.id, amount: numAmount, currency: "USD" });
  };

  const openDeposit = () => {
    setShowDeposit(true);
    setShowWithdraw(false);
    setSelectedMethod(null);
    setCreatedDeposit(null);
    setAmount("");
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
            <button onClick={openDeposit} className="btn-primary gap-2">
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

        {/* Deposit modal — method selection + custodian address */}
        {showDeposit && (
          <div className="glass p-5 md:p-6 max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-fluid-lg font-semibold text-white flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-accent" /> Deposit Funds
              </h3>
              <button onClick={() => setShowDeposit(false)} className="text-broker-400 hover:text-broker-200 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
            </div>

            {createdDeposit ? (
              /* Step 3: Show custodian address to send funds to */
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-xs text-accent font-semibold mb-1">⚠️ SEND FUNDS TO THIS ADDRESS</p>
                  <p className="text-sm font-mono text-white break-all bg-broker-900/50 p-3 rounded border border-broker-700/50">
                    {createdDeposit.custodianAddress}
                  </p>
                  <div className="flex justify-between mt-3 text-xs text-broker-300">
                    <span>Amount: <span className="text-white font-mono">${createdDeposit.amount.toFixed(2)}</span></span>
                    {createdDeposit.network && <span className="text-broker-400">{createdDeposit.network}</span>}
                  </div>
                </div>
                {createdDeposit.instructions && (
                  <p className="text-xs text-broker-400">{createdDeposit.instructions}</p>
                )}
                <p className="text-xs text-broker-400">
                  Status: <span className="text-amber-400 font-medium">PENDING ADMIN APPROVAL</span> — funds credited once confirmed.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCreatedDeposit(null); setSelectedMethod(null); setAmount(""); }}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Make Another Deposit
                  </button>
                  <button onClick={() => setShowDeposit(false)} className="btn-primary flex-1 text-sm">Done</button>
                </div>
              </div>
            ) : selectedMethod ? (
              /* Step 2: Enter amount for selected method */
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between p-3 rounded-lg bg-broker-800/50">
                  <div>
                    <p className="text-white text-sm font-semibold">{selectedMethod.name}</p>
                    <p className="text-xs text-broker-400">{selectedMethod.config.network || selectedMethod.type}</p>
                  </div>
                  <button onClick={() => { setSelectedMethod(null); setAmount(""); }} className="text-xs text-accent hover:underline">Change</button>
                </div>
                <div>
                  <label className="label">Amount (USD)</label>
                  <input
                    type="number"
                    min={selectedMethod.minAmount}
                    max={selectedMethod.maxAmount}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min $${selectedMethod.minAmount} • Max $${selectedMethod.maxAmount.toLocaleString()}`}
                    className="input"
                  />
                  {selectedMethod.description && (
                    <p className="text-[10px] text-broker-500 mt-1">{selectedMethod.description}</p>
                  )}
                </div>
                <button
                  onClick={handleCreateDeposit}
                  disabled={createDepositMutation.isPending}
                  className="btn-primary w-full"
                >
                  {createDepositMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Deposit Address"}
                </button>
              </div>
            ) : (
              /* Step 1: Select deposit method */
              <div className="space-y-2 animate-fade-in">
                {depositMethods?.length === 0 && (
                  <p className="text-center text-broker-400 py-6">No deposit methods currently available.</p>
                )}
                {depositMethods?.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m)}
                    className="w-full p-4 rounded-lg bg-broker-800/50 border border-broker-700/50 hover:border-accent/40 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-semibold group-hover:text-accent transition-colors">{m.name}</p>
                        <p className="text-xs text-broker-400 mt-0.5">{m.description}</p>
                      </div>
                      <span className="text-accent text-lg ml-3">→</span>
                    </div>
                    <div className="flex gap-3 mt-2 text-[10px] text-broker-500">
                      <span>Min: ${m.minAmount}</span>
                      <span>Max: ${m.maxAmount.toLocaleString()}</span>
                      {m.config.network && <span>{m.config.network}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
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

        {/* Pending Deposits */}
        {pendingDeposits && pendingDeposits.length > 0 && (
          <div className="glass overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-broker-700/50">
              <h3 className="text-fluid-lg font-semibold text-white">Deposit History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-fluid-sm">
                <thead>
                  <tr className="border-b border-broker-700/50 text-broker-400">
                    <th className="text-left px-4 py-3">Method</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-right px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDeposits.map((d) => (
                    <tr key={d.id} className="border-b border-broker-700/30">
                      <td className="px-4 py-3 text-sm text-broker-300">{d.method.name}</td>
                      <td className="text-right px-4 py-3 font-mono text-white">${Number(d.amount).toFixed(2)}</td>
                      <td className="text-right px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${d.status === "CONFIRMED" ? "bg-accent/10 text-accent" : d.status === "PENDING" ? "bg-amber-500/10 text-amber-400" : "bg-danger/10 text-danger"}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-xs text-broker-400">{new Date(d.createdAt).toLocaleDateString()}</td>
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
