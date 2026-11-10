// Supplier run: which supplier bills to pay in the coming days, set against
// what customers are due to pay in the same days. Bills come from
// GET /api/purchases and invoices from GET /api/invoices; both are only read.
// Nothing here pays a bill or marks one paid: the owner pays from the bank and
// records it in the books.

const DAY = 86_400_000;

export type PurchaseRow = {
  id: string | number; supplier_name?: string | null; bill_number?: string | null;
  amount?: number | string | null; paid_amount?: number | string | null; status?: string | null;
  due_date?: string | null; purchase_date?: string | null; currency?: string | null;
};

export type OpenBill = { id: string; supplier: string; number: string; due: string | null; days: number | null; open: number; cur: string };

const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t.getTime(); };
export const daysUntil = (iso: string | null | undefined, today = startOfToday()): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso.slice(0, 10) + "T00:00:00");
  return Number.isFinite(t) ? Math.round((t - today) / DAY) : null;
};

/** Bills with money still to pay, soonest due first (bills with no due date last). */
export function openBills(rows: PurchaseRow[], curOf: (r: PurchaseRow) => string, keep: (supplier: string) => boolean = () => true): OpenBill[] {
  const today = startOfToday();
  return rows
    .filter((p) => String(p.status || "").toLowerCase() !== "paid")
    .map((p) => {
      const open = Math.max(0, (Number(p.amount) || 0) - (Number(p.paid_amount) || 0));
      const supplier = (p.supplier_name || "").trim() || "Unnamed supplier";
      const due = p.due_date ? p.due_date.slice(0, 10) : null;
      return { id: String(p.id), supplier, number: (p.bill_number || "").trim(), due, days: daysUntil(due, today), open, cur: curOf(p) };
    })
    .filter((b) => b.open > 0.005 && keep(b.supplier))
    .sort((a, b) => (a.days ?? 1e9) - (b.days ?? 1e9) || b.open - a.open);
}

/** In the run by default: overdue, or due within the horizon. */
export const dueInRun = (b: Pick<OpenBill, "days">, horizon: number) => b.days != null && b.days < horizon;

export function dueLabel(days: number | null): string {
  if (days == null) return "No due date";
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}
