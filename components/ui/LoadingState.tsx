import React from "react";

interface LoadingStateProps {
  label?: string;
  rows?: number;
  className?: string;
}

// Section loading skeleton: the shape of what is coming, never a fake value.
export function LoadingState({ label, rows = 1, className = "" }: LoadingStateProps) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label={label || "Loading"}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ui-panel" style={{ padding: 18, marginBottom: i === rows - 1 ? 0 : 10 }}>
          <div className="skeleton" style={{ height: 10, width: 96, marginBottom: 14 }} />
          <div className="skeleton" style={{ height: 18, width: 160, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 9, width: 120 }} />
        </div>
      ))}
      <span className="sr-only">{label || "Loading"}</span>
    </div>
  );
}
