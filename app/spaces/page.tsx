"use client";

// Spaces: the companies an owner runs inside one account, like "Halden UK,
// Halden GmbH, Halden India" in the public site's product views. Each company
// has a currency and its own customers and suppliers, assigned by name from
// the invoices and bills already here. Picking one narrows the Command
// Center, Receivables Review, Space and Supplier run to it.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, request } from "@/lib/api";
import { entitiesApi, useActiveEntity, type Entity } from "@/lib/entities";

const CURRENCIES = ["", "INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "HKD", "SAR", "ZAR"];
type Purchase = { supplier_name?: string | null };

function Badge({ e, size = 26 }: { e: Pick<Entity, "name" | "color">; size?: number }) {
  return <span aria-hidden="true" className="es-badge" style={{ width: size, height: size, background: e.color || "#4E6A63", fontSize: size * 0.5 }}>{e.name.trim()[0]?.toUpperCase()}</span>;
}

export default function SpacesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => { setUser(getUser()); }, []);
  const { available, loading, entities, entity: active, setActive } = useActiveEntity();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", currency: "", country: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const invoicesQ = useQuery({ queryKey: ["command-invoices", user?.id], queryFn: () => api.invoices.list(user!.id), enabled: !!user?.id, staleTime: 60_000 });
  const purchasesQ = useQuery({ queryKey: ["purchases"], queryFn: () => request<{ purchases: Purchase[] }>("/api/purchases"), staleTime: 60_000 });
  const customers = useMemo(() => [...new Set((invoicesQ.data?.invoices || []).map((i) => (i.customer_name || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [invoicesQ.data]);
  const suppliers = useMemo(() => [...new Set((purchasesQ.data?.purchases || []).map((p) => (p.supplier_name || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [purchasesQ.data]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["entities"] });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await entitiesApi.create({ name: form.name, currency: form.currency || null, country: form.country || null });
      setForm({ name: "", currency: "", country: "" });
      await refresh();
      setEditing(r.entity.id);
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };

  const unassignedC = customers.filter((c) => !entities.some((e) => e.customers.some((n) => n.toLowerCase() === c.toLowerCase()))).length;

  return (
    <DashboardLayout pageTitle="Spaces">
      <div className="flex flex-col" style={{ gap: 20 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap fade-once">
          <div>
            <h1 className="hv-title" style={{ margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: 37, lineHeight: 1.08, letterSpacing: "-0.012em", color: "#0F0E0D" }}>Spaces</h1>
            <p className="cc-note" style={{ margin: "8px 0 0" }}>One space for each company you run. Assign customers and suppliers, and every view can show one company or all of them.</p>
          </div>
        </div>

        {!loading && !available && (
          <div className="cc-banner" role="status">Spaces need a database update before companies can be saved. Ask your administrator to run the latest migration (071).</div>
        )}
        {err && <p role="alert" className="cc-note" style={{ margin: 0, color: "#A3392E" }}>{err}</p>}

        {available && (
          <form onSubmit={create} className="cc-card es-new" aria-label="Add a company">
            <h2 className="cc-h2">Add a company</h2>
            <div className="es-fields">
              <label className="es-f"><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Halden UK" maxLength={80} required /></label>
              <label className="es-f es-sm"><span>Currency</span><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c} value={c}>{c || "Business default"}</option>)}</select></label>
              <label className="es-f es-sm"><span>Country</span><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase().slice(0, 2) })} placeholder="GB" maxLength={2} /></label>
              <button type="submit" className="sp-go" disabled={busy || !form.name.trim()}>{busy ? "Adding…" : "Add company"}</button>
            </div>
          </form>
        )}

        <div className="sp-table">
          <div className="sp-tr sp-th es-tr"><span>Company</span><span>Currency</span><span>Customers</span><span>Suppliers</span><span /></div>
          {loading && <div className="sp-empty">Loading…</div>}
          {!loading && available && entities.length === 0 && <div className="sp-empty">No companies yet. Add the first one above; until then every view shows the whole business.</div>}
          {entities.map((e) => (
            <div key={e.id}>
              <div className={`sp-tr es-tr ${active?.id === e.id ? "es-on" : ""}`}>
                <span className="sp-td-main"><Badge e={e} /><span className="min-w-0"><span className="block truncate">{e.name}</span><span className="sp-td-sub">{e.country || "No country set"}{active?.id === e.id ? " · viewing now" : ""}</span></span></span>
                <span className="sp-td">{e.currency || "Business default"}</span>
                <span className="sp-td tabular-nums">{e.customers.length}</span>
                <span className="sp-td tabular-nums">{e.suppliers.length}</span>
                <span className="sp-td es-actions">
                  <button type="button" className="sp-btn" onClick={() => setEditing(editing === e.id ? null : e.id)} aria-expanded={editing === e.id}>{editing === e.id ? "Close" : "Edit"}</button>
                  <button type="button" className="sp-go" onClick={() => { setActive(e.id); router.push("/command"); }}>Open</button>
                </span>
              </div>
              {editing === e.id && <Editor e={e} all={entities} customers={customers} suppliers={suppliers} onSaved={refresh} onDeleted={async () => { if (active?.id === e.id) setActive(null); setEditing(null); await refresh(); }} />}
            </div>
          ))}
        </div>

        {entities.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" className="sp-btn" onClick={() => { setActive(null); router.push("/command"); }}>View all companies together</button>
            {unassignedC > 0 && <span className="cc-note" style={{ margin: 0 }}>{unassignedC} customer{unassignedC === 1 ? " is" : "s are"} not in any company yet; they show only under All companies.</span>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Picker({ title, names, chosen, setChosen, elsewhere }: { title: string; names: string[]; chosen: Set<string>; setChosen: (s: Set<string>) => void; elsewhere: Map<string, string> }) {
  const [q, setQ] = useState("");
  const shown = names.filter((n) => n.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (n: string) => { const s = new Set(chosen); if (s.has(n)) s.delete(n); else s.add(n); setChosen(s); };
  return (
    <fieldset className="es-pick">
      <legend className="cc-h2" style={{ fontSize: 13 }}>{title} <span style={{ color: "#8F8A81", fontWeight: 400 }}>({chosen.size} chosen)</span></legend>
      <input className="es-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title.toLowerCase()}`} />
      <div className="es-list">
        {shown.length === 0 && <p className="cc-note" style={{ margin: 8 }}>{names.length ? "No match." : `No ${title.toLowerCase()} in your records yet.`}</p>}
        {shown.map((n) => (
          <label key={n} className="es-opt">
            <input type="checkbox" checked={chosen.has(n)} onChange={() => toggle(n)} />
            <span className="truncate">{n}</span>
            {!chosen.has(n) && elsewhere.has(n.toLowerCase()) && <span className="es-in">in {elsewhere.get(n.toLowerCase())}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Editor({ e, all, customers, suppliers, onSaved, onDeleted }: { e: Entity; all: Entity[]; customers: string[]; suppliers: string[]; onSaved: () => Promise<unknown>; onDeleted: () => Promise<unknown> }) {
  const [name, setName] = useState(e.name);
  const [currency, setCurrency] = useState(e.currency || "");
  const [country, setCountry] = useState(e.country || "");
  // Names already assigned that are not in the current records stay listed, so saving never drops them silently.
  const cNames = useMemo(() => [...new Set([...customers, ...e.customers])].sort((a, b) => a.localeCompare(b)), [customers, e.customers]);
  const sNames = useMemo(() => [...new Set([...suppliers, ...e.suppliers])].sort((a, b) => a.localeCompare(b)), [suppliers, e.suppliers]);
  const lower = (list: string[]) => new Set(list.map((n) => n.toLowerCase()));
  const [cs, setCs] = useState(() => { const l = lower(e.customers); return new Set(cNames.filter((n) => l.has(n.toLowerCase()))); });
  const [ss, setSs] = useState(() => { const l = lower(e.suppliers); return new Set(sNames.filter((n) => l.has(n.toLowerCase()))); });
  const elsewhere = (kind: "customers" | "suppliers") => {
    const m = new Map<string, string>();
    for (const o of all) if (o.id !== e.id) o[kind].forEach((n) => m.set(n.toLowerCase(), o.name));
    return m;
  };
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      if (name.trim() !== e.name || (currency || null) !== e.currency || (country || null) !== e.country) {
        await entitiesApi.update(e.id, { name: name.trim(), currency: currency || null, country: country || null });
      }
      await entitiesApi.members(e.id, [...cs], [...ss]);
      await onSaved();
      setMsg({ ok: true, t: "Saved." });
    } catch (x) { setMsg({ ok: false, t: (x as Error).message }); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Remove ${e.name}? Its customers and suppliers go back to All companies. No invoice or bill is changed.`)) return;
    setBusy(true);
    try { await entitiesApi.remove(e.id); await onDeleted(); } catch (x) { setMsg({ ok: false, t: (x as Error).message }); setBusy(false); }
  };

  return (
    <div className="es-edit">
      <div className="es-fields">
        <label className="es-f"><span>Name</span><input value={name} onChange={(x) => setName(x.target.value)} maxLength={80} /></label>
        <label className="es-f es-sm"><span>Currency</span><select value={currency} onChange={(x) => setCurrency(x.target.value)}>{[...new Set([...CURRENCIES, currency])].map((c) => <option key={c} value={c}>{c || "Business default"}</option>)}</select></label>
        <label className="es-f es-sm"><span>Country</span><input value={country} onChange={(x) => setCountry(x.target.value.toUpperCase().slice(0, 2))} maxLength={2} /></label>
      </div>
      <p className="cc-note" style={{ margin: "4px 0 0" }}>Invoices and bills with no currency of their own are shown in this company&rsquo;s currency. Figures are never converted between currencies.</p>
      <div className="es-picks">
        <Picker title="Customers" names={cNames} chosen={cs} setChosen={setCs} elsewhere={elsewhere("customers")} />
        <Picker title="Suppliers" names={sNames} chosen={ss} setChosen={setSs} elsewhere={elsewhere("suppliers")} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" className="sp-go" onClick={save} disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save company"}</button>
        <button type="button" className="sp-btn" onClick={remove} disabled={busy}>Remove company</button>
        {msg && <span role={msg.ok ? "status" : "alert"} className="cc-note" style={{ margin: 0, color: msg.ok ? "#2F6B45" : "#A3392E" }}>{msg.t}</span>}
      </div>
    </div>
  );
}
