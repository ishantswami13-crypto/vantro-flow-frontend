import React from "react";
import { FiArrowDown } from "react-icons/fi";
import { Badge } from "@/components/ui/Badge";
import { formatINR } from "./format";
import type { SignalImpact, ImpactComponent } from "@/lib/api";

// A clean, structured causal chain — deliberately NOT a free-form network
// graph. Each node shows only the number a decision-maker actually needs at
// that link, sourced directly from the real impact response.
function Node({ eyebrow, title, children, tone = "default" }: { eyebrow: string; title: string; children?: React.ReactNode; tone?: "default" | "danger" | "warning" }) {
  const border = tone === "danger" ? "border-danger/30" : tone === "warning" ? "border-warning/30" : "border-border";
  return (
    <div className={["card-premium p-4 w-full", border].join(" ")}>
      <p className="section-label">{eyebrow}</p>
      <p className="text-sm font-bold text-primary mt-1">{title}</p>
      {children && <div className="mt-2 space-y-0.5">{children}</div>}
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center py-1">
      <FiArrowDown className="text-muted" size={16} />
    </div>
  );
}

export function CausalChain({ impact, component }: { impact: SignalImpact; component: ImpactComponent }) {
  const affectedProductCount = component.affectedFinishedProducts.length;

  return (
    <div className="max-w-md mx-auto">
      <Node eyebrow={impact.signal.event_type || "EXTERNAL EVENT"} title={impact.signal.event_title || "External event"} tone="danger">
        {impact.signal.magnitude != null && (
          <p className="text-2xs text-muted">Magnitude {impact.signal.magnitude} {impact.signal.magnitude_unit}</p>
        )}
      </Node>
      <Connector />
      <Node eyebrow="SUPPLIER" title={impact.supplier?.name || "Unknown supplier"} tone="warning">
        <p className="text-2xs text-muted">{impact.supplier?.country} · directly exposed to the event</p>
      </Node>
      <Connector />
      <Node eyebrow="COMPONENT" title={component.component.name}>
        <p className="text-2xs text-muted font-mono">{component.component.sku}</p>
        {component.alternateSource && <Badge variant="muted" className="mt-1">Alternate source on record: {component.alternateSource.name}</Badge>}
      </Node>
      <Connector />
      <Node eyebrow="INVENTORY" title={component.coverage.sufficientData ? `${component.coverage.coverageDays} days of coverage` : "Insufficient data"} tone={component.stockout.sufficientData && (component.stockout.daysUntilStockout ?? 99) <= 14 ? "danger" : "warning"}>
        {component.stockout.sufficientData && (
          <p className="text-2xs text-muted">
            {component.stockout.alreadyBelowSafetyStock ? "Already below safety stock" : `Projected stockout ${component.stockout.stockoutDate}`}
          </p>
        )}
      </Node>
      <Connector />
      <Node eyebrow="PRODUCTS" title={`${affectedProductCount} finished product${affectedProductCount === 1 ? "" : "s"} affected`} />
      <Connector />
      <Node eyebrow="ORDERS" title={`${component.affectedDemand.affectedOrderCount} order${component.affectedDemand.affectedOrderCount === 1 ? "" : "s"} exposed`} />
      <Connector />
      <Node eyebrow="REVENUE" title={formatINR(component.revenueExposure.totalRevenueExposure)} tone="danger">
        <p className="text-2xs text-muted">Revenue exposed across at-risk open orders{component.revenueExposure.excludedLineCount ? ` (${component.revenueExposure.excludedLineCount} line excluded — missing price data)` : ""}</p>
      </Node>
    </div>
  );
}
