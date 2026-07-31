import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("cookie-consent");
    if (!dismissed) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("cookie-consent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:w-96 z-50 animate-slide-up">
      <div className="glass p-5 shadow-2xl border-accent/20">
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white mb-1">Cookie Protocol</h4>
            <p className="text-xs text-broker-400 leading-relaxed mb-4">
              We utilize operational and analytical protocols to ensure a secure, institutional-grade experience.
            </p>
            <div className="flex gap-2">
              <button onClick={dismiss} className="btn-primary text-xs py-2 px-4">Accept All</button>
              <button onClick={dismiss} className="text-xs text-broker-400 hover:text-white py-2 px-3">Privacy Policy</button>
            </div>
          </div>
          <button onClick={dismiss} className="text-broker-500 hover:text-broker-300 min-w-[32px] min-h-[32px] flex items-center justify-center" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
