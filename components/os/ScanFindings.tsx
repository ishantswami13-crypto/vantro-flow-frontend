"use client";

// SCAN: what Starlane discovered in the data. Process map, bottleneck,
// documented vs actual, automation candidates with their score components,
// business opportunities and the constraint. All computed by the backend.

import React, { useState } from "react";
import Link from "next/link";
import { C, Pill, SectionLabel, Skeleton, Stat } from "@/components/decisions/ui";
import { osApi, ScanResult } from "@/lib/os";
import { money, pct, relTime } from "@/lib/decisions";
import { Panel, Btn, Row, Muted, ErrorLine, errorText, ScoreBar, useLoad } from "./shared";

export function ScanFindings() {
  const { data, error, loading, setData } = useLoad(() => osApi.latestScan());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setErr(null);
    try { setData({ scan: await osApi.scan() }); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  const scan = data?.scan || null;
  return (
    <div className="space-y-4" style={{ width: "100%" }}>
      <Panel
        title="What Starlane found in your data"
        subtitle={scan ? `Last scan ${relTime(scan.asOf)}. Deterministic: no language model decides a number here.` : "Scan rebuilds how invoices turn into cash, finds where it slows down, and proposes only what it can measure."}
        right={<Btn primary onClick={run} disabled={busy}>{busy ? "Scanning…" : scan ? "Scan again" : "Run scan"}</Btn>}
      >
        {loading && <Skeleton rows={3} />}
        <ErrorLine error={err || (error ? errorText(error) : null)} />
        {!loading && !scan && !err && <Muted>No scan yet. <Link className="underline" href="/decisions/import">Import a receivables file</Link> or <Link className="underline" href="/sources">connect Tally</Link>, then run a scan.</Muted>}
        {scan && (
          <ul className="space-y-1">
            {scan.summary.map((l) => <li key={l} className="text-[13.5px] leading-[1.55]" style={{ color: C.ink }}>{l}</li>)}
          </ul>
        )}
      </Panel>
      {scan && <ProcessPanel scan={scan} />}
      {scan && <AutomationPanel scan={scan} />}
      {scan && <OpportunityPanel scan={scan} />}
    </div>
  );
}

function ProcessPanel({ scan }: { scan: ScanResult }) {
  const p = scan.process;
  if (p.status !== "RECONSTRUCTED") return <Panel title="Invoice to payment"><Muted>{p.reason}</Muted></Panel>;
  return (
    <Panel title="Invoice to payment, as it really runs" subtitle={p.coverage ? `${p.coverage.invoices} invoices, ${p.coverage.customers} customers, ${p.coverage.from} to ${p.coverage.to}` : undefined}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
        <Stat label="Median days to cash" value={p.cycle?.medianDays ?? "?"} sub={p.cycle?.p90Days != null ? `1 in 10 take ${p.cycle.p90Days}+` : undefined} />
        <Stat label="Paid by due date" value={pct(p.sla?.rate)} tone={p.sla?.rate != null && p.sla.rate < 0.5 ? "bad" : undefined} sub={p.sla ? `${p.sla.met} of ${p.sla.met + p.sla.violated}` : undefined} />
        <Stat label="Overdue episodes a month" value={p.manualWork?.perMonth ?? "?"} />
        <Stat label="Chasing time a month" value={p.manualWork ? `${p.manualWork.humanEffort.hoursPerMonth}h` : "?"} sub="estimate" />
      </div>
      <div className="flex flex-col md:flex-row gap-2 mb-3">
        {(p.steps || []).map((s) => (
          <div key={s.key} className="rounded-lg px-3 py-2 flex-1" style={{ background: p.bottleneck?.step === s.key ? "#FBEFEE" : C.wash, border: `1px solid ${p.bottleneck?.step === s.key ? "#F0D2CF" : C.line}` }}>
            <p className="text-[12px]" style={{ color: C.muted }}>{s.label}</p>
            <p className="text-[15px]" style={{ color: C.ink, fontWeight: 600 }}>{s.medianDays != null ? `${s.medianDays} days` : "n/a"}</p>
            <p className="text-[11.5px]" style={{ color: C.faint }}>{s.n} invoices{p.bottleneck?.step === s.key ? " · bottleneck" : ""}</p>
          </div>
        ))}
      </div>
      {p.bottleneck && <p className="text-[13px] mb-1" style={{ color: C.body }}><strong style={{ color: C.bad, fontWeight: 600 }}>Bottleneck:</strong> {p.bottleneck.why}</p>}
      {p.documentedVsActual && (
        <p className="text-[13px]" style={{ color: C.body }}>
          <strong style={{ fontWeight: 600 }}>Stated vs real:</strong> {p.documentedVsActual.documented.label}. {p.documentedVsActual.actual.label}.
        </p>
      )}
      {p.manualWork && <p className="text-[11.5px] mt-2" style={{ color: C.faint }}>{p.manualWork.humanEffort.assumption}</p>}
      {p.notObservable && p.notObservable.length > 0 && (
        <p className="text-[11.5px] mt-1" style={{ color: C.faint }}>Cannot see from this data: {p.notObservable.map((n) => n.what.toLowerCase()).join("; ")}.</p>
      )}
    </Panel>
  );
}

function AutomationPanel({ scan }: { scan: ScanResult }) {
  const { candidates, considered } = scan.automation;
  return (
    <Panel title="What could be automated" subtitle="A workflow is proposed only when it recurs, is mostly rules, and its result can be checked in the ledger.">
      {candidates.length === 0 && considered.map((x) => <Muted key={x.key}>{x.why}</Muted>)}
      {candidates.map((a) => {
        const proposal = scan.proposals.find((p) => p.key === a.key);
        return (
          <div key={a.key}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div style={{ minWidth: 0 }}>
                <p className="text-[14px]" style={{ color: C.ink, fontWeight: 600 }}>{a.title}</p>
                <p className="text-[13px] mt-1" style={{ color: C.body }}>{a.summary}</p>
              </div>
              <div className="text-right">
                <p className="text-[20px]" style={{ color: C.ink, fontWeight: 600 }}>{Math.round(a.score * 100)}</p>
                <p className="text-[11px]" style={{ color: C.faint }}>fit score of 100</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-3">
              {a.components.map((c) => (
                <div key={c.key} title={c.detail}>
                  <div className="flex justify-between text-[12px]" style={{ color: C.muted }}>
                    <span>{c.label}</span>
                    <span>weight {Math.round((a.weights[c.key] || 0) * 100)}%</span>
                  </div>
                  <ScoreBar value={c.value} />
                  <p className="text-[11.5px] mt-[2px]" style={{ color: C.faint }}>{c.detail}</p>
                </div>
              ))}
            </div>
            <Row>
              <p className="text-[13px]" style={{ color: C.body }}><strong style={{ fontWeight: 600 }}>Trigger:</strong> {a.trigger.days}+ days overdue. {a.trigger.why}</p>
              <p className="text-[13px] mt-1" style={{ color: C.body }}><strong style={{ fontWeight: 600 }}>Without Starlane:</strong> {a.baseline.label}</p>
              <p className="text-[13px] mt-1" style={{ color: C.body }}><strong style={{ fontWeight: 600 }}>Past the trigger today:</strong> {a.inScopeNow.customers} customers, {money(a.inScopeNow.amount)}.</p>
              <p className="text-[12px] mt-2" style={{ color: C.muted }}>{a.steps.deterministic} of {a.steps.total} steps are rules, {a.steps.agent} is drafted by an agent, {a.steps.human} stay with a person ({a.steps.humanDetail.toLowerCase()}).</p>
              <ul className="mt-2 space-y-[2px]">
                {a.risks.map((r) => <li key={r} className="text-[12px]" style={{ color: C.warn }}>{r}</li>)}
              </ul>
            </Row>
            {proposal && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Pill tone="accent">{proposal.status === "PROPOSED" ? "Waiting in Prepared" : proposal.status.replace(/_/g, " ").toLowerCase()}</Pill>
                <Link href="/prepared" className="text-[12.5px] underline" style={{ color: C.accent }}>Review the proposal</Link>
                <Link href="/simulate" className="text-[12.5px] underline" style={{ color: C.accent }}>See the replay</Link>
              </div>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

function OpportunityPanel({ scan }: { scan: ScanResult }) {
  return (
    <Panel title="Opportunities and the constraint">
      {scan.opportunities.length === 0 && <Muted>No opportunity stood out in this data.</Muted>}
      {scan.opportunities.map((o) => (
        <div key={o.key} className="mb-3">
          <div className="flex justify-between gap-3 flex-wrap">
            <p className="text-[13.5px]" style={{ color: C.ink, fontWeight: 500 }}>{o.title}</p>
            <p className="text-[13.5px]" style={{ color: C.ink, fontWeight: 600 }}>{money(o.value)}</p>
          </div>
          <p className="text-[12.5px]" style={{ color: C.muted }}>{o.detail} ({o.valueLabel})</p>
        </div>
      ))}
      <Row>
        <SectionLabel>What limits the business most</SectionLabel>
        <p className="text-[13px]" style={{ color: C.body }}>
          {scan.constraint.constraint ? <><strong style={{ fontWeight: 600 }}>{scan.constraint.label}.</strong> {scan.constraint.why}</> : scan.constraint.why}
        </p>
        {scan.constraint.cannotSee && scan.constraint.cannotSee.length > 0 && (
          <p className="text-[11.5px] mt-1" style={{ color: C.faint }}>Not visible yet: {scan.constraint.cannotSee.join(", ")}.</p>
        )}
      </Row>
    </Panel>
  );
}
