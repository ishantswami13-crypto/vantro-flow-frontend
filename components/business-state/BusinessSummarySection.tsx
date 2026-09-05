import React from "react";
import { MetricCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BrainSummary } from "@/lib/api";

interface BusinessSummarySectionProps {
  brain: BrainSummary | null;
  brainSection?: "ok" | "disabled" | "error";
}

function fmtINR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

// Renders a subset of brain.kpis — sales delta, gross profit, net cash flow —
// with the backend's own approximation caveats surfaced verbatim rather than
// hidden, since brainSummary.js explicitly documents these as approximate.
export function BusinessSummarySection({ brain, brainSection }: BusinessSummarySectionProps) {
  if (!brain) {
    if (brainSection === "disabled") {
      return (
        <EmptyState
          title="Business Summary isn't enabled for this account yet"
          message="Ask STARLANE support to turn on the brain dashboard for this business."
        />
      );
    }
    return (
      <EmptyState
        title="Business Summary is temporarily unavailable"
        message="This section will come back automatically once it's reachable again."
      />
    );
  }

  const { kpis, approximations } = brain;
  const salesTrend: "up" | "down" | "neutral" = kpis.salesDelta > 0 ? "up" : kpis.salesDelta < 0 ? "down" : "neutral";
  const cashTrend: "up" | "down" | "neutral" = kpis.netCashFlow > 0 ? "up" : kpis.netCashFlow < 0 ? "down" : "neutral";

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Sales this month"
          value={fmtINR(kpis.salesThis)}
          trend={salesTrend}
          trendValue={`${Math.abs(kpis.salesDelta)}%`}
          sub="vs last month"
          accent={salesTrend === "down" ? "danger" : "default"}
        />
        <MetricCard
          label="Gross profit (approx.)"
          value={fmtINR(kpis.grossProfit)}
          sub={`${kpis.margin}% margin`}
          accent="success"
        />
        <MetricCard
          label="Net cash flow"
          value={fmtINR(kpis.netCashFlow)}
          trend={cashTrend}
          sub="this month"
          accent={cashTrend === "down" ? "danger" : "default"}
        />
      </div>
      <p className="text-2xs text-muted mt-2">{approximations.grossProfit}</p>
    </div>
  );
}
