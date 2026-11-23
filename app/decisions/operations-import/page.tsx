"use client";

// Import operating data from the CSV or Excel exports a business already
// has, in four kinds: products with stock on hand, components (bill of
// materials), open purchase orders, and open customer orders. The flow is
//   choose file -> check columns -> answer product questions -> review rows -> import
// Every preview call writes nothing. "Import" sends exactly the choices shown
// here; the backend writes the whole file in one transaction, then re-runs
// the supplier-delay check. Rows the file no longer contains are never
// deleted. Nothing here sends anything to anyone.

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FiUploadCloud, FiArrowRight, FiDownload } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { StepRail } from "@/components/hv/Pieces";
import { C, Notice, Pill, SectionLabel, Stat } from "@/components/decisions/ui";
import {
  decisionsApi, shortDate,
  type OpsKind, type OpsField, type OpsImportOptions, type OpsPreview, type OpsCommit, type OpsSummary,
} from "@/lib/decisions";
import { LABEL, label, FIELDS, KIND_TEXT, KIND_ORDER, selectStyle, MappingSection } from "@/components/decisions/OpsMapping";


export default function OperationsImportPage() {
  const [kind, setKind] = useState<OpsKind>("products");
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OpsPreview | null>(null);
  const [opts, setOpts] = useState<OpsImportOptions | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OpsCommit | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  function reset(k: OpsKind = kind) {
    setKind(k); setFile(null); setPreview(null); setOpts(null); setResult(null); setError(null); setConfirmed(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function runPreview(f: File, o: OpsImportOptions | null) {
    const my = ++seq.current;
    setBusy("preview"); setError(null); setConfirmed(false);
    try {
      const p = await decisionsApi.opsImportPreview(f, kind, o);
      if (my !== seq.current) return;
      setPreview(p);
      setOpts(o || p.suggestedInput);
    } catch (e) {
      if (my === seq.current) setError((e as Error).message);
    } finally {
      if (my === seq.current) setBusy(null);
    }
  }

  // Re-check with the backend shortly after each change; the preview is the
  // only source of counts shown here.
  const optsKey = opts ? JSON.stringify(opts) : "";
  const lastSent = useRef("");
  useEffect(() => {
    if (!file || !opts || !preview) return;
    if (optsKey === lastSent.current) return;
    const t = setTimeout(() => { lastSent.current = optsKey; runPreview(file, opts); }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optsKey]);

  async function commit() {
    if (!file || !opts) return;
    setBusy("commit"); setError(null);
    try {
      setResult(await decisionsApi.opsImportCommit(file, kind, opts));
      qc.invalidateQueries({ queryKey: ["ops-imports"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const s = preview?.summary || null;
  const ready = !!preview && !!s && preview.mappingErrors.length === 0 && s.counts.reviewRequired === 0 && s.counts.accepted > 0;
  const stale = !!opts && optsKey !== lastSent.current && !!preview && busy !== "commit";

  return (
    <DashboardLayout pageTitle="Import business records">
      <div>
        <Link href="/decisions/shipments" className="text-[13px] hover-dim" style={{ color: C.muted }}>← Inbound shipments</Link>
        <h1 className="hv-title mt-3 mb-2" style={{ color: "#0F0E0D", fontSize: 37, lineHeight: 1.08, letterSpacing: "-0.012em", fontFamily: "var(--serif, 'Newsreader', Georgia, serif)", fontWeight: 400 }}>
          Import business records
        </h1>
        <p className="text-[14px] max-w-[700px] mb-6" style={{ color: C.muted }}>
          Upload the CSV or Excel exports you already have, one file per kind: products first, then components, purchase orders and customer orders. You confirm what each column means and see every row Starlane would accept, reject or ask about before anything is saved.
          Starlane never fills in a value the file does not have, and never deletes anything because a newer file leaves it out.
        </p>
        <Link href="/decisions/feeds" className="text-[13px] hover-dim inline-flex items-center gap-1 mb-6" style={{ color: C.accent }}>
          Keep these up to date automatically from Shopify, Zoho Inventory, QuickBooks, a Google Sheet, a file address or your own software <FiArrowRight size={12} />
        </Link>

        <StepRail
          className="is-row mb-8"
          label="Import steps"
          steps={[
            { key: "file", label: "Choose a file", state: preview ? "done" : "active" },
            { key: "map", label: "Check the columns", state: !preview ? "waiting" : preview.mappingErrors.length ? "active" : "done" },
            { key: "review", label: "Answer product questions", state: !s ? "waiting" : s.counts.reviewRequired ? "active" : "done" },
            { key: "save", label: "Import", state: result ? "done" : ready ? "active" : "waiting" },
            { key: "see", label: "See what it means", state: result ? "done" : "waiting" },
          ]}
        />

        {error && <div className="mb-6"><Notice tone="bad" title="That didn't work">{error}</Notice></div>}

        {result ? (
          <ResultView kind={kind} r={result} onAnother={(k) => reset(k)} />
        ) : (
          <>
            {/* 1. File */}
            <section className="mb-10">
              <SectionLabel>What are you importing?</SectionLabel>
              <div className="grid sm:grid-cols-2 gap-3 mb-3" role="radiogroup" aria-label="What the file contains">
                {KIND_ORDER.map((k, i) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    onClick={() => reset(k)}
                    className="text-left rounded-[8px] px-4 py-3"
                    style={{ background: "#fff", border: `1px solid ${kind === k ? C.ink : C.line}` }}
                  >
                    <p className="text-[14px]" style={{ color: C.ink, fontWeight: 500 }}><span style={{ color: C.faint }}>{i + 1}.</span> {KIND_TEXT[k].title}</p>
                    <p className="text-[12.5px] mt-0.5" style={{ color: C.muted }}>{KIND_TEXT[k].what}</p>
                  </button>
                ))}
              </div>
              <a href={KIND_TEXT[kind].template} download className="inline-flex items-center gap-1.5 text-[12.5px] mb-5 hover-dim" style={{ color: C.accent }}>
                <FiDownload size={12} /> Download a sample {KIND_TEXT[kind].title.toLowerCase()} CSV
              </a>
              <label
                className="flex items-center gap-3 rounded-[8px] px-4 py-4 cursor-pointer"
                style={{ background: "#fff", border: `1px dashed ${C.line}` }}
              >
                <FiUploadCloud size={18} style={{ color: C.muted }} />
                <span className="text-[13.5px]" style={{ color: file ? C.ink : C.muted }}>
                  {file ? `${file.name} (${preview ? `${preview.file.rows} rows${preview.file.sheet ? `, sheet "${preview.file.sheet}"` : ""}` : "reading…"})` : "Choose a CSV or Excel file"}
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  className="sr-only"
                  aria-label="File to import"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f); setPreview(null); setOpts(null); lastSent.current = "";
                    if (f) runPreview(f, null);
                  }}
                />
              </label>
              {preview?.alreadyImported && (
                <p className="text-[12.5px] mt-2" style={{ color: C.warn }}>
                  This exact file was imported on {shortDate(preview.alreadyImported.at)}. Importing it again with the same choices changes nothing.
                </p>
              )}
            </section>

            {preview && opts && (
              <>
                <MappingSection kind={kind} p={preview} opts={opts} setOpts={setOpts} />
                {s && s.review.length > 0 && <ReviewSection s={s} opts={opts} setOpts={setOpts} />}
                {s && <RowsSection kind={kind} s={s} />}

                <section className="rounded-[8px] p-5 mb-10" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
                  {preview.mappingErrors.length > 0 ? (
                    <Notice tone="warn" title="Before this can be imported">
                      <ul className="list-disc pl-5 space-y-0.5">{preview.mappingErrors.map((e) => <li key={e}>{e}</li>)}</ul>
                    </Notice>
                  ) : s && s.counts.reviewRequired > 0 ? (
                    <Notice tone="warn" title={`${s.counts.reviewRequired} row${s.counts.reviewRequired === 1 ? "" : "s"} need a product answer`}>
                      Answer each product question above. Nothing is imported until every row has an answer.
                    </Notice>
                  ) : s && s.counts.accepted === 0 ? (
                    <Notice tone="warn" title="No rows to import">Every row was rejected, skipped or is a conflict. See the reasons above.</Notice>
                  ) : s ? (
                    <>
                      <label className="flex items-start gap-2.5 text-[13.5px] mb-4" style={{ color: C.body }}>
                        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
                        <span>
                          Import {s.counts.new} new and update {s.counts.updated} existing {KIND_TEXT[kind].noun}{s.counts.new + s.counts.updated === 1 ? "" : "s"} from <b>{opts.sourceSystem}</b>
                          {s.counts.rejected ? `, leaving out ${s.counts.rejected} rejected row${s.counts.rejected === 1 ? "" : "s"}` : ""}
                          {s.counts.conflicts ? ` and ${s.counts.conflicts} conflict${s.counts.conflicts === 1 ? "" : "s"}` : ""}.
                          {kind === "purchase_lines" && (opts.stockFollows === "EXTERNAL"
                            ? " Receipts recorded in Starlane will not change stock; your accounting system books it."
                            : " Receipts recorded in Starlane will add to stock.")}
                        </span>
                      </label>
                      <Button onClick={commit} loading={busy === "commit"} disabled={!confirmed || !ready || stale || busy === "preview"}>
                        Import {s.counts.new + s.counts.updated} line{s.counts.new + s.counts.updated === 1 ? "" : "s"}
                      </Button>
                      {stale && <span className="text-[12px] ml-3" style={{ color: C.faint }}>Checking your changes…</span>}
                    </>
                  ) : null}
                </section>
              </>
            )}
          </>
        )}
        <ImportHistory />
      </div>
    </DashboardLayout>
  );
}

function ImportHistory() {
  const q = useQuery({ queryKey: ["ops-imports"], queryFn: decisionsApi.opsImports, staleTime: 10_000 });
  const rows = q.data?.imports || [];
  if (!rows.length) return null;
  return (
    <section className="mt-4 mb-10">
      <SectionLabel>Recent imports</SectionLabel>
      <div className="rounded-[8px] overflow-x-auto" style={{ border: `1px solid ${C.line}`, background: "#fff" }}>
        <table className="w-full text-[12.5px] tabular-nums">
          <thead>
            <tr style={{ background: C.wash, color: C.muted }}>
              <th className="text-left font-normal px-3 py-2">When</th>
              <th className="text-left font-normal px-3 py-2">What</th>
              <th className="text-left font-normal px-3 py-2">File</th>
              <th className="text-left font-normal px-3 py-2">From</th>
              <th className="text-right font-normal px-3 py-2">Rows</th>
              <th className="text-right font-normal px-3 py-2">Accepted</th>
              <th className="text-right font-normal px-3 py-2">Rejected</th>
              <th className="text-left font-normal px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} style={{ borderTop: `1px solid ${C.line}`, color: C.body }}>
                <td className="px-3 py-1.5">{b.completed_at ? new Date(b.completed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
                <td className="px-3 py-1.5">{KIND_TEXT[b.kind]?.title || b.kind}</td>
                <td className="px-3 py-1.5">{b.filename}</td>
                <td className="px-3 py-1.5">{b.sourceSystem || "—"}</td>
                <td className="px-3 py-1.5 text-right">{b.rows_total ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{b.rows_accepted ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{b.rows_rejected ?? "—"}</td>
                <td className="px-3 py-1.5">
                  <Pill tone={b.status === "COMPLETED" ? "good" : b.status === "FAILED" ? "bad" : "neutral"} title={b.error_message || undefined}>
                    {b.status === "COMPLETED" ? "Imported" : b.status === "FAILED" ? "Failed, nothing saved" : b.status.toLowerCase()}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReviewSection({ s, opts, setOpts }: { s: OpsSummary; opts: OpsImportOptions; setOpts: (o: OpsImportOptions) => void }) {
  return (
    <section className="mb-10">
      <SectionLabel>Products Starlane could not match with certainty</SectionLabel>
      <p className="text-[13px] mb-3 max-w-[700px]" style={{ color: C.muted }}>
        Starlane links a row to a product only on an exact SKU or exact name. For each of these, choose the product, import the rows without a link (they cannot be checked against stock), or leave them out.
      </p>
      <ul className="space-y-3">
        {s.review.map((g) => {
          const choice = opts.reviewChoices[g.key] || "";
          return (
            <li key={g.key} className="rounded-[8px] px-4 py-3" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[14px]" style={{ color: C.ink, fontWeight: 500 }}>{g.label}</p>
                  <p className="text-[12.5px]" style={{ color: C.muted }}>{g.reason}</p>
                  <p className="text-[12px]" style={{ color: C.faint }}>{g.count} row{g.count === 1 ? "" : "s"} (row {g.rows.join(", ")}{g.count > g.rows.length ? ", …" : ""})</p>
                </div>
                <select
                  aria-label={`Product for ${g.label}`}
                  value={choice}
                  onChange={(e) => setOpts({ ...opts, reviewChoices: { ...opts.reviewChoices, [g.key]: e.target.value } })}
                  className="text-[13px] rounded-md px-2 py-1.5 min-w-[240px]"
                  style={selectStyle}
                >
                  <option value="" disabled>Choose…</option>
                  {g.candidates.map((c) => <option key={c.id} value={c.id}>Link to {c.name}{c.sku ? ` (${c.sku})` : ""}</option>)}
                  <option value="UNLINKED">Import without a product link</option>
                  <option value="SKIP">Leave these rows out</option>
                </select>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RowsSection({ kind, s }: { kind: OpsKind; s: OpsSummary }) {
  const c = s.counts;
  return (
    <section className="mb-10">
      <SectionLabel>What would be imported</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <Stat label="New" value={c.new} sub={`${KIND_TEXT[kind].noun}s`} />
        <Stat label="Updated" value={c.updated} sub={c.unchanged ? `${c.unchanged} unchanged` : undefined} />
        <Stat label="Need an answer" value={c.reviewRequired} tone={c.reviewRequired ? "warn" : undefined} />
        <Stat label="Rejected" value={c.rejected} tone={c.rejected ? "bad" : undefined} sub={c.duplicateRows ? `${c.duplicateRows} exact repeats ignored` : undefined} />
        <Stat label="Conflicts" value={c.conflicts} tone={c.conflicts ? "warn" : undefined} sub={c.closedSkipped ? `${c.closedSkipped} closed lines skipped` : undefined} />
      </div>

      {s.sample.length > 0 && (kind === "products" || kind === "components") && (
        <div className="rounded-[8px] overflow-x-auto mb-5" style={{ border: `1px solid ${C.line}`, background: "#fff" }}>
          <table className="w-full text-[12.5px] tabular-nums">
            <thead>
              <tr style={{ background: C.wash, color: C.muted }}>
                <th className="text-left font-normal px-3 py-2">Row</th>
                <th className="text-left font-normal px-3 py-2">{kind === "products" ? "SKU" : "Finished product"}</th>
                <th className="text-left font-normal px-3 py-2">{kind === "products" ? "Product" : "Component"}</th>
                <th className="text-right font-normal px-3 py-2">{kind === "products" ? "Stock on hand" : "Per finished unit"}</th>
                {kind === "products" && <th className="text-right font-normal px-3 py-2">Selling price</th>}
                <th className="text-left font-normal px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {s.sample.map((r) => (
                <tr key={r.row} style={{ borderTop: `1px solid ${C.line}`, color: C.body }}>
                  <td className="px-3 py-1.5" style={{ color: C.faint }}>{r.row}</td>
                  <td className="px-3 py-1.5">{kind === "products" ? (r.sku || <span style={{ color: C.faint }}>none</span>) : r.party}</td>
                  <td className="px-3 py-1.5">{r.product}</td>
                  <td className="px-3 py-1.5 text-right">{r.quantity ?? <span style={{ color: C.faint }}>unchanged</span>}</td>
                  {kind === "products" && <td className="px-3 py-1.5 text-right">{r.price ?? <span style={{ color: C.faint }}>not given</span>}</td>}
                  <td className="px-3 py-1.5"><Pill tone={r.action === "INSERT" ? "accent" : "neutral"}>{r.action === "INSERT" ? "New" : "Update"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
          {c.new + c.updated > s.sample.length && <p className="text-[12px] px-3 py-2" style={{ color: C.faint }}>First {s.sample.length} of {c.new + c.updated} shown.</p>}
        </div>
      )}
      {s.sample.length > 0 && (kind === "orders" || kind === "purchase_lines") && (
        <div className="rounded-[8px] overflow-x-auto mb-5" style={{ border: `1px solid ${C.line}`, background: "#fff" }}>
          <table className="w-full text-[12.5px] tabular-nums">
            <thead>
              <tr style={{ background: C.wash, color: C.muted }}>
                <th className="text-left font-normal px-3 py-2">Row</th>
                <th className="text-left font-normal px-3 py-2">{kind === "orders" ? "Customer" : "Supplier"}</th>
                <th className="text-left font-normal px-3 py-2">Ref</th>
                <th className="text-left font-normal px-3 py-2">Product</th>
                <th className="text-right font-normal px-3 py-2">Qty</th>
                <th className="text-right font-normal px-3 py-2">{kind === "orders" ? "To deliver" : "Received"}</th>
                <th className="text-left font-normal px-3 py-2">{kind === "orders" ? "Promised" : "Expected"}</th>
                <th className="text-left font-normal px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {s.sample.map((r) => (
                <tr key={r.row} style={{ borderTop: `1px solid ${C.line}`, color: C.body }}>
                  <td className="px-3 py-1.5" style={{ color: C.faint }}>{r.row}</td>
                  <td className="px-3 py-1.5">{r.party}</td>
                  <td className="px-3 py-1.5">{r.ref}</td>
                  <td className="px-3 py-1.5">{r.product || <span style={{ color: C.warn }}>not linked</span>}</td>
                  <td className="px-3 py-1.5 text-right">{r.quantity}</td>
                  <td className="px-3 py-1.5 text-right">{kind === "orders" ? (r.outstanding ?? <span style={{ color: C.faint }} title="Not in the file: the full ordered quantity is assumed">assumed {r.quantity}</span>) : (r.received ?? "0")}</td>
                  <td className="px-3 py-1.5">{r.dueDate ? shortDate(r.dueDate) : <span style={{ color: C.faint }}>missing</span>}</td>
                  <td className="px-3 py-1.5"><Pill tone={r.action === "INSERT" ? "accent" : "neutral"}>{r.action === "INSERT" ? "New" : "Update"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
          {c.new + c.updated > s.sample.length && <p className="text-[12px] px-3 py-2" style={{ color: C.faint }}>First {s.sample.length} of {c.new + c.updated} shown.</p>}
        </div>
      )}

      {s.rejectedByReason.length > 0 && (
        <Group title="Rejected rows: not imported">
          {s.rejectedByReason.map((g) => (
            <li key={g.reason}><span style={{ color: C.ink }}>{g.count} ×</span> {g.example} <span style={{ color: C.faint }}>(row {g.rows.join(", ")}{g.count > g.rows.length ? ", …" : ""})</span></li>
          ))}
        </Group>
      )}
      {s.conflicts.length > 0 && (
        <Group title="Conflicts: kept as Starlane has them">
          {s.conflicts.map((x) => <li key={`${x.row}-${x.ref}`}><span style={{ color: C.ink }}>Row {x.row}{x.ref ? ` (${x.ref})` : ""}:</span> {x.details.join("; ")}</li>)}
        </Group>
      )}
      {s.changes.length > 0 && (
        <Group title="Changes to lines imported before">
          {s.changes.map((x) => (
            <li key={`${x.row}-${x.ref}`}><span style={{ color: C.ink }}>{x.ref || `Row ${x.row}`}:</span> {x.changes.map((ch) => `${ch.field} ${fmt(ch.from)} → ${fmt(ch.to)}`).join("; ")}</li>
          ))}
        </Group>
      )}
      {s.limitations.length > 0 && (
        <Group title="What this file does not tell Starlane">
          {s.limitations.map((l) => <li key={l.key}>{l.message}</li>)}
        </Group>
      )}
      {s.notInThisFile > 0 && (
        <p className="text-[12.5px] mt-3" style={{ color: C.muted }}>
          {s.notInThisFile} line{s.notInThisFile === 1 ? "" : "s"} imported earlier from this system {s.notInThisFile === 1 ? "is" : "are"} not in this file. {s.notInThisFile === 1 ? "It stays" : "They stay"} as {s.notInThisFile === 1 ? "it was" : "they were"}; nothing is deleted. Mark them closed in your system and import again, or close them in Starlane.
        </p>
      )}
    </section>
  );
}

function fmt(v: unknown): string {
  if (v == null || v === "") return "none";
  return String(v);
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-[12.5px] mb-1.5" style={{ color: C.muted, fontWeight: 500 }}>{title}</p>
      <ul className="space-y-1 text-[12.5px] pl-4 list-disc" style={{ color: C.body }}>{children}</ul>
    </div>
  );
}

function ResultView({ kind, r, onAnother }: { kind: OpsKind; r: OpsCommit; onAnother: (next?: OpsKind) => void }) {
  const next = KIND_ORDER[KIND_ORDER.indexOf(kind) + 1];
  const s = r.summary;
  const decisions = r.supplierDelayDecisions || [];
  const entities = s?.entities;
  const lines = useMemo(() => {
    if (!s) return [];
    const out = [`${s.counts.new} new and ${s.counts.updated} updated ${KIND_TEXT[kind].noun}${s.counts.new + s.counts.updated === 1 ? "" : "s"} saved.`];
    if (kind === "orders" && entities?.customersCreated) out.push(`${entities.customersCreated} new customer${entities.customersCreated === 1 ? "" : "s"} added.`);
    if (kind === "purchase_lines" && entities?.suppliersCreated) out.push(`${entities.suppliersCreated} new supplier${entities.suppliersCreated === 1 ? "" : "s"} added.`);
    if (kind === "products" && entities?.openingStockRecorded) out.push(`Opening stock recorded for ${entities.openingStockRecorded} product${entities.openingStockRecorded === 1 ? "" : "s"}.`);
    if (s.counts.rejected) out.push(`${s.counts.rejected} rejected row${s.counts.rejected === 1 ? " was" : "s were"} left out.`);
    return out;
  }, [s, kind, entities]);

  return (
    <section className="rounded-[8px] p-6 mb-10" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
      <SectionLabel>{r.import.alreadyImported ? "Already imported" : "Imported"}</SectionLabel>
      {r.import.alreadyImported ? (
        <p className="text-[15px]" style={{ color: C.body }}>This file was imported with the same choices{r.import.importedAt ? ` on ${shortDate(r.import.importedAt)}` : ""}. Nothing changed.</p>
      ) : (
        <div className="space-y-1">{lines.map((l) => <p key={l} className="text-[15px]" style={{ color: C.body }}>{l}</p>)}</div>
      )}
      {r.discoveryError && <div className="mt-4"><Notice tone="warn" title="Decisions were not recalculated">{r.discoveryError}</Notice></div>}
      {!r.import.alreadyImported && !r.discoveryError && (
        <div className="mt-5">
          {decisions.length ? (
            <Notice tone="warn" title={`${decisions.length} supplier delay${decisions.length === 1 ? " puts" : "s put"} customer orders at risk`}>
              {decisions.slice(0, 5).map((d) => (
                <Link key={d.id} href={`/decisions/${d.id}`} className="flex items-center gap-1 underline" style={{ color: C.accent }}>{d.title} <FiArrowRight size={12} /></Link>
              ))}
            </Notice>
          ) : (
            <Notice tone="good" title="No supplier delay is putting an order at risk">
              Starlane checked your open orders against stock and expected shipments. Report a delay on Inbound shipments when a supplier moves a date.
            </Notice>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-6">
        {next && <Button size="sm" onClick={() => onAnother(next)}>Next: {KIND_TEXT[next].title.toLowerCase()}</Button>}
        {kind === "orders" && <Link href="/decisions/open-orders"><Button variant="secondary" size="sm">Review open orders</Button></Link>}
        {(kind === "orders" || kind === "purchase_lines") && <Link href="/decisions/shipments"><Button variant="secondary" size="sm">Review inbound shipments</Button></Link>}
        <Button variant="ghost" size="sm" onClick={() => onAnother()}>Import another file</Button>
      </div>
    </section>
  );
}
