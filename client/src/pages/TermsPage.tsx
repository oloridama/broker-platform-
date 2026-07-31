import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-broker-900">
      <PublicNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Terms of <span className="text-accent">Service</span></h1>
        <p className="text-broker-400 mb-8">Last updated: January 2026</p>

        <div className="space-y-8 text-broker-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using FXA Trade's platform, you agree to be bound by these Terms of Service. If you do not agree, do not use our services.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Eligibility</h2>
            <p>You must be at least 18 years old and not reside in a jurisdiction where trading is prohibited. You are responsible for compliance with local laws.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Account Registration</h2>
            <p>You must provide accurate information during registration. You are responsible for maintaining the confidentiality of your credentials.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Trading Risks</h2>
            <p>Trading involves substantial risk of loss. Past performance is not indicative of future results. You should only trade with capital you can afford to lose.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Platform Fees</h2>
            <p>Commission and spread details are available on our pricing page. Fees may change with 30 days notice.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
