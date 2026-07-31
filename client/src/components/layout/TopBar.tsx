import { Menu, Bell, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 h-16 glass border-b border-broker-700/50 flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-broker-700 text-broker-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-fluid-lg font-semibold text-broker-100 hidden sm:block">
          Welcome, {user?.firstName}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg hover:bg-broker-700 text-broker-400 min-w-[44px] min-h-[44px] flex items-center justify-center relative"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
        </button>

        <button
          onClick={handleLogout}
          className="btn-ghost text-broker-400 gap-2 hidden sm:inline-flex"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-fluid-sm">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
