import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-broker-900">
      <PublicNavbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Privacy <span className="text-accent">Policy</span></h1>
        <p className="text-broker-400 mb-8">Last updated: January 2026</p>

        <div className="space-y-8 text-broker-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>We collect information you provide during registration (name, email), trading activity data, and technical data (IP address, browser type) for security purposes.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Data</h2>
            <p>Your data is used to provide and improve our services, comply with KYC/AML regulations, prevent fraud, and communicate important account updates.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Data Security</h2>
            <p>We employ AES-256 encryption, secure server infrastructure, and regular security audits. Your password is hashed using bcrypt and never stored in plaintext.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing</h2>
            <p>We do not sell your personal data. We may share data with regulatory bodies when legally required, or with payment processors to facilitate transactions.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Your Rights</h2>
            <p>You may request access to, correction of, or deletion of your personal data at any time by contacting our support team.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
