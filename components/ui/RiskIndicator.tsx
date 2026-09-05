import React from "react";
import { ScoreBadge, Badge } from "./Badge";

// Distinguishes "scored" risk (has a real 0-100 number, e.g. customer credit
// risk) from "rule-based" risk (a flag with no underlying score, e.g.
// payables due-in-3-days/overdue rules) — the backend genuinely does not
// compute a payables risk score (see implementation plan §3), so this
// component must never present the two as equivalent.
export function RiskIndicator({ score, label }: { score: number; label?: string } | { score?: undefined; label: string }) {
  if (typeof score === "number") {
    return (
      <div className="flex items-center gap-2">
        <ScoreBadge score={score} />
        {label && <span className="text-2xs text-muted">{label}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Badge variant="warning">Rule-based</Badge>
      <span className="text-2xs text-muted">{label}</span>
    </div>
  );
}
