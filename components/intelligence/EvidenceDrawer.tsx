"use client";

import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import { formatDateTime } from "./format";
import { formatRelative } from "@/lib/format";
import css from "./evidence.module.css";
import type { IntelligenceEvidenceItem } from "@/lib/api";

// This drawer is a trust surface, not decoration — every conclusion shown
// elsewhere on the impact screen must be traceable back to one of these
// items. Grouping by kind keeps facts, assumptions, and forecasts visually
// separated rather than interleaved.
const KIND_LABEL: Record<IntelligenceEvidenceItem["kind"], string> = {
  OBSERVED_FACT: "Observed",
  CALCULATED_FACT: "Calculated",
  ASSUMPTION: "Assumption",
  FORECAST: "Forecast",
  EXTERNAL_EVIDENCE: "External",
  INTERNAL_EVIDENCE: "Internal",
};

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
      eyebrow={<span className="section-label" style={{ margin: 0 }}>Evidence</span>}
      titleSize={18}
      subtitle={record}
      footer="Conclusion → analysis → evidence → source record. Every figure in Starlane can be traced back to here."
    >
      <p className={css.intro}>
        Facts were read directly from your records or the external event. Assumptions are planning parameters. Forecasts are projections, not observations.
      </p>
      {/* Open list on hairlines, not a card per fact. Only real fields
          render: claim, kind, source, timestamp, confidence. */}
      {grouped.map((group) => (
        <div key={group.kind} className={css.group}>
          <div className={css.groupHead}>
            <h3 className="section-label" style={{ margin: 0 }}>{KIND_LABEL[group.kind]}</h3>
            <span className={css.count}>{group.items.length}</span>
          </div>
          <ul className={css.items}>
            {group.items.map((item, i) => (
              <li key={`${group.kind}-${i}`} className={css.item}>
                <div className={css.head}><span className={css.label}>{item.label}</span></div>
                <p className={css.detail}>{item.detail}</p>
                <div className={css.src}>
                  {item.source && <span className={css.kind}>{item.source}</span>}
                  {item.timestamp && <span title={formatDateTime(item.timestamp)}>{formatRelative(item.timestamp)}</span>}
                  <span className={css.kind}>{item.confidence === "UNKNOWN" ? "Confidence not known" : `${item.confidence.charAt(0)}${item.confidence.slice(1).toLowerCase()} confidence`}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Drawer>
  );
}
