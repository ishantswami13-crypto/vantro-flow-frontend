"use client";

import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import { EvidenceKindBadge, ConfidenceBadge } from "./EvidenceKindBadge";
import { formatDateTime } from "./format";
import type { IntelligenceEvidenceItem } from "@/lib/api";

// This drawer is a trust surface, not decoration — every conclusion shown
// elsewhere on the impact screen must be traceable back to one of these
// items. Grouping by kind keeps facts, assumptions, and forecasts visually
// separated rather than interleaved.
const GROUP_ORDER: IntelligenceEvidenceItem["kind"][] = [
  "EXTERNAL_EVIDENCE",
  "OBSERVED_FACT",
  "CALCULATED_FACT",
  "ASSUMPTION",
  "FORECAST",
  "INTERNAL_EVIDENCE",
];

// Canonical Evidence drawer per STARLANE_FRONTEND_HANDOFF.md §10: same
// Drawer.tsx shell as LensDrawer, "EVIDENCE" label + Fraunces title +
// record subtitle, and the fixed trust-caption footer bar (verbatim
// copy from the handoff). `title`/`record` are optional so the existing
// call site (app/intelligence/[signalId]/page.tsx) keeps working
// unchanged; new call sites can pass a real record/title pair.
export function EvidenceDrawer({
  evidence,
  onClose,
  title = "Why Starlane believes this",
  record,
}: {
  evidence: IntelligenceEvidenceItem[];
  onClose: () => void;
  title?: string;
  record?: string;
}) {
  const grouped = GROUP_ORDER.map((kind) => ({ kind, items: evidence.filter((e) => e.kind === kind) })).filter((g) => g.items.length > 0);

  return (
    <Drawer titleId="evidence-drawer-title" title={title} onClose={onClose}>
      <div className="-mx-4 -mt-4 mb-4 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #EBEAE6" }}>
        <p className="v32-section-label mb-2">Evidence</p>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 19, color: "#191917" }}>{title}</p>
        {record && <p className="text-[12.5px] mt-1" style={{ color: "#63635F" }}>{record}</p>}
      </div>
      <p className="text-2xs text-muted mb-4 leading-relaxed">
        Every number on this screen traces back to one of the items below. Facts are things Starlane read directly from your
        records or the external event. Assumptions are planning parameters you or Starlane recorded. Forecasts are
        projections, not observations.
      </p>
      {/* Open list, thin dividers — not a card per fact. Opening this drawer
          should feel like reading the system's reasoning, not scrolling a
          stack of boxes. Only real fields render: claim, classification,
          source, timestamp, confidence — nothing invented to fill a slot
          this data doesn't have (no Entity/Location/Calculation, since the
          API doesn't carry them). */}
      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.kind}>
            <div className="mb-1">
              <EvidenceKindBadge kind={group.kind} />
            </div>
            <ul className="divide-y divide-border border-t border-border mt-2">
              {group.items.map((item, i) => (
                <li key={`${group.kind}-${i}`} className="py-3">
                  <p className="text-xs font-semibold text-primary">{item.label}</p>
                  <p className="text-2xs text-secondary mt-1 leading-relaxed">{item.detail}</p>
                  <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                    <span className="text-2xs text-muted font-mono truncate">
                      {item.source}{item.timestamp ? ` · ${formatDateTime(item.timestamp)}` : ""}
                    </span>
                    <ConfidenceBadge level={item.confidence} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="-mx-4 -mb-4 mt-6 px-4 py-3.5" style={{ borderTop: "1px solid #EBEAE6" }}>
        <p className="text-[11.5px]" style={{ color: "#63635F" }}>
          Conclusion → analysis → evidence → source record. Every figure in Starlane can be traced back to here.
        </p>
      </div>
    </Drawer>
  );
}
