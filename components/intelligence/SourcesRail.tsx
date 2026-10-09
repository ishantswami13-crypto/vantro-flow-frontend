import React from "react";
import { EvidenceKindBadge } from "./EvidenceKindBadge";
import { formatDateTime, humanizeCode } from "./format";
import type { IntelligenceEvidenceItem } from "@/lib/api";

// Persistent, numbered list of every evidence item behind the page — the
// numbers match the inline citations in the reading column. Real fields
// only: label, detail, kind, source, timestamp, confidence.
export function SourcesRail({ evidence, highlighted }: { evidence: IntelligenceEvidenceItem[]; highlighted: number | null }) {
  return (
    <div>
      <h2 className="section-label">Sources<span className="wk-count">{evidence.length}</span></h2>
      <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {evidence.map((item, i) => {
          const n = i + 1;
          const active = highlighted === n;
          return (
            <li
              key={n}
              id={`source-${n}`}
              className="int-source"
              data-active={active || undefined}
            >
              <div className="flex items-start gap-2.5">
                <span className="num shrink-0" style={{ minWidth: 16, fontSize: 11, lineHeight: "18px", color: "var(--ink-3)" }}>
                  {n}
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium" style={{ color: "var(--ink)" }}>{item.label}</p>
                  <p className="text-[12px] leading-snug mt-0.5" style={{ color: "var(--ink-2)" }}>{item.detail}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <EvidenceKindBadge kind={item.kind} />
                    <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                      {item.confidence === "UNKNOWN" ? "Confidence not known yet" : `${humanizeCode(item.confidence)} confidence`}
                      {item.timestamp ? ` · ${formatDateTime(item.timestamp)}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
