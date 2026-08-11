import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

export function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const impersonating = useAuthStore((s) => s.impersonating);
  const user = useAuthStore((s) => s.user);
  const exitImpersonation = useAuthStore((s) => s.exitImpersonation);
  const navigate = useNavigate();

  // Auto-close sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  const handleExit = () => {
    exitImpersonation();
    navigate("/admin");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Impersonation banner */}
        {impersonating && (
          <div className="sticky top-0 z-30 bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3">
            <p className="text-xs text-amber-300 flex items-center gap-2 min-w-0">
              <span className="shrink-0 font-semibold">👁️ Impersonating</span>
              <span className="truncate font-mono">{user?.email}</span>
              <span className="hidden sm:inline text-amber-400/70">— you are viewing this user's account</span>
            </p>
            <button
              onClick={handleExit}
              className="shrink-0 text-xs font-semibold px-3 py-1 rounded bg-amber-500 text-broker-900 hover:bg-amber-400 min-h-[32px]"
            >
              Exit & return to admin
            </button>
          </div>
        )}

        <TopBar />
        <main className="flex-1 overflow-y-auto p-fluid-4 md:p-fluid-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
