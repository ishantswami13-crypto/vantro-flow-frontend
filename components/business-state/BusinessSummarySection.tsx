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

// Q1 (money left after purchases) + Q4 (vs last month) — renders brain.kpis
// with the backend's own approximation caveats surfaced verbatim, and never
// labels this figure "profit" since purchases here are total spend booked
// this month, not cost of goods sold, and expenses aren't included (see
// brainSummary.js).
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

  const { kpis, approximations, salesTrend } = brain;
  const cashTrend: "up" | "down" | "neutral" = kpis.netCashFlow > 0 ? "up" : kpis.netCashFlow < 0 ? "down" : "neutral";

  // Real 6-month series, already computed by brainSummary.js — just never
  // wired into a chart before. Only shown once there's more than one
  // non-zero month, otherwise a "trend" of five flat zeros and one real
  // value reads as more history than actually exists.
  const salesSeries = salesTrend && salesTrend.filter((m) => m.s > 0).length > 1
    ? salesTrend.map((m) => m.s)
    : undefined;

  // Q4 — one plain sentence, comparing the same number of days in each
  // month (the backend now bounds last month's total to the same
  // day-of-month as today, so a partial current month is never held up
  // against a full previous one).
  const salesDiff = Math.abs(kpis.salesThis - kpis.salesPrev);
  let comparisonLine: string;
  if (kpis.salesPrev === 0 && kpis.salesThis === 0) {
    comparisonLine = "No sales recorded yet this month or in the same days last month.";
  } else if (Math.abs(kpis.salesDelta) < 3) {
    comparisonLine = "Sales are about the same as last month so far.";
  } else if (kpis.salesDelta > 0) {
    comparisonLine = `Sales are ${fmtINR(salesDiff)} higher than last month, comparing the same number of days.`;
  } else {
    comparisonLine = `Sales are ${fmtINR(salesDiff)} lower than last month, comparing the same number of days.`;
  }

  // Q1 — this figure is sales minus recorded purchases, not accounting
  // profit: "purchases" here is total spend booked this month (whether or
  // not that stock has sold yet), and operating expenses like rent or
  // salaries aren't captured at all. So it's only shown once there is some
  // purchase data to subtract, and it is never called "profit" — the label
  // and sub-copy describe exactly what is and isn't included.
  const profitSub = kpis.hasCostData
    ? "Sales minus recorded purchases this month — doesn't account for unsold stock or expenses like rent and salaries"
    : "No purchases or expenses recorded yet — this is sales only, not a profit figure";

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Sales so far this month"
          value={fmtINR(kpis.salesThis)}
          sub="booked sales, whether or not paid yet"
          accent="default"
          series={salesSeries}
        />
        <MetricCard
          label={kpis.hasCostData ? "Left after recorded purchases" : "Sales so far (no cost data yet)"}
          value={fmtINR(kpis.grossProfit)}
          sub={profitSub}
          accent="default"
        />
        <MetricCard
          label="Money received minus money paid"
          value={fmtINR(kpis.netCashFlow)}
          trend={cashTrend}
          sub="this month, from recorded payments only"
          accent={cashTrend === "down" ? "danger" : "default"}
        />
      </div>
      <p className="text-xs text-secondary mt-3">{comparisonLine}</p>
      {kpis.hasCostData && <p className="text-2xs text-muted mt-1">{approximations.grossProfit}</p>}
    </div>
  );
}
