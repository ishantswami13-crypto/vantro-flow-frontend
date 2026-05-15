import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div
      className={[
        "bg-surface border border-border rounded-lg",
        paddingClasses[padding],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accent?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
}

const accentColor = {
  default: "text-accent",
  success: "text-success",
  warning: "text-warning",
  danger:  "text-danger",
};

const trendColor = {
  up:      "text-success",
  down:    "text-danger",
  neutral: "text-secondary",
};

export function MetricCard({ label, value, sub, trend, trendValue, accent = "default", icon }: MetricCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-secondary uppercase tracking-wider">{label}</span>
        {icon && <span className={["w-8 h-8 flex items-center justify-center rounded-md bg-surface-2", accentColor[accent]].join(" ")}>{icon}</span>}
      </div>
      <p className={["metric-value text-2xl", accentColor[accent]].join(" ")}>{value}</p>
      {(sub || trendValue) && (
        <div className="flex items-center gap-2 mt-2">
          {trendValue && trend && (
            <span className={["text-xs font-medium", trendColor[trend]].join(" ")}>
              {trend === "up" ? "+" : trend === "down" ? "-" : ""}{trendValue}
            </span>
          )}
          {sub && <span className="text-xs text-secondary">{sub}</span>}
        </div>
      )}
    </Card>
  );
}
