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
        bg: "#0A0E27",
        surface: "#111629",
        "surface-2": "#1A2040",
        border: "#1E2442",
        accent: "#0066FF",
        "accent-hover": "#0052CC",
        "accent-dim": "#0066FF1A",
        primary: "#F8F9FB",
        secondary: "#A0A4AC",
        muted: "#6B7280",
        success: "#00C48C",
        warning: "#FFB020",
        danger: "#FF4D4F",
        "success-dim": "#00C48C1A",
        "warning-dim": "#FFB0201A",
        "danger-dim": "#FF4D4F1A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
