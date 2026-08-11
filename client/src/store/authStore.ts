import { create, type StateCreator } from "zustand";
import { persist, type PersistOptions } from "zustand/middleware";

// ── Types ──────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  impersonating: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  impersonate: (user: User, accessToken: string, refreshToken: string) => void;
  exitImpersonation: () => void;
  logout: () => void;
}

// Stashed admin session so we can restore it after exiting impersonation.
let adminSession: { user: User; accessToken: string; refreshToken: string } | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      impersonating: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true, impersonating: false }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      impersonate: (user, accessToken, refreshToken) => {
        // Stash the current (admin) session so we can come back to it
        const cur = get();
        if (cur.user && cur.accessToken && cur.refreshToken) {
          adminSession = { user: cur.user, accessToken: cur.accessToken, refreshToken: cur.refreshToken };
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true, impersonating: true });
      },

      exitImpersonation: () => {
        const admin = adminSession;
        adminSession = null;
        if (admin) {
          set({ ...admin, isAuthenticated: true, impersonating: false });
        } else {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, impersonating: false });
        }
      },

      logout: () => {
        adminSession = null;
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          impersonating: false,
        });
      },
    }),
    {
      name: "fxa-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        impersonating: state.impersonating,
      }),
    },
  ),
);
