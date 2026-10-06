"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, type ScenarioInvoice, type SimulateScenarioResponse } from "@/lib/api";
import { SalesWhatIf, WorkflowReplays } from "@/components/os/SimulatePanels";
import { PageHeader, Subnav } from "@/components/v32/ui";

// Simulate — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§6/§14/§16.
//
// Priority 3 (Simulate V1): the "New" tab is now wired to a real, reachable
// endpoint — POST /api/intelligence/scenarios/:userId (lib/routes/scenarios.js)
// — which runs scenarioEngine.js's buildScenario/compareScenarios over a
// real BASELINE cash consequence (cashConsequenceEngine.js) and the tenant's
// own real open invoice, plus fxScenarioEngine.js's buildFxScenarioChain for
// whatever real currency-exposure data exists (honestly NO_EFFECT/
// INSUFFICIENT_CONTEXT for tenants with none today — no fabricated FX number
// is ever shown). The Saved/Comparisons/Forecasts tabs are not shown: no
// persistence layer exists for saved simulations, so they could only ever
// be empty. Decision simulations are saved with their decision instead.
//
// The generic fuel-cost/lead-time/demand assumption-pill engine described in
// the handoff still doesn't exist — this tab implements the real, narrower
// capability that scenarioEngine.js + fxScenarioEngine.js actually support
// today (named invoice hypotheticals), not the broader one that was never
// built.

const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return abs >= 100000 ? `${sign}₹${(abs / 100000).toFixed(1)}L` : `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`;
};

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
  const [invoicesError, setInvoicesError] = useState("");

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [mode, setMode] = useState<"earlier" | "unpaid">("earlier");
  // The engine compares "collected inside its 30-day horizon" with the baseline,
  // so a day count would not change the result; none is asked for.
  const daysEarlier = 0;

  const [result, setResult] = useState<SimulateScenarioResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");

  useEffect(() => {
    const user = getUser();
    setUserId(user?.id || null);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setInvoicesLoading(true);
    setInvoicesError("");
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
      .catch((e) => setInvoicesError(e instanceof Error ? e.message : "Could not load invoices"))
      .finally(() => setInvoicesLoading(false));
  }, [userId, searchParams]);

  const runSimulation = useCallback(async () => {
    if (!userId || !selectedInvoiceId) return;
    setRunning(true);
    setRunError("");
    setResult(null);
    try {
      const res = await api.intelligence.simulateScenario(userId, {
        targetInvoiceId: selectedInvoiceId,
        ...(mode === "unpaid" ? { remainsUnpaid: true } : { daysEarlier }),
      });
      setResult(res);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Could not run simulation");
    } finally {
      setRunning(false);
    }
  }, [userId, selectedInvoiceId, mode, daysEarlier]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) || null;

  const [tab, setTab] = useState<"new" | "sales" | "replays">("new");
  const pill: React.CSSProperties = { padding: "8px 30px 8px 14px", border: "1px solid rgba(25,25,23,0.14)", borderRadius: 20, fontSize: 12.5, color: "#43433F", background: "transparent", maxWidth: "100%" };
  const tone = (n: number | null | undefined, goodWhenNegative = false) =>
    n == null || n === 0 ? "#191917" : (n < 0) === goodWhenNegative ? "#477054" : "#A64F4B";

  return (
    <DashboardLayout pageTitle="Simulate">
      <PageHeader title="Simulate" subtitle="Try a what-if against your own open invoices" />
      <Subnav
        active={tab}
        onChange={(k) => setTab(k as "new" | "sales" | "replays")}
        items={[{ key: "new", label: "One invoice" }, { key: "sales", label: "Sales change" }, { key: "replays", label: "Workflow replays" }]}
      />

      {tab === "replays" ? <WorkflowReplays /> : tab === "sales" ? <SalesWhatIf /> : (
        <>
          {/* Assumptions: the tenant's own open invoices, and the two
              hypotheticals scenarioEngine.js really supports. */}
          <div style={{ boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 0, color: "#63635F", marginBottom: 12 }}>Assumptions</div>
            {invoicesLoading ? (
              <p style={{ fontSize: 13, color: "#63635F" }}>Loading your open invoices…</p>
            ) : invoicesError ? (
              <p style={{ fontSize: 13, color: "#A64F4B" }}>{invoicesError}</p>
            ) : invoices.length === 0 ? (
              <p style={{ fontSize: 13, color: "#63635F" }}>No open invoices to simulate against yet. Import your receivables or connect Tally first.</p>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <label className="sr-only" htmlFor="sim-invoice">Invoice</label>
                  <select
                    id="sim-invoice"
                    value={selectedInvoiceId}
                    onChange={(e) => { setSelectedInvoiceId(e.target.value); setResult(null); }}
                    className="hover-lift sim-pill"
                    style={pill}
                  >
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.customer_name || "Unknown customer"} · {fmt(inv.invoice_amount)}
                        {inv.days_overdue != null ? ` · ${inv.days_overdue}d overdue` : ""}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="sim-mode">Assumption</label>
                  <select
                    id="sim-mode"
                    value={mode}
                    onChange={(e) => { setMode(e.target.value as "earlier" | "unpaid"); setResult(null); }}
                    className="hover-lift sim-pill"
                    style={pill}
                  >
                    <option value="earlier">Gets collected in the next 30 days</option>
                    <option value="unpaid">Remains unpaid</option>
                  </select>
                  <button
                    onClick={runSimulation}
                    disabled={!selectedInvoiceId || running}
                    className="btn-primary-v32"
                    style={{ marginLeft: "auto", padding: "9px 16px", borderRadius: 6, fontSize: 12.5, opacity: !selectedInvoiceId || running ? 0.4 : 1 }}
                  >
                    {running ? "Running…" : "Run simulation"}
                  </button>
                </div>
                {selectedInvoice && (
                  <p style={{ fontSize: 12, color: "#8A8A86", marginTop: 10 }}>
                    Invoice amount {fmt(selectedInvoice.invoice_amount)} {selectedInvoice.currency || ""}, from your ledger.
                  </p>
                )}
                {runError && <p style={{ fontSize: 12, color: "#A64F4B", marginTop: 8 }}>{runError}</p>}
              </>
            )}
          </div>

          {result && (
            <>
              <div style={{ fontSize: 11, letterSpacing: 0, color: "#63635F" }}>DOWNSTREAM EFFECTS · 30-DAY HORIZON</div>
              <div className="grid gap-4 md:grid-cols-3">
                <SimCard label="Projected overdue" value={fmt(result.simulated.projected_state.projectedTotalOverdue)} color="#191917" note={`Today ${fmt(result.baseline.totalOverdue)} overdue of ${fmt(result.baseline.totalOpenReceivables)} open.`} />
                <SimCard label="Cash" value={fmt(result.simulated.projected_state.cashImpactDelta)} color={tone(result.simulated.projected_state.cashImpactDelta)} note={result.simulated.projected_state.narrative} />
                <SimCard label="Overdue vs today" value={fmt(result.delta.delta)} color={result.delta.direction === "IMPROVEMENT_VS_BASELINE" ? "#477054" : result.delta.direction === "WORSE_VS_BASELINE" ? "#A64F4B" : "#191917"} note={result.delta.note} />
              </div>
              <p style={{ fontSize: 12.5, color: "#8A8A86" }}>
                Currency: {result.fx.reason}
              </p>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function SimCard({ label, value, color, note }: { label: string; value: string; color: string; note: string }) {
  return (
    <div className="card-in hover-lift" style={{ boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, padding: 18 }}>
      <div style={{ fontSize: 12, color: "#63635F", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 22, color, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#63635F", lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}
