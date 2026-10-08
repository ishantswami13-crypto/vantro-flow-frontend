"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, type ScenarioInvoice, type SimulateScenarioResponse } from "@/lib/api";
import { SalesWhatIf, WorkflowReplays } from "@/components/os/SimulatePanels";
import { PageHeader, Subnav, SectionTitle } from "@/components/v32/ui";
import { IconChevronDown, IconUpload } from "@/components/v32/icons";
import { EmptyNote, PageBody, RetryLine, amount, sentence, signedAmount, humaneError } from "@/components/os/prepared/kit";
import { formatDate, formatDue, inrShort } from "@/lib/format";
import lab from "@/components/os/simulate/lab.module.css";

// Simulate — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§6/§14/§16.
//
// The "One invoice" tab runs POST /api/intelligence/scenarios/:userId
// (lib/routes/scenarios.js): scenarioEngine.js's buildScenario /
// compareScenarios over a real BASELINE cash consequence
// (cashConsequenceEngine.js) and one of the tenant's own open invoices,
// plus fxScenarioEngine.js for whatever currency exposure exists (honestly
// NO_EFFECT / INSUFFICIENT_CONTEXT today). The model is binary: an invoice
// is collected inside the 30-day horizon or it is not, so no day count is
// asked for. Nothing is saved; the Saved/Comparisons tabs are not shown
// because no persistence layer exists for simulations.

type Mode = "earlier" | "unpaid";
type Tab = "new" | "sales" | "replays";

export default function SimulatePage() {
  return (
    <Suspense fallback={null}>
      <SimulatePageInner />
    </Suspense>
  );
}

function SimulatePageInner() {
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<ScenarioInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("earlier");
  // The engine compares "collected inside its 30-day horizon" with the baseline,
  // so a day count would not change the result; none is asked for.
  const daysEarlier = 0;

  const [result, setResult] = useState<SimulateScenarioResponse | null>(null);
  const [ranFor, setRanFor] = useState<{ invoice: ScenarioInvoice | null; mode: Mode } | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<unknown>(null);
  const [tab, setTab] = useState<Tab>("new");

  useEffect(() => {
    const user = getUser();
    setUserId(user?.id || null);
    if (!user?.id) setInvoicesLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setInvoicesLoading(true);
    setInvoicesError(null);
    api.intelligence.scenarioInvoices(userId)
      .then((res) => {
        setInvoices(res.invoices || []);
        const prefill = searchParams?.get("invoiceId");
        if (prefill && (res.invoices || []).some((inv) => inv.id === prefill)) {
          setSelectedInvoiceId(prefill);
        } else if ((res.invoices || []).length > 0) {
          setSelectedInvoiceId(res.invoices[0].id);
        }
      })
      .catch((e) => setInvoicesError(e))
      .finally(() => setInvoicesLoading(false));
  }, [userId, searchParams, reloadKey]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) || null;

  const runSimulation = useCallback(async () => {
    if (!userId || !selectedInvoiceId) return;
    setRunning(true);
    setRunError(null);
    try {
      const res = await api.intelligence.simulateScenario(userId, {
        targetInvoiceId: selectedInvoiceId,
        ...(mode === "unpaid" ? { remainsUnpaid: true } : { daysEarlier }),
      });
      setResult(res);
      setRanFor({ invoice: invoices.find((inv) => inv.id === selectedInvoiceId) || null, mode });
    } catch (e) {
      setRunError(e);
    } finally {
      setRunning(false);
    }
  }, [userId, selectedInvoiceId, mode, daysEarlier, invoices]);

  return (
    <DashboardLayout pageTitle="Simulate">
      <PageBody>
        <PageHeader title="Simulate" subtitle="Try a decision against your own figures before you make it. Nothing is saved." />
        <Subnav
          active={tab}
          onChange={(k) => setTab(k as Tab)}
          label="Simulations"
          items={[{ key: "new", label: "One invoice" }, { key: "sales", label: "Sales change" }, { key: "replays", label: "Automation replays" }]}
        />

        {tab === "replays" ? <WorkflowReplays /> : tab === "sales" ? <SalesWhatIf /> : (
          invoicesLoading ? (
            <div className={lab.lab} aria-busy="true">
              <div className={lab.rail}><div className="skeleton" style={{ height: 220, borderRadius: 6 }} /></div>
              <div className={lab.main}><div className="skeleton" style={{ height: 180, borderRadius: 6 }} /></div>
              <div className={lab.side}><div className="skeleton" style={{ height: 120, borderRadius: 6 }} /></div>
            </div>
          ) : invoicesError ? (
            <RetryLine error={invoicesError} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : invoices.length === 0 ? (
            <EmptyNote action={<Link href="/decisions/import" className="ui-btn ui-btn-secondary ui-btn-sm"><IconUpload size={13} /> Bring your data</Link>}>
              No open invoices to simulate against. Import your receivables or connect Tally, and every open invoice can be tried here.
            </EmptyNote>
          ) : (
            <div className={lab.lab}>
              <Assumptions
                invoices={invoices}
                selected={selectedInvoice}
                selectedId={selectedInvoiceId}
                onSelect={(id) => setSelectedInvoiceId(id)}
                mode={mode}
                onMode={setMode}
                running={running}
                onRun={runSimulation}
                stale={!!result && (ranFor?.invoice?.id !== selectedInvoiceId || ranFor?.mode !== mode)}
              />
              <div className={lab.main}>
                <SectionTitle className="section-label-lead">Comparison · next 30 days</SectionTitle>
                {runError ? (
                  <RetryLine error={humaneError(runError, "Starlane couldn't run this simulation just now. Try again in a moment.")} onRetry={runSimulation} />
                ) : null}
                {result && ranFor ? <ScenarioResult result={result} invoice={ranFor.invoice} mode={ranFor.mode} /> : !runError && (
                  <div aria-busy={running || undefined}>
                    <p className={lab.placeholder}>
                      {running ? "Working it out from your ledger…" : "Simulate to compare your overdue total and cash outlook as things are with the same figures if this invoice goes the way you picked."}
                    </p>
                    <div className={lab.placeholderRows} aria-hidden="true">
                      <div><span>Overdue in 30 days</span></div>
                      <div><span>Change in overdue</span></div>
                      <div><span>Cash vs. outlook</span></div>
                    </div>
                  </div>
                )}
              </div>
              <aside className={lab.side} aria-label="Uncertainty">
                {result && ranFor ? <Uncertainty result={result} invoice={ranFor.invoice} /> : (
                  <div>
                    <SectionTitle>Uncertainty</SectionTitle>
                    <p className={lab.small}>The range between your best reasonable and stress cases appears here, with how strong each assumption is.</p>
                  </div>
                )}
              </aside>
            </div>
          )
        )}
      </PageBody>
    </DashboardLayout>
  );
}

const STRENGTH: Record<string, string> = { STRONG: "High", HIGH: "High", MODERATE: "Medium", MEDIUM: "Medium", WEAK: "Low", LOW: "Low" };

function Assumptions({ invoices, selected, selectedId, onSelect, mode, onMode, running, onRun, stale }: {
  invoices: ScenarioInvoice[]; selected: ScenarioInvoice | null; selectedId: string; onSelect: (id: string) => void;
  mode: Mode; onMode: (m: Mode) => void; running: boolean; onRun: () => void; stale: boolean;
}) {
  const choice = (m: Mode, title: string, hint: string) => (
    <label className={`${lab.choice} ${mode === m ? "" : lab.choiceOff}`}>
      <input type="radio" name="sim-mode" value={m} checked={mode === m} onChange={() => onMode(m)} />
      <span className="min-w-0">
        <span className={lab.choiceTitle}>{title}</span>
        <span className={lab.choiceHint}>{hint}</span>
      </span>
    </label>
  );
  return (
    <section aria-labelledby="sim-assumptions" className={lab.rail}>
      <h2 id="sim-assumptions" className="section-label">Assumptions</h2>

      <div className={lab.field} style={{ marginTop: 0 }}>
        <label htmlFor="sim-invoice" className={lab.fieldLabel}>Invoice</label>
        <div className="relative">
          <select id="sim-invoice" value={selectedId} onChange={(e) => onSelect(e.target.value)} className="ui-input sim-select" style={{ width: "100%", paddingRight: 30, fontSize: 12.5 }}>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.customer_name || "Unknown customer"} · {inv.currency && inv.currency !== "INR" ? amount(inv.invoice_amount, inv.currency) : inrShort(inv.invoice_amount)}
              </option>
            ))}
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute" style={{ right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "inline-flex" }}><IconChevronDown size={14} /></span>
        </div>
        {selected && (
          <dl className={lab.facts}>
            <dt>Amount</dt><dd>{amount(selected.invoice_amount, selected.currency)}</dd>
            <dt>Due</dt><dd title={selected.due_date ? formatDue(selected.due_date) : undefined}>{selected.due_date ? formatDate(selected.due_date) : "Not known"}</dd>
            {selected.days_overdue != null && selected.days_overdue > 0 && <><dt>Overdue</dt><dd>{selected.days_overdue} days</dd></>}
          </dl>
        )}
      </div>

      <fieldset className={`${lab.choices} ${lab.field}`} style={{ marginTop: 18 }}>
        <legend className={lab.fieldLabel}>Over the next 30 days</legend>
        {choice("earlier", "It gets collected", "Paid in full")}
        {choice("unpaid", "It stays unpaid", "Nothing comes in")}
      </fieldset>

      <button type="button" onClick={onRun} disabled={!selectedId || running} className={`ui-btn ui-btn-primary ${lab.run}`}>
        {running ? "Simulating…" : stale ? "Simulate again" : "Simulate"}
      </button>
      <p className={lab.hint}>{stale ? "The result shown is for your previous choice." : "Nothing is saved; your books are not changed."}</p>
    </section>
  );
}

function ScenarioResult({ result, invoice, mode }: { result: SimulateScenarioResponse; invoice: ScenarioInvoice | null; mode: Mode }) {
  const b = result.baseline;
  const p = result.simulated.projected_state;
  const cur = invoice?.currency || "INR";
  const name = invoice?.customer_name || "this customer";
  const cases = b.cases || null;
  const dash = <span className={lab.empty} title="The reference the other columns are measured against">—</span>;
  const tone = (v: number, goodWhenNegative = false) => (v === 0 ? "" : (v < 0) === goodWhenNegative ? lab.good : lab.bad);
  // The bounded cases as overdue totals, and their difference from today and
  // from the baseline outlook: arithmetic on the figures the engine returned.
  const caseOverdue = (c: { cashImpact: number }) => Math.abs(c.cashImpact);
  const caseChange = (c: { cashImpact: number }) => (b.totalOverdue != null ? caseOverdue(c) - b.totalOverdue : null);
  const caseCash = (c: { cashImpact: number }) => (cases ? c.cashImpact - cases.baseline.cashImpact : null);
  // Past ₹100 crore the full figures no longer fit five columns; the whole
  // table then switches to the short form together, with the full figure on hover.
  const biggest = Math.max(Math.abs(b.totalOverdue || 0), Math.abs(p.projectedTotalOverdue), cases ? Math.abs(cases.stress.cashImpact) : 0);
  const compact = cur === "INR" && biggest >= 1e9;
  const fig = (v: number) => (compact ? <span title={amount(v, cur)}>{inrShort(v)}</span> : amount(v, cur));
  const signed = (v: number) => (compact ? <span title={signedAmount(v, cur)}>{v > 0 ? "+" : v < 0 ? "−" : ""}{inrShort(Math.abs(v))}</span> : signedAmount(v, cur));
  const cell = (v: number | null) => (v == null ? <span className={lab.empty}>—</span> : signed(v));

  const reasons: string[] = [
    p.narrative,
    b.totalOverdue != null && b.totalOpenReceivables != null
      ? `Today ${amount(b.totalOverdue, cur)} of your ${amount(b.totalOpenReceivables, cur)} in open invoices is overdue.`
      : "",
    mode === "earlier"
      ? `If ${name} pays, your overdue total in 30 days falls to ${amount(p.projectedTotalOverdue, cur)}.`
      : `If ${name} doesn't pay, your overdue total stays at ${amount(p.projectedTotalOverdue, cur)} and this invoice keeps ageing.`,
  ].filter(Boolean);

  return (
    <section aria-label="Result" className="fade-once">
      <p className={lab.context}>
        If <b>{name}</b>{/s$/i.test(name) ? "’" : "’s"} {invoice ? <b className="num">{amount(invoice.invoice_amount, cur)}</b> : null} invoice {mode === "earlier" ? "is collected" : "stays unpaid"}, against your own bounded cases.
      </p>
      <div className={lab.headline}>
        <div>
          <div className={lab.hlLabel}>Overdue in 30 days</div>
          <div className={lab.hlValue}>{amount(p.projectedTotalOverdue, cur)}</div>
        </div>
        <div>
          <div className={`${lab.hlDelta} ${tone(result.delta.delta, true)}`}>{signedAmount(result.delta.delta, cur)}</div>
          {b.totalOverdue != null && <div className={lab.hlNote}>against <b>{amount(b.totalOverdue, cur)}</b> as things are</div>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className={lab.table}>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Measure</span></th>
              <th scope="col">As things are<span className={lab.sub}>Today</span></th>
              <th scope="col" className={lab.focus}>This what-if<span className={lab.sub}>{mode === "earlier" ? "Collected" : "Stays unpaid"}</span></th>
              {cases && <th scope="col">Best case<span className={lab.sub}>Reasonable</span></th>}
              {cases && <th scope="col">Stress<span className={lab.sub}>Worst bounded</span></th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Overdue in 30 days</th>
              <td>{b.totalOverdue != null ? fig(b.totalOverdue) : <span className={lab.empty}>—</span>}</td>
              <td className={lab.focus}>{fig(p.projectedTotalOverdue)}</td>
              {cases && <td>{fig(caseOverdue(cases.bestReasonable))}</td>}
              {cases && <td>{fig(caseOverdue(cases.stress))}</td>}
            </tr>
            <tr>
              <th scope="row">Change in overdue</th>
              <td>{dash}</td>
              <td className={`${lab.focus} ${tone(result.delta.delta, true)}`}>{signed(result.delta.delta)}</td>
              {cases && <td>{cell(caseChange(cases.bestReasonable))}</td>}
              {cases && <td>{cell(caseChange(cases.stress))}</td>}
            </tr>
            <tr>
              <th scope="row">Cash vs. outlook</th>
              <td>{dash}</td>
              <td className={`${lab.focus} ${tone(p.cashImpactDelta)}`}>{signed(p.cashImpactDelta)}</td>
              {cases && <td>{cell(caseCash(cases.bestReasonable))}</td>}
              {cases && <td>{cell(caseCash(cases.stress))}</td>}
            </tr>
          </tbody>
        </table>
      </div>
      <ul className={lab.why}>
        {reasons.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <p className={lab.foot}>{result.delta.note}</p>
    </section>
  );
}

/** Uncertainty: the bounded range the backend returned, the strength of
 *  each assumption and what would invalidate the result. Nothing more. */
function Uncertainty({ result, invoice }: { result: SimulateScenarioResponse; invoice: ScenarioInvoice | null }) {
  const cur = invoice?.currency || "INR";
  const b = result.baseline;
  const p = result.simulated.projected_state;
  const cases = b.cases || null;
  const lo = cases ? Math.abs(cases.bestReasonable.cashImpact) : null;
  const hi = cases ? Math.abs(cases.stress.cashImpact) : null;
  const max = Math.max(hi || 0, b.totalOverdue || 0, p.projectedTotalOverdue || 0, 1);
  const x = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const assumptions = result.simulated.assumptions || [];
  const invalid = result.simulated.invalidation_conditions || [];
  return (
    <>
      <div>
        <SectionTitle>Uncertainty</SectionTitle>
        {lo != null && hi != null ? (
          <>
            <p className={lab.small}>Overdue in 30 days, from the best reasonable case to stress.</p>
            <div className={lab.range}><span>{amount(lo, cur)}</span> – <span>{amount(hi, cur)}</span></div>
            <div className={lab.band} role="img" aria-label={`Range ${amount(lo, cur)} to ${amount(hi, cur)}; as things are ${amount(b.totalOverdue, cur)}; this what-if ${amount(p.projectedTotalOverdue, cur)}`}>
              <div className={lab.bandTrack} />
              <div className={lab.bandRange} style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />
              {b.totalOverdue != null && <div className={lab.bandMark} style={{ left: x(b.totalOverdue) }} />}
              <div className={`${lab.bandMark} ${lab.bandMarkOn}`} style={{ left: x(p.projectedTotalOverdue) }} />
            </div>
            <div className={lab.bandScale}><span>{inrShort(0)}</span><span>{inrShort(max)}</span></div>
            <div className={lab.legend}>
              <span><i aria-hidden="true" className={`${lab.key} ${lab.keyRange}`} />Best reasonable to stress</span>
              <span><i aria-hidden="true" className={`${lab.key} ${lab.keyOn}`} />This what-if</span>
              {b.totalOverdue != null && <span><i aria-hidden="true" className={lab.key} />As things are</span>}
            </div>
          </>
        ) : (
          <p className={lab.small}>No bounded cases were returned for this scenario.</p>
        )}
        {result.simulated.uncertainty == null && <p className={lab.small} style={{ marginTop: 12, color: "var(--ink-3)" }}>No probability band was computed for this what-if; it is a single path.</p>}
      </div>

      {assumptions.length > 0 && (
        <div>
          <SectionTitle>Assumption strength</SectionTitle>
          {assumptions.map((a, i) => (
            <div key={i} className={lab.kv} title={a.basis}>
              <span className={lab.kvLabel}>{a.assumption.replace(/\b[Ii]nvoice inv-[\w-]+\b/g, "This invoice").replace(/\binv-[\w-]+\b/g, "this invoice")}</span>
              <span className={lab.kvValue}>{STRENGTH[a.strength] || sentence(a.strength)}</span>
            </div>
          ))}
        </div>
      )}

      {invalid.length > 0 && (
        <div>
          <SectionTitle>Would be wrong if</SectionTitle>
          <ul className={lab.smallList}>
            {invalid.map((c) => <li key={c}>{c.replace(/payment_status/g, "payment status").replace(/\binvoice inv-[\w-]+\b/g, "this invoice")}</li>)}
          </ul>
        </div>
      )}

      {result.fx?.reason && (
        <div>
          <SectionTitle>Currency</SectionTitle>
          <p className={lab.small}>{result.fx.reason}</p>
        </div>
      )}
    </>
  );
}
