import type { Transaction } from "@/lib/api";

// No single-transaction-by-id endpoint exists (GET /api/transactions/:userId is
// list-only over bank_transactions, mapped through server.js's
// mapBankTransactionToLedger). That mapper parses each row's `description`
// into { party_name, description, reference } where `reference` is whatever
// substring matches /^(Receipt|Payment)\s+#/i (e.g. "Receipt #INV-2026-001" or
// "Payment #BILL-042") — invoice_number / bill_number are threaded into that
// description at creation time (server.js ~line 2001/2651/2748/2765).
//
// This is a client-side best-effort match against the tenant's already
// fetched, already tenant-scoped transaction list (per the plan's explicit
// "no new backend endpoint" decision, §8) — not a guaranteed 1:1 join.
export function findMatchingTransaction(
  transactions: Transaction[],
  hint: { reference?: string; partyName?: string; amount?: number; date?: string }
): Transaction | null {
  const ref = (hint.reference || "").trim().toLowerCase();
  const party = (hint.partyName || "").trim().toLowerCase();

  // 1) Strongest signal: the transaction's parsed reference contains the
  //    invoice/bill number (or vice versa).
  if (ref) {
    const byRef = transactions.find(t => {
      const tref = (t.reference || "").toLowerCase();
      return tref && (tref.includes(ref) || ref.includes(tref));
    });
    if (byRef) return byRef;
  }

  // 2) Fallback: same party name + amount within a small tolerance (handles
  //    partial payments / rounding) — party name matching is loose since
  //    `party_name` is heuristically split out of the free-text description.
  if (party && typeof hint.amount === "number") {
    const byPartyAndAmount = transactions.find(t => {
      const tparty = (t.party_name || "").toLowerCase();
      if (!tparty || !(tparty.includes(party) || party.includes(tparty))) return false;
      return Math.abs(Number(t.amount) - hint.amount!) < 1;
    });
    if (byPartyAndAmount) return byPartyAndAmount;
  }

  // 3) Weakest fallback: same party name only, most recent.
  if (party) {
    const byParty = transactions.find(t => {
      const tparty = (t.party_name || "").toLowerCase();
      return tparty && (tparty.includes(party) || party.includes(tparty));
    });
    if (byParty) return byParty;
  }

  return null;
}
