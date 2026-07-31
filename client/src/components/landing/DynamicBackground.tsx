/**
 * Dynamic background with animated gradient orbs, grid pattern, and floating particles.
 * Applied as a fixed layer behind all content.
 */
export function DynamicBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Animated gradient orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px] animate-[float_20s_ease-in-out_infinite]"
        style={{
          background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
          top: "10%",
          left: "-10%",
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[100px] animate-[float_25s_ease-in-out_infinite_5s]"
        style={{
          background: "radial-gradient(circle, #34d399 0%, transparent 70%)",
          top: "50%",
          right: "-5%",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[90px] animate-[float_30s_ease-in-out_infinite_10s]"
        style={{
          background: "radial-gradient(circle, #059669 0%, transparent 70%)",
          bottom: "10%",
          left: "30%",
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Scan line effect */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16, 185, 129, 0.4) 2px, rgba(16, 185, 129, 0.4) 3px)",
        }}
      />
    </div>
  );
}

// Add the float keyframe to the global styles via a style tag
export function DynamicBackgroundStyles() {
  return (
    <style>{`
      @keyframes float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(40px, -30px) scale(1.05); }
        50% { transform: translate(-20px, 20px) scale(0.95); }
        75% { transform: translate(-30px, -10px) scale(1.02); }
      }
    `}</style>
  );
}
