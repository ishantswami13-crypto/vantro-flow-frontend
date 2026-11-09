"use client";

import Link from "next/link";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { C, ConfidencePill, Pill } from "@/components/decisions/ui";
import { money, relTime, shortDate, daysUntil, STATUS_LABEL, type DecisionListItem } from "@/lib/decisions";

// The decisions review table, laid out like the receivables review on the
// public site: one row per decision with its status, what Starlane
// suggests, what is at stake and the deadline. Used by Decisions and
// Approvals so both read the same.

function deadlineText(d: DecisionListItem): { text: string; tone?: "bad" | "warn" } | null {
  const days = daysUntil(d.deadline || d.window?.latestSafeAt || null);
  if (days == null) return null;
  if (days < 0) return { text: `Window closed ${-days} day${days === -1 ? "" : "s"} ago`, tone: "bad" };
  if (days === 0) return { text: "Decide today", tone: "bad" };
  if (days <= 7) return { text: `Decide within ${days} day${days === 1 ? "" : "s"}`, tone: "warn" };
  return { text: `Decide by ${shortDate(d.deadline)}` };
}

const STATUS_TONE: Record<string, "neutral" | "good" | "warn" | "bad" | "accent"> = {
  OPEN: "warn", NEEDS_INFORMATION: "neutral", SELECTED: "accent", APPROVED: "accent", EXECUTING: "accent",
  SHADOWED: "neutral", EXECUTED: "good", VERIFIED: "good", REJECTED: "neutral", EXPIRED: "bad", RESOLVED: "good", SUPERSEDED: "neutral",
};

function IconDoc() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 1.8h5.2L12.5 5v9.2H4z" /><path d="M9 1.8V5.2h3.5M6 8.5h4.5M6 11h3" /></svg>;
}

/** One row of the decisions table, laid out like Harvey's review table. */
export function DecisionRow({ d, onOpen }: { d: DecisionListItem; onOpen: () => void }) {
  const dl = deadlineText(d);
  const atRisk = d.materiality?.expectedUncollected90 ?? d.materiality?.workingCapitalTiedUp ?? d.materiality?.revenueExposure ?? null;
  const sub = d.whyNow && d.whyNow.length > 0 ? d.whyNow[0] : d.collisions && d.collisions.length > 0 ? `Linked to ${d.collisions.length} other decision${d.collisions.length === 1 ? "" : "s"}` : null;
  return (
    <tr className="dt-row" onClick={onOpen}>
      <td className="dt-main">
        <div className="flex items-start gap-2 min-w-0">
          <span className="dt-ic"><IconDoc /></span>
          <div className="min-w-0">
            <Link href={`/decisions/${d.id}`} className="dt-title" onClick={(e) => e.stopPropagation()}>{d.title}</Link>
            {sub && <p className="dt-sub">{sub}</p>}
            <div className="dt-mobile">
              <Pill tone={STATUS_TONE[d.status] || "neutral"}>{STATUS_LABEL[d.status] || d.status}</Pill>
              {atRisk != null && <span className="tabular-nums">{money(atRisk, d.currency)}</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="dt-col"><Pill tone={STATUS_TONE[d.status] || "neutral"}>{STATUS_LABEL[d.status] || d.status}</Pill></td>
      <td className="dt-col dt-sugg">
        {d.recommendation
          ? <span className="inline-flex items-center gap-1.5"><span className="dt-ic dt-ic-sm"><StarlaneMark variant="glyph" size={8} /></span>{d.recommendation.informationFirst ? "Find out first" : d.recommendation.label}</span>
          : <span style={{ color: "#A8A39A" }}>Weighing options…</span>}
        <div className="mt-1"><ConfidencePill band={d.confidence?.band} score={d.confidence?.score} /></div>
      </td>
      <td className="dt-col tabular-nums" style={{ color: C.body }}>{atRisk != null ? money(atRisk, d.currency) : "—"}</td>
      <td className="dt-col dt-right" style={{ color: dl?.tone ? C[dl.tone] : "#8F8A81" }}>
        {dl ? dl.text : d.updatedAt ? relTime(d.updatedAt) : "—"}
      </td>
    </tr>
  );
}


export function DecisionTable({ decisions, onOpen }: { decisions: DecisionListItem[]; onOpen: (d: DecisionListItem) => void }) {
  return (
    <div className="dt-wrap">
      <table className="dt">
        <thead>
          <tr><th scope="col">Decision</th><th scope="col" className="dt-col">Status</th><th scope="col" className="dt-col">Starlane suggests</th><th scope="col" className="dt-col">At stake</th><th scope="col" className="dt-col dt-right">Deadline</th></tr>
        </thead>
        <tbody>
          {decisions.map((d) => <DecisionRow key={d.id} d={d} onOpen={() => onOpen(d)} />)}
        </tbody>
      </table>
    </div>
  );
}
