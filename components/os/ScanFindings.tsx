"use client";

// SCAN: what Starlane discovered in the data. Process map, bottleneck,
// documented vs actual, automation candidates with their score components,
// business opportunities and the constraint. All computed by the backend
// (POST /api/os/scan, GET /api/os/scan/latest); nothing here is estimated
// in the browser.

import React, { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/Badge";
import { SkeletonRows } from "@/components/v32/ui";
import { osApi, ScanResult } from "@/lib/os";
import { pct } from "@/lib/decisions";
import { formatCount, formatRelative, inrWhole } from "@/lib/format";
import { Section, ScoreTrack, Stat, InlineError } from "@/components/scan/ui";
import { humaneError } from "@/components/scan/humaneError";
import { useLoad } from "./shared";

const P: React.CSSProperties = { margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--body)" };
const STEP_COLS = "40px minmax(0,1fr) 96px 140px 120px";
const META: React.CSSProperties = { margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--ink-3)" };

export function ScanFindings() {
  const { data, error, loading, setData, reload } = useLoad(() => osApi.latestScan());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setErr(null);
    try { setData({ scan: await osApi.scan() }); } catch (e) { setErr(humaneError(e)); } finally { setBusy(false); }
  };

  const scan = data?.scan || null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40, width: "100%" }}>
      <Section
        title="What Starlane found in your books"
        subtitle={scan
          ? <>Last scanned {formatRelative(scan.asOf)}. Every number here is computed from your ledger; no language model decides one.</>
          : "Scan rebuilds how invoices turn into cash, finds where it slows down, and proposes only what it can measure."}
        right={<Button variant={scan ? "secondary" : "primary"} size="sm" onClick={run} loading={busy}>{busy ? "Scanning" : scan ? "Scan again" : "Scan my books"}</Button>}
      >
        <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {loading && <SkeletonRows rows={3} height={36} />}
          {err && <InlineError onRetry={run}>{err}</InlineError>}
          {!loading && error != null && !err && <InlineError onRetry={reload}>{humaneError(error)}</InlineError>}
          {!loading && error == null && !scan && !err && (
            <p className="wk-empty">No scan yet. Import a receivables file or connect Tally, then scan your books. <Link href="/decisions/import" className="underline">Import a file</Link> · <Link href="/sources" className="underline">Connect Tally</Link></p>
          )}
          {scan && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {scan.summary.map((l) => (
                <li key={l} className="flex" style={{ gap: 12, ...P, color: "var(--ink)", fontSize: 14 }}>
                  <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 2, background: "var(--ink-3)", marginTop: 10, flexShrink: 0 }} />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          )}
          {scan && scan.found.decisions > 0 && (
            <div>
              <Link href="/decisions" className="ui-btn ui-btn-secondary ui-btn-sm">
                {scan.found.decisions === 1 ? "Open the decision" : `Open the ${scan.found.decisions} decisions`}
              </Link>
            </div>
          )}
          {scan?.status === "DEGRADED" && (
            <InlineError onRetry={run}>Decision discovery didn&rsquo;t finish on this scan, so the decision count may be out of date. The other findings still stand.</InlineError>
          )}
        </div>
      </Section>
      {scan && <ProcessPanel scan={scan} />}
      {scan && <AutomationPanel scan={scan} />}
      {scan && <OpportunityPanel scan={scan} />}
    </div>
  );
}

function ProcessPanel({ scan }: { scan: ScanResult }) {
  const p = scan.process;
  if (p.status !== "RECONSTRUCTED") {
    return <Section title="Invoice to payment"><p style={{ ...P, paddingTop: 16 }}>{p.reason || "Not enough data yet to rebuild how invoices turn into cash."}</p></Section>;
  }
  return (
    <Section
      title="Invoice to payment, as it really runs"
      subtitle={p.coverage ? `${formatCount(p.coverage.invoices)} invoices and ${formatCount(p.coverage.customers)} customers, ${p.coverage.from} to ${p.coverage.to}.` : undefined}
    >
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: "20px 24px", padding: "20px 0" }}>
        <Stat label="Median days to cash" value={p.cycle?.medianDays ?? "Not known yet"} sub={p.cycle?.p90Days != null ? `1 in 10 take ${p.cycle.p90Days}+ days` : undefined} />
        <Stat label="Paid by due date" value={pct(p.sla?.rate)} tone={p.sla?.rate != null && p.sla.rate < 0.5 ? "critical" : undefined} sub={p.sla ? `${formatCount(p.sla.met)} of ${formatCount(p.sla.met + p.sla.violated)}` : undefined} />
        <Stat label="Overdue episodes a month" value={p.manualWork?.perMonth ?? "Not known yet"} />
        <Stat label="Chasing time a month" value={p.manualWork ? `${p.manualWork.humanEffort.hoursPerMonth}h` : "Not known yet"} sub={p.manualWork ? "Estimate" : undefined} />
      </div>

      {(p.steps || []).length > 0 && (
        <div role="table" aria-label="Steps from invoice to payment" className="wk-list wk-flat">
          <div role="row" className="wk-head" style={{ gridTemplateColumns: STEP_COLS }}>
            <span role="columnheader">Step</span>
            <span role="columnheader">Stage</span>
            <span role="columnheader" style={{ textAlign: "right" }}>Median</span>
            <span role="columnheader" style={{ textAlign: "right" }}>Based on</span>
            <span role="columnheader" />
          </div>
          {(p.steps || []).map((s, i) => {
            const slow = p.bottleneck?.step === s.key;
            return (
              <div key={s.key} role="row" className={`wk-row ${slow ? "wk-attn" : ""}`} style={{ gridTemplateColumns: STEP_COLS, paddingTop: 10, paddingBottom: 10 }}>
                <span role="cell" className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>{i + 1}</span>
                <span role="cell" style={{ fontSize: 13, color: "var(--ink)" }}>{s.label}</span>
                <span role="cell" className="md:text-right" style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>{s.medianDays != null ? <><span className="num">{s.medianDays}</span> days</> : "Not known yet"}</span>
                <span role="cell" className="md:text-right" style={{ display: "block", fontSize: 12, color: "var(--ink-3)" }}><span className="num">{formatCount(s.n)}</span> invoices</span>
                <span role="cell" className="md:text-right">{slow ? <StatusChip tone="attention">Bottleneck</StatusChip> : null}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 16 }}>
        {p.bottleneck && <p style={P}><span style={{ color: "var(--ink)" }}>Where it slows down.</span> {p.bottleneck.why}</p>}
        {p.documentedVsActual && <p style={P}><span style={{ color: "var(--ink)" }}>Stated against real.</span> {p.documentedVsActual.documented.label}. {p.documentedVsActual.actual.label}.</p>}
        {p.manualWork && <p style={META}>{p.manualWork.humanEffort.assumption}</p>}
        {p.notObservable && p.notObservable.length > 0 && (
          <p style={META}>Can&rsquo;t see from this data: {p.notObservable.map((n) => n.what.toLowerCase()).join("; ")}.</p>
        )}
      </div>
    </Section>
  );
}

function AutomationPanel({ scan }: { scan: ScanResult }) {
  const { candidates, considered } = scan.automation;
  return (
    <Section title="What could be automated" subtitle="A workflow is proposed only when it recurs, is mostly rules, and its result can be checked in the ledger.">
      {candidates.length === 0 && (
        <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {considered.length === 0 && <p style={P}>Nothing in this data qualifies yet.</p>}
          {considered.map((x) => <p key={x.key} style={P}>{x.why}</p>)}
        </div>
      )}
      {candidates.map((a) => {
        const proposal = scan.proposals.find((p) => p.key === a.key);
        return (
          <div key={a.key} style={{ padding: "20px 0", borderBottom: "1px solid var(--line)" }}>
            <div className="flex items-start justify-between flex-wrap" style={{ gap: 16 }}>
              <div className="min-w-0" style={{ flex: "1 1 360px" }}>
                <div className="wk-title" style={{ fontSize: 14 }}>{a.title}</div>
                <p style={{ ...P, marginTop: 4 }}>{a.summary}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="num" style={{ fontSize: 20, lineHeight: 1.2, color: "var(--ink)" }}>{Math.round(a.score * 100)}<span style={{ fontSize: 12, color: "var(--ink-3)" }}> / 100</span></div>
                <div style={{ ...META, marginTop: 4 }}>Fit score</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "14px 24px", marginTop: 18 }}>
              {a.components.map((c) => (
                <div key={c.key} className="min-w-0">
                  <div className="flex justify-between" style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6, gap: 8 }}>
                    <span>{c.label}</span>
                    <span className="tabular-nums" style={{ color: "var(--ink-3)" }}>weight {Math.round((a.weights[c.key] || 0) * 100)}%</span>
                  </div>
                  <ScoreTrack value={c.value} label={`${c.label}: ${Math.round(c.value * 100)} of 100`} />
                  <p style={{ ...META, marginTop: 6 }}>{c.detail}</p>
                </div>
              ))}
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)]" style={{ gap: "8px 20px", margin: "20px 0 0", fontSize: 13.5 }}>
              <dt style={{ color: "var(--ink-3)" }}>Trigger</dt>
              <dd style={{ ...P, margin: 0 }}>{a.trigger.days}+ days overdue. {a.trigger.why}</dd>
              <dt style={{ color: "var(--ink-3)" }}>Without Starlane</dt>
              <dd style={{ ...P, margin: 0 }}>{a.baseline.label}</dd>
              <dt style={{ color: "var(--ink-3)" }}>Past the trigger today</dt>
              <dd className="tabular-nums" style={{ ...P, margin: 0 }}>{formatCount(a.inScopeNow.customers)} customers, {inrWhole(a.inScopeNow.amount)}</dd>
              <dt style={{ color: "var(--ink-3)" }}>Who does what</dt>
              <dd style={{ ...P, margin: 0 }}>{a.steps.deterministic} of {a.steps.total} steps are rules, {a.steps.agent} is drafted by an agent, {a.steps.human} stay with a person ({a.steps.humanDetail.toLowerCase()}).</dd>
              {a.risks.length > 0 && <>
                <dt style={{ color: "var(--ink-3)" }}>Risks</dt>
                <dd style={{ margin: 0 }}>
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {a.risks.map((r) => <li key={r} style={{ ...P, color: "var(--warning)" }}>{r}</li>)}
                  </ul>
                </dd>
              </>}
            </dl>

            {proposal && (
              <div className="flex items-center flex-wrap" style={{ gap: 8, marginTop: 16 }}>
                <StatusChip tone={proposal.status === "PROPOSED" ? "attention" : "info"}>
                  {proposal.status === "PROPOSED" ? "Waiting in Prepared" : proposal.status.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}
                </StatusChip>
                <Link href="/prepared" className="ui-btn ui-btn-secondary ui-btn-sm">Review the proposal</Link>
                <Link href="/simulate" className="ui-btn ui-btn-ghost ui-btn-sm">See the replay</Link>
              </div>
            )}
          </div>
        );
      })}
    </Section>
  );
}

function OpportunityPanel({ scan }: { scan: ScanResult }) {
  return (
    <Section title="Opportunities and the constraint">
      {scan.opportunities.length === 0 && <p style={{ ...P, paddingTop: 16 }}>No opportunity stood out in this data.</p>}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {scan.opportunities.map((o) => (
          <li key={o.key} className="flex items-start justify-between" style={{ gap: 16, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
            <div className="min-w-0">
              <div style={{ fontSize: 13.5, color: "var(--ink)" }}>{o.title}</div>
              <p style={{ ...META, fontSize: 12.5, marginTop: 3 }}>{o.detail}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="num" style={{ fontSize: 13.5, color: "var(--ink)" }}>{inrWhole(o.value)}</div>
              <div style={{ ...META, marginTop: 2 }}>{o.valueLabel}</div>
            </div>
          </li>
        ))}
      </ul>
      <div style={{ paddingTop: 16 }}>
        <div className="section-label" style={{ marginBottom: 6 }}>What limits the business most</div>
        <p style={P}>
          {scan.constraint.constraint ? <><span style={{ color: "var(--ink)" }}>{scan.constraint.label}.</span> {scan.constraint.why}</> : scan.constraint.why}
        </p>
        {scan.constraint.cannotSee && scan.constraint.cannotSee.length > 0 && (
          <p style={{ ...META, marginTop: 6 }}>Not visible yet: {scan.constraint.cannotSee.join(", ")}.</p>
        )}
      </div>
    </Section>
  );
}
