"use client";

// Receivables Review: the owner's view, laid out like the "For Owners"
// product view on the public site. One line on what Starlane reviewed, the
// tiles an owner acts on, then every overdue invoice with its status and
// what Starlane is doing about it. Invoices come from GET /api/invoices,
// what is waiting on the owner from GET /api/decisions and the tasks in
// hand from GET /api/os/missions. Nothing here is a sample.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { EntityPicker, EntityNote } from "@/components/entities/EntityPicker";
import { useActiveEntity } from "@/lib/entities";
import { Pill } from "@/components/decisions/ui";
import { api, getUser } from "@/lib/api";
import { osApi } from "@/lib/os";
import { decisionsApi, money } from "@/lib/decisions";
import { startThread } from "@/lib/scanStore";

const DAY = 86_400_000;
const WAITING = new Set(["OPEN", "NEEDS_INFORMATION", "SELECTED", "APPROVED"]);
const customerOf = (title: string) => /from (.+?)\??$/.exec(title)?.[1]?.trim() || null;

function DocIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 1.8h5.2L12.5 5v9.2H4z" /><path d="M9 1.8V5.2h3.5M6 8.5h4.5M6 11h3" /></svg>;
}

export default function ReceivablesReviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => { setUser(getUser()); }, []);
  const [tab, setTab] = useState<"mine" | "all">("mine");

  const invoicesQ = useQuery({ queryKey: ["command-invoices", user?.id], queryFn: () => api.invoices.list(user!.id), enabled: !!user?.id, staleTime: 60_000 });
  const decisionsQ = useQuery({ queryKey: ["decisions", "active"], queryFn: () => decisionsApi.list("active"), staleTime: 30_000 });
  const missionsQ = useQuery({ queryKey: ["os-missions"], queryFn: () => osApi.missions(), staleTime: 30_000 });

  // The open decision and running task for each customer, by name.
  const byCustomer = useMemo(() => {
    const m = new Map<string, { decisionId?: string; suggestion?: string; task?: string; taskHref?: string }>();
    for (const d of decisionsQ.data?.decisions || []) {
      const c = customerOf(d.title); if (!c || !WAITING.has(d.status)) continue;
      m.set(c, { ...(m.get(c) || {}), decisionId: d.id, suggestion: d.recommendation ? (d.recommendation.informationFirst ? "Find out first" : d.recommendation.label) : undefined });
    }
    for (const t of missionsQ.data?.missions || []) {
      const c = customerOf(t.title); if (!c || t.state === "COMPLETED" || t.state === "FAILED") continue;
      m.set(c, { ...(m.get(c) || {}), task: t.objective || t.title, taskHref: t.href });
    }
    return m;
  }, [decisionsQ.data, missionsQ.data]);

  const { keepCustomer } = useActiveEntity();
  const rows = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return (invoicesQ.data?.invoices || []).filter((i) => i.payment_status !== "Paid" && keepCustomer(i.customer_name)).map((i) => {
      const due = i.due_date ? Date.parse(i.due_date.slice(0, 10) + "T00:00:00") : NaN;
      const late = Number.isFinite(due) ? Math.floor((today.getTime() - due) / DAY) : Number(i.days_overdue || 0);
      const owed = Math.max(0, Number(i.invoice_amount) - Number(i.payment_amount || 0));
      const link = byCustomer.get((i.customer_name || "").trim());
      return { i, late, owed, link };
    }).filter((r) => r.late > 0).sort((a, b) => b.late - a.late);
  }, [invoicesQ.data, byCustomer, keepCustomer]);

  const mine = rows.filter((r) => r.link?.decisionId);
  const shown = tab === "mine" ? mine : rows;
  const atRisk = rows.filter((r) => r.late > 90).reduce((s, r) => s + r.owed, 0);
  const inHand = rows.filter((r) => r.link?.task && !r.link?.decisionId).length;
  const waitingCount = (decisionsQ.data?.decisions || []).filter((d) => WAITING.has(d.status)).length;
  const loading = !user?.id || invoicesQ.isLoading;

  const ask = (q: string) => router.push(`/scan/${startThread(q)}`);

  return (
    <DashboardLayout pageTitle="Receivables Review">
      <div className="flex flex-col" style={{ gap: 20 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap fade-once">
          <h1 className="hv-title" style={{ margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: 37, lineHeight: 1.08, letterSpacing: "-0.012em", color: "#0F0E0D" }}>Receivables Review</h1>
          <div className="flex items-center gap-2">
            <EntityPicker />
            <Link href="/command" className="sp-btn">Command Center</Link>
            <button type="button" className="sp-go" onClick={() => ask("Who owes us the most right now, and who should I call first today?")}><StarlaneMark variant="glyph" size={10} /> Ask Starlane</button>
          </div>
        </div>

        <EntityNote />

        <div className="sp-summary" style={{ marginBottom: 0 }}>
          <span className="sp-summary-m"><StarlaneMark variant="glyph" size={9} /></span>
          {loading ? "Reviewing your overdue invoices…"
            : rows.length === 0 ? <>Nothing is overdue. <Link href="/decisions/import" className="underline" style={{ marginLeft: 4 }}>Import your latest bills</Link></>
            : <span>Starlane reviewed {rows.length} overdue invoice{rows.length === 1 ? "" : "s"} for you <span style={{ color: "#8F8A81" }}>from your ledger</span></span>}
        </div>

        <div className="rv-stats">
          <div className="sp-stat"><div className="sp-stat-n">{decisionsQ.isLoading ? "—" : waitingCount}</div><div className="sp-stat-l">Ready to approve</div></div>
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : mine.length}</div><div className="sp-stat-l">Invoices assigned to you</div></div>
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : inHand}</div><div className="sp-stat-l">Being handled</div></div>
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : money(atRisk)}</div><div className="sp-stat-l">Cash at risk, over 90 days</div></div>
        </div>

        <nav aria-label="Filter" className="sp-pills" style={{ marginBottom: -8 }}>
          <button type="button" aria-pressed={tab === "mine"} className={`sp-pill ${tab === "mine" ? "is-on" : ""}`} onClick={() => setTab("mine")}>My approvals ({mine.length})</button>
          <button type="button" aria-pressed={tab === "all"} className={`sp-pill ${tab === "all" ? "is-on" : ""}`} onClick={() => setTab("all")}>All ({rows.length})</button>
        </nav>

        <div className="sp-table">
          <div className="sp-tr sp-th sp-tr-rv"><span>Invoice</span><span>Status</span><span>Starlane summary</span><span className="sp-right">Owed</span></div>
          {loading && <div className="sp-empty">Loading…</div>}
          {!loading && shown.length === 0 && <div className="sp-empty">{tab === "mine" ? "Nothing is waiting on you. Every overdue invoice is either being handled or under watch." : "Nothing is overdue."}</div>}
          {shown.map(({ i, late, owed, link }) => {
            const href = link?.decisionId ? `/decisions/${link.decisionId}` : link?.taskHref || null;
            const status = link?.decisionId ? <Pill tone="accent">Ready for review</Pill> : link?.task ? <Pill tone="warn">In progress</Pill> : <Pill>Watching</Pill>;
            const summary = link?.decisionId ? (link.suggestion || "Weighing options…") : link?.task ? link.task : late > 90 ? "Past 90 days; raise it" : "Within terms of follow-up";
            const inner = (
              <>
                <span className="sp-td-main">
                  <span className="sp-doc"><DocIcon /></span>
                  <span className="min-w-0">
                    <span className="block truncate">{i.invoice_number || "Invoice"} <span style={{ color: "#8F8A81" }}>·</span> {i.customer_name}</span>
                    <span className="sp-td-sub">{late} day{late === 1 ? "" : "s"} overdue</span>
                  </span>
                </span>
                <span className="sp-td">{status}</span>
                <span className="sp-td rv-sum"><span className="sp-summary-m" style={{ width: 14, height: 14 }}><StarlaneMark variant="glyph" size={7} /></span><span className="truncate">{summary}</span></span>
                <span className="sp-td sp-right tabular-nums" style={{ color: late > 90 ? "#A3392E" : undefined }}>{money(owed)}</span>
              </>
            );
            return href
              ? <Link key={i.id} href={href} className="sp-tr sp-tr-rv">{inner}</Link>
              : <button key={i.id} type="button" className="sp-tr sp-tr-rv" onClick={() => ask(`What should I do about invoice ${i.invoice_number || ""} from ${i.customer_name}, ${late} days overdue?`)}>{inner}</button>;
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
