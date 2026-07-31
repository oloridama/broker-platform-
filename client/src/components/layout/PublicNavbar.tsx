import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { BarChart3, Menu, X } from "lucide-react";

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <header className="sticky top-0 z-50 bg-broker-900/80 backdrop-blur-lg border-b border-broker-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="FXA Trade home">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent-glow transition-transform group-hover:scale-105">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl hidden sm:block">
              <span className="text-white">FXA</span>
              <span className="text-accent">Trade</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" role="navigation">
            <a href="#features" className="px-3 py-2 text-sm text-broker-300 hover:text-white rounded-lg hover:bg-broker-800/50 transition-colors">Features</a>
            <a href="#plans" className="px-3 py-2 text-sm text-broker-300 hover:text-white rounded-lg hover:bg-broker-800/50 transition-colors">Invest</a>
            <Link to="/markets" className="px-3 py-2 text-sm text-broker-300 hover:text-white rounded-lg hover:bg-broker-800/50 transition-colors">Markets</Link>
            <Link to="/trading-bots" className="px-3 py-2 text-sm text-broker-300 hover:text-white rounded-lg hover:bg-broker-800/50 transition-colors">Bots</Link>
            <a href="#about" className="px-3 py-2 text-sm text-broker-300 hover:text-white rounded-lg hover:bg-broker-800/50 transition-colors">About</a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary text-sm">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm">Open Account</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-broker-800 text-broker-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-broker-700/50 bg-broker-900/95 backdrop-blur-lg animate-slide-up">
          <nav className="px-4 py-4 space-y-1" role="navigation">
            <a href="#features" onClick={() => setMobileOpen(false)} className="block px-3 py-3 text-sm text-broker-300 hover:text-white rounded-lg hover:bg-broker-800">Features</a>
            <a href="#markets" onClick={() => setMobileOpen(false)} className="block px-3 py-3 text-sm text-broker-300 hover:text-white rounded-lg hover:bg-broker-800">Markets</a>
            <a href="#accounts" onClick={() => setMobileOpen(false)} className="block px-3 py-3 text-sm text-broker-300 hover:text-white rounded-lg hover:bg-broker-800">Accounts</a>
            <a href="#about" onClick={() => setMobileOpen(false)} className="block px-3 py-3 text-sm text-broker-300 hover:text-white rounded-lg hover:bg-broker-800">About</a>
            <div className="pt-3 space-y-2 border-t border-broker-700/50 mt-3">
              {isAuthenticated ? (
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="btn-primary w-full text-sm">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary w-full text-sm">Sign In</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary w-full text-sm">Open Account</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
