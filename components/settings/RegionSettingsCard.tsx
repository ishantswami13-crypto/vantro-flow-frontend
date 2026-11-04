"use client";

import { useEffect, useMemo, useState } from "react";
import { FiCheck, FiGlobe } from "react-icons/fi";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { api, type RegionOptions, type RegionSettings } from "@/lib/api";
import { formatDate, formatMoney, setRegion } from "@/lib/locale";

// Region: where the business is and how Starlane writes its money, dates and
// tax. Saved to the backend's versioned definitions (PUT /api/settings/region),
// so every decision records the currency and timezone it was computed in.

const LOCALES: { value: string; label: string }[] = [
  { value: "en-US", label: "English (United States) · 1,234.56 · 11/3/2026" },
  { value: "en-GB", label: "English (United Kingdom) · 1,234.56 · 03/11/2026" },
  { value: "en-CA", label: "English (Canada)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "en-IE", label: "English (Ireland)" },
  { value: "en-IN", label: "English (India) · 1,23,456 · lakh and crore" },
  { value: "en-SG", label: "English (Singapore)" },
  { value: "en-AE", label: "English (UAE)" },
  { value: "en-ZA", label: "English (South Africa)" },
  { value: "de-DE", label: "Deutsch · 1.234,56" },
  { value: "fr-FR", label: "Français · 1 234,56" },
  { value: "es-ES", label: "Español (España)" },
  { value: "es-MX", label: "Español (México)" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "it-IT", label: "Italiano" },
  { value: "nl-NL", label: "Nederlands" },
  { value: "ja-JP", label: "日本語" },
];

function timezones(current: string): string[] {
  let all: string[] = [];
  try { all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") || []; } catch { /* older browser */ }
  if (!all.length) all = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "UTC"];
  return all.includes(current) ? all : [current, ...all];
}

const field = "w-full bg-white border border-border-input rounded-md text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent transition-colors";
const label = "text-xs font-medium text-secondary uppercase tracking-wider block mb-1.5";

export function RegionSettingsCard() {
  const [region, setLocal] = useState<RegionSettings | null>(null);
  const [options, setOptions] = useState<RegionOptions | null>(null);
  const [draft, setDraft] = useState<RegionSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.region.get()
      .then(({ region: r, options: o }) => { setLocal(r); setDraft(r); setOptions(o); })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your region."));
  }, []);

  const tzList = useMemo(() => timezones(draft?.timezone || "UTC"), [draft?.timezone]);
  const locales = useMemo(() => (draft && !LOCALES.some((l) => l.value === draft.locale) ? [{ value: draft.locale, label: draft.locale }, ...LOCALES] : LOCALES), [draft]);
  const currencies = useMemo(() => {
    const list = options?.currencies || [];
    return draft && !list.includes(draft.currency) ? [draft.currency, ...list] : list;
  }, [options, draft]);

  if (error && !draft) return <Card><p className="text-sm text-secondary">{error}</p></Card>;
  if (!draft || !options) return <Card><p className="text-sm text-muted">Loading region…</p></Card>;

  const pickCountry = (code: string) => {
    const c = options.countries.find((x) => x.code === code);
    if (!c) { setDraft({ ...draft, country: null }); return; }
    setDraft({ ...draft, country: c.code, currency: c.currency, locale: c.locale, timezone: c.timezone, taxLabel: c.taxLabel });
  };

  const changed = JSON.stringify([draft.country, draft.currency, draft.locale, draft.timezone, draft.taxLabel]) !== JSON.stringify([region?.country, region?.currency, region?.locale, region?.timezone, region?.taxLabel]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const { region: r } = await api.region.update({ country: draft.country, currency: draft.currency, locale: draft.locale, timezone: draft.timezone, taxLabel: draft.taxLabel });
      setLocal(r); setDraft(r); setSaved(true);
      setRegion(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Nothing was changed.");
    } finally { setSaving(false); }
  };

  // A live preview in the chosen format, computed in the browser.
  let preview = "";
  try {
    const money = new Intl.NumberFormat(draft.locale, { style: "currency", currency: draft.currency, maximumFractionDigits: 0 }).format(1250000);
    const date = new Date().toLocaleString(draft.locale, { timeZone: draft.timezone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    preview = `${money} · ${date}`;
  } catch { preview = `${formatMoney(1250000)} · ${formatDate(new Date())}`; }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2"><FiGlobe size={14} /> Region</h3>
      <p className="text-xs text-muted mb-5">Where your business is, and how Starlane writes its money, dates and tax.</p>
      <form onSubmit={save} className="space-y-4 max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="region-country">Country</label>
            <select id="region-country" className={field} value={draft.country || ""} onChange={(e) => pickCountry(e.target.value)}>
              <option value="">Other / not listed</option>
              {options.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="region-currency">Currency</label>
            <select id="region-currency" className={field} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
              {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={label} htmlFor="region-locale">Number and date format</label>
          <select id="region-locale" className={field} value={draft.locale} onChange={(e) => setDraft({ ...draft, locale: e.target.value })}>
            {locales.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="region-tz">Timezone</label>
            <select id="region-tz" className={field} value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>
              {tzList.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="region-tax">Tax name</label>
            <input id="region-tax" className={field} maxLength={24} value={draft.taxLabel} placeholder="Sales tax, VAT, GST" onChange={(e) => setDraft({ ...draft, taxLabel: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-muted">Preview: <span className="text-primary">{preview}</span>. Invoices that carry their own currency keep it.</p>
        {error && <p className="text-xs" style={{ color: "#A64F4B" }}>{error}</p>}
        {saved && !changed && <p className="text-xs" style={{ color: "#477054" }}>Saved. Amounts and dates across Starlane now use this region.</p>}
        <Button type="submit" icon={<FiCheck size={14} />} loading={saving} disabled={!changed}>Save region</Button>
      </form>
    </Card>
  );
}
