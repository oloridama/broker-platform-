import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  User,
  X,
  BarChart3,
  Bot,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { clsx } from "clsx";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/trading", icon: TrendingUp, label: "Trading" },
  { to: "/bots", icon: Bot, label: "Bots" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const location = useLocation();

  return (
    <aside
      className={clsx(
        "fixed md:sticky top-0 left-0 z-40 h-screen",
        "bg-broker-800 border-r border-broker-700/50",
        "flex flex-col transition-all duration-300 ease-in-out",
        sidebarOpen ? "w-[260px] translate-x-0" : "w-0 -translate-x-full md:w-[70px] md:translate-x-0",
      )}
      aria-label="Main navigation"
    >
      {/* Logo area */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-broker-700/50 shrink-0">
        <div className={clsx("flex items-center gap-3", !sidebarOpen && "md:hidden")}>
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-fluid-lg whitespace-nowrap">
            <span className="text-white">FXA</span>
            <span className="text-accent">Trade</span>
          </span>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-2 rounded-lg hover:bg-broker-700 text-broker-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" role="navigation">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => window.innerWidth < 768 && setSidebarOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200",
                "min-h-[44px] whitespace-nowrap",
                isActive
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-broker-300 hover:bg-broker-700/50 hover:text-broker-100",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className={clsx("text-fluid-sm font-medium", !sidebarOpen && "md:hidden")}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={clsx("p-4 border-t border-broker-700/50", !sidebarOpen && "md:hidden")}>
        <p className="text-fluid-xs text-broker-500">
          &copy; {new Date().getFullYear()} FXA Trade
        </p>
      </div>
    </aside>
  );
}
