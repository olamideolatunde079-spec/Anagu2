import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight:  "#080D24",
        navy:      "#111832",
        elevated:  "#171A3B",
        purple:    "#6338F5",
        blue:      "#168BFF",
        emerald:   "#13C98A",
        gold:      "#F0B429",
        crimson:   "#EF4444",
        secondary: "#AAB4CC",
        border:    "#29345A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #6338F5 0%, #168BFF 100%)",
        "gradient-hero":    "linear-gradient(135deg, #080D24 0%, #111832 50%, #171A3B 100%)",
        "gradient-card":    "linear-gradient(135deg, #171A3B 0%, #111832 100%)",
      },
      boxShadow: {
        glow:       "0 0 20px rgba(99,56,245,0.3)",
        "glow-blue":"0 0 20px rgba(22,139,255,0.3)",
        "glow-lg":  "0 0 40px rgba(99,56,245,0.4)",
        card:       "0 4px 24px rgba(0,0,0,0.4)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      animation: {
        "fade-in":    "fadeIn 0.3s ease-in-out",
        "slide-up":   "slideUp 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pulseGlow: { "0%,100%": { boxShadow: "0 0 10px rgba(99,56,245,0.3)" }, "50%": { boxShadow: "0 0 30px rgba(99,56,245,0.6)" } },
      },
    },
  },
  plugins: [],
};

export default config;
