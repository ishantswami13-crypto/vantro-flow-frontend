import React from "react";

interface CardProps {
  children:  React.ReactNode;
  className?: string;
  padding?:  "none" | "sm" | "md" | "lg";
  hover?:    boolean;
}

const PAD = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };

export function Card({ children, className = "", padding = "md", hover = false }: CardProps) {
  return (
    <div className={[
      hover ? "card-premium group cursor-pointer" : "card-premium",
      PAD[padding],
      className,
    ].join(" ")}>
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
}

const ACCENT_COLOR: Record<string, string> = {
  default: "#0066FF",
  success: "#10D98A",
  warning: "#F5A524",
  danger:  "#F5424D",
  gold:    "#F5A623",
};

const ACCENT_GLOW: Record<string, string> = {
  default: "rgba(0,102,255,0.12)",
  success: "rgba(16,217,138,0.12)",
  warning: "rgba(245,165,36,0.12)",
  danger:  "rgba(245,66,77,0.12)",
  gold:    "rgba(245,166,35,0.10)",
};

export function MetricCard({ label, value, sub, trend, trendValue, accent = "default", icon, pct }: MetricCardProps) {
  const color = ACCENT_COLOR[accent];
  const glow  = ACCENT_GLOW[accent];

  return (
    <div className="card-metric p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="section-label">{label}</p>
        {icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: glow, border: `1px solid ${color}30` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
        )}
      </div>
      <p className="metric-lg mb-1" style={{ color }}>{value}</p>
      {(sub || trendValue) && (
        <div className="flex items-center gap-2 mb-3">
          {trendValue && trend && (
            <span className={[
              "text-2xs font-bold font-mono",
              trend === "up"   ? "text-success" :
              trend === "down" ? "text-danger"  : "text-secondary",
            ].join(" ")}>
              {trend === "up" ? "+" : trend === "down" ? "-" : ""}{trendValue}
            </span>
          )}
          {sub && <span className="text-2xs text-muted">{sub}</span>}
        </div>
      )}
      {pct !== undefined && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${pct}%`, background: color, opacity: 0.65 }}
          />
        </div>
      )}
    </div>
  );
}
