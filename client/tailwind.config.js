/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Professional broker palette — dark navy + emerald accents
        broker: {
          900: "#0a0f1e",
          800: "#111827",
          700: "#1a2236",
          600: "#243049",
          500: "#2d3d5e",
          400: "#4a5d82",
          300: "#7485a8",
          200: "#a3b0c7",
          100: "#d1d8e3",
          50: "#f0f3f8",
        },
        accent: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dark: "#059669",
          glow: "rgba(16, 185, 129, 0.25)",
        },
        danger: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          dark: "#dc2626",
        },
        profit: "#10b981",
        loss: "#ef4444",
        surface: {
          card: "rgba(26, 34, 54, 0.8)",
          hover: "rgba(36, 48, 73, 0.6)",
          input: "rgba(17, 24, 39, 0.7)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        // Fluid type scale using clamp
        "fluid-xs": "clamp(0.7rem, 0.65rem + 0.25vw, 0.75rem)",
        "fluid-sm": "clamp(0.8rem, 0.725rem + 0.35vw, 0.875rem)",
        "fluid-base": "clamp(0.9rem, 0.8rem + 0.5vw, 1rem)",
        "fluid-lg": "clamp(1rem, 0.85rem + 0.6vw, 1.125rem)",
        "fluid-xl": "clamp(1.1rem, 0.9rem + 0.8vw, 1.25rem)",
        "fluid-2xl": "clamp(1.3rem, 1rem + 1vw, 1.5rem)",
        "fluid-3xl": "clamp(1.5rem, 1.1rem + 1.5vw, 1.875rem)",
        "fluid-4xl": "clamp(1.8rem, 1.3rem + 2vw, 2.25rem)",
      },
      spacing: {
        // Fluid spacing
        "fluid-1": "clamp(0.25rem, 0.15rem + 0.5vw, 0.5rem)",
        "fluid-2": "clamp(0.5rem, 0.35rem + 0.6vw, 0.75rem)",
        "fluid-3": "clamp(0.75rem, 0.5rem + 0.8vw, 1rem)",
        "fluid-4": "clamp(1rem, 0.75rem + 1vw, 1.5rem)",
        "fluid-6": "clamp(1.5rem, 1rem + 1.5vw, 2rem)",
        "fluid-8": "clamp(2rem, 1.5rem + 2vw, 3rem)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s infinite",
        "ticker": "ticker 20s linear infinite",
        float: "float 20s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 4px rgba(16, 185, 129, 0.3)" },
          "50%": { boxShadow: "0 0 16px rgba(16, 185, 129, 0.6)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(40px, -30px) scale(1.05)" },
          "50%": { transform: "translate(-20px, 20px) scale(0.95)" },
          "75%": { transform: "translate(-30px, -10px) scale(1.02)" },
        },
      },
    },
    screens: {
      xs: "320px",
      sm: "375px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
      "3xl": "1920px",
    },
  },
  plugins: [],
};
