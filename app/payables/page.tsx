"use client";

// Supplier run, as on the public site: the supplier bills to pay in the next
// week (or two, or month), next to what customers are due to pay in the same
// days, so the owner can see whether the run fits. Bills are read from
// GET /api/purchases and invoices from GET /api/invoices. Nothing is paid
// from here: the owner pays from the bank and records it in the books.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { Pill } from "@/components/decisions/ui";
import { PillSelect, downloadCsv } from "@/components/command/Charts";
import { EntityPicker, EntityNote } from "@/components/entities/EntityPicker";
import { CurrencyPicker, CurrencyLine } from "@/components/entities/CurrencyPicker";
import { api, getUser, request, type Invoice } from "@/lib/api";
import { useActiveEntity } from "@/lib/entities";
import { currencyOf, useCurrencyView } from "@/lib/currency";
import { openBills, dueInRun, dueLabel, daysUntil, type OpenBill, type PurchaseRow } from "@/lib/payables";
import { startThread } from "@/lib/scanStore";

const HORIZONS = [
  { value: "7", label: "Next 7 days" },
  { value: "14", label: "Next 14 days" },
  { value: "30", label: "Next 30 days" },
];
const cashKey = (userId: string, cur: string) => `starlane_cash:${userId}:${cur}`;
const readCash = (k: string) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
const writeCash = (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* private mode */ } };

function BillIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 2h8v12l-2-1.2L8 14l-2-1.2L4 14z" /><path d="M6 5.5h4M6 8h4" /></svg>;
}

export default function SupplierRunPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => { setUser(getUser()); }, []);
  const [horizon, setHorizon] = useState("7");
  const h = Number(horizon);
  // Bills the owner added to, or took out of, the run. Everything else follows the dates.
  const [pick, setPick] = useState<Map<string, boolean>>(new Map());

  const billsQ = useQuery({ queryKey: ["purchases"], queryFn: () => request<{ purchases: PurchaseRow[] }>("/api/purchases"), staleTime: 60_000 });
  const invoicesQ = useQuery({ queryKey: ["command-invoices", user?.id], queryFn: () => api.invoices.list(user!.id), enabled: !!user?.id, staleTime: 60_000 });

  const { entity, keepSupplier, keepCustomer, supplierEntity, customerEntity } = useActiveEntity();
  const bills = useMemo(
    () => openBills(billsQ.data?.purchases || [], (p) => currencyOf(p, supplierEntity(p.supplier_name)), keepSupplier),
    [billsQ.data, supplierEntity, keepSupplier],
  );
  const curView = useCurrencyView(bills, useCallback((b: OpenBill) => b.cur, []), useCallback((b: OpenBill) => b.open, []));
  const { cur, fmt } = curView;
  const shownBills = curView.inCur;

  // Customers due to pay in the same days, in the same currency. Overdue
  // invoices are shown apart: they may come in, but nothing says they will.
  const incoming = useMemo(() => {
    const out = { due: 0, dueCount: 0, overdue: 0 };
    for (const i of (invoicesQ.data?.invoices || []) as Invoice[]) {
      if (i.payment_status === "Paid" || !keepCustomer(i.customer_name)) continue;
      if (currencyOf(i, customerEntity(i.customer_name)) !== cur) continue;
      const owed = Math.max(0, Number(i.invoice_amount) - Number(i.payment_amount || 0));
      if (!owed) continue;
      const d = daysUntil(i.due_date);
      if (d != null && d >= 0 && d < h) { out.due += owed; out.dueCount++; }
      else if (d != null && d < 0) out.overdue += owed;
    }
    return out;
  }, [invoicesQ.data, keepCustomer, customerEntity, cur, h]);

  const inRun = (b: OpenBill) => pick.get(b.id) ?? dueInRun(b, h);
  const run = shownBills.filter(inRun);
  const runTotal = run.reduce((s, b) => s + b.open, 0);
  const overdue = shownBills.filter((b) => b.days != null && b.days < 0);
  const later = shownBills.filter((b) => !inRun(b));
  const toggle = (b: OpenBill) => setPick((m) => new Map(m).set(b.id, !inRun(b)));

  // Cash in the bank is the owner's own figure, kept on this device only.
  const [cash, setCash] = useState("");
  useEffect(() => { if (user?.id) setCash(readCash(cashKey(user.id, cur))); }, [user?.id, cur]);
  const cashN = cash.trim() === "" ? null : Number(cash.replace(/[,\s]/g, ""));
  const cashOk = cashN != null && Number.isFinite(cashN);
  const net = incoming.due - runTotal;
  const after = cashOk ? (cashN as number) + net : null;

  const loading = billsQ.isLoading || !user?.id;
  const ask = (q: string) => router.push(`/scan/${startThread(q)}`);
  const days = HORIZONS.find((x) => x.value === horizon)?.label.toLowerCase() || "the next 7 days";
  const exportCsv = () => downloadCsv("supplier-run", ["supplier", "bill", "due_date", "status", "amount", "currency", "in_run"],
    shownBills.map((b) => [b.supplier, b.number, b.due || "", dueLabel(b.days), Math.round(b.open * 100) / 100, b.cur, inRun(b) ? "yes" : "no"]));

  return (
    <DashboardLayout pageTitle="Supplier run">
      <div className="flex flex-col" style={{ gap: 20 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap fade-once">
          <h1 className="hv-title" style={{ margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: 37, lineHeight: 1.08, letterSpacing: "-0.012em", color: "#0F0E0D" }}>Supplier run</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <EntityPicker />
            <CurrencyPicker totals={curView.totals} cur={cur} setCur={curView.setCur} />
            <PillSelect label="Window" value={horizon} options={HORIZONS} onChange={(v) => { setHorizon(v); setPick(new Map()); }} />
            {shownBills.length > 0 && <button type="button" className="sp-btn" onClick={exportCsv}>Download as CSV</button>}
            <button type="button" className="sp-go" onClick={() => ask(`Plan my supplier payments for ${days}. I have ${run.length} bill${run.length === 1 ? "" : "s"} in the run totalling ${fmt(runTotal)}, and customers are due to pay ${fmt(incoming.due)} in the same days${cashOk ? `, with ${fmt(cashN as number)} in the bank` : ""}. Which bills should I pay first, and which can wait?`)}><StarlaneMark variant="glyph" size={10} /> Ask Starlane</button>
          </div>
        </div>

        <EntityNote />
        <CurrencyLine totals={curView.totals} cur={cur} setCur={curView.setCur} what="Bills open" />

        <div className="sp-summary" style={{ marginBottom: 0 }}>
          <span className="sp-summary-m"><StarlaneMark variant="glyph" size={9} /></span>
          {loading ? "Reading your supplier bills…"
            : shownBills.length === 0 ? <span>No unpaid supplier bills{entity ? ` for ${entity.name}` : ""}. <Link href="/purchases" className="underline" style={{ marginLeft: 4 }}>Add a bill</Link> or <Link href="/decisions/import" className="underline">import your purchases</Link>.</span>
            : <span>{run.length} bill{run.length === 1 ? "" : "s"} to pay in {days}{overdue.length ? `, ${overdue.length} already overdue` : ""} <span style={{ color: "#8F8A81" }}>from your purchases ledger</span></span>}
        </div>

        <div className="rv-stats">
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : fmt(runTotal)}</div><div className="sp-stat-l">To pay in this run ({run.length} bill{run.length === 1 ? "" : "s"})</div></div>
          <div className="sp-stat"><div className="sp-stat-n">{invoicesQ.isLoading ? "—" : fmt(incoming.due)}</div><div className="sp-stat-l">Customers due to pay you in {days}</div></div>
          <div className="sp-stat"><div className="sp-stat-n" style={{ color: net < 0 ? "#A3392E" : undefined }}>{loading ? "—" : `${net < 0 ? "−" : ""}${fmt(Math.abs(net))}`}</div><div className="sp-stat-l">Net if every customer pays on time</div></div>
          <div className="sp-stat">
            <label className="pr-cash">
              <span className="sr-only">Cash in the bank now, in {cur}</span>
              <input inputMode="decimal" placeholder="Add" value={cash} aria-label={`Cash in the bank now, in ${cur}`}
                onChange={(e) => { setCash(e.target.value); if (user?.id) writeCash(cashKey(user.id, cur), e.target.value.trim()); }} />
            </label>
            <div className="sp-stat-l">{after == null ? `Cash in the bank now (${cur}), your own figure` : <>Left after the run: <b style={{ color: after < 0 ? "#A3392E" : "#191917", fontWeight: 500 }}>{after < 0 ? "−" : ""}{fmt(Math.abs(after))}</b></>}</div>
          </div>
        </div>
        {incoming.overdue > 0 && <p className="cc-note" style={{ margin: "-6px 0 0" }}>Customers also owe {fmt(incoming.overdue)} that is already overdue. It isn&rsquo;t counted above, because nothing says when it will arrive. <Link href="/review" className="sp-link">Review it</Link></p>}

        <div className="sp-table">
          <div className="sp-tr sp-th sp-tr-pr"><span aria-hidden="true" /><span>Supplier bill</span><span>Due</span><span className="sp-right">To pay</span></div>
          {loading && <div className="sp-empty">Loading…</div>}
          {billsQ.isError && <div className="sp-empty" role="alert" style={{ color: "#A3392E" }}>Couldn&rsquo;t load your supplier bills. Try again in a moment.</div>}
          {!loading && !billsQ.isError && shownBills.length === 0 && <div className="sp-empty">Nothing to pay.</div>}
          {[...run, ...later].map((b) => {
            const on = inRun(b);
            return (
              <label key={b.id} className={`sp-tr sp-tr-pr ${on ? "" : "is-out"}`}>
                <span><input type="checkbox" checked={on} onChange={() => toggle(b)} aria-label={`Include ${b.supplier}${b.number ? ` ${b.number}` : ""} in this run`} /></span>
                <span className="sp-td-main">
                  <span className="sp-doc is-sheet"><BillIcon /></span>
                  <span className="min-w-0">
                    <span className="block truncate">{b.supplier}{b.number ? <> <span style={{ color: "#8F8A81" }}>·</span> {b.number}</> : null}</span>
                    <span className="sp-td-sub">{b.due ? new Date(b.due + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No due date"}</span>
                  </span>
                </span>
                <span className="sp-td">{b.days != null && b.days < 0 ? <Pill tone="bad">{dueLabel(b.days)}</Pill> : on ? <Pill tone="warn">{dueLabel(b.days)}</Pill> : <Pill>{dueLabel(b.days)}</Pill>}</span>
                <span className="sp-td sp-right tabular-nums">{fmt(b.open)}</span>
              </label>
            );
          })}
        </div>

        <p className="cc-note" style={{ margin: 0 }}>Tick the bills you mean to pay. Nothing is paid from this page: pay from your bank, then record the payment in your books. Net assumes every customer due in these days pays on time.</p>
      </div>
    </DashboardLayout>
  );
}
