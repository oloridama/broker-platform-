import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "@/hooks/useForm";
import { useAuthStore } from "@/store/authStore";
import { post } from "@/lib/api";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import toast from "react-hot-toast";
import { BarChart3, Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react";

interface LoginResponse {
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
  accessToken: string;
  refreshToken: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, handleSubmit } = useForm({
    initialValues: { email: "", password: "" },
    validate: (v) => {
      const e: Record<string, string> = {};
      if (!v.email) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = "Invalid email";
      if (!v.password) e.password = "Password is required";
      return e;
    },
    onSubmit: async (v) => {
      setLoading(true);
      try {
        const data = await post<LoginResponse>("/auth/login", v);
        setAuth(data.user, data.accessToken, data.refreshToken);
        toast.success(`Welcome back, ${data.user.firstName}!`);
        navigate("/dashboard");
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Login failed";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-broker-900 flex flex-col">
      <PublicNavbar />
      <div className="flex-1 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-[420px] animate-slide-up">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-broker-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent mb-4 shadow-lg shadow-accent-glow">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-fluid-3xl font-bold">
            <span className="text-white">FXA</span>
            <span className="text-accent">Trade</span>
          </h1>
          <p className="text-fluid-sm text-broker-400 mt-2">
            Sign in to your trading account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass p-6 md:p-8 space-y-5" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="email" className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-broker-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={handleChange}
                className={`input pl-10 ${errors.email ? "input-error" : ""}`}
              />
            </div>
            {errors.email && <p className="text-fluid-xs text-danger mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-broker-400" />
              <input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={values.password}
                onChange={handleChange}
                className={`input pl-10 pr-10 ${errors.password ? "input-error" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-broker-400 hover:text-broker-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-fluid-xs text-danger mt-1">{errors.password}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-fluid-sm text-broker-400 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-accent hover:text-accent-light font-medium">
            Create one
          </Link>
        </p>
      </div>
      </div>
      <Footer />
    </div>
  );
}
