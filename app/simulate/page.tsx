"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, type ScenarioInvoice, type SimulateScenarioResponse } from "@/lib/api";

// Simulate — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§6/§14/§16.
//
// Priority 3 (Simulate V1): the "New" tab is now wired to a real, reachable
// endpoint — POST /api/intelligence/scenarios/:userId (lib/routes/scenarios.js)
// — which runs scenarioEngine.js's buildScenario/compareScenarios over a
// real BASELINE cash consequence (cashConsequenceEngine.js) and the tenant's
// own real open invoice, plus fxScenarioEngine.js's buildFxScenarioChain for
// whatever real currency-exposure data exists (honestly NO_EFFECT/
// INSUFFICIENT_CONTEXT for tenants with none today — no fabricated FX number
// is ever shown). Saved/Comparisons/Forecasts remain genuine V32 empty
// states: no persistence layer exists for saved simulations yet.
//
// The generic fuel-cost/lead-time/demand assumption-pill engine described in
// the handoff still doesn't exist — this tab implements the real, narrower
// capability that scenarioEngine.js + fxScenarioEngine.js actually support
// today (named invoice hypotheticals), not the broader one that was never
// built.

type TabKey = "new" | "saved" | "comparisons" | "forecasts";

const TABS: { key: TabKey; label: string }[] = [
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "comparisons", label: "Comparisons" },
  { key: "forecasts", label: "Forecasts" },
];

const TAB_COPY: Record<Exclude<TabKey, "new">, { title: string; body: string }> = {
  saved: {
    title: "No saved simulations",
    body: "This tab would list simulations you've saved for later. Since simulations aren't persisted yet, none exist to save.",
  },
  comparisons: {
    title: "No comparisons yet",
    body: "This tab would let you compare two or more simulation runs side by side. Since simulations aren't persisted yet, there's nothing to compare.",
  },
  forecasts: {
    title: "No linked forecasts",
    body: "This tab would show simulations linked back to the cash forecast they were run against. That linkage doesn't exist yet.",
  },
};

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
  const [tab, setTab] = useState<TabKey>("new");
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<ScenarioInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState("");

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [mode, setMode] = useState<"earlier" | "unpaid">("earlier");
  const [daysEarlier, setDaysEarlier] = useState<number>(7);

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

  return (
    <DashboardLayout pageTitle="Simulate">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Simulate
          </h1>
        </div>

        <nav aria-label="Secondary" style={{ display: "flex", alignItems: "center", gap: 22, borderBottom: "1px solid #EBEAE6", marginBottom: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="hover-dim"
              style={{
                padding: "8px 2px",
                fontSize: 13,
                fontWeight: t.key === tab ? 500 : 400,
                color: t.key === tab ? "#191917" : "#63635F",
                background: "none",
                border: "none",
                borderBottomColor: t.key === tab ? "#696D86" : "transparent",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab !== "new" ? (
          <div
            style={{
              flex: 1, minHeight: 0, boxSizing: "border-box", background: "#FFFFFF",
              border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            <div className="fade-once py-10 text-center" style={{ padding: "40px 24px" }}>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917", marginBottom: 6 }}>
                {TAB_COPY[tab].title}
              </p>
              <p className="v32-body max-w-md mx-auto" style={{ color: "#63635F" }}>{TAB_COPY[tab].body}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Real picker: the tenant's own open/overdue invoices. */}
            <div style={{ background: "#FFFFFF", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {invoicesLoading ? (
                <p className="v32-body" style={{ color: "#63635F" }}>Loading your open invoices…</p>
              ) : invoicesError ? (
                <p className="v32-body" style={{ color: "#B3261E" }}>{invoicesError}</p>
              ) : invoices.length === 0 ? (
                <p className="v32-body" style={{ color: "#63635F" }}>No open (non-Paid) invoices to simulate against yet.</p>
              ) : (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#63635F", flex: "1 1 260px" }}>
                      Invoice
                      <select
                        value={selectedInvoiceId}
                        onChange={(e) => { setSelectedInvoiceId(e.target.value); setResult(null); }}
                        style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(25,25,23,0.16)", fontSize: 13, color: "#191917", background: "#FBFAF7" }}
                      >
                        {invoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.customer_name || "Unknown customer"} — {fmt(inv.invoice_amount)}
                            {inv.days_overdue != null ? ` (${inv.days_overdue}d overdue)` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#63635F" }}>
                      Assumption
                      <select
                        value={mode}
                        onChange={(e) => { setMode(e.target.value as "earlier" | "unpaid"); setResult(null); }}
                        style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(25,25,23,0.16)", fontSize: 13, color: "#191917", background: "#FBFAF7" }}
                      >
                        <option value="earlier">Paid X days earlier</option>
                        <option value="unpaid">Remains unpaid</option>
                      </select>
                    </label>

                    {mode === "earlier" && (
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#63635F" }}>
                        Days earlier
                        <input
                          type="number"
                          min={0}
                          value={daysEarlier}
                          onChange={(e) => { setDaysEarlier(Number(e.target.value) || 0); setResult(null); }}
                          style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(25,25,23,0.16)", fontSize: 13, color: "#191917", width: 90, background: "#FBFAF7" }}
                        />
                      </label>
                    )}

                    <button
                      onClick={runSimulation}
                      disabled={!selectedInvoiceId || running}
                      className="btn-secondary-v32"
                      style={{ padding: "9px 18px", fontSize: 13, opacity: !selectedInvoiceId || running ? 0.5 : 1 }}
                    >
                      {running ? "Running…" : "Run simulation"}
                    </button>
                  </div>
                  {selectedInvoice && (
                    <p style={{ fontSize: 12, color: "#9A9A94" }}>
                      Real invoice amount: {fmt(selectedInvoice.invoice_amount)} {selectedInvoice.currency || ""}
                    </p>
                  )}
                  {runError && <p style={{ fontSize: 12, color: "#B3261E" }}>{runError}</p>}
                </>
              )}
            </div>

            {result && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
                <SimCard
                  title="CURRENT BASELINE"
                  accent="#63635F"
                  rows={[
                    ["Total open receivables", fmt(result.baseline.totalOpenReceivables)],
                    ["Total overdue", fmt(result.baseline.totalOverdue)],
                  ]}
                  note="Real, observed pattern — from cashConsequenceEngine.js"
                />
                <SimCard
                  title="SIMULATED RESULT"
                  accent="#3B6E4F"
                  rows={[
                    ["Projected total overdue", fmt(result.simulated.projected_state.projectedTotalOverdue)],
                    ["Cash impact delta", fmt(result.simulated.projected_state.cashImpactDelta)],
                  ]}
                  note={result.simulated.projected_state.narrative}
                />
                <SimCard
                  title="DELTA"
                  accent={result.delta.direction === "IMPROVEMENT_VS_BASELINE" ? "#3B6E4F" : result.delta.direction === "WORSE_VS_BASELINE" ? "#B3261E" : "#63635F"}
                  rows={[
                    ["Overdue delta vs baseline", fmt(result.delta.delta)],
                    ["Direction", result.delta.direction.replace(/_/g, " ")],
                  ]}
                  note={result.delta.note}
                />
              </div>
            )}

            {result && (
              <div style={{ background: "#FFFFFF", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, padding: 16 }}>
                <p style={{ fontSize: 11, letterSpacing: 0.5, color: "#63635F", marginBottom: 8 }}>FX SCENARIO</p>
                {result.fx.impact_mode === "NO_EFFECT" || result.fx.impact_mode === "INSUFFICIENT_CONTEXT" ? (
                  <p className="v32-body" style={{ color: "#9A9A94" }}>
                    No FX exposure data available for this scenario yet — {result.fx.reason}
                  </p>
                ) : (
                  <p className="v32-body" style={{ color: "#191917" }}>{result.fx.reason}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SimCard({ title, accent, rows, note }: { title: string; accent: string; rows: [string, string][]; note: string }) {
  return (
    <div
      style={{
        boxSizing: "border-box",
        background: "#FFFFFF",
        border: `1px solid ${accent}33`,
        borderTop: `3px solid ${accent}`,
        borderRadius: 8,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 11, letterSpacing: 0.5, color: accent, fontWeight: 600 }}>{title}</span>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#63635F" }}>{label}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', 'SFMono-Regular', monospace", fontSize: 13, color: "#191917" }}>{value}</span>
        </div>
      ))}
      <span style={{ fontSize: 11.5, color: "#9A9A94", marginTop: 4 }}>{note}</span>
    </div>
  );
}
