import React from "react";
import { Signal } from "./Signal";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RankedAction } from "@/lib/api";

interface SignalsSectionProps {
  rankedActions: RankedAction[];
}

const TOP_N = 3;

// "What changed" — narrow in V1 by design: only credit-tier-worsening
// (CREDIT_RISK_ALERT) and cashflow-gap (CASHFLOW_GAP_ALERT) actions actually
// represent a *change* the backend detected, as opposed to a standing
// condition. See implementation plan §3/§5 — this is not a general
// "what changed" feed, and is not presented as one.
const CHANGE_ACTION_TYPES = new Set(["CREDIT_RISK_ALERT", "CASHFLOW_GAP_ALERT"]);

export function SignalsSection({ rankedActions }: SignalsSectionProps) {
  const signals = rankedActions.filter(a => CHANGE_ACTION_TYPES.has(a.action_type)).slice(0, TOP_N);

  if (signals.length === 0) {
    return <EmptyState title="No notable changes right now" />;
  }

  return (
    <div className="space-y-2">
      {signals.map(a => (
        <Signal key={a.id} action={a} />
      ))}
    </div>
  );
}
