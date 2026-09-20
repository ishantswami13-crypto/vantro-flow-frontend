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
        // ---- Starlane V32 design tokens (see STARLANE_FRONTEND_HANDOFF.md §3) ----
        bg:            "#F7F7F4",
        "sidebar-bg":  "#141412",
        surface:       "#FFFFFF",
        "surface-1":   "#FFFFFF",
        // §17.1: two near-identical hexes (#F3F2EE / #F3F2EF) appear in source for
        // surface-2 — chose #F3F2EE (used by the table-header spec in §12, the more
        // frequently cited value) as the single canonical token.
        "surface-2":   "#F3F2EE",
        "surface-3":   "#EDEDE9",
        "text-primary":   "#191917",
        "text-secondary": "#63635F",
        "text-tertiary":  "#8A8A86",
        "text-body":      "#43433F",
        border:        "#EBEAE6", // border-divider — most common separator
        "border-2":    "#D7D6D0", // border-strong
        "border-hairline": "#E5E4DF",
        "border-row-subtle": "rgba(25,25,23,0.06)",
        "border-default":    "rgba(25,25,23,0.10)",
        "border-input":      "rgba(25,25,23,0.12)",
        "border-button":     "rgba(25,25,23,0.14)",
        "border-emphasis":   "rgba(25,25,23,0.16)",
        accent:      "#696D86", // DEFAULT_ACCENT (indigo) — see USER_ACCENTS below
        "accent-hover": "#3D5CF5",
        "accent-dim":   "rgba(105,109,134,0.12)",
        cta:         "#FF6B35",
        "cta-hover": "#F55A22",
        "cta-dim":   "rgba(255,107,53,0.12)",
        primary:   "#191917",
        secondary: "#63635F",
        muted:     "#8A8A86",
        // §17.1 reconciliation: handoff flags positive #477054 vs #1FB870, and
        // critical #A64F4B vs #E8462B, as two-hex inconsistencies to resolve to one
        // value each. Chosen: #477054 (positive) and #A64F4B (critical) — these are
        // the primary semantic values used across the most pages (Discover, Sources,
        // Control, Agents / Bridge, Discover, ScanResult respectively); the "-alt"
        // hexes were narrower, single-page usages (Watch/Missions "On track" tag;
        // Watch triggered rows + Simulate negative sim_card) and are kept below as
        // named alt tokens rather than silently dropped, in case a future page needs
        // to match that specific historical usage intentionally.
        success:   "#477054",
        "success-alt": "#1FB870",
        warning:   "#9B742B",
        danger:    "#A64F4B",
        "danger-alt":  "#E8462B",
        info:      "#566C82",
        "success-dim": "rgba(71,112,84,0.12)",
        "warning-dim": "rgba(155,116,43,0.12)",
        "danger-dim":  "rgba(166,79,75,0.12)",
        "sidebar-user-label": "#B9B8B2",
        "sidebar-active-text": "#F5F4F0",
        // USER_ACCENTS — 10 curated per-user identity colors (handoff §3).
        // "indigo" doubles as DEFAULT_ACCENT / `accent` above.
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
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "monospace"],
        serif: ["Fraunces", "Georgia", "serif"],
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
        "card":        "0 1px 3px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)",
        "card-hover":  "0 2px 8px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4)",
        "inner-top":   "inset 0 1px 0 rgba(255,255,255,0.06)",
        "button":      "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        "button-accent":"0 1px 3px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
        // V32 (handoff §3 Shadows)
        "v32-lift":    "0 6px 18px rgba(25,25,23,0.07)",
        "v32-drawer":  "0 8px 32px rgba(0,0,0,0.08)",
        "v32-palette": "0 6px 24px rgba(0,0,0,0.10)",
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
      },
    },
  },
  plugins: [],
};

export default config;
