"use client";

// Shows where a decision stands against the current facts:
//  - a decision that is no longer current (superseded or resolved) is marked
//    as history, with the exposure it showed at the time and a link to the
//    newer decision;
//  - a decision that replaced an earlier one says so, with then-vs-now
//    exposure and what changed line by line;
//  - when the source records it reads last changed;
//  - every customer-update draft it prepared, and whether it is still valid.
// Starlane never shows a draft as delivered: it has no delivery confirmation
// in this workflow, and external sending is off.

import Link from "next/link";
import { C, Notice, SectionLabel } from "@/components/decisions/ui";
import { money, shortDate, type DecisionDetail } from "@/lib/decisions";

const NOTICE_STATE: Record<string, { label: string; tone: string }> = {
  AWAITING_APPROVAL: { label: "Draft, waiting for your approval. Not sent.", tone: C.body },
  APPROVED_NOT_SENT: { label: "Approved, not sent.", tone: C.body },
  WITHDRAWN: { label: "Withdrawn, needs no action.", tone: C.faint },
  NEEDS_REVIEW: { label: "Needs review: its decision is no longer current. Do not send.", tone: C.bad },
  OUT_OF_STARLANE: { label: "Marked done or being sent. Starlane has no delivery confirmation and cannot recall a sent message.", tone: C.warn },
  DISCARDED: { label: "Discarded.", tone: C.faint },
};

function when(iso: string | null | undefined): string {
  if (!iso) return "not recorded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Change = { customerName?: string; before: { readyAt?: string | null; neededBy?: string | null; slipDays?: number } | null; after: { readyAt?: string | null; neededBy?: string | null; slipDays?: number } | null };
type Reconciliation = { supersedes?: string; previousExposure?: number; previousOrdersAtRisk?: number; changes?: Change[]; notices?: { withdrawn?: number; cannotWithdraw?: number } };

function changeText(c: Change): string {
  const who = c.customerName || "An order";
  if (c.before && !c.after) return `${who}: no longer late because of this shipment.`;
  if (!c.before && c.after) return `${who}: now late, ready ${shortDate(c.after.readyAt)} against ${shortDate(c.after.neededBy)} promised.`;
  return `${who}: ready ${shortDate(c.before?.readyAt)} became ${shortDate(c.after?.readyAt)} (promised ${shortDate(c.after?.neededBy)}).`;
}

export default function DecisionReconciliation({ detail }: { detail: DecisionDetail }) {
  const d = detail.decision;
  const lineage = detail.lineage;
  const sd = (d.analysis?.supplierDelay || null) as { sourcesChangedAt?: string | null } | null;
  const rec = (d.analysis?.reconciliation || null) as Reconciliation | null;
  const exposure = Number((d.materiality as { revenueExposure?: number } | undefined)?.revenueExposure ?? NaN);
  const orders = Number((d.materiality as { ordersAtRisk?: number } | undefined)?.ordersAtRisk ?? NaN);
  const notices = detail.notices || [];
  const isCurrent = lineage ? lineage.current : !["SUPERSEDED", "RESOLVED", "REJECTED", "EXPIRED"].includes(d.status);
  if (!sd && !rec && !notices.length && isCurrent) return null;

  return (
    <section className="mt-6 space-y-3" data-testid="decision-reconciliation">
      {!isCurrent && (
        <Notice tone="warn" title={d.status === "SUPERSEDED" ? "History: replaced by a newer decision" : "History: this no longer applies"}>
          <p>{d.resolutionReason || "This decision is no longer current."}</p>
          {Number.isFinite(exposure) && (
            <p className="mt-1">At the time it showed {money(exposure, d.currency)} at risk{Number.isFinite(orders) ? ` across ${orders} order${orders === 1 ? "" : "s"}` : ""}. That is not the current exposure.</p>
          )}
          {lineage?.supersededBy && (
            <p className="mt-1"><Link className="underline" href={`/decisions/${lineage.supersededBy}`}>Open the current decision</Link></p>
          )}
        </Notice>
      )}
      {isCurrent && rec?.supersedes && (
        <Notice tone="accent" title="Recalculated: this replaces an earlier decision">
          <p>
            Before: {money(rec.previousExposure ?? null, d.currency)} at risk across {rec.previousOrdersAtRisk ?? "?"} order{rec.previousOrdersAtRisk === 1 ? "" : "s"}.
            {" "}Now: {money(Number.isFinite(exposure) ? exposure : null, d.currency)}{Number.isFinite(orders) ? ` across ${orders} order${orders === 1 ? "" : "s"}` : ""}.
          </p>
          {(rec.changes || []).length > 0 && (
            <ul className="mt-1 list-disc pl-4">
              {(rec.changes || []).map((c, i) => <li key={i}>{changeText(c)}</li>)}
            </ul>
          )}
          {rec.notices && (rec.notices.withdrawn || rec.notices.cannotWithdraw) ? (
            <p className="mt-1">
              {rec.notices.withdrawn ? `${rec.notices.withdrawn} unsent customer update${rec.notices.withdrawn === 1 ? " was" : "s were"} withdrawn from the earlier decision.` : ""}
              {rec.notices.cannotWithdraw ? ` ${rec.notices.cannotWithdraw} had already been marked done or was being sent; check whether those customers need a correction.` : ""}
            </p>
          ) : null}
          <p className="mt-1">This needs your own choice and approval. Nothing was approved automatically. <Link className="underline" href={`/decisions/${rec.supersedes}`}>See the earlier decision</Link></p>
        </Notice>
      )}
      {sd && (
        <p className="text-[12px]" style={{ color: C.faint }} data-testid="sources-changed-at">
          Source records (stock, receipts, purchase and order lines) last changed {when(sd.sourcesChangedAt)}.
        </p>
      )}
      {notices.length > 0 && (
        <div>
          <SectionLabel>Customer updates from this decision</SectionLabel>
          <ul>
            {notices.map((n) => {
              const st = NOTICE_STATE[n.state] || NOTICE_STATE.NEEDS_REVIEW;
              return (
                <li key={n.id} className="py-2" style={{ borderTop: `1px solid ${C.line}` }} data-notice-state={n.state}>
                  <p className="text-[13px]" style={{ color: C.ink }}>{n.title}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: st.tone }}>{st.label}{n.state === "WITHDRAWN" && n.blockReason ? ` ${n.blockReason}` : ""}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
