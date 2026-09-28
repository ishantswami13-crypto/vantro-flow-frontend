import type { IntelligenceEvidenceItem, ImpactComponent } from "@/lib/api";

// Maps each claim on the signal page to the 1-based position of the
// evidence item that backs it, so prose can carry numbered citations that
// point into the Sources rail. Built only from the real evidence array the
// backend returns (see getSignalImpact in supplyChainOrchestrator.js): the
// signal-level items come first, then one run of items per component,
// each run starting with "Component inventory".
export type ComponentCitations = Partial<Record<
  "inventory" | "coverage" | "stockout" | "downstream" | "orders" | "revenue" | "leadTime" | "alternate",
  number
>>;

export interface Citations {
  event?: number;
  exposure?: number;
  supplier?: number;
  byComponent: Record<string, ComponentCitations>;
}

const COMPONENT_LABELS: Record<string, keyof ComponentCitations> = {
  "Component inventory": "inventory",
  "Inventory coverage": "coverage",
  "Projected stockout": "stockout",
  "Downstream products affected": "downstream",
  "Open orders at risk": "orders",
  "Revenue exposure": "revenue",
  "Supplier lead time": "leadTime",
  "Alternate source on record": "alternate",
};

export function buildCitations(evidence: IntelligenceEvidenceItem[], components: ImpactComponent[]): Citations {
  const out: Citations = { byComponent: {} };
  let componentIdx = -1;
  evidence.forEach((item, i) => {
    const n = i + 1;
    if (item.label === "External event" && out.event == null) out.event = n;
    else if (item.label === "Business exposure" && out.exposure == null) out.exposure = n;
    else if (item.label === "Supplier" && out.supplier == null) out.supplier = n;
    else if (item.label in COMPONENT_LABELS) {
      if (item.label === "Component inventory") componentIdx += 1;
      const component = components[Math.max(componentIdx, 0)];
      if (!component) return;
      const slot = (out.byComponent[component.component.id] ||= {});
      const key = COMPONENT_LABELS[item.label];
      if (slot[key] == null) slot[key] = n;
    }
  });
  return out;
}
