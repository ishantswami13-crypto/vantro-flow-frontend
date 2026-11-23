"use client";

// Data feeds: keep products, bills of materials, customer orders and purchase
// orders up to date from the software a business already uses, instead of
// uploading files by hand.
//
// Sources: a connected app (Shopify, WooCommerce, Zoho Inventory, QuickBooks
// Online), a Google Sheet link, any file address (an ERP's scheduled export,
// a shared CSV / Excel / JSON link), or rows another tool pushes with the
// feed's own key. Every run goes through the same checked import as a file
// upload: the owner confirms the columns once here, and a run whose data no
// longer fits that confirmation imports nothing and asks again.
//
// Everything shown comes from GET /api/feeds; nothing here is inferred.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiArrowRight, FiCopy, FiRefreshCw } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { C, Notice, Pill, SectionLabel } from "@/components/decisions/ui";
import { FIELDS, KIND_TEXT, KIND_ORDER, MappingSection, label, selectStyle } from "@/components/decisions/OpsMapping";
import type { OpsKind, OpsImportOptions } from "@/lib/decisions";
import {
  feedsApi, everyLabel,
  type Feed, type FeedApp, type FeedColumn, type FeedPreviewResponse, type FeedRun, type FeedSourceType, type RunResult,
} from "@/lib/feeds";

const SOURCE_TEXT: Record<FeedSourceType, { title: string; what: string }> = {
  app: { title: "A connected app", what: "Shopify, WooCommerce, Zoho Inventory or QuickBooks Online, read on a schedule." },
  sheet_link: { title: "A Google Sheet", what: "A tab shared as “Anyone with the link can view”, read on a schedule." },
  file_url: { title: "A file address", what: "Any https link to a CSV, Excel or JSON file: an ERP’s scheduled export, a report URL, a shared Dropbox or Drive file." },
  push: { title: "Other software sends it", what: "Your ERP, a script, Zapier, Make or n8n sends rows to Starlane with this feed’s own key." },
};
const SOURCE_ORDER: FeedSourceType[] = ["app", "sheet_link", "file_url", "push"];

const RUN_TEXT: Record<FeedRun["status"], { label: string; tone: "good" | "neutral" | "warn" | "bad" }> = {
  imported: { label: "Imported", tone: "good" },
  unchanged: { label: "No changes", tone: "neutral" },
  needs_attention: { label: "Needs your confirmation", tone: "warn" },
  failed: { label: "Failed, nothing saved", tone: "bad" },
  running: { label: "Running", tone: "neutral" },
};

const inputStyle = { ...selectStyle, width: "100%" } as const;

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function runSentence(r: { status: string; error?: string | null; note?: string; summary?: RunResult["summary"]; details?: FeedRun["details"] } | null) {
  if (!r) return null;
  if (r.status === "failed" || r.status === "needs_attention") return r.error || "The run did not import anything.";
  if (r.note || r.details?.note) return r.note || r.details?.note || null;
  const c = r.summary?.counts || r.details?.counts;
  if (r.status === "unchanged") return "The source has not changed since the last run, so nothing was written.";
  if (!c) return "Imported.";
  const bits = [`${c.new} new`, `${c.updated} updated`, `${c.unchanged} unchanged`];
  if (c.reviewRequired) bits.push(`${c.reviewRequired} waiting for a product answer`);
  if (c.rejected) bits.push(`${c.rejected} rejected`);
  return `${bits.join(", ")}.`;
}

export default function DataFeedsPage() {
  const q = useQuery({ queryKey: ["data-feeds"], queryFn: feedsApi.list, staleTime: 5_000 });
  const [adding, setAdding] = useState(false);
  const data = q.data;

  return (
    <DashboardLayout pageTitle="Data feeds">
      <div>
        <Link href="/decisions/operations-import" className="text-[13px] hover-dim" style={{ color: C.muted }}>← Import a file</Link>
        <h1 className="hv-title mt-3 mb-2" style={{ color: "#0F0E0D", fontSize: 37, lineHeight: 1.08, letterSpacing: "-0.012em", fontFamily: "var(--serif, 'Newsreader', Georgia, serif)", fontWeight: 400 }}>
          Data feeds
        </h1>
        <p className="text-[14px] max-w-[720px] mb-6" style={{ color: C.muted }}>
          Keep products, bills of materials, customer orders and purchase orders up to date from the software you already use. You confirm what each column means once; every run after that goes through the same checks as a file upload, updates the same rows instead of adding duplicates, and imports nothing if the data stops matching what you confirmed.
        </p>

        {q.error && <div className="mb-6"><Notice tone="bad" title="Could not load your feeds">{(q.error as Error).message}</Notice></div>}
        {data?.scheduler === "off" && data.feeds.some((f) => f.intervalMinutes) && (
          <div className="mb-6">
            <Notice tone="warn" title="Scheduled runs are switched off on this server">
              Schedules are saved, but feeds run only when you press Run now, or when other software pushes rows, until background runs are switched on.
            </Notice>
          </div>
        )}

        {data && (adding
          ? <AddFeed data={data} onDone={() => { setAdding(false); q.refetch(); }} onCancel={() => setAdding(false)} />
          : <div className="mb-8"><Button onClick={() => setAdding(true)}>Add a data feed</Button></div>)}

        <SectionLabel>Your feeds</SectionLabel>
        {!data && !q.error && <p className="text-[13px]" style={{ color: C.faint }}>Loading…</p>}
        {data && !data.feeds.length && (
          <div className="rounded-[8px] px-5 py-6 mb-10" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
            <p className="text-[14px]" style={{ color: C.ink }}>No feeds yet</p>
            <p className="text-[13px] mt-1" style={{ color: C.muted }}>Add one to bring records in automatically. Until then, imports work from a file under Import a file.</p>
          </div>
        )}
        <div className="grid gap-4 mb-10">
          {data?.feeds.map((f) => <FeedCard key={f.id} f={f} apps={data.apps} />)}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── One feed ─────────────────────────────────────────────────────────────

function FeedCard({ f, apps }: { f: Feed; apps: FeedApp[] }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "good" | "bad" | "neutral"; text: string } | null>(null);
  const [key, setKey] = useState<{ pushKey: string; pushUrl: string } | null>(null);
  const [showRuns, setShowRuns] = useState(false);
  const runs = useQuery({ queryKey: ["data-feed-runs", f.id], queryFn: () => feedsApi.runs(f.id), enabled: showRuns });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["data-feeds"] }); qc.invalidateQueries({ queryKey: ["data-feed-runs", f.id] }); };
  const app = f.source.connectorId ? apps.find((a) => a.connectorId === f.source.connectorId) : null;
  const status = f.status === "NEEDS_ATTENTION" ? { label: "Needs attention", tone: "warn" as const } : f.status === "PAUSED" ? { label: "Paused", tone: "neutral" as const } : { label: "On", tone: "good" as const };

  async function act(name: string, fn: () => Promise<unknown>) {
    setBusy(name); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ tone: "bad", text: (e as Error).message }); } finally { setBusy(null); refresh(); }
  }

  return (
    <div className="rounded-[8px] p-5" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0" style={{ flex: "1 1 280px" }}>
          <div className="flex items-center flex-wrap gap-2">
            <p className="text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>{f.name}</p>
            <Pill tone={status.tone}>{status.label}</Pill>
          </div>
          <p className="text-[12.5px] mt-1" style={{ color: C.muted }}>
            {f.kindLabel} · {f.sourceType === "app" ? (app?.label || app?.name || f.source.connectorId) : f.sourceType === "push" ? "Pushed by other software" : f.source.url}
            {f.sourceType !== "push" && <> · {everyLabel(f.intervalMinutes)}</>}
          </p>
          {f.statusReason && <p className="text-[12.5px] mt-2" style={{ color: C.warn }}>{f.statusReason}</p>}
          <p className="text-[12.5px] mt-2" style={{ color: C.body }}>
            {f.lastRun ? <>Last run {when(f.lastRun.startedAt)}: <Pill tone={RUN_TEXT[f.lastRun.status].tone}>{RUN_TEXT[f.lastRun.status].label}</Pill> {f.lastRun.error && f.lastRun.error === f.statusReason ? null : runSentence(f.lastRun)}</> : f.sourceType === "push" ? "Waiting for the first delivery." : "Not run yet."}
          </p>
          {f.lastRun?.details?.truncated && <p className="text-[12px] mt-1" style={{ color: C.warn }}>{f.lastRun.details.truncated}</p>}
          {f.nextRunAt && f.intervalMinutes && <p className="text-[12px] mt-1" style={{ color: C.faint }}>Next run around {when(f.nextRunAt)}.</p>}
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {f.sourceType !== "push" && (
            <Button size="sm" loading={busy === "run"} disabled={!!busy || f.status === "PAUSED"} onClick={() => act("run", async () => {
              const r = await feedsApi.run(f.id);
              setMsg({ tone: r.run.status === "imported" || r.run.status === "unchanged" ? "good" : "bad", text: runSentence(r.run) || r.run.status });
            })}><FiRefreshCw size={12} /> Run now</Button>
          )}
          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => act("pause", () => feedsApi.update(f.id, { status: f.status === "PAUSED" ? "ACTIVE" : "PAUSED" }))}>
            {f.status === "PAUSED" ? "Resume" : "Pause"}
          </Button>
          {f.sourceType === "push" && (
            <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => {
              if (!window.confirm("Make a new key? The current key stops working at once; update the other software with the new one.")) return;
              act("rotate", async () => setKey(await feedsApi.rotateKey(f.id)));
            }}>New key</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowRuns(!showRuns)}>{showRuns ? "Hide runs" : "Runs"}</Button>
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => {
            if (!window.confirm(`Delete "${f.name}"? Records it already imported stay in Starlane.`)) return;
            act("delete", () => feedsApi.remove(f.id));
          }}>Delete</Button>
        </div>
      </div>
      {f.status === "NEEDS_ATTENTION" && f.sourceType !== "app" && <Reconfirm f={f} onDone={refresh} />}
      {key && <PushKey pushKey={key.pushKey} pushUrl={key.pushUrl} kind={f.kind} />}
      {msg && <p className="text-[12.5px] mt-3" style={{ color: msg.tone === "bad" ? C.bad : C.body }}>{msg.text}</p>}
      {showRuns && (
        <div className="mt-4 overflow-x-auto rounded-[8px]" style={{ border: `1px solid ${C.line}` }}>
          <table className="w-full text-[12.5px] tabular-nums">
            <thead>
              <tr style={{ background: C.wash, color: C.muted }}>
                <th className="text-left font-normal px-3 py-2">When</th>
                <th className="text-left font-normal px-3 py-2">How</th>
                <th className="text-left font-normal px-3 py-2">Result</th>
                <th className="text-right font-normal px-3 py-2">Accepted</th>
                <th className="text-right font-normal px-3 py-2">Rejected</th>
                <th className="text-left font-normal px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {(runs.data?.runs || []).map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${C.line}`, color: C.body }}>
                  <td className="px-3 py-1.5 whitespace-nowrap">{when(r.startedAt)}</td>
                  <td className="px-3 py-1.5">{{ manual: "Run now", schedule: "Schedule", push: "Pushed", setup: "First run" }[r.trigger]}</td>
                  <td className="px-3 py-1.5"><Pill tone={RUN_TEXT[r.status].tone}>{RUN_TEXT[r.status].label}</Pill></td>
                  <td className="px-3 py-1.5 text-right">{r.rowsAccepted}</td>
                  <td className="px-3 py-1.5 text-right">{r.rowsRejected}</td>
                  <td className="px-3 py-1.5" style={{ color: C.muted }}>{runSentence(r)}</td>
                </tr>
              ))}
              {runs.data && !runs.data.runs.length && <tr><td colSpan={6} className="px-3 py-3" style={{ color: C.faint }}>No runs yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** A feed whose data stopped matching: show the source's columns again and confirm. */
function Reconfirm({ f, onDone }: { f: Feed; onDone: () => void }) {
  const [p, setP] = useState<FeedPreviewResponse | null>(null);
  const [opts, setOpts] = useState<OpsImportOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (f.sourceType === "push") return <PushReconfirm f={f} onDone={onDone} />;
  async function load() {
    setBusy(true); setErr(null);
    try {
      const r = await feedsApi.preview({ kind: f.kind, sourceType: f.sourceType, source: { url: f.source.url || undefined } });
      setP(r);
      if (r.preview) setOpts({ ...r.preview.suggestedInput, sourceSystem: f.mapping.sourceSystem || "", currency: f.mapping.currency ?? null, ...(f.kind === "purchase_lines" ? { stockFollows: f.mapping.stockFollows || "STARLANE" } : {}) });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function save() {
    if (!opts) return;
    setBusy(true); setErr(null);
    try { await feedsApi.update(f.id, { mapping: opts }); await feedsApi.run(f.id); onDone(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="mt-4">
      {!p && <Button size="sm" onClick={load} loading={busy}>Check the columns again</Button>}
      {p?.preview && opts && (
        <>
          <MappingSection kind={f.kind} p={p.preview} opts={opts} setOpts={setOpts} />
          <Button size="sm" onClick={save} loading={busy}>Save and run</Button>
        </>
      )}
      {f.sourceType === "file_url" && f.source.hasHeader && p && <p className="text-[12px] mt-2" style={{ color: C.faint }}>The check above reads the file without the saved request header; if the file needs it, delete the feed and add it again.</p>}
      {err && <p className="text-[12.5px] mt-2" style={{ color: C.bad }}>{err}</p>}
    </div>
  );
}

/** Push feed: match the columns of the last delivery once; later deliveries use that mapping. */
function PushReconfirm({ f, onDone }: { f: Feed; onDone: () => void }) {
  const cols = f.lastRun?.details?.columns || [];
  const fields = FIELDS[f.kind];
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!cols.length) return <p className="text-[12.5px] mt-3" style={{ color: C.muted }}>Send rows with the column names Starlane reads (see Add a data feed › Other software sends it).</p>;
  async function save() {
    setBusy(true); setErr(null);
    try {
      await feedsApi.update(f.id, { mapping: { sourceSystem: f.mapping.sourceSystem || "", currency: f.mapping.currency ?? null, stockFollows: f.mapping.stockFollows, mapping } });
      onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const used = new Set(Object.values(mapping));
  return (
    <div className="mt-4">
      <p className="text-[13px] mb-2" style={{ color: C.body }}>The last delivery sent these columns: {cols.join(", ")}. Say which is which; later deliveries with the same columns import without asking.</p>
      <div className="grid sm:grid-cols-2 gap-2 max-w-[720px]">
        {fields.map(({ field, required }) => (
          <label key={field} className="flex items-center justify-between gap-3 text-[12.5px]" style={{ color: C.body }}>
            <span>{label(f.kind, field)}{required ? <span style={{ color: C.bad }}> *</span> : null}</span>
            <select value={mapping[field] || ""} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })} className="text-[12.5px] rounded-md px-2 py-1" style={{ ...selectStyle, maxWidth: 200 }} aria-label={label(f.kind, field)}>
              <option value="">Not sent</option>
              {cols.map((c) => <option key={c} value={c} disabled={used.has(c) && mapping[field] !== c}>{c}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-3"><Button size="sm" onClick={save} loading={busy}>Save these columns</Button></div>
      {err && <p className="text-[12.5px] mt-2" style={{ color: C.bad }}>{err}</p>}
    </div>
  );
}

function PushKey({ pushKey, pushUrl, kind }: { pushKey: string; pushUrl: string; kind: OpsKind }) {
  const example = kind === "orders"
    ? `{"rows":[{"order_ref":"SO-1001","customer_name":"Shree Traders","promised_date":"2026-12-15","lines":[{"sku":"PMP-A1","quantity":4}]}]}`
    : kind === "purchase_lines"
      ? `{"rows":[{"po_ref":"PO-77","supplier_name":"Volt Motors","sku":"MTR-1HP","quantity":50,"received_quantity":10,"expected_date":"2026-12-01"}]}`
      : kind === "products"
        ? `{"rows":[{"sku":"PMP-A1","product_name":"Pump A1","on_hand":5}]}`
        : `{"rows":[{"finished_sku":"PMP-A1","component_sku":"MTR-1HP","quantity_per_unit":1}]}`;
  const curl = `curl -X POST ${pushUrl} \\\n  -H "Authorization: Bearer ${pushKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '${example}'`;
  return (
    <div className="mt-4 rounded-[8px] p-4" style={{ background: C.wash, border: `1px solid ${C.line}` }}>
      <p className="text-[13px]" style={{ color: C.ink, fontWeight: 500 }}>This feed’s key: copy it now, it is not shown again</p>
      <div className="flex items-center gap-2 mt-2">
        <code className="text-[12px] break-all" style={{ color: C.ink }}>{pushKey}</code>
        <button type="button" className="hover-dim" aria-label="Copy the key" onClick={() => navigator.clipboard?.writeText(pushKey)} style={{ color: C.accent }}><FiCopy size={13} /></button>
      </div>
      <p className="text-[12.5px] mt-3" style={{ color: C.muted }}>
        Send rows as JSON (a list, or {"{"}&quot;rows&quot;: [...]{"}"}; an order may carry its lines as a list), CSV, or an Excel file, to <code>{pushUrl}</code> with the header <code>Authorization: Bearer &lt;key&gt;</code>. Tools that can only set an address can post to <code>{pushUrl}/&lt;key&gt;</code>.
      </p>
      <pre className="text-[11.5px] mt-2 p-3 rounded-md overflow-x-auto" style={{ background: "#fff", border: `1px solid ${C.line}`, color: C.body }}>{curl}</pre>
    </div>
  );
}

// ── Adding a feed ────────────────────────────────────────────────────────

function AddFeed({ data, onDone, onCancel }: { data: { apps: FeedApp[]; intervals: number[]; kinds: { kind: OpsKind; label: string; columns: FeedColumn[] }[] }; onDone: () => void; onCancel: () => void }) {
  const [kind, setKind] = useState<OpsKind>("orders");
  const [sourceType, setSourceType] = useState<FeedSourceType>("app");
  const [connectorId, setConnectorId] = useState<string>("");
  const [url, setUrl] = useState("");
  const [header, setHeader] = useState({ name: "", value: "" });
  const [preview, setPreview] = useState<FeedPreviewResponse | null>(null);
  const [opts, setOpts] = useState<OpsImportOptions | null>(null);
  const [sourceSystem, setSourceSystem] = useState("");
  const [stockFollows, setStockFollows] = useState<"STARLANE" | "EXTERNAL">("STARLANE");
  const [interval, setIntervalMinutes] = useState<number | "">(60);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ feed: Feed; firstRun: RunResult | null; pushKey?: string; pushUrl?: string } | null>(null);

  const appsForKind = useMemo(() => data.apps.filter((a) => a.kinds.includes(kind)), [data.apps, kind]);
  const columns = data.kinds.find((k) => k.kind === kind)?.columns || [];
  const source = sourceType === "app" ? { connectorId } : sourceType === "push" ? {} : { url, ...(sourceType === "file_url" && header.name ? { header } : {}) };

  function resetCheck() { setPreview(null); setOpts(null); setError(null); }

  async function check(o: OpsImportOptions | null = null) {
    setBusy("preview"); setError(null);
    try {
      const r = await feedsApi.preview({ kind, sourceType, source, mapping: o });
      setPreview(r);
      if (r.preview && !o) setOpts({ ...r.preview.suggestedInput, sourceSystem: sourceSystem || r.preview.suggestedInput.sourceSystem, ...(kind === "purchase_lines" ? { stockFollows } : {}) });
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  async function save() {
    setBusy("save"); setError(null);
    try {
      const mapping = sourceType === "app" ? { stockFollows: kind === "purchase_lines" ? stockFollows : undefined }
        : sourceType === "push" ? { sourceSystem, auto: true, ...(kind === "purchase_lines" ? { stockFollows } : {}) }
          : { ...(opts as OpsImportOptions), sourceSystem: sourceSystem || opts?.sourceSystem || "", ...(kind === "purchase_lines" ? { stockFollows } : {}) };
      const r = await feedsApi.create({ name: name || undefined, kind, sourceType, source, mapping, intervalMinutes: sourceType === "push" || interval === "" ? null : interval });
      setDone(r);
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  if (done) {
    return (
      <section className="rounded-[8px] p-5 mb-10" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
        <p className="text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>“{done.feed.name}” is saved</p>
        {done.firstRun && (
          <p className="text-[13px] mt-2" style={{ color: done.firstRun.status === "failed" || done.firstRun.status === "needs_attention" ? C.warn : C.body }}>
            First run: {RUN_TEXT[done.firstRun.status].label}. {runSentence(done.firstRun)}
          </p>
        )}
        {done.pushKey && done.pushUrl && <PushKey pushKey={done.pushKey} pushUrl={done.pushUrl} kind={kind} />}
        <div className="mt-4"><Button onClick={onDone}>Done</Button></div>
      </section>
    );
  }

  const canSave = sourceType === "push"
    ? !!sourceSystem.trim()
    : sourceType === "app"
      ? !!preview && !preview.preview?.mappingErrors.length
      : !!preview?.preview && !!opts && !preview.preview.mappingErrors.length && !!(sourceSystem || opts.sourceSystem);

  return (
    <section className="rounded-[8px] p-5 mb-10" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>Add a data feed</p>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>

      <SectionLabel>1. What should it bring in?</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-3 mb-6" role="radiogroup" aria-label="What the feed brings in">
        {KIND_ORDER.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setConnectorId(""); resetCheck(); }}
            className="text-left rounded-[8px] px-4 py-3" style={{ background: "#fff", border: `1px solid ${kind === k ? C.ink : C.line}` }}>
            <p className="text-[14px]" style={{ color: C.ink, fontWeight: 500 }}>{KIND_TEXT[k].title}</p>
            <p className="text-[12.5px] mt-0.5" style={{ color: C.muted }}>{KIND_TEXT[k].what}</p>
          </button>
        ))}
      </div>

      <SectionLabel>2. Where does it come from?</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-3 mb-4" role="radiogroup" aria-label="Where the records come from">
        {SOURCE_ORDER.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={sourceType === s} onClick={() => { setSourceType(s); resetCheck(); }}
            className="text-left rounded-[8px] px-4 py-3" style={{ background: "#fff", border: `1px solid ${sourceType === s ? C.ink : C.line}` }}>
            <p className="text-[14px]" style={{ color: C.ink, fontWeight: 500 }}>{SOURCE_TEXT[s].title}</p>
            <p className="text-[12.5px] mt-0.5" style={{ color: C.muted }}>{SOURCE_TEXT[s].what}</p>
          </button>
        ))}
      </div>

      <div className="mb-6 max-w-[640px]">
        {sourceType === "app" && (
          appsForKind.length ? (
            <div className="grid gap-2">
              {appsForKind.map((a) => (
                <label key={a.connectorId} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: a.connected && a.live ? C.body : C.faint }}>
                  <input type="radio" name="feed-app" disabled={!a.connected || !a.live || a.status === "AUTH_REQUIRED"} checked={connectorId === a.connectorId}
                    onChange={() => { setConnectorId(a.connectorId); resetCheck(); setSourceSystem(a.name); }} className="mt-1" />
                  <span>
                    <span style={{ color: a.connected && a.live ? C.ink : C.faint, fontWeight: 500 }}>{a.name}</span>
                    {a.label && <span> · {a.label}</span>}
                    <span className="block text-[12px]">
                      {!a.live ? "Not switched on on this server yet." : a.status === "AUTH_REQUIRED" ? <>Needs to be connected again. <Link href="/sources?tab=apps" style={{ color: C.accent }}>Sources</Link></> : !a.connected ? <>Not connected. <Link href="/sources?tab=apps" style={{ color: C.accent }}>Connect it under Sources</Link></> : "Connected."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : <p className="text-[13px]" style={{ color: C.muted }}>No app can feed {KIND_TEXT[kind].title.toLowerCase()} yet. Use a Google Sheet, a file address, or have your software push it.</p>
        )}
        {(sourceType === "sheet_link" || sourceType === "file_url") && (
          <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
            {sourceType === "sheet_link" ? "Google Sheet share link (the tab you want)" : "File address (https)"}
            <input value={url} onChange={(e) => { setUrl(e.target.value); resetCheck(); }} placeholder={sourceType === "sheet_link" ? "https://docs.google.com/spreadsheets/d/…/edit#gid=0" : "https://erp.example.com/exports/open-orders.csv"} className="text-[14px] rounded-md px-3 py-2" style={inputStyle} />
          </label>
        )}
        {sourceType === "file_url" && (
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
              Request header name (optional)
              <input value={header.name} onChange={(e) => { setHeader({ ...header, name: e.target.value }); resetCheck(); }} placeholder="Authorization or X-Api-Key" className="text-[14px] rounded-md px-3 py-2" style={inputStyle} />
            </label>
            <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
              Header value (stored encrypted, never shown again)
              <input type="password" autoComplete="off" value={header.value} onChange={(e) => { setHeader({ ...header, value: e.target.value }); resetCheck(); }} className="text-[14px] rounded-md px-3 py-2" style={inputStyle} />
            </label>
          </div>
        )}
        {sourceType === "push" && <PushColumns columns={columns} />}
        {kind === "purchase_lines" && (
          <fieldset className="mt-4 rounded-[8px] px-4 py-3" style={{ border: `1px solid ${C.line}` }}>
            <legend className="text-[12.5px] px-1" style={{ color: C.muted }}>Who records stock when these goods arrive?</legend>
            {([["STARLANE", "Starlane: receipts recorded here add to stock"], ["EXTERNAL", "My accounting system (e.g. Tally purchase vouchers) books stock"]] as const).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2.5 py-1 text-[13.5px]" style={{ color: C.body }}>
                <input type="radio" name="feed-stock" checked={stockFollows === v} onChange={() => { setStockFollows(v); if (opts) setOpts({ ...opts, stockFollows: v }); }} /> {l}
              </label>
            ))}
          </fieldset>
        )}
      </div>

      {sourceType !== "push" && (
        <>
          <SectionLabel>3. Check what Starlane reads</SectionLabel>
          <div className="mb-4">
            <Button size="sm" variant="secondary" loading={busy === "preview"} disabled={busy === "save" || (sourceType === "app" ? !connectorId : !url.trim())} onClick={() => check(null)}>
              {preview ? "Read it again" : "Read the source"}
            </Button>
          </div>
          {preview?.empty && <div className="mb-4"><Notice tone="neutral" title="The source has no records right now">You can still save the feed; it imports when records appear.</Notice></div>}
          {preview?.truncated && <div className="mb-4"><Notice tone="warn" title="More records than one run reads">The first runs read the most recent records; the rest come in as earlier ones close.</Notice></div>}
          {preview?.preview && sourceType === "app" && <AppCheck p={preview} />}
          {preview?.preview && opts && sourceType !== "app" && (
            <>
              <MappingSection kind={kind} p={preview.preview} opts={{ ...opts, sourceSystem: sourceSystem || opts.sourceSystem }} setOpts={(o) => { setOpts(o); setSourceSystem(o.sourceSystem); }} />
              <div className="mb-4"><Button size="sm" variant="secondary" loading={busy === "preview"} onClick={() => check({ ...opts, sourceSystem: sourceSystem || opts.sourceSystem })}>Check these choices</Button></div>
              {preview.preview.mappingErrors.length > 0 && <Notice tone="warn" title="Before this can be saved"><ul className="list-disc pl-5">{preview.preview.mappingErrors.map((e) => <li key={e}>{e}</li>)}</ul></Notice>}
              {preview.preview.summary && <SummaryLine s={preview.preview.summary} />}
            </>
          )}
        </>
      )}

      <SectionLabel>{sourceType === "push" ? "3" : "4"}. Name and schedule</SectionLabel>
      <div className="grid sm:grid-cols-3 gap-3 mb-5 max-w-[860px]">
        <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
          Feed name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${KIND_TEXT[kind].title}`} maxLength={80} className="text-[14px] rounded-md px-3 py-2" style={inputStyle} />
        </label>
        {sourceType !== "app" && (
          <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
            Which system the records come from
            <input value={sourceSystem} onChange={(e) => { setSourceSystem(e.target.value); if (opts) setOpts({ ...opts, sourceSystem: e.target.value }); }} placeholder="e.g. Tally, our ERP, Orders sheet" maxLength={60} className="text-[14px] rounded-md px-3 py-2" style={inputStyle} />
          </label>
        )}
        {sourceType !== "push" && (
          <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
            How often
            <select value={interval} onChange={(e) => setIntervalMinutes(e.target.value === "" ? "" : Number(e.target.value))} className="text-[14px] rounded-md px-3 py-2" style={inputStyle}>
              <option value="">Only when I press Run now</option>
              {data.intervals.map((m) => <option key={m} value={m}>{everyLabel(m)}</option>)}
            </select>
          </label>
        )}
      </div>

      {error && <div className="mb-4"><Notice tone="bad" title="That didn't work">{error}</Notice></div>}
      <Button onClick={save} loading={busy === "save"} disabled={!canSave || busy === "preview"}>
        {sourceType === "push" ? "Save and show the key" : "Save and run it now"} <FiArrowRight size={13} />
      </Button>
      {sourceType !== "push" && !preview && <span className="text-[12px] ml-3" style={{ color: C.faint }}>Read the source first.</span>}
    </section>
  );
}

function AppCheck({ p }: { p: FeedPreviewResponse }) {
  const s = p.preview?.summary;
  return (
    <div className="mb-5">
      <p className="text-[13px] mb-2" style={{ color: C.body }}>
        Read {p.rowsReceived ?? p.preview?.file.rows ?? 0} rows. The app’s fields map to Starlane’s directly; nothing for you to match.
      </p>
      {p.preview?.mappingErrors.length ? <Notice tone="warn" title="Before this can be saved"><ul className="list-disc pl-5">{p.preview.mappingErrors.map((e) => <li key={e}>{e}</li>)}</ul></Notice> : null}
      {s && <SummaryLine s={s} />}
    </div>
  );
}

function SummaryLine({ s }: { s: NonNullable<NonNullable<FeedPreviewResponse["preview"]>["summary"]> }) {
  const c = s.counts;
  return (
    <div className="mb-5">
      <p className="text-[13px]" style={{ color: C.body }}>
        The first run would add {c.new}, update {c.updated} and leave {c.unchanged} unchanged{c.rejected ? `; ${c.rejected} rows would be rejected` : ""}{c.reviewRequired ? `; ${c.reviewRequired} rows name a product Starlane cannot match and wait for you under Import a file` : ""}.
      </p>
      {s.rejectedByReason.slice(0, 4).map((r) => <p key={r.reason} className="text-[12px]" style={{ color: C.faint }}>{r.count} rejected: {r.reason}</p>)}
      {s.limitations.slice(0, 4).map((l) => <p key={l.key} className="text-[12px]" style={{ color: l.severity === "blocking" ? C.warn : C.faint }}>{l.message}</p>)}
    </div>
  );
}

function PushColumns({ columns }: { columns: FeedColumn[] }) {
  return (
    <div>
      <p className="text-[13px] mb-2" style={{ color: C.body }}>Columns Starlane reads (send these names, or the field names, and nothing needs matching):</p>
      <div className="rounded-[8px] overflow-x-auto" style={{ border: `1px solid ${C.line}` }}>
        <table className="w-full text-[12.5px]">
          <thead><tr style={{ background: C.wash, color: C.muted }}><th className="text-left font-normal px-3 py-2">Column</th><th className="text-left font-normal px-3 py-2">or field</th><th className="text-left font-normal px-3 py-2">Needed</th></tr></thead>
          <tbody>
            {columns.map((c) => (
              <tr key={c.field} style={{ borderTop: `1px solid ${C.line}`, color: C.body }}>
                <td className="px-3 py-1.5">{c.column}</td><td className="px-3 py-1.5"><code>{c.field}</code></td><td className="px-3 py-1.5">{c.required ? "Yes" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] mt-2" style={{ color: C.faint }}>Rows with other column names are not guessed at: the feed imports nothing and asks you to confirm.</p>
    </div>
  );
}
