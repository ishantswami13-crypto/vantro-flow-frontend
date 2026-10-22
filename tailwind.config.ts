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
        // Every colour reads a CSS variable from app/tokens.css, so the whole
        // app follows the theme (dark by default, light on request).
        bg:            "rgb(var(--tk-bg) / <alpha-value>)",
        "sidebar-bg":  "rgb(var(--tk-sidebar) / <alpha-value>)",
        surface:       "rgb(var(--tk-surface) / <alpha-value>)",
        "surface-1":   "rgb(var(--tk-surface) / <alpha-value>)",
        "surface-2":   "rgb(var(--tk-surface-2) / <alpha-value>)",
        "surface-3":   "rgb(var(--tk-surface-3) / <alpha-value>)",
        elevated:      "rgb(var(--tk-elevated) / <alpha-value>)",
        "text-primary":   "rgb(var(--tk-ink) / <alpha-value>)",
        "text-secondary": "rgb(var(--tk-ink-2) / <alpha-value>)",
        "text-tertiary":  "rgb(var(--tk-ink-3) / <alpha-value>)",
        "text-body":      "rgb(var(--tk-body) / <alpha-value>)",
        ink:           "rgb(var(--tk-ink) / <alpha-value>)",
        body:          "rgb(var(--tk-body) / <alpha-value>)",
        border:        "rgb(var(--tk-line) / <alpha-value>)",
        "border-2":    "rgb(var(--tk-line-strong) / <alpha-value>)",
        "border-hairline": "rgb(var(--tk-line-hairline) / <alpha-value>)",
        "border-row-subtle": "var(--line-row)",
        "border-default":    "var(--line-card)",
        "border-input":      "var(--line-input)",
        "border-button":     "var(--line-button)",
        "border-emphasis":   "var(--line-emphasis)",
        accent:        "rgba(var(--accent-rgb), <alpha-value>)",
        "accent-hover": "rgb(var(--tk-ink) / <alpha-value>)",
        "accent-dim":   "rgba(var(--accent-rgb), 0.12)",
        // The primary action is the inverse of the page.
        cta:         "rgb(var(--tk-ink) / <alpha-value>)",
        "cta-hover": "var(--inverse-hover)",
        "cta-dim":   "var(--hover)",
        primary:   "rgb(var(--tk-ink) / <alpha-value>)",
        secondary: "rgb(var(--tk-ink-2) / <alpha-value>)",
        muted:     "rgb(var(--tk-ink-3) / <alpha-value>)",
        // One status language: positive, warning (attention), danger (critical), info.
        success:       "rgb(var(--tk-positive) / <alpha-value>)",
        "success-alt": "rgb(var(--tk-positive) / <alpha-value>)",
        warning:       "rgb(var(--tk-warning) / <alpha-value>)",
        danger:        "rgb(var(--tk-critical) / <alpha-value>)",
        "danger-alt":  "rgb(var(--tk-critical) / <alpha-value>)",
        info:          "rgb(var(--tk-info) / <alpha-value>)",
        "success-dim": "rgb(var(--tk-positive) / 0.12)",
        "warning-dim": "rgb(var(--tk-warning) / 0.12)",
        "danger-dim":  "rgb(var(--tk-critical) / 0.12)",
        "sidebar-user-label": "#B9B8B2",
        "sidebar-active-text": "#F5F4F0",
        // USER_ACCENTS (lib/identity.ts) for swatches in the identity picker.
        "accent-sage":           "#66765F",
        "accent-slate-teal":     "#557476",
        "accent-stone-blue":     "#647384",
        "accent-aubergine":      "#756775",
        "accent-clay":           "#876C61",
        "accent-olive":          "#77755B",
        "accent-indigo":         "#696D86",
        "accent-graphite-green": "#617068",
        "accent-dust-rose":      "#846D70",
        "accent-deep-sand":      "#847661",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        // IBM Plex Mono for figures, ids and evidence that must align.
        mono: ["var(--font-mono)"],
        serif: ["var(--font-display)"],
        display: ["var(--font-display)"],
      },
      borderRadius: {
        // Starlane V32 radius scale (handoff §3) — Tailwind's default `sm/DEFAULT/md/...`
        // scale is left untouched; these are the exact named stops from the spec so new
        // components can reference them directly (e.g. rounded-v32-card).
        "v32-xs":  "3px",
        "v32-sm":  "4px",
        "v32-md":  "6px",
        "v32-nav": "7px",
        "v32-lg":  "8px",
        "v32-palette": "10px",
        "v32-composer": "12px",
        "v32-pill": "20px",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem",  { lineHeight: "2.5rem",  letterSpacing: "-0.03em" }],
        "5xl": ["3rem",     { lineHeight: "1",        letterSpacing: "-0.04em" }],
      },
      boxShadow: {
        "card":        "var(--shadow-sm)",
        "card-hover":  "var(--shadow-md)",
        "inner-top":   "var(--highlight)",
        "button":      "var(--shadow-sm)",
        "button-accent":"var(--shadow-sm)",
        "v32-lift":    "var(--shadow-md)",
        "v32-drawer":  "var(--shadow-lg)",
        "v32-palette": "var(--shadow-lg)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
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
        "count-up": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "progress": {
          "0%":   { width: "0%" },
          "100%": { width: "var(--progress-width)" },
        },
        "spin-slow": {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        // V32 motion (handoff §3): fadeInOnce is the preferred single-shot entrance;
        // fadeUp/card-in stay only for intentionally staggered card reveals (kept in
        // globals.css, not duplicated here). pulseDot/drawerIn/backdropIn also live in
        // globals.css alongside the LENS_CSS-equivalent drawer styles they animate.
        "fade-in-once": {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in":       "fade-in 0.3s ease-out both",
        "fade-in-scale": "fade-in-scale 0.25s ease-out both",
        "slide-in-left": "slide-in-left 0.3s ease-out both",
        "count-up":      "count-up 0.4s ease-out both",
        "spin-slow":     "spin-slow 8s linear infinite",
        "fade-in-once":  "fade-in-once 180ms cubic-bezier(0.2,0.8,0.2,1) both",
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
        instant: "100ms",
        fast: "160ms",
        base: "220ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      zIndex: {
        sticky: "10", sidebar: "30", overlay: "40", drawer: "50", modal: "60", palette: "70", toast: "80", tooltip: "90",
      },
      maxWidth: {
        content: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
