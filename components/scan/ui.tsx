"use client";

// Small layout pieces shared by Scan findings, Memory and Intelligence, built
// on the tokens only. Display only: every value passed in comes from the
// backend.

import React from "react";

/** A titled block of the page: serif heading, one-line subtitle, optional
 *  right-hand action, then its content. Hierarchy comes from spacing and a
 *  hairline, not a box, so these never nest as cards. */
export function Section({ title, subtitle, right, children, id, count }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  count?: number | null;
}) {
  return (
    <section id={id} aria-label={typeof title === "string" ? title : undefined} className="fade-once" style={{ minWidth: 0 }}>
      <div className="flex items-end justify-between flex-wrap" style={{ gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
        <div className="min-w-0">
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 20, lineHeight: 1.25, color: "var(--ink)" }}>
            {title}
            {count != null && <span className="tabular-nums" style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-3)", marginLeft: 8 }}>{count}</span>}
          </h2>
          {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: 1.55, color: "var(--ink-2)", maxWidth: 720 }}>{subtitle}</p>}
        </div>
        {right && <div className="flex items-center shrink-0" style={{ gap: 8 }}>{right}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}

/** A 0..1 score as a thin bar in ink on a hairline track. */
export function ScoreTrack({ value, label }: { value: number; label?: string }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div role="img" aria-label={label ?? `${Math.round(w)} of 100`} style={{ height: 4, borderRadius: 999, background: "var(--line)", overflow: "hidden" }}>
      <div style={{ width: `${w}%`, height: "100%", borderRadius: 999, background: "var(--ink-2)" }} />
    </div>
  );
}

/** Label over a figure, for compact fact rows inside a section. */
export function Stat({ label, value, sub, tone }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: "critical" | "warning" | "positive" }) {
  return (
    <div className="min-w-0">
      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{label}</div>
      <div className="tabular-nums" style={{ fontSize: 22, lineHeight: 1.2, marginTop: 6, color: tone ? `var(--${tone})` : "var(--ink)", letterSpacing: "-0.01em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/** A quiet, honest inline error with a way out. Never raw exception text. */
export function InlineError({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between flex-wrap" style={{ gap: 12, padding: "10px 12px 10px 14px", borderRadius: "var(--radius-md)", border: "1px solid rgb(var(--tk-critical) / 0.25)", background: "rgb(var(--tk-critical) / 0.06)" }}>
      <span style={{ fontSize: 13, color: "var(--ink)" }}>{children}</span>
      {onRetry && <button type="button" onClick={onRetry} className="ui-btn ui-btn-secondary ui-btn-sm">Try again</button>}
    </div>
  );
}
