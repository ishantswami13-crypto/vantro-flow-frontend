"use client";

// Small presentational pieces shared by the decision screens. Display only:
// every number passed in was computed by the backend engine.

import React from "react";
import type { Interval, HealthDimension } from "@/lib/decisions";
import { money, BAND_LABEL } from "@/lib/decisions";

// Version 32 tokens (STARLANE_FRONTEND_HANDOFF.md §3).
export const C = {
  ink: "var(--text-primary)",
  body: "var(--text-body)",
  muted: "var(--text-secondary)",
  faint: "#6E6E6A", // 4.5:1 on the page background (was var(--text-tertiary), 3.1:1)
  line: "var(--border-default)",
  card: "rgb(var(--c-ink) / 0.10)",
  wash: "#F3F2EE",
  good: "var(--status-success)",
  warn: "var(--status-warning)",
  bad: "var(--status-danger)",
  accent: "var(--accent, var(--status-info))",
};

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] uppercase mb-3" style={{ color: C.muted, fontWeight: 500, letterSpacing: 0 }}>
      {children}
    </p>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "accent";
// Outlined tag pills, as on the Missions and Memory boards: coloured text
// and border on white, radius 20px. Never a filled colour block.
const TONE: Record<Tone, { fg: string; bg: string; bd: string }> = {
  neutral: { fg: C.muted, bg: "transparent", bd: "rgb(var(--c-ink) / 0.14)" },
  good: { fg: C.good, bg: "transparent", bd: "rgba(71,112,84,0.45)" },
  warn: { fg: C.warn, bg: "transparent", bd: "rgba(155,116,43,0.45)" },
  bad: { fg: C.bad, bg: "transparent", bd: "rgba(166,79,75,0.45)" },
  accent: { fg: C.accent, bg: "transparent", bd: "rgb(var(--c-accent) / 0.5)" },
};

export function Pill({ tone = "neutral", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  const t = TONE[tone];
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 text-[11px] px-[9px] py-[1px] rounded-[20px] whitespace-nowrap"
      style={{ color: t.fg, background: t.bg, border: `1px solid ${t.bd}`, fontWeight: 400, letterSpacing: "0.2px" }}
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
      <p className="text-[22px] leading-tight mt-1 tabular-nums" style={{ color: tone ? C[tone] : C.ink, fontWeight: 400, fontFamily: "var(--font-sans)", letterSpacing: "-0.01em" }}>{value}</p>
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
    <div className="rounded-xl px-4 py-3" style={{ background: t.bg, border: `1px solid ${t.bd}` }} role={tone === "bad" ? "alert" : undefined}>
      <p className="text-[13px]" style={{ color: t.fg, fontWeight: 500 }}>{title}</p>
      {children && <div className="text-[12px] mt-1 leading-[1.55]" style={{ color: C.body }}>{children}</div>}
    </div>
  );
}
