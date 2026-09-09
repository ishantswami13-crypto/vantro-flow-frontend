import React from "react";
import { Signal } from "./Signal";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RankedAction, BrainSummary } from "@/lib/api";

interface SignalsSectionProps {
  rankedActions: RankedAction[];
  brain?: BrainSummary | null;
}

const TOP_N = 3;

// "What changed" — narrow in V1 by design: only credit-tier-worsening
// (CREDIT_RISK_ALERT) and cashflow-gap (CASHFLOW_GAP_ALERT) actions actually
// represent a *change* the backend detected, as opposed to a standing
// condition. See implementation plan §3/§5 — this is not a general
// "what changed" feed, and is not presented as one.
const CHANGE_ACTION_TYPES = new Set(["CREDIT_RISK_ALERT", "CASHFLOW_GAP_ALERT"]);

function fmtINR(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}K`;
  return `₹${abs.toLocaleString("en-IN")}`;
}

// Q5 — "is there anything I should pay attention to": objective, directly
// provable-from-records facts only. No new detection logic — this reuses
// numbers already computed by brainSummary.js (brain.receivables' own
// days_overdue field, brain.payables' own due_date) and the existing
// rules-engine alerts above. If neither has anything to show, the honest
// answer is "Nothing urgent right now" — that is a legitimate state, not a
// missing feature.
function buildFactualNotices(brain?: BrainSummary | null): string[] {
  if (!brain) return [];
  const notices: string[] = [];

  const veryLate = (brain.receivables || []).filter((r) => r.daysLate > 30);
  if (veryLate.length > 0) {
    notices.push(`${veryLate.length} customer${veryLate.length === 1 ? " hasn't" : "s haven't"} paid you in over 30 days.`);
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const dueTomorrow = (brain.payables || []).filter((p) => p.dueDate === tomorrowStr);
  if (dueTomorrow.length > 0) {
    const total = dueTomorrow.reduce((a, p) => a + p.amount, 0);
    notices.push(`${fmtINR(total)} needs to be paid to supplier${dueTomorrow.length === 1 ? "" : "s"} tomorrow.`);
  }

  return notices;
}

export function SignalsSection({ rankedActions, brain }: SignalsSectionProps) {
  const signals = rankedActions.filter(a => CHANGE_ACTION_TYPES.has(a.action_type)).slice(0, TOP_N);
  const notices = buildFactualNotices(brain);

  if (signals.length === 0 && notices.length === 0) {
    return <EmptyState title="Nothing urgent right now" />;
  }

  return (
    <div className="space-y-2">
      {notices.map((n) => (
        <div key={n} className="text-sm text-primary bg-surface-2 border border-border rounded-lg px-3 py-2.5">
          {n}
        </div>
      ))}
      {signals.map(a => (
        <Signal key={a.id} action={a} />
      ))}
    </div>
  );
}
