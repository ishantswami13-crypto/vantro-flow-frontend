// One way to write numbers, money, dates and time across Starlane.
// Money is always in full with Indian grouping (₹90,000, ₹12,50,000):
// a figure an owner acts on is never shortened to "90K" or "0.9L".

const IN = "en-IN";

/** ₹90,000 · −₹4,500 · ₹1,250.50. Other currencies keep their code: USD 1,200. */
export function inr(n: number | string | null | undefined, currency = "INR", decimals = 0): string {
  const v = Number(n);
  if (n === null || n === undefined || n === "" || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v).toLocaleString(IN, { minimumFractionDigits: 0, maximumFractionDigits: decimals || (Math.abs(v) % 1 ? 2 : 0) });
  const sign = v < 0 ? "−" : "";
  return !currency || currency.toUpperCase() === "INR" ? `${sign}₹${abs}` : `${sign}${currency.toUpperCase()} ${abs}`;
}

/** 1,240 */
export function count(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(Number(n)) ? "—" : Number(n).toLocaleString(IN);
}

/** 12% · +3.4% (signed) */
export function pct(n: number | null | undefined, opts: { signed?: boolean; decimals?: number } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  const v = Number(n);
  const s = v.toLocaleString(IN, { maximumFractionDigits: opts.decimals ?? (Math.abs(v) < 10 && v % 1 ? 1 : 0) });
  return `${opts.signed && v > 0 ? "+" : ""}${s}%`;
}

/** "just now" · "12m ago" · "3h ago" · "yesterday" · "6d ago" · "1 Jun" */
export function ago(iso: string | number | Date | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.round(s / 86400);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return shortDate(iso);
}

/** Exact local time for a tooltip: "6 Oct 2026, 6:52 pm" */
export function exact(iso: string | number | Date | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString(IN, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
}

/** "1 Jun" (this year) · "1 Jun 2025" (other years) */
export function shortDate(iso: string | number | Date | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(IN, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

/** "128 days" · "1 day" */
export function days(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  const v = Math.round(Number(n));
  return `${v.toLocaleString(IN)} ${Math.abs(v) === 1 ? "day" : "days"}`;
}

/** Chart axis ticks only, where space is tight: ₹45K · ₹1.2L · ₹3.4Cr. Never for a figure someone acts on. */
export function axisInr(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e7) return `${s}₹${+(a / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${s}₹${+(a / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${s}₹${Math.round(a / 1e3)}K`;
  return `${s}₹${a}`;
}
