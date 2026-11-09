"use client";

// Bank matching: the "Reconcile bank lines" work from the public site. Import
// a bank statement and every money-in line is paired with the open invoice it
// most likely settles, with the reason shown. Statement lines are stored by
// POST /api/bank/transactions/bulk and read back from GET /api/bank/transactions;
// invoices come from GET /api/invoices. Matches are suggestions: nothing here
// marks an invoice paid, because the books stay the record.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { Pill } from "@/components/decisions/ui";
import { api, getUser, request } from "@/lib/api";
import { money } from "@/lib/decisions";
import { startThread } from "@/lib/scanStore";
import { txnText } from "@/lib/txnText";
import { downloadCsv } from "@/components/command/Charts";
import { parseBankStatement, type StatementRow } from "@/lib/bankStatement";
import { matchStatement, openInvoices, type BankTxn, type MatchKind } from "@/lib/reconcile";

const LABEL: Record<MatchKind, string> = {
  matched: "Matched", suggested: "Suggested match", amount_only: "Check customer", part: "Part payment?", no_invoice: "No invoice found",
};
const TONE: Record<MatchKind, "good" | "accent" | "warn" | "bad" | "neutral"> = {
  matched: "good", suggested: "accent", amount_only: "warn", part: "warn", no_invoice: "bad",
};
type Filter = "all" | "suggested" | "check" | "no_invoice";
const shortDate = (iso: string) => new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function BankIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M2 6h12L8 2.5zM3.5 6.5v5M6.5 6.5v5M9.5 6.5v5M12.5 6.5v5M2 13.5h12" /></svg>;
}

export default function BankMatchingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => { setUser(getUser()); }, []);
  const [filter, setFilter] = useState<Filter>("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ name: string; rows: StatementRow[]; skipped: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const invoicesQ = useQuery({ queryKey: ["command-invoices", user?.id], queryFn: () => api.invoices.list(user!.id), enabled: !!user?.id, staleTime: 60_000 });
  const txnsQ = useQuery({ queryKey: ["bank-transactions"], queryFn: () => request<{ transactions: BankTxn[] }>("/api/bank/transactions"), staleTime: 30_000 });

  const open = useMemo(() => openInvoices(invoicesQ.data?.invoices || []), [invoicesQ.data]);
  const rows = useMemo(() => matchStatement(txnsQ.data?.transactions || [], open), [txnsQ.data, open]);
  const claimed = useMemo(() => new Set(rows.flatMap((r) => r.invoices.map((i) => i.id))), [rows]);

  const count = (k: MatchKind[]) => rows.filter((r) => k.includes(r.kind)).length;
  const sumOf = (k: MatchKind[]) => rows.filter((r) => k.includes(r.kind)).reduce((s, r) => s + Number(r.txn.amount), 0);
  const moneyIn = rows.reduce((s, r) => s + Number(r.txn.amount), 0);
  const overdueNoReceipt = open.filter((i) => !claimed.has(i.id) && i.due && i.due < new Date().toISOString().slice(0, 10));
  const shown = rows.filter((r) => filter === "all" ? true
    : filter === "suggested" ? r.kind === "suggested" || r.kind === "matched"
    : filter === "check" ? r.kind === "amount_only" || r.kind === "part"
    : r.kind === "no_invoice");
  const loading = !user?.id || invoicesQ.isLoading || txnsQ.isLoading;
  const ask = (q: string) => router.push(`/scan/${startThread(q)}`);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setNote(null);
    if (!/\.csv$/i.test(f.name)) { setNote({ tone: "err", text: "Export the statement from your bank as CSV, then choose that file." }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBankStatement(String(reader.result || ""));
      if (!parsed.headerFound) { setNote({ tone: "err", text: "Couldn’t find the date and amount columns in this file. Is it a bank statement?" }); return; }
      if (!parsed.rows.length) { setNote({ tone: "err", text: "No transactions could be read from this file." }); return; }
      setPreview({ name: f.name, rows: parsed.rows, skipped: parsed.skipped });
    };
    reader.readAsText(f);
  };

  const doImport = async () => {
    if (!preview) return;
    setImporting(true); setNote(null);
    try {
      const all = preview.rows;
      let inserted = 0, duplicates = 0, rejected = 0;
      for (let i = 0; i < all.length; i += 1000) {
        const r = await request<{ inserted: number; duplicates: number; rejected: unknown[] }>("/api/bank/transactions/bulk", {
          method: "POST", body: JSON.stringify({ account_id: null, transactions: all.slice(i, i + 1000).map((x) => ({ txn_date: x.date, description: x.description, amount: x.amount, type: x.type })) }),
        });
        inserted += r.inserted || 0; duplicates += r.duplicates || 0; rejected += (r.rejected || []).length;
      }
      setPreview(null);
      setNote({ tone: "ok", text: `Imported ${inserted} line${inserted === 1 ? "" : "s"}${duplicates ? `, ${duplicates} already here` : ""}${rejected ? `, ${rejected} couldn’t be read` : ""}. Matches are below.` });
      await qc.invalidateQueries({ queryKey: ["bank-transactions"] });
    } catch (err) {
      setNote({ tone: "err", text: `The import didn’t go through. ${(err as Error).message}` });
    } finally { setImporting(false); }
  };

  const exportCsv = () => downloadCsv("bank-matching", ["date", "narration", "amount", "status", "invoices", "customer", "reason"],
    rows.map((r) => [r.txn.txn_date.slice(0, 10), txnText(r.txn.description), Number(r.txn.amount), LABEL[r.kind], r.invoices.map((i) => i.number).join(" + "), r.invoices[0]?.customer || "", r.why]));

  const credits = preview?.rows.filter((r) => r.type === "credit") || [];

  return (
    <DashboardLayout pageTitle="Bank matching">
      <div className="flex flex-col" style={{ gap: 20 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap fade-once">
          <h1 className="hv-title" style={{ margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: 37, lineHeight: 1.08, letterSpacing: "-0.012em", color: "#0F0E0D" }}>Bank matching</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} aria-label="Choose a bank statement CSV" />
            {rows.length > 0 && <button type="button" className="sp-btn" onClick={exportCsv}>Download as CSV</button>}
            <button type="button" className="sp-btn" onClick={() => fileRef.current?.click()}>Import statement</button>
            <button type="button" className="sp-go" onClick={() => ask("Match my bank receipts against my open invoices and list every gap: unpaid, part-paid, or paid without an invoice.")}><StarlaneMark variant="glyph" size={10} /> Ask Starlane</button>
          </div>
        </div>

        <div className="sp-summary" style={{ marginBottom: 0 }}>
          <span className="sp-summary-m"><StarlaneMark variant="glyph" size={9} /></span>
          {loading ? "Matching your bank lines…"
            : rows.length === 0 ? <span>Import a bank statement and Starlane matches each receipt to the invoice it settles.</span>
            : <span>Starlane matched {count(["suggested", "matched"])} of {rows.length} receipt{rows.length === 1 ? "" : "s"} to open invoices <span style={{ color: "#8F8A81" }}>from your statements and ledger</span></span>}
        </div>

        {note && <p role={note.tone === "err" ? "alert" : "status"} className="cc-note" style={{ margin: 0, color: note.tone === "err" ? "#A3392E" : "#2F6B45" }}>{note.text}</p>}

        {preview && (
          <section className="cc-card bm-preview" aria-label="Statement preview">
            <div className="cc-card-top">
              <div>
                <h2 className="cc-h2">{preview.name}</h2>
                <div className="cc-sub">{preview.rows.length} line{preview.rows.length === 1 ? "" : "s"} read: {credits.length} money in ({money(credits.reduce((s, r) => s + r.amount, 0))}), {preview.rows.length - credits.length} money out{preview.skipped ? `. ${preview.skipped} couldn’t be read and will be left out.` : "."}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="sp-btn" onClick={() => setPreview(null)} disabled={importing}>Cancel</button>
                <button type="button" className="sp-go" onClick={doImport} disabled={importing}>{importing ? "Importing…" : `Import ${preview.rows.length} lines`}</button>
              </div>
            </div>
            <div className="sp-table" style={{ marginTop: 14 }}>
              {preview.rows.slice(0, 5).map((r, i) => (
                <div key={i} className="sp-tr sp-tr-bmp">
                  <span className="sp-td">{shortDate(r.date)}</span>
                  <span className="sp-td truncate">{r.description}</span>
                  <span className="sp-td sp-right tabular-nums" style={{ color: r.type === "credit" ? "#2F6B45" : undefined }}>{r.type === "credit" ? "+" : "−"}{money(r.amount)}</span>
                </div>
              ))}
              {preview.rows.length > 5 && <div className="sp-empty">and {preview.rows.length - 5} more</div>}
            </div>
            <p className="cc-note" style={{ marginBottom: 0 }}>Lines already imported are skipped, so importing the same statement twice is safe.</p>
          </section>
        )}

        <div className="rv-stats">
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : money(moneyIn)}</div><div className="sp-stat-l">Money in on your statements</div></div>
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : money(sumOf(["suggested", "matched"]))}</div><div className="sp-stat-l">Matched to an invoice</div></div>
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : count(["amount_only", "part", "no_invoice"])}</div><div className="sp-stat-l">Receipts to check</div></div>
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : overdueNoReceipt.length}</div><div className="sp-stat-l">Overdue invoices with no receipt</div></div>
        </div>

        <nav aria-label="Filter" className="sp-pills" style={{ marginBottom: -8, flexWrap: "wrap" }}>
          {([["all", `All (${rows.length})`], ["suggested", `Matched (${count(["suggested", "matched"])})`], ["check", `To check (${count(["amount_only", "part"])})`], ["no_invoice", `No invoice (${count(["no_invoice"])})`]] as Array<[Filter, string]>).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} className={`sp-pill ${filter === k ? "is-on" : ""}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </nav>

        <div className="sp-table">
          <div className="sp-tr sp-th sp-tr-rv"><span>Bank line</span><span>Status</span><span>Starlane summary</span><span className="sp-right">Amount</span></div>
          {loading && <div className="sp-empty">Loading…</div>}
          {(txnsQ.isError || invoicesQ.isError) && <div className="sp-empty" role="alert" style={{ color: "#A3392E" }}>Couldn’t load your {txnsQ.isError ? "bank lines" : "invoices"}. Try again in a moment.</div>}
          {!loading && rows.length === 0 && !txnsQ.isError && (
            <div className="sp-empty">No bank lines yet. <button type="button" className="sp-link" onClick={() => fileRef.current?.click()}>Import a statement</button> exported from your bank as CSV.</div>
          )}
          {!loading && rows.length > 0 && shown.length === 0 && <div className="sp-empty">Nothing here.</div>}
          {shown.map((r) => {
            const inv = r.invoices;
            const what = inv.length ? `${inv.map((i) => i.number).join(" + ")} · ${inv[0].customer}` : r.why;
            return (
              <button key={r.txn.id} type="button" className="sp-tr sp-tr-rv"
                onClick={() => ask(inv.length
                  ? `A receipt of ${money(Number(r.txn.amount))} on ${shortDate(r.txn.txn_date)} ("${txnText(r.txn.description)}") looks like it settles ${what}. Check it against the ledger and tell me what to record.`
                  : `A receipt of ${money(Number(r.txn.amount))} on ${shortDate(r.txn.txn_date)} ("${txnText(r.txn.description)}") matches no open invoice. Who is it most likely from, and what should I do?`)}>
                <span className="sp-td-main">
                  <span className="sp-doc"><BankIcon /></span>
                  <span className="min-w-0">
                    <span className="block truncate">{txnText(r.txn.description) || "Bank receipt"}</span>
                    <span className="sp-td-sub">{shortDate(r.txn.txn_date)}</span>
                  </span>
                </span>
                <span className="sp-td"><Pill tone={TONE[r.kind]}>{LABEL[r.kind]}</Pill></span>
                <span className="sp-td rv-sum" title={r.why}><span className="sp-summary-m" style={{ width: 14, height: 14 }}><StarlaneMark variant="glyph" size={7} /></span><span className="truncate">{inv.length ? <>{what} <span style={{ color: "#8F8A81" }}>· {r.why}</span></> : r.why}</span></span>
                <span className="sp-td sp-right tabular-nums">{money(Number(r.txn.amount))}</span>
              </button>
            );
          })}
        </div>

        {!loading && overdueNoReceipt.length > 0 && (
          <section aria-labelledby="bm-gaps">
            <div className="flex items-center justify-between gap-3" style={{ marginBottom: 10 }}>
              <h2 id="bm-gaps" className="cc-h2">Overdue, and no receipt on any statement</h2>
              <Link href="/review" className="sp-link">Receivables Review</Link>
            </div>
            <div className="sp-table">
              {overdueNoReceipt.slice(0, 8).map((i) => (
                <div key={i.id} className="sp-tr sp-tr-bmp">
                  <span className="sp-td">{i.number}</span>
                  <span className="sp-td truncate">{i.customer} <span style={{ color: "#8F8A81" }}>· due {i.due ? shortDate(i.due) : "—"}</span></span>
                  <span className="sp-td sp-right tabular-nums">{money(i.owed)}</span>
                </div>
              ))}
              {overdueNoReceipt.length > 8 && <div className="sp-empty">and {overdueNoReceipt.length - 8} more</div>}
            </div>
          </section>
        )}

        <p className="cc-note" style={{ margin: 0 }}>Matches are suggestions worked out from your statements and open invoices. Starlane does not mark an invoice paid: record the payment in your books and it arrives with the next sync.</p>
      </div>
    </DashboardLayout>
  );
}
