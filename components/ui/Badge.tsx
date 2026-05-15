import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-2 text-secondary border-border",
  success: "bg-success-dim text-success border-success/30",
  warning: "bg-warning-dim text-warning border-warning/30",
  danger:  "bg-danger-dim text-danger border-danger/30",
  accent:  "bg-accent-dim text-accent border-accent/30",
  muted:   "bg-surface-2 text-muted border-border",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium border",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const variant = score >= 70 ? "success" : score >= 40 ? "warning" : "danger";
  return <Badge variant={variant}>{score}%</Badge>;
}
