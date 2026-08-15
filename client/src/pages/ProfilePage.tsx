import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch, post } from "@/lib/api";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import {
  User,
  Shield,
  Mail,
  Calendar,
  Save,
  Upload,
  Loader2,
  Lock,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────
interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
  kyc: KycData | null;
  accounts: { id: string; accountType: string; balance: string; equity: string; currency: string }[];
}

interface KycData {
  status: string;
  documentType: string;
  documentNumber: string;
  country: string;
  createdAt: string;
  rejectionReason?: string;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [showKyc, setShowKyc] = useState(false);
  const [kycForm, setKycForm] = useState({
    documentType: "PASSPORT",
    documentNumber: "",
    addressLine1: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [pwStep, setPwStep] = useState<"idle" | "form" | "verify">("idle");
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwCode, setPwCode] = useState("");
  const [pwDelivered, setPwDelivered] = useState<"email" | "manual" | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => get<Profile>("/users/me"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { firstName: string; lastName: string }) =>
      patch<{ firstName: string; lastName: string }>("/users/me", data),
    onSuccess: (data) => {
      toast.success("Profile updated!");
      const storeState = useAuthStore.getState();
      if (storeState.user) {
        setAuth({ ...storeState.user, ...data }, storeState.accessToken!, storeState.refreshToken!);
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const kycMutation = useMutation({
    mutationFn: () => post("/users/kyc", kycForm),
    onSuccess: () => {
      toast.success("KYC submitted for review!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setShowKyc(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "KYC submission failed";
      toast.error(msg);
    },
  });

  const requestPwMutation = useMutation({
    mutationFn: () => post("/users/me/change-password/request", { currentPassword: pwForm.currentPassword }),
    onSuccess: (data) => {
      const delivered = (data as { delivered?: "email" | "manual" })?.delivered;
      setPwDelivered(delivered || "email");
      toast.success(delivered === "manual" ? "Code generated — get it from support" : "Verification code sent to your email");
      setPwStep("verify");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to send verification code";
      toast.error(msg);
    },
  });

  const confirmPwMutation = useMutation({
    mutationFn: () => post("/users/me/change-password/confirm", { code: pwCode, newPassword: pwForm.newPassword }),
    onSuccess: () => {
      toast.success("Password updated!");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwCode("");
      setPwStep("idle");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to change password";
      toast.error(msg);
    },
  });

  function submitPasswordRequest() {
    if (pwForm.newPassword.length < 8 || !/[A-Z]/.test(pwForm.newPassword) || !/[0-9]/.test(pwForm.newPassword)) {
      toast.error("New password must be 8+ characters with an uppercase letter and a number");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    requestPwMutation.mutate();
  }

  const kycStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED": return <CheckCircle className="w-5 h-5 text-accent" />;
      case "PENDING": return <Clock className="w-5 h-5 text-amber-400" />;
      case "UNDER_REVIEW": return <AlertCircle className="w-5 h-5 text-blue-400" />;
      case "REJECTED": return <XCircle className="w-5 h-5 text-danger" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-fluid-4 max-w-3xl">
        <div>
          <h1 className="text-fluid-3xl font-bold text-white">Profile</h1>
          <p className="text-fluid-sm text-broker-400 mt-1">Manage your account and verification</p>
        </div>

        {/* Profile card */}
        <div className="glass p-5 md:p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center">
              <User className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h2 className="text-fluid-xl font-bold text-white">
                {profile?.firstName} {profile?.lastName}
              </h2>
              <div className="flex items-center gap-2 text-fluid-sm text-broker-400 mt-1">
                <Mail className="w-3.5 h-3.5" />
                {profile?.email}
              </div>
              <div className="flex items-center gap-2 text-fluid-sm text-broker-400 mt-0.5">
                <Shield className="w-3.5 h-3.5" />
                Role: <span className="text-accent font-medium">{profile?.role}</span>
              </div>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateMutation.mutate({ firstName, lastName })}
                  disabled={updateMutation.isPending}
                  className="btn-primary gap-2"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="btn-secondary">Edit Profile</button>
            </div>
          )}
        </div>

        {/* Security: Change Password */}
        <div className="glass p-5 md:p-6">
          <h3 className="text-fluid-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" /> Security
          </h3>

          {pwStep === "verify" ? (
            <div className="space-y-4">
              <p className="text-fluid-sm text-broker-300">
                {pwDelivered === "manual" ? (
                  <>Enter the 6-digit code provided by support. It expires in 10 minutes.</>
                ) : (
                  <>Enter the 6-digit code we emailed to <span className="text-white font-medium">{profile?.email}</span>. It expires in 10 minutes.</>
                )}
              </p>
              <div className="max-w-xs">
                <label className="label">Verification Code</label>
                <input
                  value={pwCode}
                  onChange={(e) => setPwCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="input text-center text-lg tracking-[0.5em] font-mono"
                  placeholder="••••••"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmPwMutation.mutate()}
                  disabled={confirmPwMutation.isPending || pwCode.length !== 6}
                  className="btn-primary gap-2"
                >
                  {confirmPwMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Verify & Change Password
                </button>
                <button onClick={() => { setPwStep("form"); setPwCode(""); }} className="btn-secondary">Back</button>
              </div>
            </div>
          ) : pwStep === "form" ? (
            <div className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  className="input"
                  autoComplete="current-password"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                    className="input"
                    autoComplete="new-password"
                    placeholder="8+ chars, uppercase, number"
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    className="input"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={submitPasswordRequest}
                  disabled={requestPwMutation.isPending}
                  className="btn-primary gap-2"
                >
                  {requestPwMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Verification Code
                </button>
                <button onClick={() => setPwStep("idle")} className="btn-secondary">Cancel</button>
              </div>
              <p className="text-fluid-xs text-broker-500">
                A 6-digit verification code will be emailed to your registered address before the change is applied.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-fluid-sm text-broker-300">Keep your account secure</p>
                <p className="text-fluid-xs text-broker-500 mt-0.5">Change the password you use to sign in. A verification code is sent to your email.</p>
              </div>
              <button onClick={() => setPwStep("form")} className="btn-secondary">Change Password</button>
            </div>
          )}
        </div>

        {/* KYC Section */}
        <div className="glass p-5 md:p-6">
          <h3 className="text-fluid-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" /> Verification (KYC)
          </h3>

          {profile?.kyc ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-broker-800/50">
                {kycStatusIcon(profile.kyc.status)}
                <div>
                  <p className="font-medium text-white capitalize">{profile.kyc.status.replace("_", " ")}</p>
                  <p className="text-fluid-sm text-broker-400">
                    {profile.kyc.documentType} • {profile.kyc.country || "—"}
                  </p>
                </div>
              </div>
              {profile.kyc.rejectionReason && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-fluid-sm text-danger">
                  Reason: {profile.kyc.rejectionReason}
                </div>
              )}
              {profile.kyc.status === "REJECTED" && (
                <button onClick={() => setShowKyc(true)} className="btn-primary gap-2">
                  <Upload className="w-4 h-4" /> Resubmit KYC
                </button>
              )}
            </div>
          ) : showKyc ? (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Document Type</label>
                  <select
                    value={kycForm.documentType}
                    onChange={(e) => setKycForm((f) => ({ ...f, documentType: e.target.value }))}
                    className="input"
                  >
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVERS_LICENSE">Driver's License</option>
                    <option value="NATIONAL_ID">National ID</option>
                  </select>
                </div>
                <div>
                  <label className="label">Document Number</label>
                  <input
                    value={kycForm.documentNumber}
                    onChange={(e) => setKycForm((f) => ({ ...f, documentNumber: e.target.value }))}
                    className="input"
                    placeholder="AB123456"
                  />
                </div>
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  value={kycForm.addressLine1}
                  onChange={(e) => setKycForm((f) => ({ ...f, addressLine1: e.target.value }))}
                  className="input"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">City</label>
                  <input
                    value={kycForm.city}
                    onChange={(e) => setKycForm((f) => ({ ...f, city: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Postal Code</label>
                  <input
                    value={kycForm.postalCode}
                    onChange={(e) => setKycForm((f) => ({ ...f, postalCode: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input
                    value={kycForm.country}
                    onChange={(e) => setKycForm((f) => ({ ...f, country: e.target.value }))}
                    className="input"
                    placeholder="US"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => kycMutation.mutate()}
                  disabled={kycMutation.isPending}
                  className="btn-primary gap-2"
                >
                  {kycMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Submit for Verification
                </button>
                <button onClick={() => setShowKyc(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowKyc(true)} className="btn-primary gap-2">
              <Upload className="w-4 h-4" /> Start KYC Verification
            </button>
          )}
        </div>

        {/* Account info */}
        <div className="glass p-5 md:p-6">
          <h3 className="text-fluid-lg font-semibold text-white mb-4">Account Details</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-fluid-sm text-broker-400">Member Since</dt>
              <dd className="text-white font-medium flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-broker-400" />
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-fluid-sm text-broker-400">Last Login</dt>
              <dd className="text-white font-medium mt-1">
                {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-fluid-sm text-broker-400">Status</dt>
              <dd className="mt-1">
                <span className={`px-2 py-0.5 rounded text-fluid-xs font-medium ${
                  profile?.isActive ? "bg-accent/10 text-accent" : "bg-danger/10 text-danger"
                }`}>
                  {profile?.isActive ? "Active" : "Deactivated"}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </ErrorBoundary>
  );
}
