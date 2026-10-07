import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BrainSummary } from "@/lib/api";
import { inr } from "@/lib/format";

interface WhoOwesYouSectionProps {
  brain: BrainSummary | null;
}

const TOP_N = 8;

// Money is always written in full (lib/format).
function fmtINR(n: number): string {
  return inr(n);
}

// Q2 — "who owes me money, and who is taking too long to pay": a plain
// per-customer list of pending amount + days-late, straight from each
// unpaid invoice's own `days_overdue` field (brain.receivables, computed in
// lib/brain/brainSummary.js). No aging buckets, no "DPD"/"outstanding
// ledger" language — just Pending / Due today / N days late.
function dueLabel(daysLate: number): string {
  if (daysLate > 0) return `${daysLate} day${daysLate === 1 ? "" : "s"} late`;
  if (daysLate === 0) return "Due today";
  return "Not yet due";
}

function dueTone(daysLate: number): "danger" | "warning" | "default" {
  if (daysLate > 30) return "danger";
  if (daysLate > 0) return "warning";
  return "default";
}

export function WhoOwesYouSection({ brain }: WhoOwesYouSectionProps) {
  if (!brain) {
    return <EmptyState title="No customer payment data yet" />;
  }

  const receivables = brain.receivables || [];
  const top = receivables.slice(0, TOP_N);
  const lateCount = receivables.filter((r) => r.daysLate > 0).length;

  if (top.length === 0) {
    return <EmptyState title="No customer owes you money right now" message="Every recorded invoice has been paid." />;
  }

  return (
    <div>
      <p className="text-2xs text-muted mb-2">
        {receivables.length} customer{receivables.length === 1 ? "" : "s"} still {receivables.length === 1 ? "owes" : "owe"} you money
        {lateCount > 0 ? `, ${lateCount} of them late` : ""}.
      </p>
      <div className="space-y-2">
        {top.map((r) => {
          const tone = dueTone(r.daysLate);
          return (
            <div
              key={r.name}
              className="w-full flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg border border-border bg-surface-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{r.name}</p>
                <p className="text-2xs text-muted truncate">{fmtINR(r.amount)} pending</p>
              </div>
              <span
                className={[
                  "text-2xs font-bold shrink-0 px-2 py-1 rounded-full",
                  tone === "danger" ? "text-danger bg-danger/10" : tone === "warning" ? "text-warning bg-warning/10" : "text-muted bg-surface-3",
                ].join(" ")}
              >
                {dueLabel(r.daysLate)}
              </span>
            </div>
          );
        })}
      </div>
      {receivables.length > TOP_N && (
        <p className="text-2xs text-muted mt-2">+{receivables.length - TOP_N} more customer{receivables.length - TOP_N === 1 ? "" : "s"} with pending amounts.</p>
      )}
    </div>
  );
}
