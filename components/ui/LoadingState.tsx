import React from "react";

interface LoadingStateProps {
  label?: string;
  rows?: number;
  className?: string;
}

// Generic section-level loading skeleton. Modeled on the SkeletonCard pattern
// already used in app/forecast/page.tsx — promoted here so every Business
// State section (and any future section) shares one implementation instead
// of each page hand-rolling its own pulse animation.
export function LoadingState({ label, rows = 1, className = "" }: LoadingStateProps) {
  return (
    <div className={["animate-pulse", className].join(" ")} role="status" aria-label={label || "Loading"}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card-metric p-5 mb-3 last:mb-0">
          <div className="h-3 w-24 bg-surface-3 rounded mb-4" />
          <div className="h-6 w-40 bg-surface-3 rounded mb-2" />
          <div className="h-2.5 w-28 bg-surface-3 rounded" />
        </div>
      ))}
      <span className="sr-only">{label || "Loading"}</span>
    </div>
  );
}
