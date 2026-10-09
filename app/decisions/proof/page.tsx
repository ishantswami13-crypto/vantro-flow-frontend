"use client";

import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { IconChevronDown } from "@/components/v32/icons";
import { PageBody, amount, humaneError } from "@/components/os/prepared/kit";
import { PageHeader } from "@/components/v32/ui";
import { formatDate } from "@/lib/format";
import css from "@/components/os/prepared/inbox.module.css";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { C, Notice, SectionLabel, Skeleton, Stat } from "@/components/decisions/ui";
import { decisionsApi, pct } from "@/lib/decisions";

// The proof screen: is Starlane actually right? Everything here is measured
// against what happened in this business's own data. Where there isn't
// enough evidence yet, it says so instead of showing a number.
export default function DecisionProofPage() {
  const tr = useQuery({ queryKey: ["decisions-track-record"], queryFn: decisionsApi.trackRecord, staleTime: 30_000 });
  const bt = useMutation({ mutationFn: () => decisionsApi.backtest(60) });
  const r = tr.data;
  const s = bt.data?.scorecard;

  return (
    <DashboardLayout pageTitle="Track record">
      <PageBody gap={0}>
        <div style={{ maxWidth: 1000 }}>
        <Link href="/decisions" className="inline-flex items-center gap-1.5 text-[13px] hover-dim mb-5" style={{ color: C.muted }}>
          <span aria-hidden="true" style={{ display: "inline-flex", transform: "rotate(90deg)" }}><IconChevronDown size={13} /></span> Decisions
        </Link>
        <PageHeader title="Track record" subtitle="How Starlane's forecasts and recommendations compare with what really happened in your business." />
        <div className="mb-8" />

        {tr.isLoading && <Skeleton rows={2} />}
        {tr.isError && <ErrorState title="Couldn't load the track record" message={humaneError(tr.error)} onRetry={() => tr.refetch()} />}
        {r && (
          <>
            <section className={css.strip} aria-label="Summary">
              <Stat label="Decisions carried through" value={r.contracts} sub={Object.entries(r.byStatus).map(([k, v]) => `${v} ${k.replace(/_/g, " ").toLowerCase()}`).join(", ") || "none yet"} />
              <Stat label="Followed the suggestion" value={r.followedRecommendation ? pct(r.followedRecommendation.share) : "—"} sub={r.followedRecommendation ? `${r.followedRecommendation.count} of ${r.contracts}` : "no decisions yet"} />
              <Stat
                label="Forecasts inside their 80% range"
                value={r.calibration.intervalCoverage == null ? "—" : pct(r.calibration.intervalCoverage)}
                sub={r.calibration.status === "MEASURED" ? `target 80%, ${r.calibration.resolvedPredictions} scored` : `${r.calibration.resolvedPredictions} scored so far, ${r.calibration.pendingPredictions} waiting`}
                tone={r.calibration.status === "MEASURED" && r.calibration.intervalCoverage != null && Math.abs(r.calibration.intervalCoverage - 0.8) > 0.15 ? "warn" : undefined}
              />
              <Stat
                label="Estimated extra cash collected"
                value={Object.keys(r.valueLedger.estimatedUpliftByCurrency).length ? Object.entries(r.valueLedger.estimatedUpliftByCurrency).map(([c, v]) => amount(v, c)).join(" + ") : "Not known yet"}
                sub={r.valueLedger.entries.length ? `${r.valueLedger.entries.length} live decision(s)` : "needs live, verified decisions"}
              />
            </section>
            {r.calibration.status !== "MEASURED" && (
              <p className="text-[12px] mt-3" style={{ color: C.faint }}>
                Calibration is reported once at least 10 forecasts have reached their review date. Until then treat the ranges as the model&apos;s best estimate, not a proven one.
              </p>
            )}

            {r.valueLedger.entries.length > 0 && (
              <section className="mt-10">
                <SectionLabel>Value ledger</SectionLabel>
                <table className="w-full text-[13px] sl-table">
                  <thead>
                    <tr style={{ color: C.faint }}>
                      <th className="text-left font-normal py-2 pr-3">Decision</th>
                      <th className="text-right font-normal py-2 pr-3">Collected</th>
                      <th className="text-right font-normal py-2 pr-3">If nothing was done (forecast)</th>
                      <th className="text-right font-normal py-2">Estimated difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.valueLedger.entries.map((e) => (
                      <tr key={e.decisionId} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td className="py-2 pr-3"><Link className="hover-dim" href={`/decisions/${e.decisionId}`} style={{ color: C.body }}>{e.title}</Link></td>
                        <td className="py-2 pr-3 text-right num">{amount(e.collected, e.currency)}</td>
                        <td className="py-2 pr-3 text-right num" style={{ color: C.muted }}>{amount(e.doNothingExpected, e.currency)}</td>
                        <td className="py-2 text-right num" style={{ color: e.estimatedUplift >= 0 ? C.good : C.bad }}>{amount(e.estimatedUplift, e.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[12px] mt-2" style={{ color: C.faint }}>{r.valueLedger.note}</p>
              </section>
            )}

            <section className="mt-10">
              <SectionLabel>Earned autonomy</SectionLabel>
              {r.autonomy.perAction.length === 0 ? (
                <p className="text-[13px]" style={{ color: C.muted }}>No live, verified outcomes yet. Every action needs your approval. Autonomy is only ever raised by you, never by Starlane.</p>
              ) : (
                <ul>
                  {r.autonomy.perAction.map((a) => (
                    <li key={a.action} className="py-2 text-[13px] flex flex-wrap gap-2 items-center" style={{ borderTop: `1px solid ${C.line}`, color: C.body }}>
                      <span style={{ fontWeight: 500 }}>{a.action.replace(/_/g, " ").toLowerCase()}</span>
                      <span style={{ color: C.muted }}>suggested {a.suggestedLevel.replace(/_/g, " ").toLowerCase()}</span>
                      <span style={{ color: C.faint }}>{a.basis}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[12px] mt-2" style={{ color: C.faint }}>Ceiling for this account: {r.autonomy.ceiling.replace(/_/g, " ").toLowerCase()}. {r.autonomy.note}</p>
            </section>

            {r.recent.length > 0 && (
              <section className="mt-10">
                <SectionLabel>Recent</SectionLabel>
                <ul>
                  {r.recent.map((x) => (
                    <li key={x.decisionId} className="py-2 text-[13px]" style={{ borderTop: `1px solid ${C.line}` }}>
                      <Link className="hover-dim" href={`/decisions/${x.decisionId}`} style={{ color: C.body }}>{x.title}</Link>
                      <span className="text-[12px] ml-2" style={{ color: C.faint }}>{x.mode === "SHADOW" ? "shadow" : "live"} · {x.status.replace(/_/g, " ").toLowerCase()} · {formatDate(x.activatedAt)}</span>
                      {x.reason && <p className="text-[12px]" style={{ color: C.faint }}>{x.reason}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <section className="mt-10 pt-6" style={{ borderTop: `1px solid ${C.line}` }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionLabel>Replay your history</SectionLabel>
              <p className="text-[13px] max-w-[620px]" style={{ color: C.body }}>
                Starlane goes back to past dates, sees only what was known then, raises the decisions it would have raised, and checks them against what happened in the following 60 days.
              </p>
            </div>
            <Button size="sm" variant="secondary" loading={bt.isPending} onClick={() => bt.mutate()}>Replay history</Button>
          </div>
          {bt.isError && <div className="mt-4"><Notice tone="bad" title="The replay didn't run">{humaneError(bt.error, "Try again in a moment.")}</Notice></div>}
          {bt.data?.status === "INSUFFICIENT_HISTORY" && <div className="mt-4"><Notice title="Not enough history yet">{bt.data.detail}</Notice></div>}
          {s && bt.data?.method && (
            <div className="mt-5">
              {s.sampleWarning && <div className="mb-4"><Notice tone="warn" title="Small sample">{s.sampleWarning}</Notice></div>}
              <table className="w-full text-[13px] sl-table">
                <thead>
                  <tr style={{ color: C.faint }}>
                    <th className="text-left font-normal py-2 pr-3"></th>
                    <th className="text-right font-normal py-2 pr-3">Starlane</th>
                    <th className="text-right font-normal py-2">Simple rule</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["Material losses in history", s.engine.materialEvents, s.simpleRule.materialEvents],
                    ["Caught in time", s.engine.detected, s.simpleRule.detected],
                    ["Missed", s.engine.missed, s.simpleRule.missed],
                    ["False alarms", s.engine.falsePositives, s.simpleRule.falsePositives],
                    ["Precision", pct(s.engine.precision), pct(s.simpleRule.precision)],
                    ["Recall", pct(s.engine.recall), pct(s.simpleRule.recall)],
                  ] as [string, string | number, string | number][]).map(([k, a, b]) => (
                    <tr key={k} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td className="py-2 pr-3" style={{ color: C.body }}>{k}</td>
                      <td className="py-2 pr-3 text-right num" style={{ color: C.ink }}>{a}</td>
                      <td className="py-2 text-right num" style={{ color: C.muted }}>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[12px] mt-3" style={{ color: C.faint }}>
                Simple rule: {s.simpleRule.rule}. Median warning before the 90-day line: {s.engine.medianWarningDaysBeforeBadDebt == null ? "—" : `${s.engine.medianWarningDaysBeforeBadDebt} days`}.
                Do-nothing forecast: {s.doNothingForecast.intervals} scored, {pct(s.doNothingForecast.coverage)} inside the 80% range, average error {amount(s.doNothingForecast.meanAbsoluteError)}. {s.doNothingForecast.biasNote}
              </p>
              <p className="text-[12px] mt-2" style={{ color: C.faint }}>
                {bt.data.method.leakageGuard}. Cut-off dates: {bt.data.method.cutoffs.map((c) => formatDate(c)).join(", ")}. A material loss means: {bt.data.method.materialEvent}.
              </p>
            </div>
          )}
        </section>
        </div>
      </PageBody>
    </DashboardLayout>
  );
}
