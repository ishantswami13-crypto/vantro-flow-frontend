"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, type ScenarioInvoice, type SimulateScenarioResponse } from "@/lib/api";
import { SalesWhatIf, WorkflowReplays } from "@/components/os/SimulatePanels";
import { PageHeader, Subnav, Figure, EmptyLine } from "@/components/v32/ui";
import { IconChevronDown, IconSimulate, IconUpload } from "@/components/v32/icons";
import { PageBody, RetryLine, amount, signedAmount, humaneError } from "@/components/os/prepared/kit";
import { SimBars } from "@/components/os/simulate/SimChart";
import { formatDate, formatDue } from "@/lib/format";

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
        <PageHeader title="Simulate" subtitle="Try a what-if against your own figures. Nothing is saved and your books are not changed." />
        <Subnav
          active={tab}
          onChange={(k) => setTab(k as Tab)}
          label="Simulations"
          items={[{ key: "new", label: "One invoice" }, { key: "sales", label: "Sales change" }, { key: "replays", label: "Automation replays" }]}
        />

        {tab === "replays" ? <WorkflowReplays /> : tab === "sales" ? <SalesWhatIf /> : (
          invoicesLoading ? (
            <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
              <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
            </div>
          ) : invoicesError ? (
            <RetryLine error={invoicesError} onRetry={() => setReloadKey((k) => k + 1)} />
          ) : invoices.length === 0 ? (
            <EmptyLine
              icon={<IconSimulate size={17} />}
              title="No open invoices to simulate against"
              body="Simulate works from your own receivables. Import them or connect Tally, and every open invoice can be tried here."
              action={<Link href="/decisions/import" className="ui-btn ui-btn-secondary ui-btn-sm"><IconUpload size={14} /> Bring your data</Link>}
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] items-start">
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
              <div className="min-w-0 flex flex-col" style={{ gap: 16 }}>
                {runError ? (
                  <RetryLine error={humaneError(runError, "Starlane couldn't run this simulation just now. Try again in a moment.")} onRetry={runSimulation} />
                ) : null}
                {result && ranFor ? <ScenarioResult result={result} invoice={ranFor.invoice} mode={ranFor.mode} /> : !runError && <ResultPlaceholder running={running} />}
              </div>
            </div>
          )
        )}
      </PageBody>
    </DashboardLayout>
  );
}

const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--line-card)", borderRadius: 12 };

function Assumptions({ invoices, selected, selectedId, onSelect, mode, onMode, running, onRun, stale }: {
  invoices: ScenarioInvoice[]; selected: ScenarioInvoice | null; selectedId: string; onSelect: (id: string) => void;
  mode: Mode; onMode: (m: Mode) => void; running: boolean; onRun: () => void; stale: boolean;
}) {
  const choice = (m: Mode, title: string, hint: string) => {
    const on = mode === m;
    return (
      <label className="flex items-start cursor-pointer row-hover" style={{ gap: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${on ? "rgba(var(--accent-rgb), 0.55)" : "var(--line-input)"}`, background: on ? "var(--selected)" : "transparent" }}>
        <input type="radio" name="sim-mode" value={m} checked={on} onChange={() => onMode(m)} className="sim-radio" />
        <span className="min-w-0">
          <span style={{ display: "block", fontSize: 13, color: "var(--ink)" }}>{title}</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{hint}</span>
        </span>
      </label>
    );
  };
  return (
    <section aria-labelledby="sim-assumptions" style={{ ...panel, padding: 20 }} className="fade-once">
      <h2 id="sim-assumptions" style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 17, color: "var(--ink)" }}>Assumptions</h2>
      <p style={{ margin: "4px 0 16px", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>Pick one open invoice and what happens to it over the next 30 days.</p>

      <label htmlFor="sim-invoice" style={{ display: "block", fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>Invoice</label>
      <div className="relative">
        <select id="sim-invoice" value={selectedId} onChange={(e) => onSelect(e.target.value)} className="ui-input sim-select" style={{ width: "100%", paddingRight: 32 }}>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.customer_name || "Unknown customer"} · {amount(inv.invoice_amount, inv.currency)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute" style={{ right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "inline-flex" }}><IconChevronDown size={14} /></span>
      </div>
      {selected && (
        <dl className="grid" style={{ gridTemplateColumns: "auto 1fr", columnGap: 12, rowGap: 4, margin: "10px 0 0", fontSize: 12.5 }}>
          <dt style={{ color: "var(--ink-3)" }}>Amount</dt><dd style={{ margin: 0, color: "var(--ink)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{amount(selected.invoice_amount, selected.currency)}</dd>
          <dt style={{ color: "var(--ink-3)" }}>Due</dt><dd style={{ margin: 0, color: "var(--ink)", textAlign: "right" }}>{selected.due_date ? `${formatDate(selected.due_date)}, ${formatDue(selected.due_date)}` : "Not known yet"}</dd>
        </dl>
      )}

      <fieldset style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
        <legend style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>What happens</legend>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {choice("earlier", "It gets collected", "Paid in full within the next 30 days")}
          {choice("unpaid", "It stays unpaid", "Nothing comes in for the next 30 days")}
        </div>
      </fieldset>

      <button type="button" onClick={onRun} disabled={!selectedId || running} className="ui-btn ui-btn-primary" style={{ width: "100%", marginTop: 18, height: 38 }}>
        {running ? "Running…" : stale ? "Run again" : "Run simulation"}
      </button>
      {stale && <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-3)" }}>The result shown is for your previous choice.</p>}
    </section>
  );
}

function ResultPlaceholder({ running }: { running: boolean }) {
  return (
    <div style={{ ...panel, padding: "28px 24px", borderStyle: "dashed", background: "transparent" }} aria-busy={running || undefined}>
      <p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>{running ? "Working it out from your ledger…" : "The 30-day effect appears here"}</p>
      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 520 }}>
        Starlane compares your overdue total and cash outlook today with the same figures if this invoice goes the way you picked. Every number comes from your own invoices.
      </p>
    </div>
  );
}

function ScenarioResult({ result, invoice, mode }: { result: SimulateScenarioResponse; invoice: ScenarioInvoice | null; mode: Mode }) {
  const b = result.baseline;
  const p = result.simulated.projected_state;
  const cur = invoice?.currency || "INR";
  const cashDelta = p.cashImpactDelta;
  const overdueDelta = result.delta.delta;
  const name = invoice?.customer_name || "this customer";
  const cases = b.cases || null;

  // Each bar is a figure the backend returned: the overdue total in 30 days
  // under its bounded cases, and under this scenario.
  const bars = [
    cases ? { label: "Best reasonable", value: Math.abs(cases.bestReasonable.cashImpact), tone: "muted" as const } : null,
    b.totalOverdue != null ? { label: "As things are", value: b.totalOverdue, tone: "ink" as const } : null,
    { label: "This what-if", value: p.projectedTotalOverdue, tone: "accent" as const },
    cases ? { label: "Stress case", value: Math.abs(cases.stress.cashImpact), tone: "muted" as const } : null,
  ].filter((x): x is { label: string; value: number; tone: "muted" | "ink" | "accent" } => !!x && Number.isFinite(x.value));

  const reasons: string[] = [
    p.narrative,
    b.totalOverdue != null && b.totalOpenReceivables != null
      ? `Today ${amount(b.totalOverdue, cur)} of your ${amount(b.totalOpenReceivables, cur)} in open invoices is overdue.`
      : "",
    mode === "earlier"
      ? `If ${name} pays, your overdue total in 30 days falls to ${amount(p.projectedTotalOverdue, cur)}.`
      : `If ${name} doesn't pay, your overdue total stays at ${amount(p.projectedTotalOverdue, cur)} and this invoice keeps ageing.`,
    result.fx?.reason ? result.fx.reason : "",
  ].filter(Boolean);

  return (
    <section aria-label="Result" className="fade-once flex flex-col" style={{ gap: 16 }}>
      <div style={{ ...panel, padding: "20px 22px" }}>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 14 }}>
          If {name}&apos;s {invoice ? amount(invoice.invoice_amount, cur) : ""} invoice {mode === "earlier" ? "is collected" : "stays unpaid"} · next 30 days
        </div>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
          <Figure value={signedAmount(cashDelta, cur)} label="Cash against today's outlook" tone={cashDelta > 0 ? "var(--positive)" : cashDelta < 0 ? "var(--critical)" : undefined} />
          <Figure value={amount(p.projectedTotalOverdue, cur)} label="Overdue in 30 days" />
          <Figure value={signedAmount(overdueDelta, cur)} label="Change in overdue" tone={result.delta.direction === "IMPROVEMENT_VS_BASELINE" ? "var(--positive)" : result.delta.direction === "WORSE_VS_BASELINE" ? "var(--critical)" : undefined} />
        </div>
      </div>

      <div style={{ ...panel, padding: "18px 22px 12px" }}>
        <div className="flex items-baseline justify-between flex-wrap" style={{ gap: 8, marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Overdue after 30 days</h3>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Your bounded cases against this what-if</span>
        </div>
        <SimBars bars={bars} ariaLabel={bars.map((x) => `${x.label}: ${amount(x.value, cur)}`).join(". ")} />
      </div>

      <div style={{ padding: "4px 2px" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Why</h3>
        <ul className="flex flex-col" style={{ gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
          {reasons.map((r) => (
            <li key={r} className="flex" style={{ gap: 10, fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>
              <span aria-hidden="true" style={{ color: "var(--ink-3)" }}>–</span><span>{r}</span>
            </li>
          ))}
        </ul>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-3)" }}>{result.delta.note}</p>
      </div>
    </section>
  );
}
