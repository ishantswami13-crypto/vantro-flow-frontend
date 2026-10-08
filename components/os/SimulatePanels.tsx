"use client";

// SIMULATE: a business-level sales what-if, and replays of an automation over
// history before it runs. Each weekly replay only sees data known on that
// date (the backend asserts it), so the replay cannot peek at payments that
// came later. Display only: every figure is computed by the backend.

import React, { useState } from "react";
import { Pill } from "@/components/decisions/ui";
import { osApi, Workflow, Replay, WORKFLOW_STATUS_LABEL, SalesWhatIf as SalesWhatIfResult } from "@/lib/os";
import { pct } from "@/lib/decisions";
import { formatDate, formatCount } from "@/lib/format";
import { Figure, EmptyLine, SkeletonRows } from "@/components/v32/ui";
import { IconChart, IconSimulate, IconChevronDown } from "@/components/v32/icons";
import { useLoad } from "./shared";
import { RetryLine, SectionHead, amount, signedAmount, humaneError } from "./prepared/kit";
import { SimBars } from "./simulate/SimChart";

const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--line-card)", borderRadius: 12 };

// Business-level what-if: a change in sales, played through this business's
// own payment timing. Read-only; nothing is saved.
export function SalesWhatIf() {
  const [change, setChange] = useState(-20);
  const [days, setDays] = useState(60);
  const [res, setRes] = useState<SalesWhatIfResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const run = async () => {
    setBusy(true); setErr(null);
    try { setRes(await osApi.salesWhatIf(change, days)); } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const label: React.CSSProperties = { display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 6 };
  const cash = res?.cashFromNewSales;
  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] items-start">
      <section aria-labelledby="sales-assumptions" className="fade-once" style={{ ...panel, padding: 20 }}>
        <h2 id="sales-assumptions" style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 17, color: "var(--ink)" }}>Assumptions</h2>
        <p style={{ margin: "4px 0 16px", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>A change in sales, played through how fast your customers really pay.</p>
        <div className="grid grid-cols-2" style={{ gap: 12 }}>
          <div>
            <label htmlFor="sales-change" style={label}>Sales change (%)</label>
            <input id="sales-change" className="ui-input" type="number" min={-100} max={200} step={5} value={change} onChange={(e) => setChange(Number(e.target.value))} style={{ fontVariantNumeric: "tabular-nums" }} />
          </div>
          <div>
            <label htmlFor="sales-days" style={label}>Over (days)</label>
            <input id="sales-days" className="ui-input" type="number" min={7} max={180} step={1} value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ fontVariantNumeric: "tabular-nums" }} />
          </div>
        </div>
        <button type="button" onClick={run} disabled={busy} className="ui-btn ui-btn-primary" style={{ width: "100%", marginTop: 18, height: 38 }}>
          {busy ? "Running…" : res ? "Run again" : "Run simulation"}
        </button>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-3)" }}>Nothing is saved.</p>
      </section>

      <div className="min-w-0 flex flex-col" style={{ gap: 16 }}>
        {err ? <RetryLine error={humaneError(err, "Starlane couldn't run this what-if just now. Try again in a moment.")} onRetry={run} /> : null}
        {!res && !err && (
          <div style={{ ...panel, padding: "28px 24px", borderStyle: "dashed", background: "transparent" }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>{busy ? "Working it out from your invoices…" : "The cash effect appears here"}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 520 }}>Starlane uses your average monthly sales and your customers&apos; real payment timing. It needs a few months of invoices and payments.</p>
          </div>
        )}
        {res && res.status === "INSUFFICIENT_EVIDENCE" && (
          <div style={{ ...panel, padding: "6px 20px" }}>
            <EmptyLine icon={<IconChart size={17} />} title="Not enough history to project this yet" body={res.reason || "Starlane needs more paid invoices before it can say how a change in sales reaches your cash."} />
          </div>
        )}
        {res && res.status === "PROJECTED" && cash && (
          <section aria-label="Result" className="fade-once flex flex-col" style={{ gap: 16 }}>
            <div style={{ ...panel, padding: "20px 22px" }}>
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14 }}>
                Sales {res.changePct > 0 ? "up" : "down"} {Math.abs(res.changePct)}% · next {res.horizonDays} days
              </div>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
                <Figure value={signedAmount(cash.delta)} label="Cash from new sales, change" tone={cash.delta < 0 ? "var(--critical)" : cash.delta > 0 ? "var(--positive)" : undefined} />
                <Figure value={amount(cash.scenario)} label={`Cash in ${res.horizonDays} days with the change`} />
                <Figure value={res.salesPerMonth != null ? amount(res.salesPerMonth) : "Not known yet"} label={res.scenarioSalesPerMonth != null ? `Sales a month, becomes ${amount(res.scenarioSalesPerMonth)}` : "Sales a month"} />
              </div>
            </div>
            <div style={{ ...panel, padding: "18px 22px 12px" }}>
              <div className="flex items-baseline justify-between flex-wrap" style={{ gap: 8, marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Cash from new sales in {res.horizonDays} days</h3>
                {res.medianDaysToCash != null && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Customers take a median of {res.medianDaysToCash} days to pay</span>}
              </div>
              <SimBars
                ariaLabel={`As things are: ${amount(cash.baseline)}. With the change: ${amount(cash.scenario)}.`}
                bars={[{ label: "As things are", value: cash.baseline, tone: "ink" }, { label: "With the change", value: cash.scenario, tone: "accent" }]}
              />
            </div>
            <div style={{ padding: "4px 2px" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Why</h3>
              {res.summary && <p style={{ margin: 0, fontSize: 13, color: "var(--body)", lineHeight: 1.6, maxWidth: 760 }}>{res.summary}</p>}
              {(res.assumptions || []).length > 0 && (
                <ul className="flex flex-col" style={{ gap: 4, margin: "10px 0 0", padding: 0, listStyle: "none" }}>
                  {(res.assumptions || []).map((a) => <li key={a} style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>– {a}</li>)}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export function WorkflowReplays() {
  const { data, error, loading, reload } = useLoad(() => osApi.workflows("PROPOSED,SHADOW,WITH_APPROVAL,PAUSED"));
  const list = data?.workflows || [];
  return (
    <section>
      <SectionHead title="Automation replays" count={loading || error ? null : list.length} hint="What an automation would have done over the last months, using only what was known each week." />
      {loading && <SkeletonRows rows={2} />}
      {error ? <RetryLine error={error} onRetry={reload} /> : null}
      {!loading && !error && list.length === 0 && (
        <EmptyLine icon={<IconSimulate size={17} />} title="No automation to replay yet" body="Run a scan and Starlane proposes automations from your own history. Each one can be replayed here before it runs." />
      )}
      <div className="flex flex-col" style={{ gap: 14 }}>
        {list.map((w) => <ReplayCard key={w.id} w={w} />)}
      </div>
    </section>
  );
}

function ReplayCard({ w }: { w: Workflow }) {
  const [sim, setSim] = useState<Replay | null>(w.simulation);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [open, setOpen] = useState(false);
  const rerun = async () => {
    setBusy(true); setErr(null);
    try { setSim((await osApi.simulate(w.id)).simulation); } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  return (
    <article className="card-in" style={{ ...panel, padding: "18px 20px" }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
        <div className="min-w-0" style={{ flex: "1 1 280px" }}>
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 6 }}>
            <Pill tone="accent">{WORKFLOW_STATUS_LABEL[w.status] || w.status}</Pill>
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{w.name}</h3>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-2)" }}>{w.trigger.description}</p>
        </div>
        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={rerun} disabled={busy}>{busy ? "Replaying…" : sim ? "Replay again" : "Replay"}</button>
      </div>
      {err ? <div style={{ marginTop: 12 }}><RetryLine error={humaneError(err, "Starlane couldn't replay this just now. Try again in a moment.")} onRetry={rerun} /></div> : null}
      {!sim && !err && <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "var(--ink-3)" }}>Not replayed yet.</p>}
      {sim && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 20, marginTop: 18 }}>
            <Figure value={formatCount(sim.episodes)} label={`Would have fired, ${sim.perMonth} a month`} />
            <Figure value={amount(sim.amountTriggered)} label="Amount it covered" />
            <Figure value={formatCount(sim.paidWithinWindowWithoutAction)} label={`Paid anyway in 7 days (${pct(sim.baselineRate)})`} />
            <Figure value={`${sim.humanHoursPerMonth}h`} label="Checking time saved a month, estimate" />
          </div>
          <p style={{ margin: "16px 0 0", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
            {sim.replays} weekly replays over {sim.lookbackDays} days. Future data: {sim.leakage}.
          </p>
          {sim.cannotSay && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--warning)", lineHeight: 1.55 }}>{sim.cannotSay}</p>}
          {sim.sample.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ paddingLeft: 6 }}>
                <span style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : undefined, transition: "transform 160ms" }}><IconChevronDown size={13} /></span>
                {open ? "Hide" : "Show"} {sim.sample.length} example firing{sim.sample.length === 1 ? "" : "s"}
              </button>
              {open && (
                <div className="overflow-x-auto" style={{ marginTop: 8 }}>
                  <table className="w-full" style={{ fontSize: 12.5, borderCollapse: "collapse", minWidth: 420 }}>
                    <thead>
                      <tr style={{ color: "var(--ink-3)", fontSize: 12 }}>
                        <th className="text-left font-normal" style={{ padding: "8px 8px 8px 0" }}>Week of</th>
                        <th className="text-left font-normal" style={{ padding: 8 }}>Customer</th>
                        <th className="text-right font-normal" style={{ padding: 8 }}>Owed</th>
                        <th className="text-right font-normal" style={{ padding: "8px 0 8px 8px" }}>Paid in 7 days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.sample.map((s, i) => (
                        <tr key={i} className="row-hover" style={{ borderTop: "1px solid var(--line)", color: "var(--body)", height: 44 }}>
                          <td style={{ padding: "0 8px 0 0" }}>{formatDate(s.asOf)}</td>
                          <td style={{ padding: "0 8px", color: "var(--ink)" }}>{s.customer}</td>
                          <td className="text-right" style={{ padding: "0 8px", fontVariantNumeric: "tabular-nums" }}>{amount(s.amount)}</td>
                          <td className="text-right" style={{ padding: "0 0 0 8px" }}>{s.paidWithinWindow ? "Yes" : "No"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}
