"use client";

// Scan look-up on the web — the same explanations as the desktop and phone
// apps: type a customer or invoice number, open why it matters, with every
// fact labelled (GET /api/client/scan/search, /scan/customer/:key,
// /scan/invoice/:id). Read-only; it links to starting a mission.
import { useEffect, useState } from "react";
import Link from "next/link";
import { request } from "@/lib/api";
import type { CustomerScan, InvoiceScan, ScanSearch } from "../../packages/contracts/src/features";

const RULE = "rgb(var(--tk-ink) / 0.10)", GRAPHITE = "var(--ink-2)";
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
function show(v: unknown, unit?: string) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return unit === "INR" ? inr(v) : `${v.toLocaleString("en-IN")}${unit && unit !== "INR" ? ` ${unit}` : ""}`;
  return String(v);
}

export default function ScanLookup() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ScanSearch | null>(null);
  const [scan, setScan] = useState<CustomerScan | null>(null);
  const [invoice, setInvoice] = useState<InvoiceScan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits(null); return; }
    let live = true;
    const t = setTimeout(() => { request<ScanSearch>(`/api/client/scan/search?q=${encodeURIComponent(term)}`).then((h) => live && setHits(h)).catch(() => live && setHits(null)); }, 220);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  // /scan?invoice=<id> or ?customer=<key> (from Watch, Bridge) opens it directly.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const inv = q.get("invoice"), cust = q.get("customer");
    if (inv) void openInvoice(inv); else if (cust) void openCustomer(cust);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openCustomer(key: string) {
    setError(null); setInvoice(null);
    try { setScan((await request<{ scan: CustomerScan }>(`/api/client/scan/customer/${encodeURIComponent(key)}`)).scan); } catch (e) { setError((e as Error).message); }
  }
  async function openInvoice(id: string) {
    setError(null);
    try { const s = (await request<{ scan: InvoiceScan }>(`/api/client/scan/invoice/${id}`)).scan; setInvoice(s); setScan(s.customer); } catch (e) { setError((e as Error).message); }
  }

  return (
    <section aria-labelledby="scan-lookup-h" style={{ width: "100%", display: "grid", gap: 10, marginBottom: 28 }}>
      <h2 id="scan-lookup-h" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Look into a customer or invoice</h2>
      <input aria-label="Customer or invoice number" placeholder="Mehta Hardware, S/101…" value={q} onChange={(e) => setQ(e.target.value)}
        style={{ padding: "10px 12px", border: `1px solid ${RULE}`, borderRadius: 8, font: "inherit", background: "var(--surface)" }} />
      {hits && (hits.customers.length || hits.invoices.length) ? (
        <div style={{ background: "var(--surface)", border: `1px solid ${RULE}`, borderRadius: 8, overflow: "hidden" }}>
          {hits.customers.map((c, i) => (
            <button key={c.key} onClick={() => void openCustomer(c.key)} style={{ all: "unset", boxSizing: "border-box", width: "100%", display: "flex", gap: 12, padding: "10px 14px", borderTop: i ? `1px solid ${RULE}` : 0, cursor: "pointer" }}>
              <span style={{ flex: 1 }}><strong style={{ fontWeight: 500 }}>{c.name}</strong> <span style={{ color: GRAPHITE, fontSize: 13 }}>· {c.openCount} open · oldest {c.oldestDays} days</span></span>
              <span style={{ fontFamily: "var(--font-sans)" }}>{inr(c.openTotal)}</span>
            </button>
          ))}
          {hits.invoices.map((v) => (
            <button key={v.id} onClick={() => void openInvoice(v.id)} style={{ all: "unset", boxSizing: "border-box", width: "100%", display: "flex", gap: 12, padding: "10px 14px", borderTop: `1px solid ${RULE}`, cursor: "pointer" }}>
              <span style={{ flex: 1 }}><strong style={{ fontWeight: 500 }}>{v.invoiceNumber}</strong> <span style={{ color: GRAPHITE, fontSize: 13 }}>· {v.customer} · {v.daysOverdue > 0 ? `${v.daysOverdue} days overdue` : "not yet due"}</span></span>
              <span style={{ fontFamily: "var(--font-sans)" }}>{inr(v.amount)}</span>
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert" style={{ color: "var(--critical)", margin: 0 }}>{error}</p> : null}
      {scan ? (
        <article style={{ background: "var(--surface)", border: `1px solid ${RULE}`, borderRadius: 8, padding: "16px 18px", display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 21 }}>{invoice ? invoice.headline : scan.headline}</h3>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>{scan.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          {scan.nextStep ? <p style={{ margin: 0, fontSize: 13.5, color: GRAPHITE }}>Next step: {scan.nextStep.stage.replace(/_/g, " ").toLowerCase()}. {scan.nextStep.text}</p> : null}
          <dl style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: "6px 12px", margin: 0, fontSize: 13.5 }}>
            {(invoice ? invoice.evidence : scan.evidence).facts.map((f, i) => (
              <div key={i} style={{ display: "contents" }}>
                <dt>{f.label}</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-sans)" }}>{show(f.value, f.unit)}</dd>
                <dd style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11, color: GRAPHITE }}>{f.kind}</dd>
              </div>
            ))}
          </dl>
          {scan.invoices.some((i) => i.daysOverdue > 0 && !i.disputed) ? (
            <Link href={invoice ? `/missions/new?invoice=${encodeURIComponent(invoice.subject.id)}` : `/missions/new?customer=${encodeURIComponent(scan.subject.name)}`}
              style={{ justifySelf: "start", fontSize: 13.5, padding: "7px 12px", borderRadius: 6, background: "var(--inverse)", color: "var(--on-inverse)", textDecoration: "none" }}>
              Start a mission to collect{invoice ? " this invoice" : ""}
            </Link>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
