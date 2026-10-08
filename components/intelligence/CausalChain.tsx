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
    <li className="relative pl-9" style={{ paddingBottom: last ? 0 : 20 }}>
      {!last && <span aria-hidden="true" className="absolute left-[11px] top-7 bottom-0" style={{ width: 1, background: "var(--line-hairline)" }} />}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 inline-flex items-center justify-center w-[23px] h-[23px] rounded-full text-[11px] font-semibold"
        style={{
          background: tone === "danger" ? "rgb(var(--tk-critical) / 0.10)" : "var(--surface-2)",
          color: tone === "danger" ? "var(--critical)" : "var(--ink-2)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {index}
      </span>
      <p className="text-[14px] leading-[1.55]" style={{ color: "var(--ink)" }}>
        {title}
        {cites}
      </p>
      {detail && <p className="text-[12.5px] mt-0.5 leading-snug" style={{ color: "var(--ink-3)" }}>{detail}</p>}
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
    <ol>
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
        title={<>They supply {component.component.name} <span className="text-[12px] tabular-nums" style={{ color: "var(--ink-3)" }}>{component.component.sku}</span>.</>}
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
        title={<>{formatINR(component.revenueExposure.totalRevenueExposure)} of revenue is exposed.</>}
        detail={component.revenueExposure.excludedLineCount ? `${component.revenueExposure.excludedLineCount} order line(s) excluded for missing price data.` : undefined}
        cites={<Cite n={c.revenue} onCite={onCite} />}
      />
    </ol>
  );
}
