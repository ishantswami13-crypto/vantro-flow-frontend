import React from "react";
import { formatINR, formatDate, humanizeCode } from "./format";
import { Cite } from "./Cite";
import type { ComponentCitations, Citations } from "./citations";
import type { SignalImpact, ImpactComponent } from "@/lib/api";

// "How Starlane got here" — the cause-to-consequence trace written as
// numbered reasoning steps, each carrying a citation into the Sources
// rail. No step exists without a real number or fact behind it.
function Step({ index, title, detail, cites, last = false, tone }: {
  index: number;
  title: React.ReactNode;
  detail?: React.ReactNode;
  cites?: React.ReactNode;
  last?: boolean;
  tone?: "danger";
}) {
  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)]" style={{ paddingBottom: last ? 0 : 16 }}>
      <span aria-hidden="true" className="num" style={{ fontSize: 11.5, lineHeight: "22px", color: "var(--ink-3)" }}>{index}</span>
      <div className="min-w-0">
        <p className="text-[14px] leading-[1.55]" style={{ margin: 0, color: "var(--ink)", fontWeight: tone === "danger" && last ? 500 : 400 }}>
          {title}
          {cites}
        </p>
        {detail && <p className="text-[12.5px] mt-0.5 leading-snug" style={{ margin: "2px 0 0", color: tone === "danger" && !last ? "var(--critical)" : "var(--ink-3)" }}>{detail}</p>}
      </div>
    </li>
  );
}

export function CausalChain({ impact, component, citations, onCite }: {
  impact: SignalImpact;
  component: ImpactComponent;
  citations: Citations;
  onCite: (n: number) => void;
}) {
  const c: ComponentCitations = citations.byComponent[component.component.id] || {};
  const products = component.affectedFinishedProducts.length;
  const orders = component.affectedDemand.affectedOrderCount;
  const eventType = humanizeCode(impact.signal.event_type) || "External event";

  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      <Step
        index={1}
        title={<>{eventType}: {impact.signal.event_title || "external event"}</>}
        detail={impact.signal.magnitude != null ? `Magnitude ${impact.signal.magnitude} ${impact.signal.magnitude_unit ?? ""}`.trim() : undefined}
        cites={<Cite n={citations.event} onCite={onCite} />}
      />
      <Step
        index={2}
        title={<>It reaches {impact.supplier?.name || "a supplier"}{impact.supplier?.country ? ` (${impact.supplier.country})` : ""}, who supplies you directly.</>}
        cites={<><Cite n={citations.supplier} onCite={onCite} /><Cite n={citations.exposure} onCite={onCite} /></>}
      />
      <Step
        index={3}
        title={<>They supply {component.component.name} <span className="num text-[12px]" style={{ color: "var(--ink-3)" }}>{component.component.sku}</span>.</>}
        detail={component.alternateSource ? `Alternate source on record: ${component.alternateSource.name}` : "No alternate source on record."}
        cites={<><Cite n={c.inventory} onCite={onCite} /><Cite n={c.alternate} onCite={onCite} /></>}
      />
      <Step
        index={4}
        tone={component.stockout.sufficientData ? "danger" : undefined}
        title={component.coverage.sufficientData ? <>You have {component.coverage.coverageDays} days of stock on hand.</> : <>Not enough data to calculate stock coverage.</>}
        detail={component.stockout.sufficientData
          ? component.stockout.alreadyBelowSafetyStock
            ? "Already below safety stock."
            : `Stockout (below safety stock) in ${component.stockout.daysUntilStockout} days, ${formatDate(component.stockout.stockoutDate)}.`
          : undefined}
        cites={<><Cite n={c.coverage} onCite={onCite} /><Cite n={c.stockout} onCite={onCite} /></>}
      />
      <Step
        index={5}
        title={<>{products} finished product{products === 1 ? "" : "s"} use it, across {orders} open order{orders === 1 ? "" : "s"}.</>}
        cites={<><Cite n={c.downstream} onCite={onCite} /><Cite n={c.orders} onCite={onCite} /></>}
      />
      <Step
        index={6}
        last
        tone="danger"
        title={<><span className="tabular-nums">{formatINR(component.revenueExposure.totalRevenueExposure)}</span> of revenue is exposed.</>}
        detail={component.revenueExposure.excludedLineCount ? `${component.revenueExposure.excludedLineCount} order line(s) excluded for missing price data.` : undefined}
        cites={<Cite n={c.revenue} onCite={onCite} />}
      />
    </ol>
  );
}
