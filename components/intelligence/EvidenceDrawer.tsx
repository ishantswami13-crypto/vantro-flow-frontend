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
      <div className="space-y-5">
        {grouped.map((group) => (
          <div key={group.kind}>
            <div className="mb-2">
              <EvidenceKindBadge kind={group.kind} />
            </div>
            <ul className="space-y-2">
              {group.items.map((item, i) => (
                <li key={`${group.kind}-${i}`} className="card-premium p-3">
                  <p className="text-xs font-semibold text-primary">{item.label}</p>
                  <p className="text-2xs text-secondary mt-1 leading-relaxed">{item.detail}</p>
                  <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                    <span className="text-2xs text-muted font-mono truncate">{item.source}</span>
                    <ConfidenceBadge level={item.confidence} />
                  </div>
                  {item.timestamp && <p className="text-2xs text-muted mt-1">{formatDateTime(item.timestamp)}</p>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
