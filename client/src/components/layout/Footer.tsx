import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-broker-800/50 border-t border-broker-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">
                <span className="text-white">FXA</span>
                <span className="text-accent">Trade</span>
              </span>
            </div>
            <p className="text-sm text-broker-400 leading-relaxed">
              Professional trading platform with competitive spreads, fast execution, and institutional-grade tools.
            </p>
          </div>

          {/* Trading */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Trading</h4>
            <ul className="space-y-2">
              {[
                { label: "Live Markets", to: "/markets" },
                { label: "Trading Bots", to: "/trading-bots" },
                { label: "Investment Plans", to: "/#plans" },
                { label: "ROI Calculator", to: "/calculator" },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-broker-400 hover:text-accent transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              {[
                { label: "About Us", to: "/about" },
                { label: "Contact", to: "/about" },
                { label: "Terms", to: "/terms" },
                { label: "Privacy", to: "/privacy" },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-broker-400 hover:text-accent transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              {[
                { label: "Terms of Service", to: "/terms" },
                { label: "Privacy Policy", to: "/privacy" },
                { label: "Risk Disclosure", to: "/terms" },
                { label: "KYC Policy", to: "/privacy" },
              ].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm text-broker-400 hover:text-accent transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-broker-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-broker-500">
            &copy; {new Date().getFullYear()} FXA Trade. All rights reserved.
          </p>
          <p className="text-xs text-broker-500">
            Trading involves substantial risk of loss and is not suitable for all investors.
          </p>
        </div>
      </div>
    </footer>
  );
}
