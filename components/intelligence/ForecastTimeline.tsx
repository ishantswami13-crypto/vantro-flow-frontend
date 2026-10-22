import React from "react";
import { StatusChip } from "@/components/ui/Badge";
import type { IntelligencePrediction, ImpactComponent } from "@/lib/api";

// "If nothing changes": a plain horizon strip rather than a chart, because
// the data is 3 discrete deterministic checkpoints (7/14/30 days), not a
// continuous series. A line across 3 points would imply more precision than
// the model provides.
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0" style={{ padding: "12px 0" }}>
      <div className="tabular-nums" style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function HorizonPoint({ label, willStockOut, dataQuality }: { label: string; willStockOut: boolean | null; dataQuality: string }) {
  const insufficient = dataQuality !== "sufficient" || willStockOut === null;
  return (
    <Cell label={label}>
      {insufficient
        ? <StatusChip tone="unknown">Not enough data</StatusChip>
        : willStockOut
          ? <StatusChip tone="critical">Stocked out</StatusChip>
          : <StatusChip tone="positive">Coverage holds</StatusChip>}
    </Cell>
  );
}

export function ForecastTimeline({ predictions, component }: { predictions: IntelligencePrediction[]; component: ImpactComponent }) {
  const byHorizon = [7, 14, 30].map((h) => predictions.find((p) => p.horizon_days === h) || null);

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ columnGap: 24, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <Cell label="Today">
          <span className="tabular-nums" style={{ fontSize: 13, color: "var(--ink)" }}>
            {component.coverage.sufficientData ? `${component.coverage.coverageDays} days of stock` : "Not known yet"}
          </span>
        </Cell>
        {byHorizon.map((p, i) => (
          <HorizonPoint
            key={i}
            label={`Day ${[7, 14, 30][i]}`}
            willStockOut={p ? p.point_estimate != null && p.point_estimate >= 1 : null}
            dataQuality={p?.data_quality || "insufficient"}
          />
        ))}
      </div>
      <p className="meta" style={{ margin: "10px 0 0", lineHeight: 1.55, maxWidth: "68ch" }}>
        &ldquo;Stocked out&rdquo; means below safety stock. Based on current inventory, average daily demand and safety stock; the sources hold the underlying figures. This is a forecast, not an observation.
      </p>
    </div>
  );
}
