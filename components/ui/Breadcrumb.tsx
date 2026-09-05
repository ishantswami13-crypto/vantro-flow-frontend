import React from "react";

export interface BreadcrumbSegment {
  label: string;
  onClick?: () => void; // omitted (or a no-op) on the current/last segment
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
}

// Stack-based breadcrumb for the drawer's navigation stack. Renders as a
// horizontally scrollable single-line strip (matters most on mobile full-screen
// drawers, §8 of the plan) rather than wrapping to multiple lines.
export function Breadcrumb({ segments }: BreadcrumbProps) {
  if (segments.length === 0) return null;
  return (
    <nav aria-label="Business State navigation" className="overflow-x-auto whitespace-nowrap -mx-1 px-1 mb-0.5">
      <ol className="inline-flex items-center gap-1 text-2xs text-muted">
        {segments.map((seg, i) => {
          const isCurrent = i === segments.length - 1;
          return (
            <li key={`${seg.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 && <span aria-hidden="true">/</span>}
              {isCurrent || !seg.onClick ? (
                <span aria-current={isCurrent ? "page" : undefined} className={isCurrent ? "text-primary font-medium" : ""}>
                  {seg.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={seg.onClick}
                  className="hover:text-primary underline-offset-2 hover:underline focus-ring rounded"
                >
                  {seg.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
