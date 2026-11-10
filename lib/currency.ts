// Invoices in other currencies. Each invoice keeps the currency it was booked
// in: its own currency, else its company's (Spaces), else the business's.
// Amounts in different currencies are never added together or converted;
// a view that sums shows one currency at a time and lists the others.

import { useMemo, useState } from "react";
import { getRegion } from "@/lib/locale";
import { money } from "@/lib/decisions";
import type { Entity } from "@/lib/entities";

export const baseCurrency = () => (getRegion().currency || "USD").toUpperCase();

const CODE = /^[A-Za-z]{3}$/;
export function currencyOf(
  row: { currency?: string | null } | null | undefined,
  entity: Pick<Entity, "currency"> | null | undefined,
): string {
  const own = row?.currency && CODE.test(row.currency) ? row.currency.toUpperCase() : null;
  return own || (entity?.currency ? entity.currency.toUpperCase() : null) || baseCurrency();
}

/**
 * The currencies among `rows`, largest total first, and the one being shown.
 * `amount` is what each row contributes to the totals listed beside the picker.
 */
export function useCurrencyView<T>(rows: T[], curOf: (r: T) => string, amount: (r: T) => number) {
  const totals = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>();
    for (const r of rows) {
      const c = curOf(r); const t = m.get(c) || { total: 0, count: 0 };
      t.total += Math.max(0, amount(r) || 0); t.count += 1; m.set(c, t);
    }
    return [...m.entries()].map(([code, v]) => ({ code, ...v })).sort((a, b) => b.total - a.total || b.count - a.count);
  }, [rows, curOf, amount]);
  const [picked, setPicked] = useState<string | null>(null);
  const cur = picked && totals.some((t) => t.code === picked) ? picked : totals[0]?.code || baseCurrency();
  const inCur = useMemo(() => rows.filter((r) => curOf(r) === cur), [rows, curOf, cur]);
  const fmt = useMemo(() => (v: number) => money(v, cur), [cur]);
  return { totals, cur, setCur: setPicked, inCur, fmt, mixed: totals.length > 1 };
}
