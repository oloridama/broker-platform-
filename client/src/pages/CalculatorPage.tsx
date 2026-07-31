import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { RoiCalculator } from "@/components/landing/RoiCalculator";

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-broker-900">
      <PublicNavbar />
      <div className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center">
          <p className="text-accent text-sm font-semibold uppercase tracking-wider mb-2">Precision Forecasting</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            ROI <span className="text-accent">Calculator</span>
          </h1>
          <p className="mt-2 text-broker-400">Project your investment returns with institutional-grade precision.</p>
        </div>
        <RoiCalculator />
      </div>
      <Footer />
    </div>
  );
}
