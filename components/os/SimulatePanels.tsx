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
import { SectionTitle, SkeletonRows } from "@/components/v32/ui";
import { IconChevronDown } from "@/components/v32/icons";
import { useLoad } from "./shared";
import { EmptyNote, RetryLine, SectionHead, amount, signedAmount, humaneError } from "./prepared/kit";
import lab from "./simulate/lab.module.css";

function RFig({ value, label }: { value: React.ReactNode; label: React.ReactNode }) {
  return <div className={lab.fig}><div className={lab.figValue}>{value}</div><div className={lab.figLabel}>{label}</div></div>;
}

// Business-level what-if: a change in sales, played through this business's
// own payment timing. Read-only; nothing is saved.
export function SalesWhatIf() {
  const [change, setChange] = useState(-20);
  const [days, setDays] = useState(60);
  const [res, setRes] = useState<SalesWhatIfResult | null>(null);
  const [ranFor, setRanFor] = useState<{ change: number; days: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const run = async () => {
    setBusy(true); setErr(null);
    try { setRes(await osApi.salesWhatIf(change, days)); setRanFor({ change, days }); } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const cash = res?.cashFromNewSales;
  const stale = !!ranFor && (ranFor.change !== change || ranFor.days !== days);
  const row = (label: string, base: React.ReactNode, scen: React.ReactNode, delta: React.ReactNode, deltaCls = "") => (
    <tr>
      <th scope="row">{label}</th>
      <td>{base}</td>
      <td className={lab.focus}>{scen}</td>
      <td className={deltaCls}>{delta}</td>
    </tr>
  );
  const dash = <span className={lab.empty}>—</span>;
  return (
    <div className={lab.lab}>
      <section aria-labelledby="sales-assumptions" className={lab.rail}>
        <h2 id="sales-assumptions" className="section-label">Assumptions</h2>
        <div className="grid grid-cols-2" style={{ gap: 12 }}>
          <div>
            <label htmlFor="sales-change" className={lab.fieldLabel}>Sales change, %</label>
            <input id="sales-change" className="ui-input num" type="number" min={-100} max={200} step={5} value={change} onChange={(e) => setChange(Number(e.target.value))} style={{ fontSize: 12.5 }} />
          </div>
          <div>
            <label htmlFor="sales-days" className={lab.fieldLabel}>Over, days</label>
            <input id="sales-days" className="ui-input num" type="number" min={7} max={180} step={1} value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ fontSize: 12.5 }} />
          </div>
        </div>
        <button type="button" onClick={run} disabled={busy} className={`ui-btn ui-btn-primary ${lab.run}`}>
          {busy ? "Simulating…" : res ? "Simulate again" : "Simulate"}
        </button>
        <p className={lab.hint}>{stale ? "The result shown is for your previous inputs." : "Played through how fast your customers really pay. Nothing is saved."}</p>
      </section>

      <div className={lab.main}>
        <SectionTitle className="section-label-lead">Comparison{res && res.status === "PROJECTED" ? ` · next ${res.horizonDays} days` : ""}</SectionTitle>
        {err ? <RetryLine error={humaneError(err, "Starlane couldn't run this what-if just now. Try again in a moment.")} onRetry={run} /> : null}
        {!res && !err && (
          <div aria-busy={busy || undefined}>
            <p className={lab.placeholder}>{busy ? "Working it out from your invoices…" : "Simulate to see how a change in sales reaches your cash, using your average monthly sales and your customers' real payment timing."}</p>
            <div className={lab.placeholderRows} aria-hidden="true">
              <div><span>Cash from new sales</span></div>
              <div><span>Sales a month</span></div>
            </div>
          </div>
        )}
        {res && res.status === "INSUFFICIENT_EVIDENCE" && (
          <p className={lab.placeholder}>Not enough history to project this yet. {res.reason || "Starlane needs more paid invoices before it can say how a change in sales reaches your cash."}</p>
        )}
        {res && res.status === "PROJECTED" && cash && (
          <section aria-label="Result" className="fade-once">
            <p className={lab.context}>Sales <b>{res.changePct > 0 ? "up" : "down"} <span className="num">{Math.abs(res.changePct)}%</span></b> over the next <b className="num">{res.horizonDays}</b> days.</p>
            <div className={lab.headline}>
              <div>
                <div className={lab.hlLabel}>Cash from new sales in {res.horizonDays} days</div>
                <div className={lab.hlValue}>{amount(cash.scenario)}</div>
              </div>
              <div>
                <div className={`${lab.hlDelta} ${cash.delta < 0 ? lab.bad : cash.delta > 0 ? lab.good : ""}`}>{signedAmount(cash.delta)}</div>
                <div className={lab.hlNote}>against <b>{amount(cash.baseline)}</b> as things are</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className={lab.table}>
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">Measure</span></th>
                    <th scope="col">As things are<span className={lab.sub}>Today</span></th>
                    <th scope="col" className={lab.focus}>With the change<span className={lab.sub}>Sales {res.changePct > 0 ? "+" : "−"}{Math.abs(res.changePct)}%</span></th>
                    <th scope="col">Difference<span className={lab.sub}>Change</span></th>
                  </tr>
                </thead>
                <tbody>
                  {row(`Cash from new sales in ${res.horizonDays} days`, amount(cash.baseline), amount(cash.scenario), signedAmount(cash.delta), cash.delta < 0 ? lab.bad : cash.delta > 0 ? lab.good : "")}
                  {res.salesPerMonth != null && row("Sales a month", amount(res.salesPerMonth), res.scenarioSalesPerMonth != null ? amount(res.scenarioSalesPerMonth) : dash, res.scenarioSalesPerMonth != null ? signedAmount(res.scenarioSalesPerMonth - res.salesPerMonth) : dash)}
                </tbody>
              </table>
            </div>
            {res.summary && <ul className={lab.why}><li>{res.summary}</li></ul>}
          </section>
        )}
      </div>

      <aside className={lab.side} aria-label="Uncertainty">
        <div>
          <SectionTitle>Uncertainty</SectionTitle>
          {res && res.status === "PROJECTED" ? (
            <>
              {res.medianDaysToCash != null && (
                <div className={lab.kv}><span className={lab.kvLabel}>Median days to cash</span><span className={`${lab.kvValue} num`}>{res.medianDaysToCash}</span></div>
              )}
              <p className={lab.small} style={{ marginTop: 8, color: "var(--ink-3)" }}>A single projection from your history; no probability band was computed.</p>
            </>
          ) : (
            <p className={lab.small}>How sure this is, and what it rests on, appears here.</p>
          )}
        </div>
        {res && (res.assumptions || []).length > 0 && (
          <div>
            <SectionTitle>Assumptions used</SectionTitle>
            <ul className={lab.smallList}>{(res.assumptions || []).map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
      </aside>
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
        <EmptyNote>No automation to replay yet. Run a scan and Starlane proposes automations from your own history; each can be replayed here before it runs.</EmptyNote>
      )}
      {list.length > 0 && <div style={{ borderTop: "1px solid var(--line)" }}>{list.map((w) => <ReplayCard key={w.id} w={w} />)}</div>}
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
    <article className={lab.replay}>
      <div className={lab.replayHead}>
        <div className="min-w-0" style={{ flex: "1 1 280px" }}>
          <div style={{ marginBottom: 3 }}><Pill>{WORKFLOW_STATUS_LABEL[w.status] || w.status}</Pill></div>
          <h3 className={lab.replayTitle}>{w.name}</h3>
          <p className={lab.replaySub}>{w.trigger.description}</p>
        </div>
        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={rerun} disabled={busy}>{busy ? "Replaying…" : sim ? "Replay again" : "Replay"}</button>
      </div>
      {err ? <div style={{ marginTop: 12 }}><RetryLine error={humaneError(err, "Starlane couldn't replay this just now. Try again in a moment.")} onRetry={rerun} /></div> : null}
      {!sim && !err && <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "var(--ink-3)" }}>Not replayed yet.</p>}
      {sim && (
        <>
          <div className={lab.figs}>
            <RFig value={formatCount(sim.episodes)} label={`Would have fired, ${sim.perMonth} a month`} />
            <RFig value={amount(sim.amountTriggered)} label="Amount it covered" />
            <RFig value={formatCount(sim.paidWithinWindowWithoutAction)} label={`Paid anyway in 7 days (${pct(sim.baselineRate)})`} />
            <RFig value={`${sim.humanHoursPerMonth}h`} label="Checking time saved a month, estimate" />
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55 }}>
            {sim.replays} weekly replays over {sim.lookbackDays} days. Future data: {sim.leakage}.
          </p>
          {sim.cannotSay && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}><span style={{ color: "var(--ink)", fontWeight: 500 }}>Limit:</span> {sim.cannotSay}</p>}
          {sim.sample.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ paddingLeft: 0, marginLeft: -2 }}>
                <span style={{ display: "inline-flex", transform: open ? "rotate(180deg)" : undefined, transition: "transform 160ms" }}><IconChevronDown size={13} /></span>
                {open ? "Hide" : "View"} {sim.sample.length} example firing{sim.sample.length === 1 ? "" : "s"}
              </button>
              {open && (
                <div className="overflow-x-auto" style={{ marginTop: 8 }}>
                  <table className={lab.table} style={{ minWidth: 420, maxWidth: 720 }}>
                    <thead>
                      <tr>
                        <th scope="col">Week of</th>
                        <th scope="col" style={{ textAlign: "left" }}>Customer</th>
                        <th scope="col">Owed</th>
                        <th scope="col">Paid in 7 days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.sample.map((s, i) => (
                        <tr key={i}>
                          <td>{formatDate(s.asOf)}</td>
                          <td style={{ textAlign: "left", fontFamily: "var(--font-sans)", color: "var(--ink)" }}>{s.customer}</td>
                          <td>{amount(s.amount)}</td>
                          <td style={{ fontFamily: "var(--font-sans)" }}>{s.paidWithinWindow ? "Yes" : "No"}</td>
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
