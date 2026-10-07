import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BrainSummary } from "@/lib/api";
import { inr } from "@/lib/format";

interface MoneySectionProps {
  brain: BrainSummary | null;
}

// Money is always written in full (lib/format).
function fmtINR(n: number): string {
  return inr(n);
}

// Cash position: receivable / payable / net, from brain.position only.
// No aging buckets — confirmed absent from the backend (see implementation
// plan §3/§5) — so this section stays a 3-number snapshot, not fabricated
// into buckets the backend doesn't compute.
//
// These three numbers are related facts, not three independent statuses —
// they don't need three different accent colors to be readable. Open
// typographic columns with a thin divider; color reserved for the one
// case that's genuinely a problem (net position negative).
export function MoneySection({ brain }: MoneySectionProps) {
  if (!brain) {
    return <EmptyState title="No cash position data yet" />;
  }

  const { position } = brain;
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-stretch gap-4 sm:gap-0 sm:divide-x sm:divide-border">
      <div className="sm:pr-6">
        <p className="metric-value text-xl text-primary">{fmtINR(position.receivable)}</p>
        <p className="text-2xs text-muted mt-0.5">
          Customers still need to pay you · {position.customerCount} customer{position.customerCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="sm:px-6">
        <p className="metric-value text-xl text-primary">{fmtINR(position.payable)}</p>
        <p className="text-2xs text-muted mt-0.5">
          You still need to pay suppliers · {position.supplierCount} supplier{position.supplierCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="sm:pl-6">
        <p className={["metric-value text-xl", position.net >= 0 ? "text-primary" : "text-danger"].join(" ")}>{fmtINR(position.net)}</p>
        <p className="text-2xs text-muted mt-0.5">
          Overall balance{position.setoffTotal > 0 ? ` · ${fmtINR(position.setoffTotal)} can be adjusted between customers and suppliers` : ""}
        </p>
      </div>
    </div>
  );
}
