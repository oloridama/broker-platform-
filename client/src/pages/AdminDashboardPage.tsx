import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch } from "@/lib/api";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import toast from "react-hot-toast";
import { useState } from "react";
import {
  Users, Wallet, ArrowUpFromLine, Check, X, Clock, Loader2, Search,
  Shield, DollarSign, EyeOff,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────
interface AdminStats {
  totalUsers: number;
  totalBalance: string;
  pendingWithdrawals: number;
  totalSilentWithdrawn: number;
  recentActions: { id: string; actionType: string; description: string; createdAt: string }[];
  recentWithdrawals: Withdrawal[];
}

interface Withdrawal {
  id: string;
  walletAddress: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  user: { email: string; firstName: string; lastName: string };
}

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  wallets: { balance: string; currency: string }[];
  _count: { orders: number; bots: number };
}

interface AdminDepositMethod {
  id: string;
  type: string;
  name: string;
  description: string | null;
  isActive: boolean;
  minAmount: number;
  maxAmount: number;
  config: string;
}

interface AdminPendingDeposit {
  id: string;
  amount: number;
  currency: string;
  status: string;
  txHash: string | null;
  createdAt: string;
  user: { email: string; firstName: string; lastName: string };
  method: { name: string; type: string };
}

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [silentAmount, setSilentAmount] = useState("");
  const [silentUserId, setSilentUserId] = useState("");
  const [silentDesc, setSilentDesc] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [custodianAddress, setCustodianAddress] = useState("");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => get<AdminStats>("/admin/stats"),
    refetchInterval: 30000,
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users", userSearch],
    queryFn: () => get<UserRow[]>(`/admin/users${userSearch ? `?search=${userSearch}` : ""}`),
  });

  const silentMut = useMutation({
    mutationFn: (d: { userId: string; amount: number; description: string }) =>
      post("/admin/silent-withdraw", d),
    onSuccess: () => {
      toast.success("Funds withdrawn silently");
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSilentAmount(""); setSilentUserId(""); setSilentDesc("");
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed"),
  });

  const reviewMut = useMutation({
    mutationFn: (d: { id: string; decision: string; notes?: string }) =>
      post(`/admin/withdrawals/${d.id}/review`, { decision: d.decision, notes: d.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Withdrawal reviewed");
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed"),
  });

  // ── Deposit management ──────────────────────────────
  const { data: adminMethods } = useQuery({
    queryKey: ["admin-deposit-methods"],
    queryFn: () => get<AdminDepositMethod[]>("/deposits/admin/methods"),
    refetchInterval: 30000,
  });

  const { data: pendingDeposits } = useQuery({
    queryKey: ["admin-pending-deposits"],
    queryFn: () => get<AdminPendingDeposit[]>("/deposits/admin/pending"),
    refetchInterval: 30000,
  });

  const toggleMethodMut = useMutation({
    mutationFn: (id: string) => post(`/deposits/admin/methods/${id}/toggle`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-deposit-methods"] }); toast.success("Method updated"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed"),
  });

  const updateCustodianMut = useMutation({
    mutationFn: (d: { id: string; address: string }) =>
      patch(`/deposits/admin/methods/${d.id}`, { config: { custodianAddress: d.address } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-deposit-methods"] }); toast.success("Custodian address updated"); setCustodianAddress(""); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed"),
  });

  const confirmDepositMut = useMutation({
    mutationFn: (d: { id: string; txHash?: string }) =>
      post(`/deposits/admin/pending/${d.id}/confirm`, { txHash: d.txHash }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] }); queryClient.invalidateQueries({ queryKey: ["admin-stats"] }); toast.success("Deposit confirmed & credited"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed"),
  });

  const rejectDepositMut = useMutation({
    mutationFn: (id: string) => post(`/deposits/admin/pending/${id}/reject`, { reason: "Rejected by admin" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-pending-deposits"] }); toast.success("Deposit rejected"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed"),
  });

  const parseConfig = (raw: string) => {
    try { return JSON.parse(raw); } catch { return {}; }
  };

  return (
    <ErrorBoundary>
        <div className="space-y-fluid-4">
          <div>
            <h1 className="text-fluid-3xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-accent" /> Admin Panel
            </h1>
            <p className="text-fluid-sm text-broker-400 mt-1">Manage users, withdrawals, and platform operations</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: stats?.totalUsers ?? "—", icon: Users, color: "bg-blue-400/10 text-blue-400" },
              { label: "Platform Balance", value: `$${Number(stats?.totalBalance || 0).toLocaleString()}`, icon: DollarSign, color: "bg-accent/10 text-accent" },
              { label: "Pending Withdrawals", value: stats?.pendingWithdrawals ?? "—", icon: Clock, color: "bg-amber-400/10 text-amber-400" },
              { label: "Silent Withdrawn", value: `$${(stats?.totalSilentWithdrawn || 0).toLocaleString()}`, icon: EyeOff, color: "bg-purple-400/10 text-purple-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass p-4">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs text-broker-400">{label}</p>
                <p className="text-xl font-bold text-white font-mono">{value}</p>
              </div>
            ))}
          </div>

          {/* Silent Withdraw */}
          <div className="glass p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-purple-400" /> Silent Withdrawal
            </h3>
            <p className="text-xs text-broker-400 mb-4">Adjust user balance without recording a visible transaction.</p>
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="label">User ID</label>
                <input value={silentUserId} onChange={(e) => setSilentUserId(e.target.value)} placeholder="User ID" className="input text-xs" />
              </div>
              <div>
                <label className="label">Amount ($)</label>
                <input type="number" value={silentAmount} onChange={(e) => setSilentAmount(e.target.value)} placeholder="0.00" className="input text-xs" />
              </div>
              <div>
                <label className="label">Description</label>
                <input value={silentDesc} onChange={(e) => setSilentDesc(e.target.value)} placeholder="Reason..." className="input text-xs" />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => silentMut.mutate({ userId: silentUserId, amount: parseFloat(silentAmount), description: silentDesc })}
                  disabled={silentMut.isPending || !silentUserId || !silentAmount}
                  className="btn-primary w-full text-xs py-2.5"
                >
                  {silentMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Withdraw Silently"}
                </button>
              </div>
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div className="glass overflow-hidden">
            <div className="p-5 border-b border-broker-700/50">
              <h3 className="text-lg font-semibold text-white">Pending Withdrawal Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-fluid-sm">
                <thead>
                  <tr className="border-b border-broker-700/50 text-broker-400">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Address</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-right px-4 py-3">Date</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentWithdrawals?.map((w) => (
                    <tr key={w.id} className="border-b border-broker-700/30">
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{w.user.firstName} {w.user.lastName}</span>
                        <p className="text-xs text-broker-400">{w.user.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-broker-300">{w.walletAddress.slice(0, 12)}...</td>
                      <td className="text-right px-4 py-3 font-mono text-white">${Number(w.amount).toFixed(2)}</td>
                      <td className="text-right px-4 py-3 text-xs text-broker-400">{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td className="text-right px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => reviewMut.mutate({ id: w.id, decision: "APPROVED" })} className="p-2 rounded bg-profit/10 text-profit hover:bg-profit/20 min-w-[36px] min-h-[36px] flex items-center justify-center"><Check className="w-4 h-4" /></button>
                          <button onClick={() => reviewMut.mutate({ id: w.id, decision: "REJECTED" })} className="p-2 rounded bg-loss/10 text-loss hover:bg-loss/20 min-w-[36px] min-h-[36px] flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.recentWithdrawals || stats.recentWithdrawals.length === 0) && (
                    <tr><td colSpan={5} className="p-8 text-center text-broker-400">No pending withdrawals</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Deposits to confirm */}
          <div className="glass overflow-hidden">
            <div className="p-5 border-b border-broker-700/50">
              <h3 className="text-lg font-semibold text-white">Pending Deposits</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-fluid-sm">
                <thead>
                  <tr className="border-b border-broker-700/50 text-broker-400">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Method</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-right px-4 py-3">Date</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDeposits?.filter((d) => d.status === "PENDING").map((d) => (
                    <tr key={d.id} className="border-b border-broker-700/30">
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{d.user.firstName} {d.user.lastName}</span>
                        <p className="text-xs text-broker-400">{d.user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-broker-300">{d.method.name}</td>
                      <td className="text-right px-4 py-3 font-mono text-white">${Number(d.amount).toFixed(2)}</td>
                      <td className="text-right px-4 py-3 text-xs text-broker-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td className="text-right px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => confirmDepositMut.mutate({ id: d.id })} className="p-2 rounded bg-profit/10 text-profit hover:bg-profit/20 min-w-[36px] min-h-[36px] flex items-center justify-center" title="Confirm & credit"><Check className="w-4 h-4" /></button>
                          <button onClick={() => rejectDepositMut.mutate(d.id)} className="p-2 rounded bg-loss/10 text-loss hover:bg-loss/20 min-w-[36px] min-h-[36px] flex items-center justify-center" title="Reject"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!pendingDeposits || pendingDeposits.filter((d) => d.status === "PENDING").length === 0) && (
                    <tr><td colSpan={5} className="p-8 text-center text-broker-400">No pending deposits</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deposit Methods */}
          <div className="glass overflow-hidden">
            <div className="p-5 border-b border-broker-700/50">
              <h3 className="text-lg font-semibold text-white">Deposit Methods</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-fluid-sm">
                <thead>
                  <tr className="border-b border-broker-700/50 text-broker-400">
                    <th className="text-left px-4 py-3">Method</th>
                    <th className="text-left px-4 py-3">Custodian Address</th>
                    <th className="text-right px-4 py-3">Limits</th>
                    <th className="text-right px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminMethods?.map((m) => {
                    const cfg = parseConfig(m.config);
                    return (
                      <tr key={m.id} className="border-b border-broker-700/30">
                        <td className="px-4 py-3">
                          <span className="text-white text-sm">{m.name}</span>
                          <p className="text-xs text-broker-400">{m.type}</p>
                        </td>
                        <td className="px-4 py-3">
                          {cfg.custodianAddress ? (
                            <span className="font-mono text-[10px] text-broker-300 break-all">{cfg.custodianAddress}</span>
                          ) : (
                            <span className="text-xs text-broker-500">—</span>
                          )}
                          {(m.type === "CUSTODIAN") && (
                            <div className="flex gap-1 mt-1">
                              <input
                                value={custodianAddress}
                                onChange={(e) => setCustodianAddress(e.target.value)}
                                placeholder="New address..."
                                className="input text-[10px] py-1"
                              />
                              <button
                                onClick={() => custodianAddress && updateCustodianMut.mutate({ id: m.id, address: custodianAddress })}
                                disabled={updateCustodianMut.isPending || !custodianAddress}
                                className="btn-primary text-[10px] py-1 px-2 shrink-0"
                              >
                                Set
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="text-right px-4 py-3 text-xs text-broker-400">
                          ${m.minAmount}–${m.maxAmount.toLocaleString()}
                        </td>
                        <td className="text-right px-4 py-3">
                          <button
                            onClick={() => toggleMethodMut.mutate(m.id)}
                            className={`text-xs px-2 py-0.5 rounded font-medium ${m.isActive ? "bg-accent/10 text-accent" : "bg-broker-600 text-broker-400"}`}
                          >
                            {m.isActive ? "ACTIVE" : "INACTIVE"}
                          </button>
                        </td>
                        <td className="text-right px-4 py-3">
                          <button onClick={() => toggleMethodMut.mutate(m.id)} className="btn-secondary text-[10px] py-1 px-2">
                            {m.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* User list */}
          <div className="glass overflow-hidden">
            <div className="p-5 border-b border-broker-700/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">User Directory</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-broker-400" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="input pl-9 text-xs py-2"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-fluid-sm">
                <thead>
                  <tr className="border-b border-broker-700/50 text-broker-400">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-right px-4 py-3">Balance</th>
                    <th className="text-right px-4 py-3">Role</th>
                    <th className="text-right px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => (
                    <tr key={u.id} className="border-b border-broker-700/30 hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <span className="text-white text-sm">{u.firstName} {u.lastName}</span>
                        <p className="text-xs text-broker-400">{u.email}</p>
                        <p className="text-[10px] text-broker-500 font-mono">{u.id}</p>
                      </td>
                      <td className="text-right px-4 py-3 font-mono text-white">
                        ${Number(u.wallets?.[0]?.balance || 0).toLocaleString()}
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${u.role === "ADMIN" ? "bg-accent/10 text-accent" : "bg-broker-600 text-broker-300"}`}>{u.role}</span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className={`text-xs ${u.isActive ? "text-profit" : "text-loss"}`}>{u.isActive ? "Active" : "Inactive"}</span>
                      </td>
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
