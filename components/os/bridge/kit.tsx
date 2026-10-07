"use client";

// Small pieces shared by the Bridge and Watch surfaces. Display only: every
// value passed in comes from the backend.

import React from "react";
import Link from "next/link";
import { IconAlert, IconArrowRight } from "@/components/v32/icons";
import { formatDate } from "@/lib/format";

/** The person's first name, only when the account really holds one.
 *  The backend's `name` falls back to the business name or the email, so
 *  those are never used as a name: the greeting then stays "Good evening". */
export function personFirstName(): string {
  if (typeof window === "undefined") return "";
  try {
    const u = JSON.parse(localStorage.getItem("vantro_user") || "{}") as Record<string, unknown>;
    const business = String(u.business_name || "").trim().toLowerCase();
    const emailPrefix = typeof u.email === "string" ? u.email.split("@")[0].toLowerCase() : "";
    for (const c of [u.owner_name, u.first_name, u.full_name, u.name]) {
      if (typeof c !== "string") continue;
      const s = c.trim();
      const low = s.toLowerCase();
      if (!s || s.includes("@") || low === business || low === emailPrefix || low === "user") continue;
      return s.split(/\s+/)[0];
    }
  } catch {
    /* unreadable profile: no name */
  }
  return "";
}

/** Strip warning emoji and other pictographs some agents still put in titles,
 *  and read any raw ISO date in server text ("2026-10-05") as "5 Oct". */
export function plain(text: string | null | undefined): string {
  return String(text || "")
    .replace(/\b(\d{4}-\d{2}-\d{2})(T[\d:.]+Z?)?\b/g, (_m, d: string) => formatDate(d))
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const OFFLINE_LINE = "Couldn't reach Starlane. Check your connection and try again.";

/** A humane one-line failure with a way out. Never shows raw exception text. */
export function QuietError({ message = OFFLINE_LINE, onRetry, compact = false }: { message?: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className="flex items-center flex-wrap" style={{ gap: 10, padding: compact ? "6px 0" : "14px 16px", borderRadius: 8, background: compact ? "transparent" : "rgb(var(--tk-critical) / 0.06)", border: compact ? "none" : "1px solid rgb(var(--tk-critical) / 0.18)" }}>
      <span className="shrink-0 inline-flex" style={{ color: "var(--critical)" }} aria-hidden="true"><IconAlert size={15} /></span>
      <span className="flex-1 min-w-0" style={{ fontSize: 13, color: "var(--body)" }}>{message}</span>
      {onRetry && <button type="button" onClick={onRetry} className="ui-btn ui-btn-secondary ui-btn-sm">Try again</button>}
    </div>
  );
}

/** Section heading with an optional quiet link on the right. */
export function SectionHead({ title, meta, href, linkLabel, id }: { title: React.ReactNode; meta?: React.ReactNode; href?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="flex items-baseline justify-between" style={{ gap: 12, marginBottom: 10 }}>
      <h2 id={id} style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 17, letterSpacing: "-0.1px", color: "var(--ink)" }}>
        {title}
        {meta != null && <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--ink-3)", marginLeft: 8 }} className="tabular-nums">{meta}</span>}
      </h2>
      {href && linkLabel && (
        <Link href={href} className="hover-dim inline-flex items-center shrink-0" style={{ gap: 4, fontSize: 12.5, color: "var(--ink-2)" }}>
          {linkLabel}<IconArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

/** A quiet sentence for an empty section. */
export function QuietLine({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, padding: "10px 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{children}</p>;
}
