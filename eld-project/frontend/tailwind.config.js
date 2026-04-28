/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        // Industrial trucking palette
        diesel: {
          50:  "#fefce8",
          100: "#fef9c3",
          400: "#facc15",
          500: "#eab308",
          600: "#ca8a04",
        },
        slate: {
          850: "#172033",
          950: "#0a0f1e",
        },
        amber: {
          glow: "#f59e0b",
        },
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
        body:    ["'Barlow'", "sans-serif"],
      },
      backgroundImage: {
        "grid-dark":
          "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), " +
          "linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-sm": "24px 24px",
      },
      boxShadow: {
        "amber-glow": "0 0 20px rgba(245,158,11,0.25)",
        "blue-glow":  "0 0 20px rgba(59,130,246,0.3)",
      },
      animation: {
        "fade-in":      "fadeIn 0.4s ease forwards",
        "slide-up":     "slideUp 0.5s ease forwards",
        "pulse-amber":  "pulseAmber 2s ease infinite",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp:   { "0%": { transform: "translateY(20px)", opacity: 0 }, "100%": { transform: "translateY(0)", opacity: 1 } },
        pulseAmber: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245,158,11,0.4)" },
          "50%":       { boxShadow: "0 0 0 8px rgba(245,158,11,0)" },
        },
      },
    },
  },
  plugins: [],
};
