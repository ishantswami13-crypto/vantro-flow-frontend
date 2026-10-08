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
        // Every colour reads a token from app/tokens.css, so the whole app
        // follows the theme. Names kept from Version 32 so existing classes work.
        bg:            "rgb(var(--c-bg-primary) / <alpha-value>)",
        "sidebar-bg":  "rgb(var(--c-bg-secondary) / <alpha-value>)",
        surface:       "rgb(var(--c-bg-elevated) / <alpha-value>)",
        "surface-1":   "rgb(var(--c-bg-elevated) / <alpha-value>)",
        "surface-2":   "rgb(var(--c-bg-raised) / <alpha-value>)",
        "surface-3":   "rgb(var(--c-bg-raised) / <alpha-value>)",
        elevated:      "rgb(var(--c-bg-elevated) / <alpha-value>)",
        raised:        "rgb(var(--c-bg-raised) / <alpha-value>)",
        inverse:       "rgb(var(--c-bg-inverse) / <alpha-value>)",
        "on-inverse":  "rgb(var(--c-text-on-inverse) / <alpha-value>)",
        ink:           "rgb(var(--c-ink) / <alpha-value>)",
        "text-primary":   "rgb(var(--c-text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--c-text-secondary) / <alpha-value>)",
        "text-tertiary":  "rgb(var(--c-text-tertiary) / <alpha-value>)",
        "text-body":      "rgb(var(--c-text-body) / <alpha-value>)",
        border:        "var(--border-default)",
        "border-2":    "var(--border-strong)",
        "border-hairline": "var(--border-subtle)",
        "border-row-subtle": "var(--border-subtle)",
        "border-default":    "var(--border-default)",
        "border-input":      "var(--border-default)",
        "border-button":     "var(--border-strong)",
        "border-emphasis":   "var(--border-strong)",
        // One product accent. The user's identity colour stays in --accent
        // (avatar only) and is no longer the interface accent.
        accent:        "rgb(var(--c-accent) / <alpha-value>)",
        "accent-hover": "rgb(var(--c-accent-hover) / <alpha-value>)",
        "accent-dim":   "var(--accent-muted)",
        cta:           "rgb(var(--c-bg-inverse) / <alpha-value>)",
        "cta-hover":   "rgb(var(--c-text-body) / <alpha-value>)",
        "cta-dim":     "var(--bg-hover)",
        primary:   "rgb(var(--c-text-primary) / <alpha-value>)",
        secondary: "rgb(var(--c-text-secondary) / <alpha-value>)",
        muted:     "rgb(var(--c-text-tertiary) / <alpha-value>)",
        success:   "rgb(var(--c-success) / <alpha-value>)",
        "success-alt": "rgb(var(--c-success) / <alpha-value>)",
        warning:   "rgb(var(--c-warning) / <alpha-value>)",
        danger:    "rgb(var(--c-danger) / <alpha-value>)",
        "danger-alt":  "rgb(var(--c-danger) / <alpha-value>)",
        info:      "rgb(var(--c-info) / <alpha-value>)",
        neutral:   "rgb(var(--c-neutral) / <alpha-value>)",
        "success-dim": "var(--status-success-muted)",
        "warning-dim": "var(--status-warning-muted)",
        "danger-dim":  "var(--status-danger-muted)",
        "sidebar-user-label": "rgb(var(--c-text-secondary) / <alpha-value>)",
        "sidebar-active-text": "rgb(var(--c-text-primary) / <alpha-value>)",
        // USER_ACCENTS — per-user identity colours (avatars only).
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
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        // Figures that matter use IBM Plex Mono; "font-code" is the same face for code.
        mono: ["IBM Plex Mono", "ui-monospace", "Consolas", "monospace"],
        code: ["IBM Plex Mono", "ui-monospace", "Consolas", "monospace"],
        serif: ["Fraunces", "Georgia", "serif"],
        brand: ["Fraunces", "Georgia", "serif"],
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
        "r-sm": "6px",
        "r-md": "10px",
        "r-lg": "14px",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem",  { lineHeight: "2.5rem",  letterSpacing: "-0.03em" }],
        "5xl": ["3rem",     { lineHeight: "1",        letterSpacing: "-0.04em" }],
      },
      boxShadow: {
        // Elevation is mostly borders; shadows are for floating layers only.
        "card":        "none",
        "card-hover":  "none",
        "inner-top":   "inset 0 1px 0 rgb(var(--c-ink) / 0.04)",
        "button":      "none",
        "button-accent":"none",
        "v32-lift":    "none",
        "v32-drawer":  "var(--shadow-float)",
        "v32-palette": "var(--shadow-float)",
        "float":       "var(--shadow-float)",
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
        standard: "220ms",
        slow: "320ms",
      },
      transitionTimingFunction: { std: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    },
  },
  plugins: [],
};

export default config;
