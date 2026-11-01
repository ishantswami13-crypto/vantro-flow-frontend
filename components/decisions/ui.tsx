"use client";

// Small presentational pieces shared by the decision screens. Display only:
// every number passed in was computed by the backend engine.

import React from "react";
import type { Interval, HealthDimension } from "@/lib/decisions";
import { money, BAND_LABEL } from "@/lib/decisions";

// Version 32 tokens (STARLANE_FRONTEND_HANDOFF.md §3).
export const C = {
  ink: "#191917",
  body: "#43433F",
  muted: "#63635F",
  faint: "#6E6E6A", // 4.5:1 on the page background (was #6E6E69, 3.1:1)
  line: "#EBEAE6",
  card: "rgba(25,25,23,0.10)",
  wash: "#F3F2EE",
  good: "#477054",
  warn: "#8C6826",
  bad: "#A64F4B",
  accent: "var(--accent, #696D86)",
};

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3" style={{ color: "#6E6A63", fontSize: 12.5, fontWeight: 500 }}>
      {children}
    </p>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "accent";
// Status pills as Harvey draws them: a soft tint, a small dot and the
// word in sentence case. Colour is never the only signal; the word is.
const TONE: Record<Tone, { fg: string; bg: string; bd: string; dot: string }> = {
  neutral: { fg: "#57534D", bg: "#F0EEEA", bd: "#E4E1DA", dot: "#A8A39A" },
  good: { fg: "#2F6B45", bg: "#EAF3EC", bd: "#CFE3D5", dot: "#3E8A5A" },
  warn: { fg: "#8A5A12", bg: "#FBF1DD", bd: "#F0DDB4", dot: "#D19A2E" },
  bad: { fg: "#A3392E", bg: "#F9E7E4", bd: "#EFCBC5", dot: "#C9533F" },
  accent: { fg: "#2F5E9A", bg: "#E7EEF8", bd: "#CCDAEE", dot: "#3F74C0" },
};

export function Pill({ tone = "neutral", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  const t = TONE[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center gap-[5px] px-[7px] rounded-[5px] whitespace-nowrap max-w-full overflow-hidden text-ellipsis"
      style={{ color: t.fg, background: t.bg, fontSize: 11.5, lineHeight: "20px", fontWeight: 500 }}
    >
      <span aria-hidden="true" className="shrink-0 rounded-full" style={{ width: 5, height: 5, background: t.dot }} />
      {children}
    </span>
  );
}

export function bandTone(band?: string | null): Tone {
  if (band === "KNOWN" || band === "LIKELY") return "good";
  if (band === "POSSIBLE") return "warn";
  if (band === "CONTRADICTED") return "bad";
  return "neutral";
}

export function ConfidencePill({ band, score }: { band?: string | null; score?: number | null }) {
  if (!band) return <Pill>Confidence not assessed</Pill>;
  return (
    <Pill tone={bandTone(band)} title={score != null ? `Confidence score ${Math.round(score * 100)} of 100` : undefined}>
      {BAND_LABEL[band] || band}
    </Pill>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "bad" | "warn" | "good" }) {
  return (
    <div className="min-w-0">
      <p className="leading-none tabular-nums" style={{ color: tone ? C[tone] : "#0F0E0D", fontSize: 38, fontWeight: 400, fontFamily: "'Newsreader', Georgia, serif", letterSpacing: "-0.02em" }}>{value}</p>
      <p className="mt-2" style={{ color: "#6E6A63", fontSize: 13 }}>{label}</p>
      {sub && <p className="text-[12px] mt-1" style={{ color: C.muted }}>{sub}</p>}
    </div>
  );
}

/**
 * A p10–p90 range with the expected value marked, on a shared scale so
 * several options can be compared at a glance.
 */
export function RangeBar({ interval, max, currency, highlight }: { interval?: Interval | null; max: number; currency?: string; highlight?: boolean }) {
  if (!interval || !(max > 0)) return <span className="text-[12px]" style={{ color: C.faint }}>No forecast</span>;
  const x = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const width = Math.max(1.5, ((interval.p90 - interval.p10) / max) * 100);
  const tone = highlight ? C.ink : "#8C939C";
  // One shared axis (0 to the largest p90 across options), so bars compare
  // across cards: the band is the 80% range, the tick the expected value.
  return (
    <div className="w-full">
      <div className="relative h-[14px]">
        <div className="absolute left-0 right-0" style={{ top: 6, height: 1, background: "rgba(25,25,23,0.14)" }} />
        <div className="absolute" style={{ left: x(interval.p10), width: `${width}%`, top: 3, height: 7, background: tone, opacity: highlight ? 0.9 : 0.55 }} />
        <div className="absolute" style={{ left: x(interval.mean), top: -2, width: 2, height: 18, marginLeft: -1, background: C.ink, boxShadow: "0 0 0 1.5px #FFFFFF" }} />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mt-2 tabular-nums">
        <span className="text-[12.5px]" style={{ color: C.ink }}>
          <span style={{ fontWeight: 500 }}>{money(interval.mean, currency)}</span> expected
          <span style={{ color: C.faint }}> · range {money(interval.p10, currency)} to {money(interval.p90, currency)}</span>
        </span>
        <span style={{ fontSize: 11.5, color: C.faint }}>
          Axis 0 to {money(max, currency)}
        </span>
      </div>
    </div>
  );
}

const HEALTH_TONE: Record<string, Tone> = {
  OK: "good", FRESH: "good", SHADOW: "accent", LIVE: "good", MEASURED: "good",
  AGING: "warn", GAPS: "warn", DEGRADED: "warn", TOO_FEW_TO_JUDGE: "neutral", NO_RESOLVED_PREDICTIONS_YET: "neutral", NONE: "neutral",
  STALE: "bad", MISSING: "bad", STOPPED: "bad", UNKNOWN: "neutral",
};

const HEALTH_WORD: Record<string, string> = {
  OK: "OK", FRESH: "Fresh", AGING: "Ageing", STALE: "Stale", MISSING: "Missing", GAPS: "Gaps", DEGRADED: "Degraded",
  NONE: "None", MEASURED: "Measured", TOO_FEW_TO_JUDGE: "Too early", NO_RESOLVED_PREDICTIONS_YET: "Not yet measured",
  SHADOW: "Shadow", LIVE: "Live", STOPPED: "Stopped", UNKNOWN: "Unknown",
};

export function HealthStrip({ dimensions }: { dimensions: HealthDimension[] }) {
  return (
    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {dimensions.map((d) => (
        <div key={d.key} className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: C.muted }}>{d.label}</span>
            <Pill tone={HEALTH_TONE[d.status] || "neutral"}>{HEALTH_WORD[d.status] || d.status}</Pill>
          </div>
          <p className="text-[12px] mt-1 leading-[1.5]" style={{ color: C.faint }}>{d.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="py-6" style={{ borderBottom: `1px solid ${C.line}` }}>
          <div className="skeleton h-3 w-32 mb-3" />
          <div className="skeleton h-4 w-80 max-w-full mb-2" />
          <div className="skeleton h-3 w-full max-w-[520px]" />
        </div>
      ))}
    </div>
  );
}

export function Notice({ tone = "neutral", title, children }: { tone?: Tone; title: string; children?: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <div className="rounded-[10px] px-4 py-3" style={{ background: tone === "neutral" ? "#FFFFFF" : t.bg, border: `1px solid ${t.bd}` }} role={tone === "bad" ? "alert" : undefined}>
      <p className="text-[13px]" style={{ color: t.fg, fontWeight: 500 }}>{title}</p>
      {children && <div className="text-[12px] mt-1 leading-[1.55]" style={{ color: C.body }}>{children}</div>}
    </div>
  );
}
