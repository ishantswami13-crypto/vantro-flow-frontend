import React from "react";
import { Badge } from "@/components/ui/Badge";
import { formatINR } from "./format";
import type { SignalImpact, ImpactComponent } from "@/lib/api";

// Starlane's signature causal-trace primitive — cause to consequence as one
// continuous editorial composition, not a flowchart. Deliberately NOT boxes
// connected by arrow icons: a single thin vertical rule runs through every
// node, each node is a small state marker + mono eyebrow + typographic
// title, sourced directly from the real impact response. No node exists
// without a real number or fact behind it.
const TONE_COLOR: Record<"default" | "danger" | "warning", string> = {
  default: "var(--border-2, #2a2a2a)",
  warning: "#F5A524",
  danger:  "#F5424D",
};

function Node({ eyebrow, title, children, tone = "default", last = false }: {
  eyebrow: string; title: string; children?: React.ReactNode; tone?: "default" | "danger" | "warning"; last?: boolean;
}) {
  return (
    <div className="relative pl-6" style={{ paddingBottom: last ? 0 : 28 }}>
      {/* the continuous trace line */}
      {!last && (
        <span aria-hidden="true" className="absolute left-[3px] top-3 bottom-0" style={{ width: 1, background: "var(--border)" }} />
      )}
      {/* state marker */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1.5 rounded-full"
        style={{ width: 7, height: 7, border: `1.5px solid ${TONE_COLOR[tone]}`, background: tone === "default" ? "transparent" : TONE_COLOR[tone] }}
      />
      <p className="text-2xs font-mono tracking-wider text-muted uppercase">{eyebrow}</p>
      <p className="text-sm font-bold text-primary mt-0.5">{title}</p>
      {children && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

export function CausalChain({ impact, component }: { impact: SignalImpact; component: ImpactComponent }) {
  const affectedProductCount = component.affectedFinishedProducts.length;

  return (
    <div className="max-w-md">
      <Node eyebrow={impact.signal.event_type || "External event"} title={impact.signal.event_title || "External event"} tone="danger">
        {impact.signal.magnitude != null && (
          <p className="text-2xs text-muted">Magnitude {impact.signal.magnitude} {impact.signal.magnitude_unit}</p>
        )}
      </Node>
      <Node eyebrow="Connected supplier" title={impact.supplier?.name || "Unknown supplier"} tone="warning">
        <p className="text-2xs text-muted">{impact.supplier?.country} · directly exposed to the event</p>
      </Node>
      <Node eyebrow="Dependency" title={component.component.name}>
        <p className="text-2xs text-muted font-mono">{component.component.sku}</p>
        {component.alternateSource && <Badge variant="muted" className="mt-1">Alternate source on record: {component.alternateSource.name}</Badge>}
      </Node>
      <Node
        eyebrow="Calculated coverage"
        title={component.coverage.sufficientData ? `${component.coverage.coverageDays} days of coverage` : "Insufficient data"}
        tone={component.stockout.sufficientData && (component.stockout.daysUntilStockout ?? 99) <= 14 ? "danger" : "warning"}
      >
        {component.stockout.sufficientData && (
          <p className="text-2xs text-muted">
            {component.stockout.alreadyBelowSafetyStock ? "Already below safety stock" : `Projected stockout ${component.stockout.stockoutDate}`}
          </p>
        )}
      </Node>
      <Node eyebrow="Affected products" title={`${affectedProductCount} finished product${affectedProductCount === 1 ? "" : "s"} affected`} />
      <Node eyebrow="Exposed orders" title={`${component.affectedDemand.affectedOrderCount} order${component.affectedDemand.affectedOrderCount === 1 ? "" : "s"} exposed`} />
      <Node eyebrow="Potential revenue exposure" title={formatINR(component.revenueExposure.totalRevenueExposure)} tone="danger" last>
        <p className="text-2xs text-muted">Revenue exposed across at-risk open orders{component.revenueExposure.excludedLineCount ? ` (${component.revenueExposure.excludedLineCount} line excluded — missing price data)` : ""}</p>
      </Node>
    </div>
  );
}
