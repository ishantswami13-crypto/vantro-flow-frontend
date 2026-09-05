import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  freshness?: string; // e.g. "As of 2:41 PM" — display-only, composition-time not data-recency, see BusinessState.generatedAt
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, freshness, actions, className = "" }: PageHeaderProps) {
  return (
    <div className={["flex items-start justify-between gap-4 mb-5", className].join(" ")}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-primary">{title}</h1>
        {subtitle && <p className="text-2xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {freshness && <span className="text-2xs text-muted font-mono">{freshness}</span>}
        {actions}
      </div>
    </div>
  );
}
