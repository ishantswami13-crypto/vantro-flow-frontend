// Bank matching: pair each money-in line on an imported bank statement with
// the open invoice it most likely settles. These are suggestions worked out
// in the browser from two things Starlane already holds, the statement lines
// (GET /api/bank/transactions) and the open invoices (GET /api/invoices). No
// invoice is marked paid here: the payment is recorded in the books and
// arrives with the next sync.

import type { Invoice } from "@/lib/api";

export type BankTxn = {
  id: number; txn_date: string; description: string | null; amount: number;
  type: "credit" | "debit"; status: string; account_id?: number | null;
};

export type MatchKind = "matched" | "suggested" | "amount_only" | "part" | "no_invoice";
export type OpenInvoice = { id: string; number: string; customer: string; owed: number; date: string | null; due: string | null };
export type MatchRow = { txn: BankTxn; kind: MatchKind; invoices: OpenInvoice[]; why: string };

const STOP = new Set(["pvt", "ltd", "private", "limited", "llp", "and", "the", "co", "company", "traders", "trading", "enterprises", "india", "industries", "corp", "inc"]);
const tokens = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((t) => t.length >= 3 && !STOP.has(t));

/** True when the statement narration names the customer: a distinctive word of the name appears in it. */
export function namesCustomer(narration: string, customer: string): boolean {
  const n = ` ${(narration || "").toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  const words = tokens(customer);
  if (!words.length) return false;
  return words.some((w) => n.includes(` ${w} `) || (w.length >= 5 && n.includes(w)));
}

const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, b * 0.001);

export function openInvoices(invoices: Invoice[]): OpenInvoice[] {
  return invoices.filter((i) => i.payment_status !== "Paid").map((i) => ({
    id: i.id, number: i.invoice_number || "Invoice", customer: (i.customer_name || "").trim() || "Unnamed customer",
    owed: Math.max(0, Number(i.invoice_amount) - Number(i.payment_amount || 0)),
    date: i.invoice_date ? i.invoice_date.slice(0, 10) : null, due: i.due_date ? i.due_date.slice(0, 10) : null,
  })).filter((i) => i.owed > 0);
}

/**
 * Suggest a match for every money-in line. Each open invoice is offered to
 * one line at most, strongest evidence first, so two receipts never claim
 * the same invoice.
 */
export function matchStatement(txns: BankTxn[], open: OpenInvoice[]): MatchRow[] {
  const credits = txns.filter((t) => t.type === "credit" && t.status !== "ignored");
  const used = new Set<string>();
  const out = new Map<number, MatchRow>();
  const before = (inv: OpenInvoice, t: BankTxn) => !inv.date || inv.date <= t.txn_date.slice(0, 10);

  for (const t of credits) if (t.status === "matched") out.set(t.id, { txn: t, kind: "matched", invoices: [], why: "Marked as matched" });
  const pending = credits.filter((t) => !out.has(t.id));

  // 1. Same amount, and the narration names the customer.
  for (const t of pending) {
    const hit = open.find((i) => !used.has(i.id) && near(i.owed, Number(t.amount)) && before(i, t) && namesCustomer(t.description || "", i.customer));
    if (hit) { used.add(hit.id); out.set(t.id, { txn: t, kind: "suggested", invoices: [hit], why: `Same amount, and the narration names ${hit.customer}` }); }
  }
  // 2. The narration names the customer and the amount clears several of their invoices exactly.
  for (const t of pending) {
    if (out.has(t.id)) continue;
    const theirs = open.filter((i) => !used.has(i.id) && before(i, t) && namesCustomer(t.description || "", i.customer))
      .sort((a, b) => (a.due || "").localeCompare(b.due || ""));
    if (!theirs.length) continue;
    let sum = 0; const pick: OpenInvoice[] = [];
    for (const i of theirs) { if (sum + i.owed > Number(t.amount) + 1) break; sum += i.owed; pick.push(i); }
    if (pick.length > 1 && near(sum, Number(t.amount))) {
      pick.forEach((i) => used.add(i.id));
      out.set(t.id, { txn: t, kind: "suggested", invoices: pick, why: `Clears ${pick.length} of ${pick[0].customer}'s invoices, oldest first` });
    } else {
      const first = theirs[0];
      out.set(t.id, { txn: t, kind: "part", invoices: [first], why: Number(t.amount) < first.owed
        ? `Less than the ${first.number} balance; looks like a part payment from ${first.customer}`
        : `Names ${first.customer}, but the amount does not clear their open invoices exactly` });
    }
  }
  // 3. Exactly one open invoice for this amount, with no name in the narration.
  for (const t of pending) {
    if (out.has(t.id)) continue;
    const same = open.filter((i) => !used.has(i.id) && near(i.owed, Number(t.amount)) && before(i, t));
    if (same.length === 1) { used.add(same[0].id); out.set(t.id, { txn: t, kind: "amount_only", invoices: same, why: "Only open invoice for this amount; the narration does not name the customer" }); }
  }
  for (const t of pending) if (!out.has(t.id)) out.set(t.id, { txn: t, kind: "no_invoice", invoices: [], why: "No open invoice matches this receipt" });

  return credits.map((t) => out.get(t.id)!).sort((a, b) => b.txn.txn_date.localeCompare(a.txn.txn_date));
}
