"use client";

// Agent run, laid out like Harvey's agent view: a slim rail, a title bar with
// back and Share, the request as a bubble, the agent's account of the run as
// plain text, an "Ask" box at the bottom, and a right panel with Progress,
// Context (Outputs and Sources) and Properties.
//
// Everything shown comes from GET /api/os/agents/:key/runs/:runId (one row
// of the agent_runs ledger for the signed-in workspace) and the agent's own
// definition from GET /api/os/agents. Nothing is invented: steps are the
// agent's declared steps, ticked only when the run completed; output files
// are built in the browser from the run's recorded output.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { osApi, type AgentInfo, type AgentRun } from "@/lib/os";
import { useLoad, errorText } from "@/components/os/shared";
import { startThread } from "@/lib/scanStore";
import { savePrompt } from "@/lib/promptStore";
import { downloadCsv } from "@/components/command/Charts";

const WORKING_CAPITAL = "starlane.working_capital";

type Week = { week: number; from: string; to: string; moneyIn: number; moneyOut: number; net: number; cumulativeNet: number };
type Chase = { invoiceId: string; number: string | null; customer: string; outstanding: number; daysLate: number | null };
type Payable = { purchaseId: string; supplier: string; billNumber: string | null; outstanding: number; dueDate: string | null; when: string; daysLate?: number };
type Flow = { dueInHorizonCount?: number; overdueCount?: number; noDueDateCount?: number };

function money(n: unknown, currency = "INR"): string {
  const v = Math.round(Number(n) || 0);
  const sign = v < 0 ? "−" : "";
  const abs = Math.abs(v);
  if (currency === "INR") return `${sign}₹${abs.toLocaleString("en-IN")}`;
  return `${sign}${currency} ${abs.toLocaleString("en-US")}`;
}
function day(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
function dur(ms: number | null): string {
  if (ms == null) return "";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}
function count(n: number | undefined, one: string, many = one + "s"): string {
  const v = Number(n) || 0;
  return `${v} ${v === 1 ? one : many}`;
}

/* ── Icons, drawn to match the reference's thin line set ─────────────── */
const I = {
  back: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" /></svg>,
  share: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><circle cx="6" cy="5.5" r="2.3" /><path d="M2 13.5c.6-2.3 2.1-3.5 4-3.5s3.4 1.2 4 3.5M11 6v4M9 8h4" /></svg>,
  panel: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M10 3v10" /></svg>,
  tick: <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 5.2l2 2 4-4.4" /></svg>,
  chev: <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M2 3.5l3 3 3-3" /></svg>,
  doc: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 1.8h5.2L12.5 5v9.2H4z" /><path d="M9 1.8V5.2h3.5M6 8.5h4.5M6 11h3" /></svg>,
  db: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><ellipse cx="8" cy="4" rx="5" ry="2" /><path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" /></svg>,
  search: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>,
  save: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M3 2.5h10v11H3zM6 2.5v4h4v-4" /></svg>,
  down: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>,
  arrow: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>,
};

interface OutFile { name: string; rows: number; download: () => void }
interface SourceItem { name: string; detail: string }

/** What the run produced and read, from its recorded output. */
function describe(run: AgentRun, agent: AgentInfo | null) {
  const out = (run.output || {}) as Record<string, unknown>;
  const input = (run.input || {}) as Record<string, unknown>;
  const asOf = String(input.asOf || out.asOf || run.startedAt || "");
  const files: OutFile[] = [];
  const sources: SourceItem[] = [];
  const knowledge: string[] = [];
  const paragraphs: string[] = [];
  const name = agent?.name || "This agent";

  if (run.agentKey === WORKING_CAPITAL && run.output) {
    const cur = String(out.currency || "INR");
    const weeks = (out.weeks as Week[]) || [];
    const chase = (out.chaseFirst as Chase[]) || [];
    const pay = (out.payablesSoonest as Payable[]) || [];
    const inflow = (out.inflow || {}) as Flow;
    const outflow = (out.outflow || {}) as Flow;
    const h = Number(out.horizonDays ?? input.horizonDays ?? 30);
    const unknowns = (out.unknowns as string[]) || [];

    paragraphs.push(`I read your open invoices and unpaid purchases as of ${day(asOf)} and laid out the next ${h} days week by week, by due date.`);
    if (out.headline) paragraphs.push(String(out.headline));
    if (chase.length) {
      // One line per customer: the agent lists invoices, several can share a customer.
      const by = new Map<string, { n: number; amt: number; worst: number }>();
      for (const c of chase) {
        const g = by.get(c.customer) || { n: 0, amt: 0, worst: 0 };
        g.n += 1; g.amt += Number(c.outstanding) || 0; g.worst = Math.max(g.worst, c.daysLate ?? 0);
        by.set(c.customer, g);
      }
      paragraphs.push(`Already late, so chase these first: ${[...by.entries()].slice(0, 3).map(([who, g]) => `${who} (${g.n > 1 ? `${g.n} invoices, ` : ""}${money(g.amt, cur)}${g.worst ? `, ${g.n > 1 ? "up to " : ""}${g.worst} days late` : ""})`).join("; ")}.`);
    }
    if (pay.length) paragraphs.push(`Suppliers due soonest: ${pay.slice(0, 3).map((p) => `${p.supplier} (${money(p.outstanding, cur)}${p.when === "OVERDUE" ? `, ${p.daysLate ?? 0} days overdue` : p.dueDate ? `, due ${day(p.dueDate)}` : ""})`).join("; ")}.`);
    if (unknowns.length) paragraphs.push(`What I can't see: ${unknowns.join(" ")}`);

    if (weeks.length) files.push({ name: "Week by week.csv", rows: weeks.length, download: () => downloadCsv("week-by-week", ["week", "from", "to", "money_in", "money_out", "net", "cumulative_net"], weeks.map((w) => [w.week, w.from, w.to, w.moneyIn, w.moneyOut, w.net, w.cumulativeNet])) });
    if (chase.length) files.push({ name: "Customers to chase.csv", rows: chase.length, download: () => downloadCsv("customers-to-chase", ["customer", "invoice", "outstanding", "days_late"], chase.map((c) => [c.customer, c.number || "", c.outstanding, c.daysLate ?? ""])) });
    if (pay.length) files.push({ name: "Suppliers due soonest.csv", rows: pay.length, download: () => downloadCsv("suppliers-due", ["supplier", "bill", "outstanding", "due_date", "status"], pay.map((p) => [p.supplier, p.billNumber || "", p.outstanding, p.dueDate || "", p.when])) });

    const invN = (inflow.dueInHorizonCount || 0) + (inflow.overdueCount || 0) + (inflow.noDueDateCount || 0);
    const purN = (outflow.dueInHorizonCount || 0) + (outflow.overdueCount || 0) + (outflow.noDueDateCount || 0);
    sources.push({ name: "Open invoices", detail: count(invN, "invoice") });
    sources.push({ name: "Unpaid purchases", detail: count(purN, "purchase") });
    knowledge.push("Receivables", "Purchases");
  } else {
    if (run.summary) paragraphs.push(run.summary);
    sources.push({ name: "Your workspace ledger", detail: asOf ? `as of ${day(asOf)}` : "" });
    knowledge.push("Ledger");
  }

  if (run.output) {
    files.push({
      name: "Run output.json", rows: 0, download: () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(run.output, null, 2)], { type: "application/json" }));
        const a = document.createElement("a"); a.href = url; a.download = `run-${run.id.slice(0, 8)}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
    });
  }

  if (run.status === "completed") paragraphs.push(files.length > 1 ? `Done in ${dur(run.durationMs)}. The results are ready for you to review in the panel.` : `Done in ${dur(run.durationMs)}.`);
  if (run.status === "running") paragraphs.push("Still running. This page shows the result once it is recorded.");

  const request = run.agentKey === WORKING_CAPITAL
    ? `Run the ${name.toLowerCase()} for the next ${String(input.horizonDays ?? out.horizonDays ?? 30)} days: what comes in, what goes out, and which week runs short.`
    : `Run the ${name.toLowerCase()}${asOf ? ` on my data as of ${day(asOf)}` : ""}.`;

  return { request, paragraphs, files, sources, knowledge, name };
}

function Section({ title, aside, open, onToggle, children }: { title: string; aside?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="ar-sec">
      <button type="button" className="ar-sec-head" aria-expanded={open} onClick={onToggle}>
        <span>{title}</span>
        <span className="ar-sec-aside">{aside}<span className="ar-chev" style={{ transform: open ? "none" : "rotate(-90deg)" }}>{I.chev}</span></span>
      </button>
      {open && <div className="ar-sec-body">{children}</div>}
    </section>
  );
}

export default function AgentRunDetail() {
  const router = useRouter();
  const params = useParams<{ id: string; runId: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const runId = params?.runId ? decodeURIComponent(params.runId) : "";
  const { data, error, loading } = useLoad(() => osApi.agentRun(id, runId));
  const agents = useLoad(() => osApi.agents());
  const notFound = !!error && (error as { status?: number }).status === 404;
  const r = data?.run;
  const agent = agents.data?.agents.find((a) => a.key === id) || null;

  const [panel, setPanel] = useState(true);
  const [secs, setSecs] = useState({ progress: true, context: true, props: true });
  const [tab, setTab] = useState<"outputs" | "sources">("outputs");
  const [filter, setFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ask, setAsk] = useState("");


  const d = useMemo(() => (r ? describe(r, agent) : null), [r, agent]);
  const steps = agent?.performs || [];
  const done = r?.status === "completed";
  const files = (d?.files || []).filter((f) => f.name.toLowerCase().includes(filter.toLowerCase()));

  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setShared(true); setTimeout(() => setShared(false), 1800); } catch { /* clipboard blocked */ }
  };
  // "Add to Library": saves the request as a prompt in the Library's
  // "Saved by you" (the same store the Library reads), so it can be re-run.
  const saveToLibrary = () => {
    if (!d) return;
    savePrompt(d.request);
    setSaved(true); setTimeout(() => setSaved(false), 1800);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = ask.trim();
    if (!q) return;
    router.push(`/scan/${startThread(q)}`);
  };

  return (
    <DashboardLayout pageTitle="Agent run" slimRail bare>
      <div className={`ar ${panel ? "has-panel" : ""}`}>
        <div className="ar-main">
          <header className="ar-bar">
            <Link href={`/agents/${encodeURIComponent(id)}`} className="ar-back" aria-label="Back to the agent">{I.back}</Link>
            <span className="ar-name">{d?.name || agent?.name || "Agent run"}</span>
            {r?.startedAt && <span className="ar-meta">{day(r.startedAt)}{r.durationMs != null ? ` · ${dur(r.durationMs)}` : ""}</span>}
            <span className="flex-1" />
            <button type="button" className="ar-btn" onClick={share} aria-live="polite">{I.share} {shared ? "Link copied" : "Share"}</button>
            <button type="button" className={`ar-icon ${panel ? "is-on" : ""}`} aria-pressed={panel} aria-label={panel ? "Hide the side panel" : "Show the side panel"} onClick={() => setPanel(!panel)}>{I.panel}</button>
          </header>

          <div className="ar-scroll">
            <div className="ar-thread">
              {loading && <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />}
              {notFound && <p className="ar-text">Run not found. No run &ldquo;{runId}&rdquo; is recorded for this agent in your workspace.</p>}
              {!!error && !notFound && <p className="ar-text" role="alert" style={{ color: "#A3392E" }}>This run could not be loaded: {errorText(error)}</p>}
              {d && r && (
                <>
                  <div className="ar-bubble">{d.request}</div>
                  {d.paragraphs.map((p, i) => <p key={i} className="ar-text" style={{ animationDelay: `${120 + i * 90}ms` }}>{p}</p>)}
                  {r.error && <p className="ar-text" role="alert" style={{ color: "#A3392E" }}>The run failed: {r.error}</p>}
                </>
              )}
            </div>
          </div>

          <form className="ar-ask" onSubmit={submit}>
            <label htmlFor="ar-ask" className="sr-only">Ask Starlane anything</label>
            <textarea id="ar-ask" rows={1} value={ask} placeholder="Ask Starlane anything…" onChange={(e) => setAsk(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }} />
            <div className="ar-ask-row">
              <Link href="/decisions/import" className="ar-ask-plus" aria-label="Add data">{I.plus}</Link>
              <span className="flex-1" />
              <button type="submit" className="ar-send" disabled={!ask.trim()} aria-label="Ask">{I.arrow}</button>
            </div>
          </form>
        </div>

        {panel && d && r && (
          <aside className="ar-panel" aria-label="Run details">
            <Section title="Progress" aside={steps.length ? `${done ? steps.length : 0} of ${steps.length} steps` : undefined} open={secs.progress} onToggle={() => setSecs({ ...secs, progress: !secs.progress })}>
              {steps.length === 0 ? <p className="ar-note">{agents.loading ? "Loading steps…" : "This agent doesn't list its steps."}</p> : (
                <ol className="ar-steps">
                  {steps.map((s, i) => (
                    <li key={s} className={done ? "is-done" : r.status === "failed" ? "is-failed" : ""} style={{ animationDelay: `${i * 110}ms` }}>
                      <span className="ar-step-dot">{done && I.tick}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              )}
              {r.status === "failed" && <p className="ar-note" style={{ color: "#A3392E" }}>Stopped before finishing.</p>}
            </Section>

            <Section title="Context" open={secs.context} onToggle={() => setSecs({ ...secs, context: !secs.context })}>
              <div className="ar-seg" role="tablist" aria-label="Context">
                {(["outputs", "sources"] as const).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "is-on" : ""} onClick={() => setTab(t)}>{t === "outputs" ? "Outputs" : "Sources"}</button>
                ))}
              </div>
              {tab === "outputs" ? (
                <>
                  <div className="ar-files-head">
                    {searching
                      ? <input autoFocus className="ar-filter" value={filter} placeholder="Filter files" aria-label="Filter files" onChange={(e) => setFilter(e.target.value)} onBlur={() => { if (!filter) setSearching(false); }} />
                      : <span>{count(d.files.length, "file")}</span>}
                    <button type="button" className="ar-mini" aria-label="Filter files" onClick={() => setSearching(true)}>{I.search}</button>
                  </div>
                  {files.length === 0 ? <p className="ar-note">{d.files.length ? "No file matches." : "This run recorded no output files."}</p> : (
                    <ul className="ar-files">
                      {files.map((f) => (
                        <li key={f.name}><button type="button" onClick={f.download} title={`Download ${f.name}`}><span className="ar-file-ic">{I.doc}</span><span className="truncate">{f.name}</span></button></li>
                      ))}
                    </ul>
                  )}
                  {d.files.length > 0 && (
                    <div className="ar-actions">
                      <button type="button" className="ar-btn ar-btn-box" onClick={saveToLibrary}>{I.save} {saved ? "Saved" : "Add to Library"}</button>
                      <button type="button" className="ar-btn ar-btn-box" onClick={() => d.files.forEach((f, i) => setTimeout(f.download, i * 250))}>{I.down} Download</button>
                    </div>
                  )}
                </>
              ) : (
                <ul className="ar-files">
                  {d.sources.map((s) => (
                    <li key={s.name}><div className="ar-src"><span className="ar-file-ic ar-src-ic">{I.db}</span><span className="truncate">{s.name}</span><span className="ar-src-n">{s.detail}</span></div></li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Properties" open={secs.props} onToggle={() => setSecs({ ...secs, props: !secs.props })}>
              <dl className="ar-props">
                <dt>Agent</dt>
                <dd><span className="ar-chip"><span className="ar-chip-mark"><StarlaneMark variant="glyph" size={8} /></span>{d.name}</span></dd>
                <dt>Knowledge</dt>
                <dd className="flex flex-wrap" style={{ gap: 6 }}>{d.knowledge.map((k) => <span key={k} className="ar-chip"><span className="ar-chip-dot" />{k}</span>)}</dd>
                <dt>Model</dt>
                <dd><span className="ar-model">✳</span>{agent?.model || "Not recorded"}</dd>
                <dt>Status</dt>
                <dd style={{ color: r.status === "failed" ? "#A3392E" : r.status === "completed" ? "#2F6B45" : "#57534D" }}>{r.status === "completed" ? "Completed" : r.status === "failed" ? "Failed" : "Running"}</dd>
              </dl>
            </Section>
          </aside>
        )}
      </div>
    </DashboardLayout>
  );
}
