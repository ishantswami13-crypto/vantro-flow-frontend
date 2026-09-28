"use client";

// Small presentational pieces shared by the decision screens. Display only:
// every number passed in was computed by the backend engine.

import React from "react";
import type { Interval, HealthDimension } from "@/lib/decisions";
import { money, BAND_LABEL } from "@/lib/decisions";

export const C = {
  ink: "#171717",
  body: "#4A4A47",
  muted: "#686868",
  faint: "#8A8A86",
  line: "#E5E5E1",
  wash: "#FAFAF8",
  good: "#2F7D5B",
  warn: "#A0661B",
  bad: "#B3413A",
  accent: "#5C5F9E",
};

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.08em] mb-3" style={{ color: C.faint, fontWeight: 500 }}>
      {children}
    </p>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "accent";
const TONE: Record<Tone, { fg: string; bg: string; bd: string }> = {
  neutral: { fg: C.body, bg: "#F3F3F0", bd: "#E5E5E1" },
  good: { fg: C.good, bg: "#EEF6F1", bd: "#D3E8DC" },
  warn: { fg: C.warn, bg: "#FBF4EA", bd: "#EFDDC2" },
  bad: { fg: C.bad, bg: "#FBEFEE", bd: "#F0D2CF" },
  accent: { fg: C.accent, bg: "#F1F1F8", bd: "#DCDDF0" },
};

export function Pill({ tone = "neutral", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  const t = TONE[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 text-[11px] px-2 py-[2px] rounded-full whitespace-nowrap"
      style={{ color: t.fg, background: t.bg, border: `1px solid ${t.bd}`, fontWeight: 500 }}
    >
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
      <p className="text-[12px]" style={{ color: C.faint }}>{label}</p>
      <p className="text-[22px] leading-tight mt-1 tabular-nums" style={{ color: tone ? C[tone] : C.ink, fontWeight: 500, letterSpacing: "-0.01em" }}>{value}</p>
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
  return (
    <div className="w-full">
      <div className="relative h-[8px] rounded-full" style={{ background: "#F0F0EC" }}>
        <div
          className={`absolute top-0 h-full rounded-full ${highlight ? "id-gradient" : ""}`}
          style={{ left: x(interval.p10), width: `${width}%`, background: highlight ? undefined : "#CFCFD8", opacity: highlight ? 0.9 : 1 }}
        />
        <div className="absolute" style={{ left: x(interval.mean), top: -3, width: 2, height: 14, background: C.ink, borderRadius: 1 }} />
      </div>
      <div className="flex justify-between text-[11px] mt-1 tabular-nums" style={{ color: C.faint }}>
        <span>{money(interval.p10, currency)}</span>
        <span style={{ color: C.ink, fontWeight: 500 }}>{money(interval.mean, currency)} expected</span>
        <span>{money(interval.p90, currency)}</span>
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
    <div aria-busy="true" aria-label="Loading">
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
    <div className="rounded-xl px-4 py-3" style={{ background: t.bg, border: `1px solid ${t.bd}` }} role={tone === "bad" ? "alert" : undefined}>
      <p className="text-[13px]" style={{ color: t.fg, fontWeight: 500 }}>{title}</p>
      {children && <div className="text-[12px] mt-1 leading-[1.55]" style={{ color: C.body }}>{children}</div>}
    </div>
  );
}
