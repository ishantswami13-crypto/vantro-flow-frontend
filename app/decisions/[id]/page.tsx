"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import FeedbackBar from "@/components/decisions/FeedbackBar";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { Notice, Pill, RangeBar, SectionLabel, Skeleton } from "@/components/decisions/ui";
import { DecisionEvidenceDrawer } from "@/components/decisions/DecisionEvidenceDrawer";
import { IconChevronDown, IconX } from "@/components/v32/icons";
import { PageBody, RetryLine, amount, cleanTitle, humaneError, prettyDates } from "@/components/os/prepared/kit";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  decisionsApi, pct, relTime, daysUntil, STATUS_LABEL, EVIDENCE_LABEL, BAND_LABEL,
  DecisionApiError, type Decision, type DecisionDetail, type DecisionOption, type Interval, type SimulateResponse,
} from "@/lib/decisions";
import m from "./memo.module.css";

// ── helpers ───────────────────────────────────────────────────────────────

function headline(o: DecisionOption, kind: string): { label: string; interval: Interval | null; lowerIsBetter?: boolean } {
  if (kind === "RECEIVABLE_RISK") return { label: "Collected within 60 days", interval: o.futures.cash60 || null };
  if (kind === "PROCESS_DEGRADATION") return { label: "Working capital freed", interval: o.futures.workingCapitalFreed || null };
  return { label: "Expected cost (stockout + premium)", interval: o.futures.expectedCost || null, lowerIsBetter: true };
}

function errorText(err: unknown): { title: string; detail?: string } {
  if (err instanceof DecisionApiError) {
    const b = err.body as { blockedBy?: { reason: string }[]; checks?: { check: string; ok: boolean; detail?: string }[]; compensated?: { intent: string }[] };
    if (err.status === 423) return { title: "Stopped by a kill switch", detail: (b.blockedBy || []).map((x) => x.reason).join(" ") };
    if (err.status === 409 && b.checks) return { title: err.message, detail: b.checks.filter((c) => !c.ok).map((c) => c.detail || c.check).join(" · ") };
    if (err.status === 502) return { title: "The action didn't complete", detail: b.compensated?.length ? `Undone: ${b.compensated.map((c) => c.intent.replace(/_/g, " ").toLowerCase()).join(", ")}. Nothing is left half-done.` : "Nothing was changed. Try again in a moment." };
  }
  return { title: humaneError(err, "That didn't go through. Try again in a moment.") };
}

const INTENT_WORDS: Record<string, string> = {
  HOLD_CREDIT: "Put the customer on advance payment",
  CONTACT_CUSTOMER: "Prepare a firm reminder for your approval",
  OFFER_PAYMENT_PLAN: "Record a proposed payment plan",
  CREATE_DUNNING_RULES: "Create reminder rules",
  CHANGE_PAYMENT_TERMS: "Shorten default terms for new invoices",
  CREATE_PO: "Draft a purchase order",
};

function stepsOf(o?: DecisionOption | null): string[] {
  if (!o || o.isDoNothing) return [];
  const steps = o.intent.type === "COMPOSITE" ? o.intent.steps || [] : [o.intent];
  return steps.map((s) => s.type);
}

// ── sections ──────────────────────────────────────────────────────────────

function reversibilityWord(r?: string): string | null {
  if (!r) return null;
  if (r === "IRREVERSIBLE") return "Cannot be undone";
  if (r === "REVERSIBLE") return "Reversible";
  return r.charAt(0) + r.slice(1).replace(/_/g, " ").toLowerCase();
}

/** The second outcome column, by decision kind: only when the engine returned it. */
function secondMetric(d: Decision): { label: string; get: (o: DecisionOption) => number | null | undefined } | null {
  if (d.options.some((o) => o.futures.probFullRecovery90 != null)) return { label: "Paid in 90d", get: (o) => o.futures.probFullRecovery90 };
  if (d.options.some((o) => o.futures.stockoutProbability != null)) return { label: "Stockout chance", get: (o) => o.futures.stockoutProbability };
  return null;
}

/** Options as one comparison table. Every option, "Do nothing" included,
 *  gets the same row; the recommended one is named, not boxed. */
function OptionsTable({ d, max, recKey, canChoose, choosing, busy, onChoose }: {
  d: Decision; max: number; recKey?: string; canChoose: boolean; choosing: string | null; busy: boolean; onChoose: (key: string) => void;
}) {
  const second = secondMetric(d);
  const h0 = headline(d.options[0], d.kind);
  return (
    <div className={m.table} role="table" aria-label="Options">
      <div className={m.thead} role="row">
        <span role="columnheader">Option</span>
        <span role="columnheader">{h0.label}</span>
        <span role="columnheader" className={m.r}>Expected</span>
        <span role="columnheader" className={m.r} title="Share of simulated futures in which this option is best">Best in</span>
        <span role="columnheader" className={m.r}>{second?.label || ""}</span>
        <span role="columnheader" />
      </div>
      {d.options.map((o) => {
        const h = headline(o, d.kind);
        const rec = recKey === o.key;
        const chosen = d.selectedOption === o.key;
        const extra = [
          !o.isDoNothing ? reversibilityWord(o.reversibility) : null,
          !o.isDoNothing ? o.executableAs : null,
          o.futures.creditLossAvoided && o.futures.creditLossAvoided.mean > 0 ? `Loss avoided on new credit ${amount(o.futures.creditLossAvoided.mean, d.currency)}` : null,
          o.futures.marginLost && o.futures.marginLost.mean > 0 ? `Margin at risk ${amount(o.futures.marginLost.mean, d.currency)}` : null,
          o.futures.robustness != null ? `Within 2% of the best in ${pct(o.futures.robustness)} of futures` : null,
        ].filter(Boolean);
        const sv = second?.get(o);
        return (
          <div key={o.key} className={`${m.trow} ${rec ? m.trowRec : ""} ${o.valid ? "" : m.dim}`} role="row">
            <div className="min-w-0" role="cell">
              <div className={m.optName}>
                {o.label}
                {rec && <span className={`${m.optTag} ${m.optTagOn}`}>Recommended</span>}
                {chosen && <span className={`${m.optTag} ${m.optTagOn}`}>Chosen</span>}
                {o.isDoNothing && <span className={m.optTag}>Baseline</span>}
              </div>
              {o.summary && <div className={m.optSub}>{o.summary}</div>}
              {extra.length > 0 && <div className={m.optMeta}>{extra.join(" · ")}</div>}
              {!o.isDoNothing && o.blastRadius?.summary && <div className={m.optMeta}>Touches {o.blastRadius.summary.charAt(0).toLowerCase() + o.blastRadius.summary.slice(1)}</div>}
              {!o.isDoNothing && o.approval?.reason && <div className={m.optMeta}>{o.approval.reason}</div>}
              {!o.valid && o.invalidReason && <div className={`${m.optMeta} ${m.invalid}`}>Not allowed: {o.invalidReason}</div>}
            </div>
            <div role="cell" style={{ paddingTop: 7 }}><RangeBar interval={h.interval} max={max} currency={d.currency} highlight={rec} compact /></div>
            <div role="cell" className={m.cellNum}><span className={m.cellLabel}>Expected</span>{h.interval ? amount(h.interval.mean, d.currency) : "—"}</div>
            <div role="cell" className={m.cellNum}><span className={m.cellLabel}>Best in</span>{pct(o.futures.bestShare)}</div>
            <div role="cell" className={m.cellNum}>{second && <span className={m.cellLabel}>{second.label}</span>}{second ? (sv != null ? pct(sv) : "—") : ""}</div>
            <div role="cell" className={m.r}>
              {canChoose && o.valid && !chosen && (
                <Button size="sm" variant="ghost" loading={busy && choosing === o.key} disabled={busy} onClick={() => onChoose(o.key)}>Choose</Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StressTable({ d }: { d: Decision }) {
  const stress = (d.analysis?.stress as unknown as { key: string; label: string; changes: string; recommended: string; options: { key: string; value: Interval }[] }[] | null) || null;
  if (!Array.isArray(stress) || !stress.length) return <p className={m.prose} style={{ color: "var(--ink-3)", fontSize: 12.5 }}>No stress cases were run for this decision.</p>;
  const label = (k: string) => d.options.find((o) => o.key === k)?.label || k;
  return (
    <table className={m.mini}>
      <thead>
        <tr>
          <th>If the customer…</th>
          <th>Best choice</th>
          <th style={{ textAlign: "right" }}>Expected</th>
        </tr>
      </thead>
      <tbody>
        {stress.map((s) => {
          const best = s.options.find((o) => o.key === s.recommended);
          const same = s.recommended === d.recommendation?.key;
          return (
            <tr key={s.key}>
              <td title={s.changes}>{s.label}</td>
              <td style={{ color: same ? "var(--ink)" : "var(--warning)" }}>{label(s.recommended)}{same ? "" : " (changes)"}</td>
              <td className={m.num}>{amount(best?.value?.mean, d.currency)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function WhatIf({ d }: { d: Decision }) {
  const [speed, setSpeed] = useState(1);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const sim = useMutation({ mutationFn: () => decisionsApi.simulate(d.id, { paymentSpeed: speed }), onSuccess: setResult });
  if (d.kind !== "RECEIVABLE_RISK") return <p className={m.prose} style={{ color: "var(--ink-3)", fontSize: 12.5 }}>A what-if is available for receivable decisions.</p>;
  const max = Math.max(...d.options.map((o) => o.futures.cash60?.p90 || 0), 1);
  return (
    <div>
      <label htmlFor="speed" style={{ display: "block", fontSize: 12.5, color: "var(--ink-2)" }}>
        Customer pays at <span className="num" style={{ color: "var(--ink)" }}>{speed.toFixed(2)}×</span> their usual speed
      </label>
      <div className="flex flex-wrap items-center" style={{ gap: 12, marginTop: 8 }}>
        <input id="speed" type="range" min={0.5} max={1.5} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="flex-1" style={{ minWidth: 140, maxWidth: 240, accentColor: "var(--ink)" }} />
        <Button size="sm" variant="secondary" loading={sim.isPending} onClick={() => sim.mutate()}>Simulate</Button>
      </div>
      {sim.isError && <div style={{ marginTop: 12 }}><RetryLine error={errorText(sim.error).title} onRetry={() => sim.mutate()} /></div>}
      {result && (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: result.recommendation.changed ? "var(--warning)" : "var(--body)" }}>
            {result.recommendation.changed ? `At this speed the best choice becomes ${result.recommendation.label}.` : `The recommendation holds: ${result.recommendation.label}.`}{" "}
            <span style={{ color: "var(--ink-3)" }}>Not saved.</span>
          </p>
          <div style={{ marginTop: 10 }}>
            {result.options.map((o) => (
              <div key={o.key} className="grid items-center" style={{ gridTemplateColumns: "120px minmax(0,1fr)", gap: 12, padding: "6px 0" }}>
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{o.label}</span>
                <RangeBar interval={o.futures.cash60 || null} max={max} currency={d.currency} highlight={o.key === result.recommendation.key} compact />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const OUTCOME_WORDS: Record<string, string> = {
  MET: "worked", NOT_MET: "did not work", ON_TRACK: "on track", OFF_TRACK: "off track", ABORTED: "stopped (dispute)",
  UNKNOWN: "outcome unknown", ACTIVE: "still being checked", DRAFT: "not started", NO_ACTION_RECORDED: "no action recorded",
};

// Similar-decision memory: earlier decisions like this one and how they ended.
function SimilarDecisions({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["decision-similar", id], queryFn: () => decisionsApi.similar(id) });
  if (q.isLoading) return null;
  return (
    <section aria-labelledby="sec-similar">
      <SectionLabel id="sec-similar">Similar decisions before</SectionLabel>
      {q.error ? (
        <RetryLine error="Couldn't load earlier decisions just now." onRetry={() => q.refetch()} />
      ) : !q.data?.similar.length ? (
        <p className={m.prose} style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{q.data?.note || "No earlier decision is close enough to compare."}</p>
      ) : (
        <ul className={m.rows}>
          {q.data.similar.map((s) => (
            <li key={s.id}>
              <div className="flex items-baseline justify-between flex-wrap" style={{ gap: 12 }}>
                <Link href={`/decisions/${s.id}`} className="hover-dim" style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{cleanTitle(s.title)}</Link>
                <span className="num" style={{ fontSize: 11.5, color: "var(--ink-3)" }} title="How alike the two decisions are">{Math.round(s.similarity * 100)}% alike</span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--body)" }}>
                {s.chosen ? `Chose “${s.chosen}”` : "Nothing chosen"} · {OUTCOME_WORDS[s.outcome.status] || s.outcome.status.replace(/_/g, " ").toLowerCase()}
                {s.decidedAt ? ` · ${formatDate(s.decidedAt)}` : ""}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--ink-3)" }}>
                {[s.why.sameCustomer ? "Same customer" : null, s.why.sharedSigns.length ? `${s.why.sharedSigns.length} shared warning sign${s.why.sharedSigns.length === 1 ? "" : "s"}` : null, s.why.sizeSimilarity >= 0.5 ? "similar size" : null].filter(Boolean).join(", ") || "Same kind of decision"}
                {s.outcome.detail ? `. ${s.outcome.detail}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Verification({ detail, onVerify, busy }: { detail: DecisionDetail; onVerify: () => void; busy: boolean }) {
  const c = detail.contract;
  if (!c || !c.activated_at) return null;
  const v = c.verification;
  const cur = detail.decision.currency;
  return (
    <section aria-labelledby="sec-verify">
      <div className="flex items-baseline justify-between" style={{ gap: 12 }}>
        <SectionLabel id="sec-verify">What actually happened</SectionLabel>
        <Button size="xs" variant="ghost" loading={busy} onClick={onVerify}>Check now</Button>
      </div>
      <div className="flex flex-wrap items-center" style={{ gap: "4px 12px", fontSize: 12, color: "var(--ink-3)" }}>
        <Pill tone={c.status === "MET" || c.status === "ON_TRACK" ? "good" : c.status === "NOT_MET" || c.status === "OFF_TRACK" || c.status === "ABORTED" ? "bad" : "neutral"}>
          {c.status.charAt(0) + c.status.slice(1).replace(/_/g, " ").toLowerCase()}
        </Pill>
        <span>{c.mode === "SHADOW" ? "Shadow contract" : "Live contract"} · started {formatDate(c.activated_at)}{v ? ` · checked ${relTime(v.checkedAt)}` : ""}</span>
      </div>
      <p className={m.prose} style={{ marginTop: 8 }}>{v?.reason || "Not checked yet. The first comparison with the forecast happens when its horizon has passed."}</p>
      {v && (
        <>
          <div className="overflow-x-auto" style={{ marginTop: 12 }}>
            <table className={m.mini}>
              <thead>
                <tr>
                  <th>Forecast</th>
                  <th style={{ textAlign: "right" }}>Expected (80% range)</th>
                  <th style={{ textAlign: "right" }}>Actual</th>
                  <th style={{ textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {v.predictions.map((p, i) => (
                  <tr key={i}>
                    <td>{p.target.split(":")[1] === "do_nothing" ? "If nothing was done" : "Chosen option"}, {p.horizonDays} days</td>
                    <td className={m.num}>{amount(p.expected, cur)}{p.range ? ` (${amount(p.range[0], cur)}–${amount(p.range[1], cur)})` : ""}</td>
                    <td className={m.num}>{p.actual == null ? "—" : amount(p.actual, cur)}</td>
                    <td style={{ textAlign: "right", color: p.insideRange === false ? "var(--critical)" : "var(--ink-3)" }}>
                      {p.status === "RESOLVED" ? (p.insideRange ? "Inside range" : p.insideRange === false ? "Outside range" : "Scored") : p.status === "COUNTERFACTUAL" ? "Can't be observed" : "Waiting"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={m.tfoot}>{v.attributionNote}</p>
        </>
      )}
      {c.regret && <p className={m.tfoot}>Regret at decision time: {amount(c.regret.exAnte, cur)} (best then: {detail.decision.options.find((o) => o.key === c.regret?.bestAtDecisionTime)?.label || c.regret.bestAtDecisionTime}).</p>}
    </section>
  );
}

function BackLink() {
  return (
    <Link href="/decisions" className="inline-flex items-center hover-dim" style={{ gap: 4, fontSize: 12.5, color: "var(--ink-2)", alignSelf: "flex-start" }}>
      <span aria-hidden="true" style={{ display: "inline-flex", transform: "rotate(90deg)" }}><IconChevronDown size={13} /></span> Decisions
    </Link>
  );
}

function Fact({ label, value, kind = "num", tone, title }: { label: string; value: React.ReactNode; kind?: "num" | "word" | "none"; tone?: string; title?: string }) {
  return (
    <div className={m.fact} title={title}>
      <div className={kind === "num" ? m.factValue : kind === "word" ? m.factWord : m.factNone} style={tone ? { color: tone } : undefined}>{value}</div>
      <div className={m.factLabel}>{label}</div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────

export default function DecisionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["decision", id], queryFn: () => decisionsApi.get(id), enabled: !!id, retry: (n, err) => !(err instanceof DecisionApiError && err.status === 404) && n < 2 });
  const [note, setNote] = useState("");
  const [obs, setObs] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [actionError, setActionError] = useState<{ title: string; detail?: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["decision", id] });
    qc.invalidateQueries({ queryKey: ["decisions"] });
    qc.invalidateQueries({ queryKey: ["decisions-today"] });
  };
  const act = <T, V = void>(fn: (v: V) => Promise<T>, ok?: (r: T) => string | null) => ({
    mutationFn: fn,
    onMutate: () => { setActionError(null); setFlash(null); },
    onSuccess: (r: T) => { const m = ok?.(r); if (m) setFlash(m); refresh(); },
    onError: (e: unknown) => { setActionError(errorText(e)); refresh(); },
  });

  const [choosing, setChoosing] = useState<string | null>(null);
  const select = useMutation(act((key: string) => decisionsApi.select(id, key, note || undefined), () => "Choice recorded with its expected outcomes. Approve it to run."));
  const approve = useMutation(act(() => decisionsApi.approve(id), () => "Approved."));
  const execute = useMutation(act((live: boolean) => decisionsApi.execute(id, live), (r) => (r.mode === "SHADOW" ? "Recorded in shadow mode. Nothing was changed outside Starlane." : "Done. Each step was checked in the system it changed.")));
  const reject = useMutation(act(() => decisionsApi.reject(id, note || undefined), () => "Rejected."));
  // "Handle it": the server selects the recommended option, records your
  // approval and runs it in your account's pilot mode, with every policy
  // and precondition check a step-by-step run would have.
  const handle = useMutation(act(() => decisionsApi.handle(id, { approve: true, optionKey: detail?.decision.recommendation?.key, note: note || undefined }), (r) => {
    const ran = r.steps.find((s) => s.step === "EXECUTED");
    if (!ran) return r.next || "Mission started.";
    return ran.mode === "SHADOW" ? "Mission started in shadow mode. Nothing was changed outside Starlane. Track it in Missions." : "Mission started. Track it in Missions.";
  }));
  const requestInfo = useMutation(act((key: string | undefined) => decisionsApi.requestInformation(id, key), (r) => `Task created: ${r.request.label}`));
  const observe = useMutation(act(() => decisionsApi.observe(id, obs, "MEDIUM"), () => { setObs(""); return "Added to the evidence as your observation."; }));
  const verify = useMutation(act(() => decisionsApi.verify(id)));

  const detail = q.data;
  const d = detail?.decision;
  const max = useMemo(() => {
    if (!d) return 1;
    return Math.max(1, ...d.options.map((o) => headline(o, d.kind).interval?.p90 || 0));
  }, [d]);

  if (q.isLoading) return <DashboardLayout pageTitle="Decision"><PageBody><BackLink /><Skeleton rows={4} /></PageBody></DashboardLayout>;
  if (q.isError || !detail || !d) {
    const notFound = q.error instanceof DecisionApiError && q.error.status === 404;
    return (
      <DashboardLayout pageTitle="Decision">
        <PageBody>
          <BackLink />
          <ErrorState title={notFound ? "Decision not found" : "Couldn't load this decision"} message={notFound ? "It may belong to another account or have been removed." : humaneError(q.error)} onRetry={notFound ? undefined : () => q.refetch()} />
        </PageBody>
      </DashboardLayout>
    );
  }

  const rec = d.recommendation;
  const recOption = rec ? d.options.find((o) => o.key === rec.key) : undefined;
  const chosen = d.options.find((o) => o.key === d.selectedOption) || null;
  const canChoose = ["OPEN", "NEEDS_INFORMATION", "SELECTED"].includes(d.status);
  const days = daysUntil(d.deadline || d.window?.latestSafeAt || null);
  const cod = (d.window?.costOfDelayPerWeek as unknown as { valueLost?: number } | null) || null;
  const steps = stepsOf(chosen);
  const allInternal = steps.every((s) => s !== "CONTACT_CUSTOMER");
  const flips = (d.analysis?.sensitivity?.results || []).filter((r) => r.flips);
  const stake = d.materiality?.expectedUncollected90 ?? d.materiality?.workingCapitalTiedUp ?? d.materiality?.revenueExposure ?? null;

  const statusTone = d.status === "NEEDS_INFORMATION" ? "warn" : ["REJECTED", "EXPIRED", "SUPERSEDED", "RESOLVED", "OPEN"].includes(d.status) ? "neutral" : "good";
  const recH = recOption ? headline(recOption, d.kind) : null;
  const canHandle = !!rec && canChoose && !rec.informationFirst && !!recOption && recOption.valid !== false;
  const showNext = !canChoose || d.status === "SELECTED";

  return (
    <DashboardLayout pageTitle="Decision">
      <article className={`${m.memo} page-in`}>
        <BackLink />

        {/* Metadata → title → why now */}
        <div className={m.metaRow}>
          <Pill tone={statusTone}>{STATUS_LABEL[d.status] || d.status}</Pill>
          <span title={formatDateTime(d.updatedAt)}>Analysed {relTime(d.updatedAt)} from data as of {formatDate(d.asOf)}</span>
          {detail.pilotMode === "SHADOW" && <span title="Nothing is executed; Starlane records what it would have done">Shadow mode</span>}
        </div>
        <h1 className={m.title}>{cleanTitle(d.title)}</h1>
        {d.description && <p className={m.lede}>{d.description}</p>}

        <div className={m.facts}>
          <Fact label="At stake if ignored" value={stake != null ? amount(stake, d.currency) : "Not estimated"} kind={stake != null ? "num" : "none"} />
          <Fact
            label={days != null ? (days <= 0 ? "Decide now" : `Decide by · ${days} day${days === 1 ? "" : "s"} left`) : "Decide by"}
            value={days != null ? formatDate(d.deadline || d.window?.latestSafeAt) : "No deadline"}
            kind={days != null ? "num" : "none"}
            tone={days != null && days <= 2 ? "var(--critical)" : undefined}
          />
          <Fact label="Cost of waiting a week" value={cod?.valueLost != null ? amount(cod.valueLost, d.currency) : "Not estimated"} kind={cod?.valueLost != null ? "num" : "none"} />
          <Fact
            label="Confidence"
            value={d.confidence?.band ? BAND_LABEL[d.confidence.band] || d.confidence.band : "Not assessed"}
            kind={d.confidence?.band ? "word" : "none"}
            title={d.confidence?.score != null ? `Confidence score ${Math.round(d.confidence.score * 100)} of 100` : undefined}
          />
        </div>
        {d.window?.basis && <p className={m.note}>{d.window.basis}</p>}

        {/* Messages */}
        {(flash || actionError || d.contradictions.length > 0 || (d.collisions && d.collisions.length > 0)) && (
          <div className="flex flex-col" style={{ gap: 12, marginTop: 24 }} aria-live="polite">
            {flash && <Notice tone="good" title={flash} />}
            {actionError && <Notice tone="bad" title={actionError.title}>{actionError.detail}</Notice>}
            {d.contradictions.length > 0 && (
              <Notice tone="warn" title={`${d.contradictions.length} thing${d.contradictions.length === 1 ? "" : "s"} in your data disagree`}>
                {d.contradictions.slice(0, 3).map((c, i) => <p key={i} style={{ margin: 0 }}>{c.detail || c.label || c.type}{c.toResolve ? ` To resolve: ${c.toResolve}` : ""}</p>)}
              </Notice>
            )}
            {d.collisions && d.collisions.length > 0 && (
              <Notice title="Linked decisions">
                {d.collisions.map((c, i) => <p key={i} style={{ margin: 0 }}><Link className="underline" style={{ textUnderlineOffset: 3 }} href={`/decisions/${c.with}`}>{c.withTitle}</Link>: {c.detail}</p>)}
              </Notice>
            )}
          </div>
        )}

        {/* Recommendation */}
        {rec && (
          <section aria-labelledby="sec-rec">
            <div className={m.rec}>
              <SectionLabel id="sec-rec">{rec.informationFirst ? "Find out first" : "Recommendation"}</SectionLabel>
              <p className={m.recLabel}>{rec.label}</p>
              {rec.why && <p className={m.recWhy}>{rec.why}</p>}
              <div className={m.recFacts}>
                {d.confidence?.band && <span>Confidence <b>{BAND_LABEL[d.confidence.band] || d.confidence.band}</b></span>}
                {recOption?.futures.bestShare != null && <span>Best in <b className="num">{pct(recOption.futures.bestShare)}</b> of futures</span>}
                {recH?.interval && <span>{recH.label} <b className="num">{amount(recH.interval.mean, d.currency)}</b> expected</span>}
                {recOption && !recOption.isDoNothing && recOption.reversibility && <span>{reversibilityWord(recOption.reversibility)}</span>}
              </div>
              <p className={m.actionNote} style={{ marginTop: 8 }}>
                {flips.length > 0
                  ? <>Would change if {flips.map((f) => `${f.label.charAt(0).toLowerCase() + f.label.slice(1)} (${f.switches.map((sw) => `${d.options.find((o) => o.key === sw.to)?.label || sw.to} wins between ${sw.between[0]} and ${sw.between[1]}`).join("; ")})`).join("; ")}.</>
                  : "No single assumption, moved across its full range, changes this recommendation."}
              </p>
              {rec.whyNot && rec.whyNot.length > 0 && (
                <details className={m.fold} style={{ marginTop: 8 }}>
                  <summary>Why not the others</summary>
                  <ul className={m.list} style={{ marginTop: 6 }}>
                    {rec.whyNot.map((w) => (
                      <li key={w.key} style={{ fontSize: 12.5 }}>
                        <span style={{ color: "var(--ink)" }}>{d.options.find((o) => o.key === w.key)?.label || w.key}:</span> {w.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className={m.actions}>
                {canHandle && (
                  <Button variant={d.status === "SELECTED" ? "secondary" : "primary"} loading={handle.isPending} onClick={() => handle.mutate()}>Handle it</Button>
                )}
                {d.kind === "RECEIVABLE_RISK" && <a href="#sec-sim" className="ui-btn ui-btn-secondary">Simulate</a>}
                {d.evidence.length > 0 && <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setShowEvidence(true)}>View evidence <span className="num" style={{ color: "var(--ink-3)", fontSize: 12 }}>{d.evidence.length}</span></button>}
              </div>
              {canHandle && recOption && (
                <p className={m.actionNote}>
                  Handle it approves this option and starts a mission.{" "}
                  {recOption.isDoNothing
                    ? "Nothing is changed; Starlane checks what happens."
                    : detail.pilotMode === "SHADOW"
                      ? "Your account is in shadow mode: Starlane records what it would do and changes nothing outside Starlane."
                      : "Your account is live: approved internal steps are carried out and checked; customer messages stay drafts for you to send."}
                  {" "}Rejecting leaves the decision open. <Link href="/missions" className="hover-dim" style={{ color: "var(--ink-2)", textDecoration: "underline", textUnderlineOffset: 3 }}>Missions</Link>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Next step, once a choice exists */}
        {showNext && (
          <section aria-labelledby="sec-next">
            <SectionLabel id="sec-next">Next step</SectionLabel>
            {d.status === "SELECTED" && chosen && (
              <>
                <p className={m.prose}>
                  You chose <span style={{ color: "var(--ink)", fontWeight: 500 }}>{chosen.label}</span>.{" "}
                  {chosen.isDoNothing ? "Nothing will be changed; Starlane will still check what happens." : `Approving allows: ${steps.map((st) => INTENT_WORDS[st] || st).join(", then ")}.`}
                </p>
                <div className={m.actions} style={{ marginTop: 12 }}>
                  {chosen.isDoNothing ? (
                    <Button loading={execute.isPending} onClick={() => execute.mutate(false)}>Start watching the outcome</Button>
                  ) : (
                    <Button loading={approve.isPending} onClick={() => approve.mutate()}>Approve</Button>
                  )}
                  <Button variant="ghost" loading={reject.isPending} icon={<IconX size={13} />} onClick={() => reject.mutate()}>Reject</Button>
                </div>
              </>
            )}
            {d.status === "APPROVED" && chosen && (
              <>
                <p className={m.prose}>
                  Approved: {steps.map((st) => INTENT_WORDS[st] || st).join(", then ")}.{" "}
                  {detail.pilotMode === "SHADOW"
                    ? "Your account is in shadow mode, so running it records exactly what would happen without changing anything."
                    : "Your account is live: approved internal steps will be carried out and checked."}
                  {!detail.externalSendEnabled && steps.includes("CONTACT_CUSTOMER") ? " Customer messages are prepared as drafts for you to send; nothing is sent automatically." : ""}
                </p>
                <div className={m.actions} style={{ marginTop: 12 }}>
                  <Button loading={execute.isPending && execute.variables === false} onClick={() => execute.mutate(false)}>
                    {detail.pilotMode === "SHADOW" ? "Run in shadow mode" : "Run"}
                  </Button>
                  {detail.pilotMode === "SHADOW" && allInternal && (
                    <Button variant="secondary" loading={execute.isPending && execute.variables === true} onClick={() => execute.mutate(true)}>
                      Do it for real (internal only)
                    </Button>
                  )}
                  <Button variant="ghost" loading={reject.isPending} onClick={() => reject.mutate()}>Cancel</Button>
                </div>
              </>
            )}
            {["SHADOWED", "EXECUTED", "VERIFIED", "EXECUTING"].includes(d.status) && detail.runs.length > 0 && (
              <ul className={m.rows}>
                {detail.runs.map((r) => (
                  <li key={r.id}>
                    <div className="flex flex-wrap items-center" style={{ gap: "4px 12px", fontSize: 13 }}>
                      <span style={{ color: "var(--ink)" }}>{INTENT_WORDS[r.intent_type] || r.intent_type}</span>
                      <Pill tone={r.status === "SUCCEEDED" || r.status === "PREPARED" ? "good" : r.status === "FAILED" || r.status === "BLOCKED" ? "bad" : "neutral"}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</Pill>
                      <span className="num" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>via {r.adapter}</span>
                    </div>
                    {r.status === "SHADOWED" && r.would_have && <p className={m.tfoot} style={{ marginTop: 2 }}>Would have written: {String((r.would_have as { write?: string }).write || "")}</p>}
                    {r.postcondition?.note && <p className={m.tfoot} style={{ marginTop: 2 }}>{r.postcondition.note}</p>}
                    {r.error && <p className={m.tfoot} style={{ marginTop: 2, color: "var(--critical)" }}>This step didn&apos;t complete. Nothing was left half-done.</p>}
                  </li>
                ))}
              </ul>
            )}
            {steps.includes("CONTACT_CUSTOMER") && d.status === "EXECUTED" && (
              <p className={m.tfoot}>The reminder is waiting in <Link className="underline" style={{ textUnderlineOffset: 3 }} href="/control/approvals">Control › Approvals</Link>.</p>
            )}
            {["REJECTED", "RESOLVED", "EXPIRED", "SUPERSEDED"].includes(d.status) && (
              <p className={m.prose}>{d.resolutionReason || STATUS_LABEL[d.status]}</p>
            )}
          </section>
        )}

        {/* Why now / if you do nothing */}
        <section className={m.two}>
          <div>
            <SectionLabel>Why now</SectionLabel>
            <ul className={m.list}>
              {(d.triggers || []).map((t) => <li key={t.code}>{t.label}</li>)}
            </ul>
          </div>
          <div>
            <SectionLabel>If you do nothing</SectionLabel>
            <p className={m.prose}>{d.whatIfIgnored}</p>
          </div>
        </section>

        {/* Options */}
        <section aria-labelledby="sec-options">
          <div className="flex items-end justify-between flex-wrap" style={{ gap: 12 }}>
            <SectionLabel id="sec-options">Options</SectionLabel>
          </div>
          <OptionsTable
            d={d}
            max={max}
            recKey={rec?.key}
            canChoose={canChoose}
            choosing={choosing}
            busy={select.isPending}
            onChoose={(key) => { setChoosing(key); select.mutate(key); }}
          />
          <p className={m.tfoot}>Ranges show the middle 80% of simulated futures from this customer&apos;s own payment history; the mark is the expected value.</p>
          {canChoose && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for the record (optional): why you chose this"
              aria-label="Note for the record"
              className="ui-input"
              style={{ maxWidth: 420, marginTop: 12, fontSize: 12.5 }}
              maxLength={1000}
            />
          )}
        </section>

        {/* Evidence */}
        <section aria-labelledby="sec-evidence">
          <div className="flex items-baseline justify-between" style={{ gap: 12 }}>
            <SectionLabel id="sec-evidence">Evidence</SectionLabel>
            {d.evidence.length > 0 && <button type="button" className={m.textLink} onClick={() => setShowEvidence(true)}>View all {d.evidence.length} with sources</button>}
          </div>
          {d.evidence.length === 0 ? (
            <p className={m.prose} style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No evidence was recorded for this decision.</p>
          ) : (
            <table className={m.mini}>
              <tbody>
                {d.evidence.slice(0, 5).map((e, i) => (
                  <tr key={i}>
                    <td className={m.evKind}>{EVIDENCE_LABEL[e.kind] || e.kind}</td>
                    <td><span style={{ color: "var(--ink)" }}>{e.label}</span><span style={{ color: "var(--ink-2)" }}> · {prettyDates(e.detail)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {d.evidence.length > 5 && <p className={m.tfoot}>{d.evidence.length - 5} more in the evidence drawer.</p>}
        </section>

        {/* Unknowns */}
        {d.unknowns.length > 0 && (
          <section aria-labelledby="sec-unknowns">
            <SectionLabel id="sec-unknowns">What Starlane doesn&apos;t know</SectionLabel>
            <ul className={m.rows}>
              {d.unknowns.map((u) => (
                <li key={u.key} className="flex flex-wrap items-start" style={{ gap: 12 }}>
                  <div className="min-w-0 flex-1">
                    <p style={{ margin: 0, fontSize: 13, color: "var(--ink)" }}>{u.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, lineHeight: 1.5, color: "var(--ink-3)" }}>
                      {u.changesRecommendation
                        ? `Worth about ${amount(u.valueOfInformation ?? null, d.currency)} to know; it might change the choice.`
                        : u.valueOfInformation != null ? "Knowing this would not change the recommendation." : "Its effect can't be estimated yet."}
                      {u.acquisition?.how ? ` ${u.acquisition.how}.` : ""}
                    </p>
                  </div>
                  {canChoose && (u.changesRecommendation || u.valueOfInformation == null) && (
                    <Button size="xs" variant="secondary" loading={requestInfo.isPending && requestInfo.variables === u.key} onClick={() => requestInfo.mutate(u.key)}>
                      Ask for it
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {d.informationRequests && d.informationRequests.length > 0 && (
              <p className={m.tfoot}>Requested: {d.informationRequests.map((r) => r.label).join("; ")} (see Tasks).</p>
            )}
          </section>
        )}

        {/* Simulation */}
        <section aria-labelledby="sec-sim-label" id="sec-sim" style={{ scrollMarginTop: 64 }}>
          <SectionLabel id="sec-sim-label">Simulation</SectionLabel>
          <div className={m.two}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "var(--ink-2)" }}>Under pressure</p>
              <StressTable d={d} />
            </div>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "var(--ink-2)" }}>Try a what-if</p>
              <WhatIf d={d} />
            </div>
          </div>
        </section>

        <Verification detail={detail} onVerify={() => verify.mutate()} busy={verify.isPending} />

        <SimilarDecisions id={d.id} />

        {/* Observations */}
        <section aria-labelledby="sec-obs">
          <SectionLabel id="sec-obs">Your observations</SectionLabel>
          {detail.observations.length > 0 && (
            <ul className={m.rows} style={{ marginBottom: 10 }}>
              {detail.observations.map((o) => (
                <li key={o.id} style={{ fontSize: 13, color: "var(--body)" }}>{o.text} <span style={{ fontSize: 11.5, color: "var(--ink-3)" }} title={formatDateTime(o.at)}>· {relTime(o.at)}</span></li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <input
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Something Starlane can't see, e.g. “They said payment is coming after Diwali”"
              aria-label="Your observation"
              className="ui-input flex-1 min-w-[220px]"
              style={{ width: "auto", fontSize: 12.5 }}
              maxLength={2000}
            />
            <Button variant="secondary" disabled={!obs.trim()} loading={observe.isPending} onClick={() => observe.mutate()}>Add observation</Button>
          </div>
          <p className={m.tfoot}>Recorded as evidence with your name. It never changes the numbers or permissions on its own.</p>
        </section>

        <FeedbackBar decisionId={d.id} />

        {/* History */}
        <section style={{ marginBottom: 24 }}>
          <details className={m.fold}>
            <summary>History · {detail.events.length} event{detail.events.length === 1 ? "" : "s"}</summary>
            <table className={m.mini} style={{ marginTop: 8 }}>
              <tbody>
                {detail.events.map((e) => (
                  <tr key={e.id}>
                    <td className="num" style={{ width: 150, color: "var(--ink-3)", fontSize: 11.5, whiteSpace: "nowrap" }}>{formatDateTime(e.at)}</td>
                    <td>{e.type.charAt(0) + e.type.slice(1).replace(/_/g, " ").toLowerCase()}</td>
                    <td style={{ textAlign: "right", color: "var(--ink-3)" }}>{e.actor.type === "agent" ? `Starlane (${e.actor.agentVersion || e.actor.id})` : "You"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>
      </article>
      {showEvidence && <DecisionEvidenceDrawer d={d} onClose={() => setShowEvidence(false)} />}
    </DashboardLayout>
  );
}
