import React from "react";
import type { IntelligencePrediction, ImpactComponent } from "@/lib/api";

// "If nothing changes" — a plain horizon timeline rather than a chart,
// because the underlying data is 3 discrete deterministic checkpoints
// (7/14/30 days), not a continuous series. A line chart across 3 points
// would imply more precision than the model actually provides.
function HorizonPoint({ label, willStockOut, dataQuality }: { label: string; willStockOut: boolean | null; dataQuality: string }) {
  const insufficient = dataQuality !== "sufficient" || willStockOut === null;
  return (
    <div className="flex-1 min-w-0">
      <p className="text-2xs text-muted mb-2">{label}</p>
      <div className={[
        "rounded-xl border p-3 text-center",
        insufficient ? "border-border bg-surface-2" : willStockOut ? "border-danger/30 bg-danger-dim" : "border-success/30 bg-success-dim",
      ].join(" ")}>
        {insufficient ? (
          <span className="text-2xs text-muted">Insufficient data</span>
        ) : willStockOut ? (
          <span className="text-xs font-bold text-danger">Stocked out</span>
        ) : (
          <span className="text-xs font-bold text-success">Coverage holds</span>
        )}
      </div>
    </div>
  );
}

export function ForecastTimeline({ predictions, component }: { predictions: IntelligencePrediction[]; component: ImpactComponent }) {
  const byHorizon = [7, 14, 30].map((h) => predictions.find((p) => p.horizon_days === h) || null);

  return (
    <div>
      <p className="text-[13px] mb-4" style={{ color: "#8A8A86" }}>If nothing changes</p>
      <div className="flex items-stretch gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-2xs text-muted mb-2">Today</p>
          <div className="rounded-xl border border-border bg-surface-2 p-3 text-center">
            <span className="text-xs font-bold text-primary">
              {component.coverage.sufficientData ? `${component.coverage.coverageDays}d coverage` : "—"}
            </span>
          </div>
        </div>
        {byHorizon.map((p, i) => (
          <HorizonPoint
            key={i}
            label={`Day ${[7, 14, 30][i]}`}
            willStockOut={p ? p.point_estimate != null && p.point_estimate >= 1 : null}
            dataQuality={p?.data_quality || "insufficient"}
          />
        ))}
      </div>
      <p className="text-2xs text-muted mt-2">
        Based on current inventory, average daily demand, and safety stock — see evidence for the underlying figures. This is a forecast, not an observation.
      </p>
    </div>
  );
}
