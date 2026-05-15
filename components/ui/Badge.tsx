import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "muted" | "gold";

interface BadgeProps { children: React.ReactNode; variant?: BadgeVariant; className?: string; }

const V: Record<BadgeVariant, string> = {
  default: "bg-surface-2 text-secondary border-border",
  success: "bg-success-dim text-success border-success/25",
  warning: "bg-warning-dim text-warning border-warning/25",
  danger:  "bg-danger-dim  text-danger  border-danger/25",
  accent:  "bg-accent-dim  text-accent  border-accent/25",
  muted:   "bg-surface-2 text-muted border-border",
  gold:    "bg-[rgba(245,166,35,0.12)] text-[#F7C15E] border-[rgba(245,166,35,0.25)]",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={[
      "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold border",
      V[variant],
      className,
    ].join(" ")}>
      {children}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 70 ? "success" : score >= 40 ? "warning" : "danger";
  return (
    <span className={[
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-bold border",
      V[variant],
    ].join(" ")}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {score}%
    </span>
  );
}
