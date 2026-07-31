import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Zap, Globe, Users, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-broker-900">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center mb-12">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Our Story</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            About <span className="text-accent">FXA Trade</span>
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <p className="text-lg text-broker-300 leading-relaxed mb-4">
              FXA Trade was founded in 2020 with a singular mission: democratize access to institutional-grade trading tools. 
              We believe every trader — from retail to professional — deserves the same execution quality, data depth, 
              and platform stability that hedge funds enjoy.
            </p>
            <p className="text-lg text-broker-300 leading-relaxed mb-4">
              Headquartered in London with offices in Singapore and New York, our team of 120+ engineers, 
              quants, and support specialists serves traders across 150+ countries.
            </p>
            <p className="text-lg text-broker-300 leading-relaxed">
              We're regulated by FINRA and SEC-compliant, holding broker-dealer and investment adviser registrations. 
              Our matching engine processes over $12 billion in monthly volume with 99.99% uptime.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, label: "Regulated", desc: "FINRA & SEC compliant" },
              { icon: Zap, label: "Fast", desc: "0.03s avg execution" },
              { icon: Globe, label: "Global", desc: "150+ countries served" },
              { icon: Users, label: "Trusted", desc: "150K+ active traders" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass p-5 text-center">
                <Icon className="w-6 h-6 text-accent mx-auto mb-2" />
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-xs text-broker-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-8 text-center">
          <Award className="w-10 h-10 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Our Commitment</h2>
          <p className="text-broker-400 max-w-2xl mx-auto">
            We're committed to transparency, security, and innovation. Every feature we build — 
            from our MA+RSI trading bots to our silent withdrawal system — is designed with 
            institutional standards and regulatory compliance at its core.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
