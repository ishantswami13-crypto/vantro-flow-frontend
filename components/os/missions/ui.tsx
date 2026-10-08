"use client";

// Small building blocks shared by Missions, Agents and Outreach. Display
// only: every value passed in comes from the backend. Colours are tokens.

import React from "react";
import Link from "next/link";
import { IconArrowRight } from "@/components/v32/icons";
import type { StatusTone } from "@/components/ui/Badge";
import type { MissionState, MissionOutcome } from "@/lib/os";
import { formatDate } from "@/lib/format";

export const NETWORK_ERROR = "Couldn't reach Starlane. Check your connection and try again.";

/**
 * A sentence a person can act on, never raw exception text. A backend
 * refusal (4xx) already carries a sentence written for the owner, so it is
 * shown after cleaning off request ids; anything else gets the fallback.
 */
export function humaneError(err: unknown, fallback = "Starlane couldn't finish that. Try again in a moment."): string {
  if (!err) return fallback;
  const e = err as { status?: unknown; message?: unknown; body?: { error?: unknown } };
  const status = typeof e.status === "number" ? e.status : null;
  const raw = typeof e.body?.error === "string" ? e.body.error : typeof e.message === "string" ? e.message : "";
  if (err instanceof TypeError || status === 0 || /failed to fetch|network|timed out|load failed/i.test(raw)) return NETWORK_ERROR;
  if (status !== null && status >= 400 && status < 500 && status !== 401) {
    const clean = raw.replace(/\s*\(Error ID:[^)]*\)\s*$/i, "").trim();
    if (clean && !/HTTP \d|Request failed|unreadable|^Error\b|undefined|null/i.test(clean)) return clean.endsWith(".") ? clean : `${clean}.`;
  }
  return fallback;
}

/** Strip warning emoji the backend sometimes puts in titles. */
export function cleanTitle(s: string | null | undefined): string {
  return String(s || "").replace(/[⚠\u{1F6A8}\u{1F534}\u{1F7E0}\u{1F7E1}❗‼]️?/gu, "").replace(/\s{2,}/g, " ").trim();
}

/** ISO dates inside backend sentences ("until 2026-10-21") read as "21 Oct". */
export function humanDates(s: string): string {
  return s.replace(/\b(\d{4}-\d{2}-\d{2})(?:T[\d:.]+Z?)?\b/g, (_m, d: string) => formatDate(d));
}

export function missionTone(s: MissionState): StatusTone {
  if (s === "COMPLETED") return "positive";
  if (s === "BLOCKED" || s === "FAILED") return "critical";
  if (s === "WAITING_FOR_APPROVAL" || s === "WAITING_FOR_INFORMATION") return "attention";
  if (s === "RUNNING" || s === "VERIFYING") return "info";
  return "neutral";
}

export const OUTCOME_SHORT: Record<MissionOutcome, string> = {
  PENDING: "Not checked yet",
  VERIFIED_SUCCESS: "Verified: it worked",
  VERIFIED_FAILURE: "Verified: it did not work",
  OUTCOME_UNKNOWN: "Not known yet",
};

export function outcomeColor(o: MissionOutcome): string {
  if (o === "VERIFIED_SUCCESS") return "var(--positive)";
  if (o === "VERIFIED_FAILURE") return "var(--critical)";
  if (o === "OUTCOME_UNKNOWN") return "var(--ink-3)";
  return "var(--ink-2)";
}

/** Content column: left aligned with the page title, about 1180px wide. */
export function PageColumn({ children, gap = 24 }: { children: React.ReactNode; gap?: number }) {
  return <div className="flex flex-col w-full" style={{ maxWidth: "var(--content-max)", gap }}>{children}</div>;
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover-dim inline-flex items-center self-start" style={{ gap: 6, fontSize: 12.5, color: "var(--ink-2)", minHeight: 28 }}>
      <IconArrowRight size={13} style={{ transform: "rotate(180deg)" }} />
      {children}
    </Link>
  );
}

/** Section heading: 13px sentence case, with an optional count and a right slot. */
export function SectionHead({ title, count, right, hint }: { title: React.ReactNode; count?: number | null; right?: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between flex-wrap" style={{ gap: 8, marginBottom: 10 }}>
      <div className="min-w-0">
        <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>
          {title}
          {count != null && <span className="tabular-nums" style={{ marginLeft: 6, fontWeight: 400, color: "var(--ink-3)" }}>{count}</span>}
        </h2>
        {hint && <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{hint}</p>}
      </div>
      {right}
    </div>
  );
}

/** The one card surface: --surface, 1px line, 12px radius, no shadow. */
export function Panel({ children, pad = true, style }: { children: React.ReactNode; pad?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: pad ? "16px 18px" : 0, minWidth: 0, ...style }}>
      {children}
    </div>
  );
}

/** Label / value row for right-rail facts. */
export function Fact({ label, children, first }: { label: React.ReactNode; children: React.ReactNode; first?: boolean }) {
  return (
    <div className="flex items-baseline justify-between" style={{ gap: 16, padding: "9px 0", borderTop: first ? 0 : "1px solid var(--line)" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-3)", flexShrink: 0 }}>{label}</span>
      <span className="tabular-nums" style={{ fontSize: 13, color: "var(--ink)", textAlign: "right", minWidth: 0 }}>{children}</span>
    </div>
  );
}

/** A thin, honest progress bar (ratio 0..1). */
export function Meter({ ratio, tone = "positive", label }: { ratio: number; tone?: "positive" | "critical" | "ink"; label: string }) {
  const w = Math.max(0, Math.min(1, ratio)) * 100;
  const fill = tone === "critical" ? "var(--critical)" : tone === "ink" ? "var(--ink-2)" : "var(--positive)";
  return (
    <div role="img" aria-label={label} style={{ height: 4, borderRadius: 999, background: "rgb(var(--tk-ink) / 0.08)", overflow: "hidden" }}>
      <div style={{ width: `${w}%`, height: "100%", borderRadius: 999, background: fill, transition: "width var(--dur-slow, 320ms) var(--ease, ease)" }} />
    </div>
  );
}

/** Inline message under a control: quiet for notes, critical for errors. */
export function Note({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "critical" | "positive" | "attention" }) {
  const color = tone === "critical" ? "var(--critical)" : tone === "positive" ? "var(--positive)" : tone === "attention" ? "var(--warning)" : "var(--ink-2)";
  return <p role={tone === "critical" ? "alert" : "status"} style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color }}>{children}</p>;
}
