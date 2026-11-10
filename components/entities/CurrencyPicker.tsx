"use client";

// One currency at a time: a picker beside a page title when the figures span
// more than one currency, and a line listing what is owed in each, unconverted.

import { PillSelect } from "@/components/command/Charts";
import { money } from "@/lib/decisions";

type Totals = { code: string; total: number; count: number }[];

export function CurrencyPicker({ totals, cur, setCur }: { totals: Totals; cur: string; setCur: (c: string) => void }) {
  if (totals.length < 2) return null;
  return <PillSelect label="Currency" value={cur} options={totals.map((t) => ({ value: t.code, label: t.code }))} onChange={setCur} />;
}

export function CurrencyLine({ totals, cur, setCur, what = "Owed" }: { totals: Totals; cur: string; setCur: (c: string) => void; what?: string }) {
  if (totals.length < 2) return null;
  return (
    <p className="cc-note cur-line" style={{ margin: 0 }}>
      <span>{what} in {totals.length} currencies, shown one at a time and never converted:</span>
      {totals.map((t) => (
        <button key={t.code} type="button" aria-pressed={t.code === cur} className={`cur-chip ${t.code === cur ? "is-on" : ""}`} onClick={() => setCur(t.code)}>
          {money(t.total, t.code)} <span>{t.code}</span>
        </button>
      ))}
    </p>
  );
}
