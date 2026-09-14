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

export function EvidenceDrawer({ evidence, onClose }: { evidence: IntelligenceEvidenceItem[]; onClose: () => void }) {
  const grouped = GROUP_ORDER.map((kind) => ({ kind, items: evidence.filter((e) => e.kind === kind) })).filter((g) => g.items.length > 0);

  return (
    <Drawer titleId="evidence-drawer-title" title="Why Starlane believes this" onClose={onClose}>
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
    </Drawer>
  );
}
