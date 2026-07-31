import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/landing/CookieConsent";
import { StockTicker } from "@/components/landing/StockTicker";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { InvestmentPlans } from "@/components/landing/InvestmentPlans";
import { ManagedPortfolios } from "@/components/landing/ManagedPortfolios";
import { RoiCalculator } from "@/components/landing/RoiCalculator";
import { TradingBots } from "@/components/landing/TradingBots";
import { TeamSection } from "@/components/landing/TeamSection";
import { DynamicBackground, DynamicBackgroundStyles } from "@/components/landing/DynamicBackground";
import { ParticleCanvas } from "@/components/landing/ParticleCanvas";
import { useAuthStore } from "@/store/authStore";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Shield } from "lucide-react";

export default function LandingPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="min-h-screen bg-broker-900 relative">
      <DynamicBackgroundStyles />
      <DynamicBackground />
      <ParticleCanvas />
      <div className="relative z-10">
      <PublicNavbar />
      <HeroSection />
      <StockTicker />
      <StatsSection />

      {/* Why & How We Stand Out */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-12">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Advanced Capabilities</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Why and How We <span className="text-accent">Stand Out</span>
          </h2>
          <p className="mt-4 text-lg text-broker-400 max-w-2xl mx-auto">
            Access a universe of financial opportunities through a single, secure gateway designed for both retail and institutional traders.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Bank-Grade Security", desc: "AES-256 encryption, cold storage for 95% of assets, multi-signature wallets." },
            { title: "Lightning Fast", desc: "Low-latency matching engine ensures you get the price you see, under 30ms execution." },
            { title: "Regulated & Compliant", desc: "SEC v4.2 compliant infrastructure with real-time audit logs and transparency." },
            { title: "24/7 Global Support", desc: "Multi-lingual team available around the clock via live chat, email, and phone." },
          ].map((item) => (
            <div key={item.title} className="glass p-5 hover:border-accent/30 transition-all">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1.5">{item.title}</h3>
              <p className="text-xs text-broker-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <InvestmentPlans />
      <ManagedPortfolios />
      <RoiCalculator />
      <TradingBots />

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="glass p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.1),transparent_70%)]" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Ready to Start <span className="text-accent">Trading</span>?
            </h2>
            <p className="mt-4 text-lg text-broker-300 max-w-xl mx-auto">
              Open an account in minutes and access global financial markets with institutional-grade tools.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary text-base px-8 py-3.5 gap-2 group">
                  Go to Dashboard <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary text-base px-8 py-3.5 gap-2 group">
                    Create Free Account <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link to="/login" className="btn-secondary text-base px-8 py-3.5">Sign In</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <TeamSection />
      <Footer />
      <CookieConsent />
      </div>
    </div>
  );
}
