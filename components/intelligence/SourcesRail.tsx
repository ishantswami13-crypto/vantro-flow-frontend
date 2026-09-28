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
      <p className="text-[11px] font-semibold uppercase mb-3" style={{ color: "#8A8A86", letterSpacing: "0.08em" }}>
        Sources · {evidence.length}
      </p>
      <ol className="space-y-1.5">
        {evidence.map((item, i) => {
          const n = i + 1;
          const active = highlighted === n;
          return (
            <li
              key={n}
              id={`source-${n}`}
              className="rounded-lg px-3 py-2.5 transition-colors"
              style={{ background: active ? "#FFFFFF" : "transparent", border: `1px solid ${active ? "var(--id-b, #D7D6D0)" : "transparent"}` }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="shrink-0 mt-[1px] inline-flex items-center justify-center min-w-[18px] h-[18px] rounded text-[10px] font-semibold"
                  style={{ background: "#EDEDE9", color: "#63635F", fontVariantNumeric: "tabular-nums" }}
                >
                  {n}
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium" style={{ color: "#191917" }}>{item.label}</p>
                  <p className="text-[12px] leading-snug mt-0.5" style={{ color: "#63635F" }}>{item.detail}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <EvidenceKindBadge kind={item.kind} />
                    <span className="text-[11px]" style={{ color: "#8A8A86" }}>
                      {item.confidence === "UNKNOWN" ? "Confidence unknown" : `${humanizeCode(item.confidence)} confidence`}
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
