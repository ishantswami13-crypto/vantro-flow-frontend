import React from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export interface PurchaseRow {
  id: string | number;
  supplier_name: string;
  amount: number;
  paid_amount?: number;
  purchase_date: string;
  status?: string;
}

interface MoneySpentSectionProps {
  purchases: PurchaseRow[] | null;
  isLoading?: boolean;
}

function fmtINR(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}K`;
  return `₹${abs.toLocaleString("en-IN")}`;
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch {
    return d;
  }
}

// Q3 — "what did I spend money on": this product has no real expense
// categories in the database (confirmed — the `purchases` table has no
// category column that reflects reality; the one hardcoded value it does
// write, "material", is not a real category, so it is never shown here).
// Rather than invent categorization, this lists the real recorded
// purchases this month plainly: date, supplier, amount, and whether it's
// actually been paid — booked vs paid is kept distinct per the mission's
// time-language rule (a booked-but-unpaid purchase is never called "spent").
export function MoneySpentSection({ purchases, isLoading }: MoneySpentSectionProps) {
  if (isLoading) return <EmptyState title="Loading purchases…" />;
  if (!purchases) return <EmptyState title="Purchase data is temporarily unavailable" />;

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = purchases
    .filter((p) => String(p.purchase_date || "").slice(0, 7) === thisMonthKey)
    .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));

  if (thisMonth.length === 0) {
    return <EmptyState title="No purchases recorded this month" />;
  }

  const totalBooked = thisMonth.reduce((a, p) => a + Number(p.amount || 0), 0);
  const totalPaid = thisMonth.reduce((a, p) => a + Number(p.paid_amount || 0), 0);

  return (
    <div>
      <p className="text-sm text-primary mb-1">
        <span className="font-bold">{fmtINR(totalPaid)}</span> actually paid to suppliers this month
        {totalBooked !== totalPaid && <span className="text-muted"> ({fmtINR(totalBooked)} booked in total, some still unpaid)</span>}
      </p>
      <div className="space-y-1.5 mt-3">
        {thisMonth.slice(0, 10).map((p) => {
          const paid = Number(p.paid_amount || 0);
          const booked = Number(p.amount || 0);
          const fullyPaid = paid >= booked && booked > 0;
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border bg-surface-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{p.supplier_name || "Unknown supplier"}</p>
                <p className="text-2xs text-muted">{fmtDate(p.purchase_date)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-primary">{fmtINR(booked)}</p>
                <p className="text-2xs text-muted">{fullyPaid ? "Paid" : paid > 0 ? `${fmtINR(paid)} paid` : "Not yet paid"}</p>
              </div>
            </div>
          );
        })}
      </div>
      {thisMonth.length > 10 && (
        <p className="text-2xs text-muted mt-2">+{thisMonth.length - 10} more purchase{thisMonth.length - 10 === 1 ? "" : "s"} this month.</p>
      )}
    </div>
  );
}
