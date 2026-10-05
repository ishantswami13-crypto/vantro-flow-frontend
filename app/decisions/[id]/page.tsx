"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiArrowLeft, FiCheck, FiX } from "react-icons/fi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import FeedbackBar from "@/components/decisions/FeedbackBar";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { C, ConfidencePill, Notice, Pill, RangeBar, SectionLabel, Skeleton } from "@/components/decisions/ui";
import {
  decisionsApi, money, pct, shortDate, relTime, daysUntil, STATUS_LABEL, EVIDENCE_LABEL,
  DecisionApiError, type Decision, type DecisionDetail, type DecisionOption, type Interval, type SimulateResponse,
} from "@/lib/decisions";

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
    if (err.status === 502) return { title: `Action failed: ${err.message}`, detail: b.compensated?.length ? `Undone: ${b.compensated.map((c) => c.intent.replace(/_/g, " ").toLowerCase()).join(", ")}. Nothing is left half-done.` : undefined };
    return { title: err.message };
  }
  return { title: err instanceof Error ? err.message : "Something went wrong" };
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

function OptionCard({ o, d, max, recommended, selected, canChoose, onChoose, busy }: {
  o: DecisionOption; d: Decision; max: number; recommended: boolean; selected: boolean; canChoose: boolean; onChoose: () => void; busy: boolean;
}) {
  const h = headline(o, d.kind);
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#FFFFFF", border: `1px solid ${selected ? C.accent : recommended ? "#CFD0E8" : C.line}`, boxShadow: recommended ? "0 1px 0 rgba(92,95,158,0.06)" : undefined, opacity: o.valid ? 1 : 0.7 }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>{o.label}</p>
            {recommended && <Pill tone="accent">Recommended</Pill>}
            {o.isDoNothing && <Pill>Baseline</Pill>}
            {selected && <Pill tone="good"><FiCheck size={11} /> Chosen</Pill>}
            {!o.valid && <Pill tone="bad">Not allowed</Pill>}
          </div>
          {o.summary && <p className="text-[13px] mt-1 max-w-[620px]" style={{ color: C.muted }}>{o.summary}</p>}
        </div>
        {canChoose && o.valid && (
          <Button size="sm" variant={recommended ? "primary" : "secondary"} loading={busy} onClick={onChoose}>
            Choose
          </Button>
        )}
      </div>

      {!o.valid && o.invalidReason && <p className="text-[12px] mt-3" style={{ color: C.bad }}>{o.invalidReason}</p>}

      <div className="mt-4">
        <p className="text-[12px] mb-2" style={{ color: C.faint }}>{h.label} · 80% range</p>
        <RangeBar interval={h.interval} max={max} currency={d.currency} highlight={recommended} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-[12px]">
        <div>
          <p style={{ color: C.faint }}>Best in</p>
          <p className="tabular-nums" style={{ color: C.ink }}>{pct(o.futures.bestShare)} of futures</p>
        </div>
        {o.futures.probFullRecovery90 != null && (
          <div>
            <p style={{ color: C.faint }}>Fully paid in 90 days</p>
            <p className="tabular-nums" style={{ color: C.ink }}>{pct(o.futures.probFullRecovery90)}</p>
          </div>
        )}
        {o.futures.stockoutProbability != null && (
          <div>
            <p style={{ color: C.faint }}>Stockout chance</p>
            <p className="tabular-nums" style={{ color: C.ink }}>{pct(o.futures.stockoutProbability)}</p>
          </div>
        )}
        {o.futures.creditLossAvoided && o.futures.creditLossAvoided.mean > 0 && (
          <div>
            <p style={{ color: C.faint }}>Loss avoided on new credit</p>
            <p className="tabular-nums" style={{ color: C.ink }}>{money(o.futures.creditLossAvoided.mean, d.currency)}</p>
          </div>
        )}
        {o.futures.marginLost && o.futures.marginLost.mean > 0 && (
          <div>
            <p style={{ color: C.faint }}>Margin at risk</p>
            <p className="tabular-nums" style={{ color: C.ink }}>{money(o.futures.marginLost.mean, d.currency)}</p>
          </div>
        )}
        {o.futures.robustness != null && (
          <div>
            <p style={{ color: C.faint }}>Within 2% of the best</p>
            <p className="tabular-nums" style={{ color: C.ink }}>{pct(o.futures.robustness)} of futures</p>
          </div>
        )}
      </div>

      {!o.isDoNothing && (
        <div className="flex flex-wrap gap-2 mt-4">
          {o.reversibility && <Pill tone={o.reversibility === "IRREVERSIBLE" ? "warn" : "neutral"}>{o.reversibility === "IRREVERSIBLE" ? "Cannot be undone" : o.reversibility === "REVERSIBLE" ? "Reversible" : o.reversibility.replace(/_/g, " ").toLowerCase()}</Pill>}
          {o.executableAs && <Pill>{o.executableAs}</Pill>}
        </div>
      )}
      {!o.isDoNothing && o.blastRadius?.summary && <p className="text-[12px] mt-2" style={{ color: C.muted }}>Touches: {o.blastRadius.summary}</p>}
      {!o.isDoNothing && o.approval?.reason && <p className="text-[12px] mt-1" style={{ color: C.faint }}>{o.approval.reason}</p>}
    </div>
  );
}

function StressTable({ d }: { d: Decision }) {
  const stress = (d.analysis?.stress as unknown as { key: string; label: string; changes: string; recommended: string; options: { key: string; value: Interval }[] }[] | null) || null;
  if (!Array.isArray(stress) || !stress.length) return null;
  const label = (k: string) => d.options.find((o) => o.key === k)?.label || k;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ color: C.faint }}>
            <th className="text-left font-normal py-2 pr-4">If the customer…</th>
            <th className="text-left font-normal py-2 pr-4">Best choice</th>
            <th className="text-right font-normal py-2">Its expected value</th>
          </tr>
        </thead>
        <tbody>
          {stress.map((s) => {
            const best = s.options.find((o) => o.key === s.recommended);
            const same = s.recommended === d.recommendation?.key;
            return (
              <tr key={s.key} style={{ borderTop: `1px solid ${C.line}` }}>
                <td className="py-2.5 pr-4" style={{ color: C.body }} title={s.changes}>{s.label}</td>
                <td className="py-2.5 pr-4" style={{ color: same ? C.ink : C.warn, fontWeight: same ? 400 : 500 }}>{label(s.recommended)}</td>
                <td className="py-2.5 text-right tabular-nums" style={{ color: C.ink }}>{money(best?.value?.mean, d.currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WhatIf({ d }: { d: Decision }) {
  const [speed, setSpeed] = useState(1);
  const [result, setResult] = useState<SimulateResponse | null>(null);
  const sim = useMutation({ mutationFn: () => decisionsApi.simulate(d.id, { paymentSpeed: speed }), onSuccess: setResult });
  if (d.kind !== "RECEIVABLE_RISK") return null;
  const max = Math.max(...d.options.map((o) => o.futures.cash60?.p90 || 0), 1);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-[13px]" style={{ color: C.body }} htmlFor="speed">
          Customer pays at <span className="tabular-nums" style={{ fontWeight: 500 }}>{speed.toFixed(2)}×</span> their usual speed
        </label>
        <input id="speed" type="range" min={0.5} max={1.5} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-48" />
        <Button size="sm" variant="secondary" loading={sim.isPending} onClick={() => sim.mutate()}>Simulate</Button>
      </div>
      {sim.isError && <p className="text-[12px] mt-2" style={{ color: C.bad }}>{errorText(sim.error).title}</p>}
      {result && (
        <div className="mt-4 space-y-3">
          <p className="text-[13px]" style={{ color: result.recommendation.changed ? C.warn : C.body }}>
            {result.recommendation.changed
              ? `At this speed the best choice becomes: ${result.recommendation.label}.`
              : `The recommendation holds: ${result.recommendation.label}.`}{" "}
            <span style={{ color: C.faint }}>Not saved; the decision itself is unchanged.</span>
          </p>
          {result.options.map((o) => (
            <div key={o.key} className="grid sm:grid-cols-[220px_1fr] gap-2 items-center">
              <p className="text-[12px]" style={{ color: C.body }}>{o.label}</p>
              <RangeBar interval={o.futures.cash60 || null} max={max} currency={d.currency} highlight={o.key === result.recommendation.key} />
            </div>
          ))}
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
    <section className="mt-10">
      <SectionLabel>Similar decisions before</SectionLabel>
      {q.error ? (
        <p className="text-[13px]" style={{ color: C.muted }}>Could not load earlier decisions just now.</p>
      ) : !q.data?.similar.length ? (
        <p className="text-[13px]" style={{ color: C.muted }}>{q.data?.note || "No earlier decision is close enough to compare."}</p>
      ) : (
        <ul>
          {q.data.similar.map((s) => (
            <li key={s.id} className="py-3" style={{ borderTop: `1px solid ${C.line}` }}>
              <Link href={`/decisions/${s.id}`} className="text-[13.5px] hover-dim" style={{ color: C.ink, fontWeight: 500 }}>{s.title}</Link>
              <p className="text-[12.5px] mt-0.5" style={{ color: C.body }}>
                {s.chosen ? `Chose "${s.chosen}"` : "Nothing chosen"} · {OUTCOME_WORDS[s.outcome.status] || s.outcome.status.replace(/_/g, " ").toLowerCase()}
                {s.decidedAt ? ` · ${shortDate(s.decidedAt)}` : ""}
              </p>
              <p className="text-[11.5px] mt-0.5" style={{ color: C.faint }}>
                {Math.round(s.similarity * 100)}% alike: {[s.why.sameCustomer ? "same customer" : null, s.why.sharedSigns.length ? `${s.why.sharedSigns.length} shared warning sign${s.why.sharedSigns.length === 1 ? "" : "s"}` : null, s.why.sizeSimilarity >= 0.5 ? "similar size" : null].filter(Boolean).join(", ") || "same kind of decision"}
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
  return (
    <section className="mt-10">
      <SectionLabel>What actually happened</SectionLabel>
      <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: `1px solid ${C.line}` }}>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={c.status === "MET" || c.status === "ON_TRACK" ? "good" : c.status === "NOT_MET" || c.status === "OFF_TRACK" || c.status === "ABORTED" ? "bad" : "neutral"}>
            {c.status.replace(/_/g, " ").toLowerCase()}
          </Pill>
          <span className="text-[12px]" style={{ color: C.faint }}>{c.mode === "SHADOW" ? "Shadow contract" : "Live contract"} · started {shortDate(c.activated_at)}{v ? ` · checked ${relTime(v.checkedAt)}` : ""}</span>
          <Button size="xs" variant="ghost" loading={busy} onClick={onVerify} className="ml-auto">Check now</Button>
        </div>
        <p className="text-[13px] mt-3" style={{ color: C.body }}>{v?.reason || "Not checked yet. The first comparison with the forecast happens when its horizon has passed."}</p>
        {v && (
          <>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ color: C.faint }}>
                    <th className="text-left font-normal py-1.5 pr-3">Forecast</th>
                    <th className="text-right font-normal py-1.5 pr-3">Expected (80% range)</th>
                    <th className="text-right font-normal py-1.5 pr-3">Actual</th>
                    <th className="text-right font-normal py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {v.predictions.map((p, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td className="py-2 pr-3" style={{ color: C.body }}>{p.target.split(":")[1] === "do_nothing" ? "If nothing was done" : "Chosen option"}, {p.horizonDays} days</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{money(p.expected, detail.decision.currency)}{p.range ? ` (${money(p.range[0], detail.decision.currency)}–${money(p.range[1], detail.decision.currency)})` : ""}</td>
                      <td className="py-2 pr-3 text-right tabular-nums" style={{ color: C.ink }}>{p.actual == null ? "—" : money(p.actual, detail.decision.currency)}</td>
                      <td className="py-2 text-right" style={{ color: p.insideRange === false ? C.bad : C.faint }}>
                        {p.status === "RESOLVED" ? (p.insideRange ? "Inside range" : p.insideRange === false ? "Outside range" : "Scored") : p.status === "COUNTERFACTUAL" ? "Can't be observed" : "Waiting"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] mt-3" style={{ color: C.faint }}>{v.attributionNote}</p>
          </>
        )}
        {c.regret && <p className="text-[12px] mt-2" style={{ color: C.faint }}>Regret at decision time: {money(c.regret.exAnte, detail.decision.currency)} (best then: {detail.decision.options.find((o) => o.key === c.regret?.bestAtDecisionTime)?.label || c.regret.bestAtDecisionTime}).</p>}
      </div>
    </section>
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

  if (q.isLoading) return <DashboardLayout pageTitle="Decision"><div className="max-w-[1000px] mx-auto px-2 sm:px-6 py-8"><Skeleton rows={4} /></div></DashboardLayout>;
  if (q.isError || !detail || !d) {
    const notFound = q.error instanceof DecisionApiError && q.error.status === 404;
    return (
      <DashboardLayout pageTitle="Decision">
        <div className="max-w-[1000px] mx-auto px-2 sm:px-6 py-8">
          <ErrorState title={notFound ? "Decision not found" : "Couldn't load this decision"} message={notFound ? "It may belong to another account or have been removed." : (q.error as Error)?.message} onRetry={notFound ? undefined : () => q.refetch()} />
        </div>
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
  const byKind = d.evidence.reduce<Record<string, typeof d.evidence>>((acc, e) => { (acc[e.kind] ||= []).push(e); return acc; }, {});
  const flips = (d.analysis?.sensitivity?.results || []).filter((r) => r.flips);

  return (
    <DashboardLayout pageTitle="Decision">
      <div className="max-w-[1000px] mx-auto px-2 sm:px-6 lg:px-8 py-8">
        <Link href="/decisions" className="inline-flex items-center gap-1.5 text-[13px] hover-dim mb-6" style={{ color: C.muted }}>
          <FiArrowLeft size={13} /> Decisions
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 text-[12px] mb-2" style={{ color: C.faint }}>
          <span>{STATUS_LABEL[d.status] || d.status}</span>
          <span>·</span>
          <span>Analysed {relTime(d.updatedAt)} from data as of {shortDate(d.asOf)}</span>
          {detail.pilotMode === "SHADOW" && <Pill tone="accent">Shadow mode</Pill>}
        </div>
        <h1 className="text-[28px] lg:text-[34px] max-w-[820px]" style={{ color: C.ink }}>{d.title}</h1>
        {d.description && <p className="text-[15px] mt-3 max-w-[760px] leading-[1.55]" style={{ color: C.body }}>{d.description}</p>}

        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-6">
          {days != null && (
            <div>
              <p className="text-[12px]" style={{ color: C.faint }}>Decide by</p>
              <p className="text-[15px]" style={{ color: days <= 2 ? C.bad : days <= 7 ? C.warn : C.ink, fontWeight: 500 }}>
                {shortDate(d.deadline || d.window?.latestSafeAt)} {days <= 0 ? "(now)" : `(${days} day${days === 1 ? "" : "s"})`}
              </p>
            </div>
          )}
          {cod?.valueLost != null && (
            <div>
              <p className="text-[12px]" style={{ color: C.faint }}>Cost of waiting a week</p>
              <p className="text-[15px] tabular-nums" style={{ color: C.ink, fontWeight: 500 }}>{money(cod.valueLost, d.currency)} expected</p>
            </div>
          )}
          <div>
            <p className="text-[12px]" style={{ color: C.faint }}>Confidence</p>
            <div className="mt-1"><ConfidencePill band={d.confidence?.band} score={d.confidence?.score} /></div>
          </div>
        </div>
        {d.window?.basis && <p className="text-[12px] mt-3 max-w-[760px]" style={{ color: C.faint }}>{d.window.basis}</p>}

        {/* Messages */}
        <div className="mt-6 space-y-3">
          {flash && <Notice tone="good" title={flash} />}
          {actionError && <Notice tone="bad" title={actionError.title}>{actionError.detail}</Notice>}
          {d.contradictions.length > 0 && (
            <Notice tone="warn" title={`${d.contradictions.length} thing${d.contradictions.length === 1 ? "" : "s"} in your data disagree`}>
              {d.contradictions.slice(0, 3).map((c, i) => <p key={i}>{c.detail || c.label || c.type}{c.toResolve ? ` To resolve: ${c.toResolve}` : ""}</p>)}
            </Notice>
          )}
          {d.collisions && d.collisions.length > 0 && (
            <Notice title="Linked decisions">
              {d.collisions.map((c, i) => <p key={i}><Link className="underline" href={`/decisions/${c.with}`}>{c.withTitle}</Link>: {c.detail}</p>)}
            </Notice>
          )}
        </div>

        <FeedbackBar decisionId={d.id} />

        {/* Why now + do nothing */}
        <section className="grid md:grid-cols-2 gap-8 mt-10">
          <div>
            <SectionLabel>Why now</SectionLabel>
            <ul className="space-y-2">
              {(d.triggers || []).map((t) => (
                <li key={t.code} className="text-[14px] leading-[1.5] flex gap-2" style={{ color: C.body }}>
                  <span aria-hidden="true" className="mt-[9px] w-1 h-1 rounded-full shrink-0" style={{ background: C.accent }} />
                  {t.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel>If you do nothing</SectionLabel>
            <p className="text-[14px] leading-[1.55]" style={{ color: C.body }}>{d.whatIfIgnored}</p>
          </div>
        </section>

        {/* Recommendation */}
        {rec && (
          <section className="mt-10 rounded-2xl p-5" style={{ background: "#F7F7FB", border: "1px solid #E2E3F1" }}>
            <SectionLabel>{rec.informationFirst ? "Find out first" : "Starlane suggests"}</SectionLabel>
            <p className="text-[18px]" style={{ color: C.ink, fontWeight: 500 }}>{rec.label}</p>
            {rec.why && <p className="text-[14px] mt-2 leading-[1.55] max-w-[760px]" style={{ color: C.body }}>{rec.why}</p>}
            {flips.length > 0 ? (
              <div className="mt-3">
                <p className="text-[12px]" style={{ color: C.faint }}>This would change if:</p>
                <ul className="mt-1 space-y-1">
                  {flips.map((f) => (
                    <li key={f.assumption} className="text-[13px]" style={{ color: C.body }}>
                      {f.label}: {f.switches.map((s) => `${d.options.find((o) => o.key === s.to)?.label || s.to} wins between ${s.between[0]} and ${s.between[1]}`).join("; ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-[12px] mt-3" style={{ color: C.faint }}>No single assumption, moved across its full range, changes this recommendation.</p>
            )}
            {rec.whyNot && rec.whyNot.length > 0 && (
              <details className="mt-3">
                <summary className="text-[12px] cursor-pointer" style={{ color: C.muted }}>Why not the others</summary>
                <ul className="mt-2 space-y-1">
                  {rec.whyNot.map((w) => (
                    <li key={w.key} className="text-[12px]" style={{ color: C.body }}>
                      <span style={{ fontWeight: 500 }}>{d.options.find((o) => o.key === w.key)?.label || w.key}:</span> {w.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {canChoose && !rec.informationFirst && recOption && recOption.valid !== false && (
              <div className="mt-5 pt-4" style={{ borderTop: "1px solid #E2E3F1" }}>
                <p className="text-[13px] max-w-[760px]" style={{ color: C.body }}>
                  <span style={{ fontWeight: 500 }}>Handle it</span> approves &ldquo;{rec.label}&rdquo; and starts a mission.{" "}
                  {recOption.isDoNothing
                    ? "Nothing is changed; Starlane checks what happens."
                    : detail.pilotMode === "SHADOW"
                      ? "Your account is in shadow mode, so Starlane records exactly what it would do and changes nothing outside Starlane."
                      : "Your account is live: approved internal steps are carried out and checked. Customer messages stay drafts for you to send."}
                  {" "}If you reject it, nothing happens and the decision stays open.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" loading={handle.isPending} onClick={() => handle.mutate()}>Handle it</Button>
                  <Link href="/missions" className="text-[12.5px] self-center hover-dim" style={{ color: C.muted }}>See missions</Link>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Options */}
        <section className="mt-10">
          <SectionLabel>Options and their likely futures</SectionLabel>
          {canChoose && (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for the record (why you chose this)"
              className="w-full max-w-[520px] mb-4 rounded-lg px-3 py-2 text-[13px]"
              style={{ border: `1px solid ${C.line}`, background: "#FFFFFF" }}
              maxLength={1000}
            />
          )}
          <div className="space-y-4">
            {d.options.map((o) => (
              <OptionCard
                key={o.key}
                o={o}
                d={d}
                max={max}
                recommended={rec?.key === o.key}
                selected={d.selectedOption === o.key}
                canChoose={canChoose && !select.isPending}
                busy={select.isPending && choosing === o.key}
                onChoose={() => { setChoosing(o.key); select.mutate(o.key); }}
              />
            ))}
          </div>
          <p className="text-[12px] mt-3" style={{ color: C.faint }}>
            Ranges are the middle 80% of simulated futures built from this customer&apos;s own payment history. The marker is the expected value.
          </p>
        </section>

        {/* Next step */}
        {!canChoose || d.status === "SELECTED" ? (
          <section className="mt-10 rounded-2xl p-5" style={{ background: "#FFFFFF", border: `1px solid ${C.line}` }}>
            <SectionLabel>Next step</SectionLabel>
            {d.status === "SELECTED" && chosen && (
              <>
                <p className="text-[14px]" style={{ color: C.body }}>
                  You chose <span style={{ fontWeight: 500 }}>{chosen.label}</span>.{" "}
                  {chosen.isDoNothing ? "Nothing will be changed; Starlane will still check what happens." : `Approving allows: ${steps.map((s) => INTENT_WORDS[s] || s).join(", then ")}.`}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {chosen.isDoNothing ? (
                    <Button size="sm" loading={execute.isPending} onClick={() => execute.mutate(false)}>Start watching the outcome</Button>
                  ) : (
                    <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate()}>Approve</Button>
                  )}
                  <Button size="sm" variant="ghost" loading={reject.isPending} icon={<FiX size={13} />} onClick={() => reject.mutate()}>Reject</Button>
                </div>
              </>
            )}
            {d.status === "APPROVED" && chosen && (
              <>
                <p className="text-[14px]" style={{ color: C.body }}>
                  Approved: {steps.map((s) => INTENT_WORDS[s] || s).join(", then ")}.{" "}
                  {detail.pilotMode === "SHADOW"
                    ? "Your account is in shadow mode, so running it records exactly what would happen without changing anything."
                    : "Your account is live: approved internal steps will be carried out and checked."}
                  {!detail.externalSendEnabled && steps.includes("CONTACT_CUSTOMER") ? " Customer messages are prepared as drafts for you to send; nothing is sent automatically." : ""}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button size="sm" loading={execute.isPending && execute.variables === false} onClick={() => execute.mutate(false)}>
                    {detail.pilotMode === "SHADOW" ? "Run in shadow mode" : "Run"}
                  </Button>
                  {detail.pilotMode === "SHADOW" && allInternal && (
                    <Button size="sm" variant="secondary" loading={execute.isPending && execute.variables === true} onClick={() => execute.mutate(true)}>
                      Do it for real (internal only)
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" loading={reject.isPending} onClick={() => reject.mutate()}>Cancel</Button>
                </div>
              </>
            )}
            {["SHADOWED", "EXECUTED", "VERIFIED", "EXECUTING"].includes(d.status) && detail.runs.length > 0 && (
              <div className="space-y-3">
                {detail.runs.map((r) => (
                  <div key={r.id} className="text-[13px]" style={{ color: C.body }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={r.status === "SUCCEEDED" || r.status === "PREPARED" ? "good" : r.status === "SHADOWED" ? "accent" : r.status === "FAILED" || r.status === "BLOCKED" ? "bad" : "neutral"}>{r.status.toLowerCase()}</Pill>
                      <span>{INTENT_WORDS[r.intent_type] || r.intent_type}</span>
                      <span className="text-[12px]" style={{ color: C.faint }}>via {r.adapter}</span>
                    </div>
                    {r.status === "SHADOWED" && r.would_have && <p className="text-[12px] mt-1" style={{ color: C.faint }}>Would have written: {String((r.would_have as { write?: string }).write || "")}</p>}
                    {r.postcondition?.note && <p className="text-[12px] mt-1" style={{ color: C.faint }}>{r.postcondition.note}</p>}
                    {r.error && <p className="text-[12px] mt-1" style={{ color: C.bad }}>{r.error}</p>}
                  </div>
                ))}
                {steps.includes("CONTACT_CUSTOMER") && ["EXECUTED"].includes(d.status) && (
                  <p className="text-[12px]" style={{ color: C.muted }}>The reminder is waiting in <Link className="underline" href="/control/approvals">Control › Approvals</Link>.</p>
                )}
              </div>
            )}
            {["REJECTED", "RESOLVED", "EXPIRED", "SUPERSEDED"].includes(d.status) && (
              <p className="text-[14px]" style={{ color: C.body }}>{d.resolutionReason || STATUS_LABEL[d.status]}</p>
            )}
          </section>
        ) : null}

        <Verification detail={detail} onVerify={() => verify.mutate()} busy={verify.isPending} />

        {/* Stress + what-if */}
        <section className="mt-10 grid lg:grid-cols-2 gap-10">
          <div>
            <SectionLabel>Under pressure</SectionLabel>
            <StressTable d={d} />
          </div>
          <div>
            <SectionLabel>Try a what-if</SectionLabel>
            <WhatIf d={d} />
          </div>
        </section>

        <SimilarDecisions id={d.id} />

        {/* Unknowns */}
        {d.unknowns.length > 0 && (
          <section className="mt-10">
            <SectionLabel>What Starlane doesn&apos;t know</SectionLabel>
            <ul>
              {d.unknowns.map((u) => (
                <li key={u.key} className="py-3 flex flex-wrap items-start gap-3" style={{ borderTop: `1px solid ${C.line}` }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px]" style={{ color: C.body }}>{u.label}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: C.faint }}>
                      {u.changesRecommendation
                        ? `Knowing this could be worth about ${money(u.valueOfInformation ?? null, d.currency)} and might change the choice.`
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
              <p className="text-[12px] mt-2" style={{ color: C.faint }}>Requested: {d.informationRequests.map((r) => r.label).join("; ")} (see Tasks).</p>
            )}
          </section>
        )}

        {/* Evidence */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <SectionLabel>Evidence</SectionLabel>
            <button type="button" className="text-[12px] hover-dim" style={{ color: C.muted }} onClick={() => setShowEvidence((v) => !v)}>
              {showEvidence ? "Hide" : `Show all ${d.evidence.length}`}
            </button>
          </div>
          <div className="space-y-4">
            {Object.entries(byKind).map(([kind, items]) => (
              <div key={kind}>
                <p className="text-[12px] mb-1" style={{ color: C.faint }}>{EVIDENCE_LABEL[kind] || kind}</p>
                <ul>
                  {(showEvidence ? items : items.slice(0, 3)).map((e, i) => (
                    <li key={i} className="text-[13px] py-1.5" style={{ color: C.body }}>
                      <span style={{ fontWeight: 500 }}>{e.label}</span>: {e.detail}
                      {e.calculation && <span className="block text-[12px]" style={{ color: C.faint }}>How: {e.calculation}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {d.assumptions.length > 0 && (
            <details className="mt-4">
              <summary className="text-[12px] cursor-pointer" style={{ color: C.muted }}>Assumptions ({d.assumptions.length})</summary>
              <ul className="mt-2 space-y-1">
                {d.assumptions.map((a, i) => <li key={i} className="text-[12px]" style={{ color: C.body }}>{a.label}</li>)}
              </ul>
            </details>
          )}
          {Array.isArray(d.analysis?.method) && (
            <details className="mt-2">
              <summary className="text-[12px] cursor-pointer" style={{ color: C.muted }}>Method</summary>
              <ul className="mt-2 space-y-1">
                {(d.analysis?.method as string[]).map((m, i) => <li key={i} className="text-[12px]" style={{ color: C.body }}>{m}</li>)}
                {d.modelVersions && <li className="text-[12px]" style={{ color: C.faint }}>Versions: {Object.values(d.modelVersions).join(", ")}</li>}
              </ul>
            </details>
          )}
        </section>

        {/* Observations */}
        <section className="mt-10">
          <SectionLabel>Your observations</SectionLabel>
          {detail.observations.map((o) => (
            <p key={o.id} className="text-[13px] py-1.5" style={{ color: C.body }}>{o.text} <span className="text-[12px]" style={{ color: C.faint }}>· {relTime(o.at)}</span></p>
          ))}
          <div className="flex flex-wrap gap-2 mt-2">
            <input
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Something Starlane can't see, e.g. “They said payment is coming after Diwali”"
              className="flex-1 min-w-[240px] rounded-lg px-3 py-2 text-[13px]"
              style={{ border: `1px solid ${C.line}`, background: "#FFFFFF" }}
              maxLength={2000}
            />
            <Button size="sm" variant="secondary" disabled={!obs.trim()} loading={observe.isPending} onClick={() => observe.mutate()}>Add</Button>
          </div>
          <p className="text-[12px] mt-1.5" style={{ color: C.faint }}>Recorded as evidence with your name. It never changes the numbers or permissions on its own.</p>
        </section>

        {/* History */}
        <section className="mt-10 mb-6">
          <details>
            <summary className="text-[12px] cursor-pointer" style={{ color: C.muted }}>History ({detail.events.length} events)</summary>
            <ol className="mt-3 space-y-1.5">
              {detail.events.map((e) => (
                <li key={e.id} className="text-[12px] flex gap-3" style={{ color: C.body }}>
                  <span className="tabular-nums shrink-0" style={{ color: C.faint }}>{new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span>{e.type.replace(/_/g, " ").toLowerCase()} · {e.actor.type === "agent" ? `Starlane (${e.actor.agentVersion || e.actor.id})` : "You"}</span>
                </li>
              ))}
            </ol>
          </details>
        </section>
      </div>
    </DashboardLayout>
  );
}
