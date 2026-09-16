"use client";

// "Close the Loop" mission: an audit-ledger view for the one deep action
// this mission built end-to-end (supply_chain_intervention), reusing the
// existing ai_actions/execution_records/action_outcomes infrastructure.
// Deliberately NOT a dashboard-card layout — a flat, filterable ledger of
// real rows, each expandable to WHY / EVIDENCE / EXPECTED EFFECT / EXACT
// PAYLOAD / APPROVAL / EXECUTION RECEIPT / VERIFICATION / OUTCOME, exactly
// the sections the mission specified. The existing Action Center
// (app/ai-actions/page.tsx) remains the card-style surface for reminder/
// dunning-type actions — this is a separate, narrower ledger for
// higher-stakes supply-chain actions with a real execution+verification
// trail, not a replacement for it.
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, type IntelligenceAction, type IntelligenceActionDetailResponse } from "@/lib/api";
import { FiChevronDown, FiChevronUp, FiCheckCircle, FiXCircle, FiClock, FiAlertTriangle } from "react-icons/fi";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "Needs approval", tone: "text-warning" },
  approved: { label: "Approved", tone: "text-secondary" },
  executing: { label: "Executing", tone: "text-secondary" },
  done: { label: "Completed", tone: "text-success" },
  failed: { label: "Failed", tone: "text-danger" },
  execution_unknown: { label: "Execution unknown", tone: "text-danger" },
  rejected: { label: "Rejected", tone: "text-muted" },
  cancelled: { label: "Cancelled", tone: "text-muted" },
  expired: { label: "Expired", tone: "text-muted" },
};

type FilterTab = "needs_approval" | "in_progress" | "completed" | "failed" | "all";

function matchesTab(a: IntelligenceAction, tab: FilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "needs_approval") return a.status === "pending";
  if (tab === "in_progress") return a.status === "approved" || a.status === "executing";
  if (tab === "completed") return a.status === "done";
  if (tab === "failed") return a.status === "failed" || a.status === "execution_unknown" || a.status === "rejected";
  return true;
}

function money(n: number | null | undefined) {
  if (n == null) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function ActionRow({ action, onChanged }: { action: IntelligenceAction; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<IntelligenceActionDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const status = STATUS_LABEL[action.status] || { label: action.status, tone: "text-secondary" };

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const res = await api.intelligence.actionDetail(action.id);
      setDetail(res);
    } finally {
      setLoadingDetail(false);
    }
  }, [action.id]);

  useEffect(() => { if (open && !detail) loadDetail(); }, [open, detail, loadDetail]);

  const handleApproveAndExecute = async () => {
    setExecuting(true);
    setConfirmOpen(false);
    try {
      await api.intelligence.approveAndExecute(action.id);
    } catch {
      // Honest failure — the row's own status (refetched below) already
      // reflects failed/execution_unknown; no separate toast needed here.
    } finally {
      setExecuting(false);
      await loadDetail();
      onChanged();
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary truncate">{action.title}</p>
          <p className="text-xs text-muted mt-0.5">
            {action.parameters?.supplier.name || "—"} · {action.parameters?.products?.[0]?.quantity ?? "—"} units ·
            {" "}protects {money(action.expected_effect?.revenue_protected)}
          </p>
        </div>
        <span className={`text-xs font-semibold ${status.tone} whitespace-nowrap`}>{status.label}</span>
        <span className="text-xs text-muted whitespace-nowrap">{new Date(action.created_at).toLocaleString()}</span>
        {open ? <FiChevronUp size={16} className="text-muted flex-shrink-0" /> : <FiChevronDown size={16} className="text-muted flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 py-4 border-t border-border space-y-4 text-sm">
          {loadingDetail && !detail ? (
            <p className="text-muted text-xs">Loading audit trail…</p>
          ) : detail ? (
            <>
              <section>
                <h4 className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Why this was recommended</h4>
                <p className="text-secondary text-xs leading-relaxed">{action.description}</p>
              </section>

              {detail.evidence && detail.evidence.length > 0 && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Evidence chain</h4>
                  <ul className="space-y-1">
                    {detail.evidence.map((e, i) => (
                      <li key={i} className="text-xs text-secondary flex gap-2">
                        <span className="text-[10px] uppercase font-mono text-muted flex-shrink-0 w-28">{e.kind}</span>
                        <span>{e.label}: {e.detail}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {action.expected_effect && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Expected effect (recorded before execution)</h4>
                  <p className="text-xs text-secondary">
                    {action.expected_effect.metric}: {action.expected_effect.baseline_value} → target {action.expected_effect.target_value ?? action.expected_effect.expected_value}.
                    Revenue protected: {money(action.expected_effect.revenue_protected)}.
                  </p>
                </section>
              )}

              {action.parameters && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Exact execution payload {action.status === "pending" ? "(preview — not yet approved)" : "(frozen at approval)"}</h4>
                  <div className="text-xs text-secondary bg-surface-2 rounded-lg p-3 border border-border space-y-1">
                    <p>Supplier: {action.parameters.supplier.name}{action.parameters.supplier.phone ? ` · ${action.parameters.supplier.phone}` : ""}</p>
                    {action.parameters.products.map((p, i) => (
                      <p key={i}>Product: {p.name} ({p.sku}) — quantity {p.quantity}</p>
                    ))}
                    <p>Currency: {action.parameters.currency ?? "unknown — not recorded on this order/product schema"}</p>
                    <p>Delivery target: {action.parameters.delivery_target_days != null ? `${action.parameters.delivery_target_days} days (supplier lead time)` : "unknown"}</p>
                    <p className="text-muted">{action.parameters.notes}</p>
                  </div>
                </section>
              )}

              <section>
                <h4 className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Approval</h4>
                <p className="text-xs text-secondary">
                  {action.approved_at ? `Approved ${new Date(action.approved_at).toLocaleString()}` : "Not yet approved"}
                </p>
              </section>

              {detail.executionRecords.length > 0 && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Execution receipt</h4>
                  {detail.executionRecords.map((r) => (
                    <div key={r.id} className="text-xs text-secondary bg-surface-2 rounded-lg p-3 border border-border">
                      <p>Channel: {r.channel} · Status: {r.status}</p>
                      <p>Reference: {r.provider_message_id || "—"}</p>
                      {r.failed_reason && <p className="text-danger">Failure: {r.failed_reason}</p>}
                      <p className="text-muted">Executed: {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</p>
                    </div>
                  ))}
                  {detail.purchaseOrders.length > 0 && (
                    <p className="text-[11px] text-muted mt-1">
                      This created a real Starlane purchase_orders row (sandbox/demo adapter — no live external ERP write occurred).
                    </p>
                  )}
                </section>
              )}

              {action.last_execution_error && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-wide text-danger mb-1.5">Execution error</h4>
                  <p className="text-xs text-danger">{action.last_execution_error}</p>
                </section>
              )}

              {detail.outcomes.length > 0 && (
                <section>
                  <h4 className="text-[11px] uppercase tracking-wide text-muted mb-1.5">Verification — expected vs observed</h4>
                  {detail.outcomes.map((o) => (
                    <div key={o.id} className="text-xs text-secondary bg-surface-2 rounded-lg p-3 border border-border flex items-center justify-between">
                      <span>
                        Expected {o.expected_metric} = {o.expected_value} · Observed {o.observed_metric} = {o.observed_value ?? "pending"}
                      </span>
                      <span className={o.status === "MET" ? "text-success" : o.status === "NOT_MET" ? "text-danger" : "text-muted"}>
                        {o.status}
                      </span>
                    </div>
                  ))}
                </section>
              )}

              {action.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  {!confirmOpen ? (
                    <button
                      onClick={() => setConfirmOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-secondary text-xs font-medium hover:bg-surface-3"
                    >
                      Review action
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-secondary">Approve and execute exactly the payload shown above?</span>
                      <button
                        onClick={handleApproveAndExecute}
                        disabled={executing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-dim border border-success/30 text-success text-xs font-medium hover:bg-success/20 disabled:opacity-50"
                      >
                        <FiCheckCircle size={13} /> {executing ? "Executing…" : "Approve and execute"}
                      </button>
                      <button onClick={() => setConfirmOpen(false)} className="text-xs text-muted hover:text-secondary">Cancel</button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function SupplyChainActionsPage() {
  const [actions, setActions] = useState<IntelligenceAction[]>([]);
  const [tab, setTab] = useState<FilterTab>("needs_approval");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.intelligence.listActions("supply_chain_intervention");
      setActions(res.actions || []);
    } catch {
      setError("Could not load supply-chain actions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = actions.filter((a) => matchesTab(a, tab));
  const tabs: { key: FilterTab; label: string }[] = [
    { key: "needs_approval", label: "Needs approval" },
    { key: "in_progress", label: "In progress" },
    { key: "completed", label: "Completed" },
    { key: "failed", label: "Failed" },
    { key: "all", label: "All" },
  ];

  return (
    <DashboardLayout pageTitle="Supply Chain Actions">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Supply Chain Actions</h1>
          <p className="text-sm text-secondary mt-0.5">
            An audit ledger — every recommendation Starlane made from a real world event, whether it was approved, what exactly executed, and whether it worked.
          </p>
        </div>

        <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === t.key ? "bg-surface-3 text-primary" : "text-secondary hover:text-secondary"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-surface-2 border border-border animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="text-center py-10 text-secondary">
            <FiAlertTriangle size={28} className="mx-auto mb-2 text-muted" />
            <p className="text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <FiClock size={32} className="mx-auto mb-2 text-muted" />
            <p className="text-sm text-secondary">No actions in this view.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => <ActionRow key={a.id} action={a} onChanged={load} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
