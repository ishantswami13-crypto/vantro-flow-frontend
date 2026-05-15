import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:          "#050B1A",
        "bg-grid":   "#070D20",
        surface:     "#0C1428",
        "surface-1": "#101A30",
        "surface-2": "#14203A",
        "surface-3": "#1A2847",
        border:      "#1E2D4A",
        "border-2":  "#243354",
        accent:      "#0066FF",
        "accent-hover": "#0052CC",
        "accent-dim":   "rgba(0,102,255,0.12)",
        "accent-glow":  "rgba(0,102,255,0.35)",
        primary:   "#E8EFF8",
        secondary: "#8899AA",
        muted:     "#556070",
        success:   "#10D98A",
        warning:   "#F5A524",
        danger:    "#F5424D",
        "success-dim": "rgba(16,217,138,0.12)",
        "warning-dim": "rgba(245,165,36,0.12)",
        "danger-dim":  "rgba(245,66,77,0.12)",
        "success-glow":"rgba(16,217,138,0.3)",
        "danger-glow": "rgba(245,66,77,0.3)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem",  { lineHeight: "2.5rem",  letterSpacing: "-0.03em" }],
        "5xl": ["3rem",     { lineHeight: "1",        letterSpacing: "-0.04em" }],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-accent": "linear-gradient(135deg, #0066FF 0%, #0047B3 100%)",
        "gradient-success":"linear-gradient(135deg, #10D98A 0%, #059669 100%)",
        "gradient-danger": "linear-gradient(135deg, #F5424D 0%, #C0392B 100%)",
        "shimmer": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
      },
      boxShadow: {
        "card":        "0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)",
        "card-hover":  "0 2px 8px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4)",
        "accent":      "0 0 0 1px rgba(0,102,255,0.5), 0 4px 20px rgba(0,102,255,0.25)",
        "accent-sm":   "0 0 0 1px rgba(0,102,255,0.3), 0 2px 8px rgba(0,102,255,0.15)",
        "success":     "0 0 0 1px rgba(16,217,138,0.4), 0 4px 16px rgba(16,217,138,0.15)",
        "danger":      "0 0 0 1px rgba(245,66,77,0.4), 0 4px 16px rgba(245,66,77,0.15)",
        "glow-accent": "0 0 30px rgba(0,102,255,0.2), 0 0 60px rgba(0,102,255,0.08)",
        "glow-success":"0 0 20px rgba(16,217,138,0.15)",
        "inner-top":   "inset 0 1px 0 rgba(255,255,255,0.06)",
        "button":      "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        "button-accent":"0 1px 3px rgba(0,66,255,0.5), 0 4px 16px rgba(0,102,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
      },
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%":   { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          "0%":   { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-accent": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(0,102,255,0.4)" },
          "50%":      { opacity: "0.8", boxShadow: "0 0 0 6px rgba(0,102,255,0)" },
        },
        "count-up": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "progress": {
          "0%":   { width: "0%" },
          "100%": { width: "var(--progress-width)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        "spin-slow": {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "row-in": {
          "0%":   { opacity: "0", transform: "translateX(-4px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in":       "fade-in 0.3s ease-out both",
        "fade-in-scale": "fade-in-scale 0.25s ease-out both",
        "slide-in-left": "slide-in-left 0.3s ease-out both",
        "shimmer":       "shimmer 2s linear infinite",
        "pulse-accent":  "pulse-accent 2s ease-in-out infinite",
        "count-up":      "count-up 0.4s ease-out both",
        "gradient-x":    "gradient-x 4s ease infinite",
        "float":         "float 3s ease-in-out infinite",
        "spin-slow":     "spin-slow 8s linear infinite",
        "row-in":        "row-in 0.2s ease-out both",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "24px",
      },
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
        "300": "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
