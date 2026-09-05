import React from "react";
import { FiCheckCircle, FiAlertTriangle, FiAlertOctagon } from "react-icons/fi";
import type { OverallState } from "@/lib/api";

// Renders the 3-value Overall State enum + its reasons. Distinct from
// ScoreBadge (which renders a 0-100 numeric score) — this is a 3-state
// classification with a human-readable "why" list, never a bare number.
const CFG: Record<OverallState["state"], { label: string; bg: string; border: string; text: string; icon: React.ReactNode }> = {
  HEALTHY: {
    label: "Healthy",
    bg: "bg-success-dim", border: "border-success/30", text: "text-success",
    icon: <FiCheckCircle size={22} aria-hidden="true" />,
  },
  UNDER_PRESSURE: {
    label: "Under Pressure",
    bg: "bg-warning-dim", border: "border-warning/30", text: "text-warning",
    icon: <FiAlertTriangle size={22} aria-hidden="true" />,
  },
  NEEDS_ATTENTION: {
    label: "Needs Attention",
    bg: "bg-danger-dim", border: "border-danger/30", text: "text-danger",
    icon: <FiAlertOctagon size={22} aria-hidden="true" />,
  },
};

export function StateIndicator({ state, reasons }: { state: OverallState["state"]; reasons: string[] }) {
  const c = CFG[state];
  return (
    <div className={["card-premium p-6 flex gap-4 items-start", c.bg, c.border, "border"].join(" ")}>
      <span className={["shrink-0 w-11 h-11 rounded-full flex items-center justify-center", c.bg, c.text].join(" ")}>
        {c.icon}
      </span>
      <div className="min-w-0">
        {/* Color is paired with the text label itself — never color-only status. */}
        <p className={["text-lg font-bold", c.text].join(" ")}>{c.label}</p>
        <ul className="mt-2 space-y-1">
          {reasons.map((reason, i) => (
            <li key={i} className="text-sm text-secondary leading-snug">
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
