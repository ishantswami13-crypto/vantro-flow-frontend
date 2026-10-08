"use client";

// Small display pieces shared by Prepared, Simulate and the decision
// screens. Display only: every figure passed in was computed by the backend.

import React from "react";
import { DecisionApiError, money } from "@/lib/decisions";
import { inrWhole, formatDate } from "@/lib/format";
import { IconAlert } from "@/components/v32/icons";

export const OFFLINE_LINE = "Couldn't reach Starlane. Check your connection and try again.";

/** A sentence a person can act on, never raw exception text. Backend
 *  4xx messages are written for people and are kept; network failures,
 *  timeouts and 5xx become one calm line. */
export function humaneError(err: unknown, fallback = "Starlane couldn't load this just now. Try again in a moment."): string {
  if (err == null) return fallback;
  const status = (err as { status?: number })?.status;
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (err instanceof TypeError || /failed to fetch|network ?error|load failed|timed out|timeout/i.test(raw)) return OFFLINE_LINE;
  if (status === 0) return OFFLINE_LINE;
  if (typeof status === "number" && status >= 500) return fallback;
  if (err instanceof DecisionApiError && typeof err.body?.error === "string" && status && status < 500) return String(err.body.error);
  const msg = raw.replace(/\s*\(Error ID:[^)]*\)\s*$/, "");
  if (typeof status === "number" && status >= 400 && msg && !/HTTP \d|Request failed|unreadable/i.test(msg)) return msg;
  return fallback;
}

/** An inline error with a working way out. */
export function RetryLine({ error, onRetry, fallback }: { error: unknown; onRetry?: () => void; fallback?: string }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-center flex-wrap" style={{ gap: 12, padding: "12px 14px", borderRadius: 8, background: "rgb(var(--tk-critical) / 0.06)", border: "1px solid rgb(var(--tk-critical) / 0.18)" }}>
      <span aria-hidden="true" style={{ color: "var(--critical)", display: "inline-flex" }}><IconAlert size={15} /></span>
      <span style={{ fontSize: 13, color: "var(--body)", flex: "1 1 220px", lineHeight: 1.5 }}>{typeof error === "string" ? error : humaneError(error, fallback)}</span>
      {onRetry && <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

/** Strip emoji and warning glyphs the agents sometimes put in titles. */
export function cleanTitle(s: string | null | undefined): string {
  return String(s || "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "").replace(/\s{2,}/g, " ").trim();
}

/** Backend sentences sometimes carry ISO dates ("due 2026-08-21"); show them as people read dates. */
export function prettyDates(s: string | null | undefined): string {
  return String(s || "").replace(/\b(\d{4}-\d{2}-\d{2})(T[\d:.]+Z?)?\b/g, (_, d: string) => formatDate(d));
}

/** Money in full: rupees through the shared formatter, other currencies by code. */
export function amount(v: number | null | undefined, currency?: string | null): string {
  if (currency && currency !== "INR") return money(v, currency);
  return inrWhole(v);
}

/** +₹4,12,500 / −₹4,12,500 for a change. */
export function signedAmount(v: number | null | undefined, currency?: string | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v === 0) return amount(0, currency);
  return `${v > 0 ? "+" : "−"}${amount(Math.abs(v), currency)}`;
}

/** Sentence case for backend codes: FLAG_BAD_DEBT → "Flag bad debt". */
export function sentence(code: string | null | undefined): string {
  const s = String(code || "").replace(/_/g, " ").toLowerCase().trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/** Content column: left-aligned with the title, never wider than ~1180px. */
export function PageBody({ children, gap = 24 }: { children: React.ReactNode; gap?: number }) {
  return <div className="flex flex-col w-full" style={{ maxWidth: 1180, gap }}>{children}</div>;
}

/** A section heading inside a page: serif title, optional count and one line of help. */
export function SectionHead({ title, count, hint, right }: { title: React.ReactNode; count?: number | null; hint?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between flex-wrap" style={{ gap: 12, marginBottom: 12 }}>
      <div className="min-w-0">
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 18, color: "var(--ink)", letterSpacing: "-0.1px" }}>
          {title}
          {count != null && <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-3)", marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>{count}</span>}
        </h2>
        {hint && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, maxWidth: 720 }}>{hint}</p>}
      </div>
      {right}
    </div>
  );
}

/**
 * One item that needs a person: what it is, why now, the money at stake
 * and one primary action. Secondary actions stay quiet.
 */
export function ItemCard({ meta, chip, title, why, stake, stakeNote, children, actions, quiet }: {
  meta?: React.ReactNode;
  chip?: React.ReactNode;
  title: React.ReactNode;
  why?: React.ReactNode;
  stake?: React.ReactNode;
  stakeNote?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  quiet?: boolean;
}) {
  return (
    <article className="card-in" style={{ background: "var(--surface)", border: "1px solid var(--line-card)", borderRadius: 12, padding: "18px 20px", opacity: quiet ? 0.86 : 1 }}>
      <div className="flex flex-col sm:flex-row sm:items-start" style={{ gap: 16 }}>
        <div className="min-w-0 flex-1">
          {(meta || chip) && (
            <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 6, fontSize: 12, color: "var(--ink-3)" }}>
              {chip}
              {meta && <span>{meta}</span>}
            </div>
          )}
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "var(--ink)", lineHeight: 1.45 }}>{title}</h3>
          {why && <div style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6, marginTop: 6, maxWidth: 760 }}>{why}</div>}
        </div>
        {stake != null && (
          <div className="sm:text-right shrink-0" style={{ minWidth: 0 }}>
            <div className="figure-in" style={{ fontFamily: "var(--font-display)", fontSize: 24, lineHeight: 1.1, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{stake}</div>
            {stakeNote && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{stakeNote}</div>}
          </div>
        )}
      </div>
      {children && <div style={{ marginTop: 14 }}>{children}</div>}
      {actions && <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 16 }}>{actions}</div>}
    </article>
  );
}

/** A quiet key/value line list, used for evidence facts. */
export function FactList({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  if (!rows.length) return null;
  return (
    <dl className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) auto", columnGap: 16, margin: 0, fontSize: 12.5 }}>
      {rows.map((r) => (
        <React.Fragment key={r.label}>
          <dt style={{ color: "var(--ink-2)", padding: "6px 0", borderTop: "1px solid var(--line)" }}>{r.label}</dt>
          <dd style={{ margin: 0, color: "var(--ink)", padding: "6px 0", borderTop: "1px solid var(--line)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
