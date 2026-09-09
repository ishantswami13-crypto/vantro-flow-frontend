import React from "react";
import { MetricCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BrainSummary } from "@/lib/api";

interface MoneySectionProps {
  brain: BrainSummary | null;
}

function fmtINR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

// Cash position: receivable / payable / net, from brain.position only.
// No aging buckets — confirmed absent from the backend (see implementation
// plan §3/§5) — so this section stays a 3-number snapshot, not fabricated
// into buckets the backend doesn't compute.
export function MoneySection({ brain }: MoneySectionProps) {
  if (!brain) {
    return <EmptyState title="No cash position data yet" />;
  }

  const { position } = brain;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <MetricCard
        label="Customers still need to pay you"
        value={fmtINR(position.receivable)}
        sub={`${position.customerCount} customer${position.customerCount === 1 ? "" : "s"}`}
        accent="success"
      />
      <MetricCard
        label="You still need to pay suppliers"
        value={fmtINR(position.payable)}
        sub={`${position.supplierCount} supplier${position.supplierCount === 1 ? "" : "s"}`}
        accent="warning"
      />
      <MetricCard
        label="Overall balance"
        value={fmtINR(position.net)}
        sub={position.setoffTotal > 0 ? `${fmtINR(position.setoffTotal)} can be adjusted between customers and suppliers` : undefined}
        accent={position.net >= 0 ? "default" : "danger"}
      />
    </div>
  );
}
