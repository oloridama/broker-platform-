import { BarChart3 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-broker-900 gap-6">
      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center animate-pulse-glow">
        <BarChart3 className="w-7 h-7 text-white" />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="text-fluid-sm text-broker-400">Loading...</p>
    </div>
  );
}
