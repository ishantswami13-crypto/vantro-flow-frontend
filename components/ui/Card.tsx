import React from "react";
import { Sparkline } from "./Sparkline";

interface CardProps {
  children:  React.ReactNode;
  className?: string;
  padding?:  "none" | "sm" | "md" | "lg";
  hover?:    boolean;
}

const PAD = { none: 0, sm: 16, md: 20, lg: 24 };

// Surface panel with one hairline edge and no shadow (tokens only).
export function Card({ children, className = "", padding = "md", hover = false }: CardProps) {
  return (
    <div
      className={[hover ? "row-hover cursor-pointer" : "", className].join(" ")}
      style={{ background: "var(--surface)", border: "1px solid var(--line-card)", borderRadius: "var(--radius-lg)", padding: PAD[padding] }}
    >
      {children}
    </div>
  );
}

interface MetricCardProps {
  label:      string;
  value:      string;
  sub?:       string;
  trend?:     "up" | "down" | "neutral";
  trendValue?: string;
  accent?:    "default" | "success" | "warning" | "danger" | "gold";
  icon?:      React.ReactNode;
  pct?:       number;
  // Real day-by-day values only — never interpolated/estimated. Omit
  // entirely rather than pass a fabricated series; a missing sparkline is
  // honest, a fake trend line is not.
  series?:    number[];
}

// The figure stays in the primary ink; only a warning or danger accent tints
// it, so a row of metrics never turns into a rainbow.
const VALUE_COLOR: Record<string, string> = {
  default: "var(--ink)",
  success: "var(--ink)",
  warning: "var(--warning)",
  danger:  "var(--critical)",
  gold:    "var(--ink)",
};

export function MetricCard({ label, value, sub, trend, trendValue, accent = "default", icon, pct, series }: MetricCardProps) {
  const color = VALUE_COLOR[accent];
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line-card)", borderRadius: "var(--radius-lg)", padding: 20, minWidth: 0 }}>
      <div className="flex items-start justify-between" style={{ gap: 8, marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)" }}>{label}</p>
        {icon && <span aria-hidden="true" style={{ color: "var(--ink-3)", display: "inline-flex" }}>{icon}</span>}
      </div>
      <p className="figure-in" style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1.1, color, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</p>
      {(sub || trendValue || series) && (
        <div className="flex items-center justify-between" style={{ gap: 8, marginTop: 6 }}>
          <div className="flex items-center min-w-0" style={{ gap: 8 }}>
            {trendValue && trend && (
              <span className="shrink-0 tabular" style={{ fontSize: 12, color: trend === "up" ? "var(--positive)" : trend === "down" ? "var(--critical)" : "var(--ink-2)" }}>
                {trend === "up" ? "+" : trend === "down" ? "−" : ""}{trendValue}
              </span>
            )}
            {sub && <span className="truncate" style={{ fontSize: 12, color: "var(--ink-3)" }}>{sub}</span>}
          </div>
          {series && <Sparkline values={series} />}
        </div>
      )}
      {pct !== undefined && (
        <div style={{ height: 4, borderRadius: 2, background: "var(--surface-2)", marginTop: 12, overflow: "hidden" }}>
          <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: "var(--ink-2)", opacity: 0.6 }} />
        </div>
      )}
    </div>
  );
}
