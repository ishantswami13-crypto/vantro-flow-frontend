// lib/locale.ts — how money, numbers and dates are written for this business.
//
// Starlane serves businesses in any country, so nothing in the app should
// assume rupees, lakh/crore grouping, GST or Indian time. The business's
// region (country, currency, locale, timezone, tax label) comes from the
// backend (GET /api/settings/region, backend lib/locale/region.js), is cached
// on this device so the first paint is right, and is refreshed by
// <RegionProvider> in the signed-in layout.
//
// Formatting goes through Intl, so each currency is written the way its own
// market reads it: $1,250,000 · £1,250,000 · 1.250.000 € · ₹12,50,000.
// Compact amounts follow the same rule: $1.3M · ₹12.5L.

export interface Region {
  country: string | null;
  currency: string;
  locale: string;
  timezone: string;
  taxLabel: string;
}

const STORAGE_KEY = "starlane.region.v1";

// Starlane is a New York company; with nothing known about the business the
// neutral default is US English and US dollars, in the browser's own timezone.
function browserTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York"; } catch { return "America/New_York"; }
}

export const DEFAULT_REGION: Region = {
  country: null,
  currency: "USD",
  locale: "en-US",
  timezone: "America/New_York",
  taxLabel: "Tax",
};

function readCache(): Region | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    return r && typeof r.currency === "string" && typeof r.locale === "string" ? { ...DEFAULT_REGION, ...r } : null;
  } catch { return null; }
}

// Server render and the first client render both use the default, so
// hydration matches; RegionProvider then applies this device's cached region
// before data loads, and the backend's answer after that.
let current: Region = { ...DEFAULT_REGION };
let cacheApplied = false;
const listeners = new Set<(r: Region) => void>();

/** Apply the region cached on this device (once). Returns true if it changed anything. */
export function applyCachedRegion(): boolean {
  if (cacheApplied || typeof window === "undefined") return false;
  cacheApplied = true;
  const cached = readCache();
  return setRegion(cached || { timezone: browserTimezone() });
}

export function getRegion(): Region {
  return current;
}

/** Replace the active region (from the API or Settings). Returns true if it changed. */
export function setRegion(next: Partial<Region>): boolean {
  const merged: Region = { ...current, ...Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined && v !== null && v !== "")) } as Region;
  if (next.country === null) merged.country = null;
  const changed = JSON.stringify(merged) !== JSON.stringify(current);
  current = merged;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch { /* private mode */ }
  }
  if (changed) listeners.forEach((fn) => fn(current));
  return changed;
}

export function onRegionChange(fn: (r: Region) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// The locale a currency is most naturally written in, for amounts stored in
// a currency other than the business's own.
const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US", CAD: "en-CA", MXN: "es-MX", BRL: "pt-BR", GBP: "en-GB", EUR: "en-IE", CHF: "de-CH", SEK: "sv-SE", PLN: "pl-PL",
  AED: "en-AE", SAR: "en-SA", ZAR: "en-ZA", NGN: "en-NG", KES: "en-KE", INR: "en-IN", SGD: "en-SG", MYR: "en-MY",
  IDR: "id-ID", PHP: "en-PH", JPY: "ja-JP", HKD: "en-HK", AUD: "en-AU", NZD: "en-NZ",
};

function localeFor(currency: string): string {
  if (currency === current.currency) return current.locale;
  return CURRENCY_LOCALE[currency] || current.locale || "en-US";
}

const fmtCache = new Map<string, Intl.NumberFormat>();
function numberFormat(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(opts)}`;
  let f = fmtCache.get(key);
  if (!f) {
    try { f = new Intl.NumberFormat(locale, opts); } catch { f = new Intl.NumberFormat("en-US", { ...opts, currency: opts.currency && /^[A-Z]{3}$/.test(opts.currency) ? opts.currency : undefined, style: opts.currency ? "currency" : opts.style }); }
    fmtCache.set(key, f);
  }
  return f;
}

export interface MoneyOptions {
  /** ISO 4217 code of the amount; defaults to the business's currency. */
  currency?: string | null;
  /** Shorten large amounts ($1.3M, ₹12.5L). */
  compact?: boolean;
  /** Fraction digits (0 by default; 2 for invoice lines). */
  decimals?: number;
  /** Write the absolute value (callers that add their own sign). */
  abs?: boolean;
  /** Show a + for positive amounts. */
  signed?: boolean;
}

/** An amount of money, written for this business. */
export function formatMoney(value: number | string | null | undefined, opts: MoneyOptions = {}): string {
  const n = Number(value);
  let v = Number.isFinite(n) ? n : 0;
  if (opts.abs) v = Math.abs(v);
  const currency = String(opts.currency || current.currency || "USD").toUpperCase();
  const decimals = opts.decimals ?? 0;
  const f = numberFormat(localeFor(currency), {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "USD",
    notation: opts.compact ? "compact" : "standard",
    minimumFractionDigits: opts.compact ? 0 : decimals,
    maximumFractionDigits: opts.compact ? 1 : decimals,
    signDisplay: opts.signed ? "exceptZero" : "auto",
  });
  return f.format(opts.compact || decimals ? v : Math.round(v));
}

/** Compact money: $1.3M, £420K, ₹12.5L. Amounts under 100,000 are written in full. */
export function formatMoneyShort(value: number | string | null | undefined, opts: Omit<MoneyOptions, "compact"> = {}): string {
  const n = Number(value);
  return formatMoney(value, { ...opts, compact: Number.isFinite(n) && Math.abs(n) >= 100000 });
}

/** The business's currency symbol ($, £, €, ₹), for input labels. */
export function currencySymbol(currency?: string | null): string {
  const cur = String(currency || current.currency || "USD").toUpperCase();
  try {
    const part = numberFormat(localeFor(cur), { style: "currency", currency: cur, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency");
    return part?.value || cur;
  } catch { return cur; }
}

/** A plain number grouped for this business's locale (no currency). */
export function formatNumber(value: number | string | null | undefined, opts: Intl.NumberFormatOptions = {}): string {
  const n = Number(value);
  return numberFormat(current.locale || "en-US", opts).format(Number.isFinite(n) ? n : 0);
}

type DateInput = string | number | Date | null | undefined;

function toDate(v: DateInput): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A date (or date-time) in the business's locale and timezone. Pass
 * { timeZone: "UTC" } for calendar dates stored as YYYY-MM-DD.
 */
export function formatDate(value: DateInput, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  try {
    return d.toLocaleString(current.locale || "en-US", { timeZone: current.timezone || undefined, ...opts });
  } catch {
    return d.toLocaleString("en-US", opts);
  }
}

export function formatDateTime(value: DateInput, fallback = "—"): string {
  return formatDate(value, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, fallback);
}

export function formatTime(value: DateInput, fallback = "—"): string {
  return formatDate(value, { hour: "2-digit", minute: "2-digit" }, fallback);
}

/** The business's tax label ("Sales tax", "VAT", "GST"). */
export function taxLabel(): string {
  return current.taxLabel || "Tax";
}
