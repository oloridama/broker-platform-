import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "@/hooks/useForm";
import { post } from "@/lib/api";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import toast from "react-hot-toast";
import { BarChart3, Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";

interface RegisterResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { values, errors, handleChange, handleSubmit } = useForm({
    initialValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
    validate: (v) => {
      const e: Record<string, string> = {};
      if (!v.firstName.trim()) e.firstName = "First name is required";
      if (!v.lastName.trim()) e.lastName = "Last name is required";
      if (!v.email) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = "Invalid email";
      if (!v.password) e.password = "Password is required";
      else if (v.password.length < 8) e.password = "At least 8 characters";
      else if (!/[A-Z]/.test(v.password)) e.password = "Must contain an uppercase letter";
      else if (!/[0-9]/.test(v.password)) e.password = "Must contain a number";
      if (v.password !== v.confirmPassword) e.confirmPassword = "Passwords don't match";
      return e;
    },
    onSubmit: async (v) => {
      setLoading(true);
      try {
        await post<RegisterResponse>("/auth/register", {
          email: v.email,
          password: v.password,
          firstName: v.firstName,
          lastName: v.lastName,
        });
        toast.success("Account created! Please sign in.");
        navigate("/login");
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Registration failed";
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
      <div className="w-full max-w-[460px] animate-slide-up">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-broker-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent mb-4 shadow-lg shadow-accent-glow">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-fluid-3xl font-bold">
            <span className="text-white">FXA</span>
            <span className="text-accent">Trade</span>
          </h1>
          <p className="text-fluid-sm text-broker-400 mt-2">Create your trading account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass p-6 md:p-8 space-y-4" noValidate>
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="label">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-broker-400" />
                <input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={values.firstName}
                  onChange={handleChange}
                  className={`input pl-10 ${errors.firstName ? "input-error" : ""}`}
                />
              </div>
              {errors.firstName && <p className="text-fluid-xs text-danger mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="label">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                placeholder="Doe"
                value={values.lastName}
                onChange={handleChange}
                className={`input ${errors.lastName ? "input-error" : ""}`}
              />
              {errors.lastName && <p className="text-fluid-xs text-danger mt-1">{errors.lastName}</p>}
            </div>
          </div>

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
                autoComplete="new-password"
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
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

          {/* Confirm password */}
          <div>
            <label htmlFor="confirmPassword" className="label">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={values.confirmPassword}
              onChange={handleChange}
              className={`input ${errors.confirmPassword ? "input-error" : ""}`}
            />
            {errors.confirmPassword && <p className="text-fluid-xs text-danger mt-1">{errors.confirmPassword}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-fluid-sm text-broker-400 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-accent hover:text-accent-light font-medium">
            Sign in
          </Link>
        </p>
      </div>
      </div>
      <Footer />
    </div>
  );
}
