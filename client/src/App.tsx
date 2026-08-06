import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { useAuthStore } from "@/store/authStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { SupportChat } from "@/components/ui/SupportChat";

// Lazy-loaded pages for code splitting
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const MarketsPage = lazy(() => import("@/pages/MarketsPage"));
const TradingBotsPage = lazy(() => import("@/pages/TradingBotsPage"));
const CalculatorPage = lazy(() => import("@/pages/CalculatorPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const TradingPage = lazy(() => import("@/pages/TradingPage"));
const WalletPage = lazy(() => import("@/pages/WalletPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public landing page — accessible to everyone */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/trading-bots" element={<TradingBotsPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Guest-only auth routes */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Protected app routes with dashboard layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/trading" element={<TradingPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {/* Floating support chat — visible on every page */}
      <SupportChat />
    </Suspense>
  );
}
