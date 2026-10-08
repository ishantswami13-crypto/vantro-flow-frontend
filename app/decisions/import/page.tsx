"use client";

// Bring your own data: upload the receivables file a business already has,
// confirm what each column means, and get Starlane's first finding.
// Nothing is written until "Import and analyse"; the backend commits only
// the column choices shown here.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconUpload, IconCheck, IconAlert, IconArrowRight, IconChevronDown } from "@/components/v32/icons";
import { PageBody, amount, humaneError } from "@/components/os/prepared/kit";
import { PageHeader } from "@/components/v32/ui";
import { formatDate } from "@/lib/format";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { C, Notice, Pill, SectionLabel, Stat } from "@/components/decisions/ui";
import {
  decisionsApi,
  type ImportCommit, type ImportOptions, type ImportPreview, type LedgerField, type LedgerProfile,
} from "@/lib/decisions";

const FIELD_LABEL: Record<LedgerField, string> = {
  customer: "Customer name",
  invoice_number: "Invoice number",
  invoice_date: "Invoice date",
  due_date: "Due date",
  amount: "Invoice amount",
  paid_amount: "Amount paid",
  outstanding: "Balance still owed",
  payment_date: "Payment date",
  status: "Payment status",
  currency: "Currency",
  credit_days: "Credit days",
  phone: "Phone",
};
const REQUIRED: LedgerField[] = ["customer", "invoice_date", "amount"];
const FIELD_ORDER: LedgerField[] = ["customer", "invoice_number", "invoice_date", "due_date", "amount", "paid_amount", "outstanding", "payment_date", "status", "credit_days", "currency", "phone"];
const DATE_FIELDS: LedgerField[] = ["invoice_date", "due_date", "payment_date"];

const TEMPLATE = [
  "Customer,Invoice No,Invoice Date,Due Date,Invoice Amount,Amount Paid,Payment Date,Status,Currency,Credit Days,Phone",
  "Sharma Traders (example),INV-1041,13/04/2026,13/05/2026,\"1,20,000\",0,,Unpaid,INR,30,9876500001",
  "Mehta Stores (example),INV-1042,15/04/2026,15/05/2026,\"45,000\",\"45,000\",14/05/2026,Paid,INR,30,9876500002",
  "Kapoor & Sons (example),INV-1043,20/04/2026,20/05/2026,\"80,000\",\"30,000\",25/05/2026,Partially paid,INR,30,",
].join("\n");

function downloadTemplate() {
  const blob = new Blob([TEMPLATE + "\n"], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "starlane-receivables-template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function ProfileSummary({ p }: { p: LedgerProfile }) {
  const currencies = Object.entries(p.byCurrency);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <Stat label="Customers" value={p.counts.customers} />
      <Stat label="Invoices" value={p.counts.invoices} sub={`${p.counts.paid} paid · ${p.counts.open} unpaid`} />
      <Stat
        label="History"
        value={p.period.historyDays ? `${p.period.historyDays} days` : "—"}
        sub={p.period.from ? `${formatDate(p.period.from)} to ${formatDate(p.period.to)}` : undefined}
      />
      <Stat
        label="Overdue now"
        value={currencies.length ? currencies.map(([c, v]) => amount(v.overdue, c)).join(" + ") : "Not known yet"}
        sub={currencies.length ? `of ${currencies.map(([c, v]) => amount(v.open, c)).join(" + ")} unpaid` : undefined}
        tone={p.counts.overdue ? "warn" : undefined}
      />
    </div>
  );
}

function Limitations({ p }: { p: LedgerProfile }) {
  if (!p.limitations.length) return <p className="text-[13px]" style={{ color: C.good }}>Nothing in this file limits what Starlane can work out.</p>;
  return (
    <ul className="space-y-2.5">
      {p.limitations.map((l) => (
        <li key={l.key} className="text-[13px] leading-[1.55] flex gap-2.5">
          <span className="mt-[2px] shrink-0">
            <Pill tone={l.severity === "blocking" ? "bad" : l.severity === "reduces" ? "warn" : "neutral"}>
              {l.severity === "blocking" ? "Blocks" : l.severity === "reduces" ? "Limits" : "Note"}
            </Pill>
          </span>
          <span style={{ color: C.body }}>
            {l.message} <span style={{ color: C.faint }}>Affects {l.affects}.</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [options, setOptions] = useState<ImportOptions | null>(null);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportCommit | null>(null);

  const runPreview = useCallback(async (f: File, opts: ImportOptions | null) => {
    setBusy("preview");
    setError(null);
    try {
      const p = await decisionsApi.importPreview(f, opts);
      setPreview(p);
      if (!opts) {
        setOptions({ ...p.suggestedInput, currency: p.suggestedInput.currency ?? "INR" });
        setConfirmed({});
      }
    } catch (e) {
      setError(humaneError(e, "Starlane couldn't read this file just now. Try again in a moment."));
    } finally {
      setBusy(null);
    }
  }, []);

  const onFile = (f: File | null) => {
    setFile(f);
    setPreview(null);
    setOptions(null);
    setResult(null);
    if (f) runPreview(f, null);
  };

  // Re-profile when a column choice changes, so the numbers shown always
  // match what would be imported.
  useEffect(() => {
    if (!file || !options) return;
    const t = setTimeout(() => runPreview(file, options), 250);
    return () => clearTimeout(t);
  }, [options, file, runPreview]);

  const setField = (field: LedgerField, header: string) => {
    if (!options) return;
    const mapping = { ...options.mapping, [field]: header || null };
    const dateOrders = { ...options.dateOrders };
    if (header && DATE_FIELDS.includes(field) && !dateOrders[header]) dateOrders[header] = preview?.proposal.dateOrders[header]?.order || "DMY";
    setOptions({ ...options, mapping, dateOrders });
  };

  const questions = useMemo(() => {
    if (!preview || !options) return [];
    return preview.proposal.needsConfirmation.filter((q) => {
      if (q.key.startsWith("field:")) return options.mapping[q.field as LedgerField] === q.header;
      if (q.key.startsWith("dateOrder:")) return Object.values(options.mapping).includes(q.header || "");
      return true;
    });
  }, [preview, options]);

  const allConfirmed = questions.every((q) => confirmed[q.key]);
  const blockingErrors = preview?.mappingErrors || [];
  const canCommit = !!file && !!options && !!preview?.profile && allConfirmed && blockingErrors.length === 0 && busy === null;

  const commit = async () => {
    if (!file || !options) return;
    setBusy("commit");
    setError(null);
    try {
      const allOpen = questions.some((q) => q.key === "assumption:all_open") ? !!confirmed["assumption:all_open"] : options.allOpen;
      const r = await decisionsApi.importCommit(file, { ...options, allOpen });
      setResult(r);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const body = (e as { body?: { errors?: string[] } }).body;
      setError([humaneError(e, "The import didn't go through. Nothing was saved. Try again in a moment."), ...(body?.errors || [])].join(" "));
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardLayout pageTitle="Bring your data">
      <PageBody gap={0}>
        <div style={{ maxWidth: 980 }}>
        <Link href="/decisions" className="inline-flex items-center gap-1.5 text-[13px] hover-dim mb-5" style={{ color: C.muted }}>
          <span aria-hidden="true" style={{ display: "inline-flex", transform: "rotate(90deg)" }}><IconChevronDown size={13} /></span> Decisions
        </Link>
        <PageHeader
          title="Bring your receivables"
          subtitle="Upload the sales register, outstanding report or Tally export you already have. You check each column before anything is saved."
        />
        <div className="mb-8" />

        {error && <div className="mb-6"><Notice tone="bad" title="That didn't work">{error}</Notice></div>}

        {/* RESULT: the first finding */}
        {result && (
          <section className="rounded-xl p-6 mb-10" style={{ background: "var(--surface)", border: `1px solid ${C.line}` }}>
            <SectionLabel>{result.import.alreadyImported ? "This file was already imported" : "What Starlane found"}</SectionLabel>
            <div className="space-y-2">
              {result.firstLook.lines.map((l, i) => (
                <p key={i} className={i === 0 ? "text-[15px]" : "text-[17px] leading-snug"} style={{ color: i === 0 ? C.body : C.ink, fontWeight: i === 0 ? 400 : 500 }}>{l}</p>
              ))}
            </div>
            {result.discoveryError && <div className="mt-4"><Notice tone="warn" title="Analysis didn't finish">{result.discoveryError}</Notice></div>}
            {result.firstLook.top.length > 0 && (
              <div className="mt-6">
                {result.firstLook.top.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => router.push(`/decisions/${d.id}`)}
                    className="w-full text-left flex items-center gap-3 py-4"
                    style={{ borderTop: `1px solid ${C.line}` }}
                  >
                    <span aria-hidden="true" className="rounded-full shrink-0 id-gradient" style={{ width: 7, height: 7 }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>{d.title}</span>
                      {d.whyNow && d.whyNow.length > 0 && <span className="block text-[13px] mt-0.5" style={{ color: C.muted }}>{d.whyNow[0]}</span>}
                    </span>
                    <span className="text-[13px] shrink-0" style={{ color: C.accent }}>See why</span>
                    <span style={{ color: C.faint, display: "inline-flex" }}><IconArrowRight size={15} /></span>
                  </button>
                ))}
              </div>
            )}
            {!result.import.alreadyImported && (
              <p className="text-[12px] mt-5" style={{ color: C.faint }}>
                Saved {result.import.counts.inserted} new, updated {result.import.counts.updated}, unchanged {result.import.counts.unchanged}
                {result.import.counts.skippedOtherSource ? `, skipped ${result.import.counts.skippedOtherSource} already present from another source` : ""}.
                Upload a newer export any time; the same invoices are updated, never duplicated.
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-5">
              <Button size="sm" onClick={() => router.push("/decisions")}>Go to Decisions</Button>
              <Button size="sm" variant="secondary" onClick={() => onFile(null)}>Import another file</Button>
            </div>
            {result.profile.limitations.length > 0 && (
              <div className="mt-8">
                <SectionLabel>What limits this analysis</SectionLabel>
                <Limitations p={result.profile} />
              </div>
            )}
          </section>
        )}

        {/* STEP 1: choose a file */}
        {!result && (
          <section className="rounded-xl p-6 mb-8" style={{ background: "var(--surface)", border: `1px dashed ${C.line}` }}>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0] || null)} />
            <div className="flex flex-wrap items-center gap-4">
              <span style={{ color: C.ink, display: "inline-flex" }}><IconUpload size={22} /></span>
              <div className="flex-1 min-w-[220px]">
                <p className="text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>{file ? file.name : "Choose a CSV or Excel file"}</p>
                <p className="text-[12px] mt-0.5" style={{ color: C.faint }}>
                  Best: 6–12 months of invoices, paid and unpaid, with due dates and payment dates. Up to 50,000 rows.
                </p>
              </div>
              <Button size="sm" variant={file ? "secondary" : "primary"} loading={busy === "preview"} onClick={() => fileRef.current?.click()}>{file ? "Choose another" : "Choose file"}</Button>
              <button type="button" onClick={downloadTemplate} className="text-[13px] inline-flex items-center gap-1.5 hover-dim" style={{ color: C.muted }}>
                <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><IconUpload size={13} /></span> Template
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: confirm what the columns mean */}
        {!result && preview && options && (
          <>
            <section className="mb-10">
              <SectionLabel>What each column means</SectionLabel>
              <p className="text-[13px] mb-4" style={{ color: C.muted }}>
                Read from {preview.file.rows} rows{preview.file.sheet ? ` on sheet “${preview.file.sheet}”` : ""}. Change anything that is wrong.
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
                {FIELD_ORDER.map((f, i) => {
                  const chosen = options.mapping[f] || "";
                  const prop = preview.proposal.fields[f];
                  const isDate = DATE_FIELDS.includes(f) && !!chosen;
                  const d = chosen ? preview.proposal.dateOrders[chosen] : undefined;
                  return (
                    <div key={f} className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ borderTop: i ? `1px solid ${C.line}` : undefined, background: i % 2 ? C.wash : "var(--surface)" }}>
                      <span className="w-[160px] text-[13px]" style={{ color: C.ink, fontWeight: 500 }}>
                        {FIELD_LABEL[f]}{REQUIRED.includes(f) && <span style={{ color: C.bad }}> *</span>}
                      </span>
                      <select
                        value={chosen}
                        onChange={(e) => setField(f, e.target.value)}
                        className="text-[13px] rounded-lg px-2 py-1.5 min-w-[200px]"
                        style={{ border: `1px solid ${C.line}`, color: C.body, background: "var(--surface)" }}
                        aria-label={FIELD_LABEL[f]}
                      >
                        <option value="">Not in this file</option>
                        {preview.file.columns.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                      {prop && prop.header === chosen && (
                        <Pill tone={prop.verdict === "CONFIRMED" ? "good" : "warn"} title={prop.reason}>
                          {prop.verdict === "CONFIRMED" ? "Matched" : "Please check"}
                        </Pill>
                      )}
                      {isDate && (
                        <span className="flex items-center gap-2 text-[12px]" style={{ color: C.muted }}>
                          <label className="inline-flex items-center gap-1">
                            <input type="radio" name={`order-${f}`} checked={options.dateOrders[chosen] !== "MDY"} onChange={() => setOptions({ ...options, dateOrders: { ...options.dateOrders, [chosen]: "DMY" } })} /> day/month
                          </label>
                          <label className="inline-flex items-center gap-1">
                            <input type="radio" name={`order-${f}`} checked={options.dateOrders[chosen] === "MDY"} onChange={() => setOptions({ ...options, dateOrders: { ...options.dateOrders, [chosen]: "MDY" } })} /> month/day
                          </label>
                          {d?.verdict === "PROVEN" && <span style={{ color: C.faint }}>(proven from the data)</span>}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-6 mt-4 text-[13px]" style={{ color: C.body }}>
                <label className="inline-flex items-center gap-2">
                  Currency when a row has none
                  <input
                    value={options.currency || ""}
                    onChange={(e) => setOptions({ ...options, currency: e.target.value.toUpperCase().slice(0, 3) || null })}
                    placeholder="INR"
                    className="w-16 rounded-lg px-2 py-1 text-[13px]"
                    style={{ border: `1px solid ${C.line}` }}
                  />
                </label>
                {!options.mapping.due_date && (
                  <label className="inline-flex items-center gap-2">
                    Your usual credit days (if there is no due date)
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={options.defaultCreditDays ?? ""}
                      onChange={(e) => setOptions({ ...options, defaultCreditDays: e.target.value === "" ? null : Number(e.target.value) })}
                      className="w-20 rounded-lg px-2 py-1 text-[13px]"
                      style={{ border: `1px solid ${C.line}` }}
                    />
                  </label>
                )}
              </div>
              {preview.proposal.unmapped.length > 0 && (
                <p className="text-[12px] mt-3" style={{ color: C.faint }}>Not used: {preview.proposal.unmapped.join(", ")}.</p>
              )}
            </section>

            {questions.length > 0 && (
              <section className="mb-10 rounded-xl p-5" style={{ background: "rgb(var(--tk-warning) / 0.07)", border: "1px solid rgb(var(--tk-warning) / 0.24)" }}>
                <SectionLabel>Please confirm</SectionLabel>
                <ul className="space-y-3">
                  {questions.map((q) => (
                    <li key={q.key}>
                      <label className="flex gap-3 text-[14px] cursor-pointer" style={{ color: C.ink }}>
                        <input type="checkbox" className="mt-1" checked={!!confirmed[q.key]} onChange={(e) => setConfirmed({ ...confirmed, [q.key]: e.target.checked })} />
                        <span>
                          {q.message}
                          <span className="block text-[12px] mt-0.5" style={{ color: C.muted }}>{q.reason}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {blockingErrors.length > 0 && (
              <div className="mb-8"><Notice tone="warn" title="Needed before importing">{blockingErrors.join(". ")}.</Notice></div>
            )}

            {preview.profile && (
              <section className="mb-10">
                <SectionLabel>What this file gives Starlane</SectionLabel>
                <div className="rounded-xl px-5 py-5" style={{ background: "var(--surface)", border: `1px solid ${C.line}` }}>
                  <ProfileSummary p={preview.profile} />
                </div>
                <div className="mt-6">
                  <Limitations p={preview.profile} />
                </div>
                {preview.profile.rejectedByReason.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[13px] mb-2" style={{ color: C.ink, fontWeight: 500 }}>
                      <span className="inline-flex mr-1.5 align-[-2px]" style={{ color: C.warn }}><IconAlert size={13} /></span>
                      {preview.profile.counts.rowsRejected} row{preview.profile.counts.rowsRejected === 1 ? "" : "s"} will be skipped
                    </p>
                    <ul className="space-y-1">
                      {preview.profile.rejectedByReason.slice(0, 8).map((r) => (
                        <li key={r.reason} className="text-[13px]" style={{ color: C.muted }}>
                          {r.count} × {r.example} <span style={{ color: C.faint }}>(row{r.rows.length > 1 ? "s" : ""} {r.rows.join(", ")}{r.count > r.rows.length ? ", …" : ""})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {preview.profile.possibleSameCustomer.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[13px] mb-2" style={{ color: C.ink, fontWeight: 500 }}>Possibly the same customer</p>
                    <ul className="space-y-1">
                      {preview.profile.possibleSameCustomer.slice(0, 6).map((g) => (
                        <li key={g.join("|")} className="text-[13px]" style={{ color: C.muted }}>{g.join(" · ")}</li>
                      ))}
                    </ul>
                    <p className="text-[12px] mt-1" style={{ color: C.faint }}>Kept separate for now. Fix the names in your file if they are one business.</p>
                  </div>
                )}
              </section>
            )}

            <div className="flex flex-wrap items-center gap-4 mb-16">
              <Button loading={busy === "commit"} disabled={!canCommit} icon={<IconCheck size={14} />} onClick={commit}>Import and analyse</Button>
              {!allConfirmed && <span className="text-[13px]" style={{ color: C.muted }}>Confirm the questions above first.</span>}
              {busy === "preview" && <span className="text-[13px]" style={{ color: C.faint }}>Re-reading the file…</span>}
            </div>
          </>
        )}
        </div>
      </PageBody>
    </DashboardLayout>
  );
}
