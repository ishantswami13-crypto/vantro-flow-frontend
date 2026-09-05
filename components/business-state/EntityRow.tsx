import React from "react";
import { RiskIndicator } from "@/components/ui/RiskIndicator";

interface EntityRowProps {
  name: string;
  detail?: string;
  score?: number; // omit for rule-based (no scored risk) entities, e.g. payables
  riskLabel?: string;
  onClick?: () => void;
}

// Compact customer/supplier row used inside Risk section lists and, later,
// inside drawer list views (Phase 5) — one component, two call sites,
// concrete reuse rather than speculative.
export function EntityRow({ name, detail, score, riskLabel, onClick }: EntityRowProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={[
        "w-full flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg border border-border bg-surface-2 text-left focus-ring",
        onClick ? "hover:bg-surface-3 cursor-pointer transition-colors" : "",
      ].join(" ")}
      type={onClick ? "button" : undefined}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary truncate">{name}</p>
        {detail && <p className="text-2xs text-muted truncate">{detail}</p>}
      </div>
      {typeof score === "number" ? (
        <RiskIndicator score={score} />
      ) : riskLabel ? (
        <RiskIndicator label={riskLabel} />
      ) : null}
    </Tag>
  );
}
