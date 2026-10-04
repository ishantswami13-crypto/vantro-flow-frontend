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
    <Drawer
      titleId="evidence-drawer-title"
      title={title}
      onClose={onClose}
      eyebrow="Evidence"
      titleSize={19}
      subtitle={record ? <span style={{ fontSize: 12.5 }}>{record}</span> : undefined}
      footer="Conclusion → analysis → evidence → source record. Every figure in Starlane can be traced back to here."
    >
      <p className="mb-5" style={{ fontSize: 12.5, color: "#63635F", lineHeight: 1.6 }}>
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
            <ul className="mt-2" style={{ borderTop: "1px solid #EBEAE6" }}>
              {group.items.map((item, i) => (
                <li key={`${group.kind}-${i}`} className="py-3" style={{ borderBottom: "1px solid #EBEAE6" }}>
                  <p style={{ fontSize: 13, color: "#191917" }}>{item.label}</p>
                  <p className="mt-1" style={{ fontSize: 12.5, color: "#43433F", lineHeight: 1.55 }}>{item.detail}</p>
                  <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                    <span className="truncate" style={{ fontSize: 11.5, color: "#8A8A86", fontFamily: "'IBM Plex Mono', monospace" }}>
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
    </Drawer>
  );
}
