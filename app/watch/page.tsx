"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Watch, WatchConditionConfig } from "@/lib/api";
import { WatchBrief, ObjectivesPanel } from "@/components/os/WatchPanels";
import { Button } from "@/components/v32/ui";
import { IconPlus } from "@/components/v32/icons";

// Watch — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§14/§16.
//
// Previously a fully honest empty shell (see git history) because nothing
// in the stack persisted a user-defined watch condition. That's no longer
// true: migrations/046_watches.sql + lib/routes/watches.js on the backend
// now give this page a real create/list/pause/resume/delete + evaluate-now
// API, plus a 15-min cron that keeps last_evaluated_at/last_triggered_at
// fresh. This page keeps the exact V32 visual shell (subnav, watch_row
// grid `2.2fr 2fr 1fr 1fr`, pulse on non-nominal status) and wires it to
// that real data instead of a static empty state.

type TabKey = "active" | "changed" | "paused" | "history";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "changed", label: "Changed" },
  { key: "paused", label: "Paused" },
  { key: "history", label: "History" },
];

const METRIC_OPTIONS: { value: Watch["metric_key"]; label: string; needsEntity?: boolean }[] = [
  { value: "receivables_overdue_amount", label: "Overdue receivables amount" },
  { value: "cash_forecast_runway_days", label: "Cash forecast runway (days)" },
  { value: "customer_exposure_amount", label: "Customer exposure amount", needsEntity: true },
];

const OPERATOR_OPTIONS: { value: WatchConditionConfig["operator"]; label: string }[] = [
  { value: "gt", label: "is greater than" },
  { value: "gte", label: "is at least" },
  { value: "lt", label: "is less than" },
  { value: "lte", label: "is at most" },
  { value: "eq", label: "equals" },
];

function conditionLabel(w: Watch): string {
  const metric = METRIC_OPTIONS.find((m) => m.value === w.metric_key)?.label || w.metric_key;
  const op = OPERATOR_OPTIONS.find((o) => o.value === w.condition_config?.operator)?.label || w.condition_config?.operator;
  const threshold = w.condition_config?.threshold;
  const suffix = w.metric_key === "customer_exposure_amount" && w.condition_config?.entity_name
    ? ` (${w.condition_config.entity_name})`
    : "";
  return `${metric} ${op} ${threshold}${suffix}`;
}

function statusOf(w: Watch): { label: string; color: string } {
  if (w.status === "paused") return { label: "Paused", color: "var(--text-secondary)" };
  if (w.last_triggered_at && w.last_evaluated_at && w.last_triggered_at === w.last_evaluated_at) {
    return { label: "Triggered", color: "var(--status-danger)" };
  }
  // Triggered at some earlier check, clear at the latest one.
  if (w.last_triggered_at) return { label: "Clear now, triggered before", color: "var(--status-warning)" };
  return { label: w.last_evaluated_at ? "Clear" : "Not checked yet", color: w.last_evaluated_at ? "var(--status-success)" : "var(--text-tertiary)" };
}

function formatChecked(w: Watch): string {
  if (!w.last_evaluated_at) return "Never";
  const d = new Date(w.last_evaluated_at);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// useSearchParams requires a Suspense boundary during static prerendering.
export default function WatchPage() {
  return (
    <Suspense fallback={null}>
      <WatchPageInner />
    </Suspense>
  );
}

function WatchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("active");
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // A failed pause/delete/check is shown above the list; it never hides the list.
  const [actionError, setActionError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Prefill from the Lens drawer's "Watch" action (see
  // components/ui/LensDrawer.tsx) — ?prefill_metric=...&prefill_entity=...
  const prefillMetric = searchParams.get("prefill_metric");
  const prefillEntity = searchParams.get("prefill_entity");

  useEffect(() => {
    if (prefillMetric || searchParams.get("new") === "1") {
      setShowModal(true);
      // Clear the query params once consumed so a refresh doesn't reopen it.
      router.replace("/watch");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.watches.list();
      setWatches(res.watches);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load watches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePauseResume(w: Watch) {
    setBusyId(w.id);
    try {
      await api.watches.update(w.id, { status: w.status === "paused" ? "active" : "paused" });
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(w: Watch) {
    if (!window.confirm(`Delete the watch "${w.name}"? This cannot be undone.`)) return;
    setBusyId(w.id); setActionError(null);
    try {
      await api.watches.remove(w.id);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleEvaluate(w: Watch) {
    setBusyId(w.id);
    try {
      await api.watches.evaluate(w.id);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Evaluate failed");
    } finally {
      setBusyId(null);
    }
  }

  const list = watches || [];
  const filtered =
    tab === "active" ? list.filter((w) => w.status === "active") :
    tab === "paused" ? list.filter((w) => w.status === "paused") :
    tab === "changed" ? list.filter((w) => w.status === "active" && w.last_triggered_at) :
    list; // history: everything, most-recently-evaluated context still per-row
  const triggeredCount = list.filter((w) => statusOf(w).label === "Triggered").length;

  return (
    <DashboardLayout pageTitle="Watch">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 22, color: "var(--text-primary)" , letterSpacing: "-0.01em"}}>
            Watch
          </h1>
          <Button primary small onClick={() => setShowModal(true)}><IconPlus size={13} />New watch</Button>
        </div>

        <div style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: -16 }}>
          {loading
            ? "Loading what Starlane is watching…"
            : list.length === 0
              ? "Starlane is not watching any of your own conditions yet."
              : `Starlane is watching ${list.length} condition${list.length === 1 ? "" : "s"} for you. ${triggeredCount === 0 ? "None need a look." : `${triggeredCount} need${triggeredCount === 1 ? "s" : ""} a look.`}`}
        </div>

        <nav
          aria-label="Secondary"
          style={{ display: "flex", alignItems: "center", gap: 22, borderBottom: "1px solid var(--border-default)", marginBottom: 4 }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="hover-dim"
              style={{
                padding: "8px 2px",
                fontSize: 13,
                fontWeight: t.key === tab ? 500 : 400,
                color: t.key === tab ? "var(--text-primary)" : "var(--text-secondary)",
                background: "none",
                border: "none",
                borderBottomColor: t.key === tab ? "var(--accent-primary)" : "transparent",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div
          style={{
            boxSizing: "border-box",
            background: "var(--bg-elevated)",
            border: "1px solid rgb(var(--c-ink) / 0.10)",
            borderRadius: 8,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="watch-grid watch-head"
            style={{
              padding: "10px 14px",
              background: "var(--bg-subtle)",
              fontSize: 11,
              letterSpacing: 0.5,
              color: "var(--text-secondary)",
            }}
          >
            <span>Watching</span>
            <span>Condition</span>
            <span>Status</span>
            <span style={{ textAlign: "right" }}>Last checked</span>
          </div>

          {actionError && (
            <div role="alert" style={{ padding: "10px 14px", color: "var(--status-danger)", fontSize: 13 }}>
              {actionError}
            </div>
          )}
          {error && (
            <div role="alert" style={{ padding: "16px 14px", color: "var(--status-danger)", fontSize: 13 }}>
              {error}
            </div>
          )}

          {!error && loading && (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5 }}>
              Loading…
            </div>
          )}

          {!error && !loading && filtered.length === 0 && (
            <div className="fade-once py-10 text-center" style={{ padding: "40px 24px" }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 16, color: "var(--text-primary)", marginBottom: 6 , fontWeight: 600, letterSpacing: "-0.015em"}}>
                {tab === "active" && "No active watch conditions"}
                {tab === "changed" && "No status changes to show"}
                {tab === "paused" && "No paused watches"}
                {tab === "history" && "No watch history yet"}
              </p>
              <p className="v32-body max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                {tab === "active" && 'Create one with "New watch" to have Starlane re-evaluate a condition against live data every 15 minutes, or check it on demand.'}
                {tab === "changed" && "This lists watches whose status just moved into a triggered state."}
                {tab === "paused" && "Paused watches stop being evaluated by the 15-minute cron until resumed."}
                {tab === "history" && "Once watches exist and are evaluated, their trigger history will show here."}
              </p>
            </div>
          )}

          {!error && !loading && filtered.map((w) => {
            const s = statusOf(w);
            return (
              <div
                key={w.id}
                className="card-in row-hover group watch-grid"
                style={{
                  padding: "16px 14px",
                  minHeight: 52,
                  boxSizing: "border-box",
                  borderBottom: "1px solid rgb(var(--c-ink) / 0.06)",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13.5, color: "var(--text-primary)" }}>{w.name}</span>
                <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{conditionLabel(w)}</span>
                <span style={{ fontSize: 12.5, color: s.color }}>
                  {s.label}
                </span>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                  <span className="watch-row-actions flex items-center" style={{ gap: 10 }}>
                  <button
                    onClick={() => handleEvaluate(w)}
                    disabled={busyId === w.id}
                    className="hover-dim"
                    style={{ fontSize: 11.5, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                    title="Evaluate now"
                  >
                    Check now
                  </button>
                  <button
                    onClick={() => handlePauseResume(w)}
                    disabled={busyId === w.id}
                    className="hover-dim"
                    style={{ fontSize: 11.5, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                  >
                    {w.status === "paused" ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => handleDelete(w)}
                    disabled={busyId === w.id}
                    className="hover-dim"
                    style={{ fontSize: 11.5, background: "none", border: "none", color: "var(--status-danger)", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{formatChecked(w)}</span>
                </span>
              </div>
            );
          })}
        </div>

        <WatchBrief />
        <ObjectivesPanel />
      </div>

      {showModal && (
        <NewWatchModal
          prefillMetric={prefillMetric}
          prefillEntity={prefillEntity}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </DashboardLayout>
  );
}

function NewWatchModal({
  onClose,
  onCreated,
  prefillMetric,
  prefillEntity,
}: {
  onClose: () => void;
  onCreated: () => void;
  prefillMetric?: string | null;
  prefillEntity?: string | null;
}) {
  const initialMetric =
    (METRIC_OPTIONS.find((m) => m.value === prefillMetric)?.value as Watch["metric_key"] | undefined) ||
    "receivables_overdue_amount";
  const [name, setName] = useState(prefillEntity ? `Watch: ${prefillEntity}` : "");
  const [metricKey, setMetricKey] = useState<Watch["metric_key"]>(initialMetric);
  const [operator, setOperator] = useState<WatchConditionConfig["operator"]>("gte");
  const [threshold, setThreshold] = useState("");
  const [entityName, setEntityName] = useState(prefillEntity || "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const needsEntity = METRIC_OPTIONS.find((m) => m.value === metricKey)?.needsEntity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const thresholdNum = Number(threshold);
    if (!name.trim()) return setFormError("Name is required");
    // Number("") is 0, so an empty box would silently become a threshold of 0.
    if (!threshold.trim()) return setFormError("Enter a threshold");
    if (Number.isNaN(thresholdNum)) return setFormError("Threshold must be a number");
    if (needsEntity && !entityName.trim()) return setFormError("Customer name is required for this metric");

    setSaving(true);
    try {
      const condition_config: WatchConditionConfig = { operator, threshold: thresholdNum };
      if (needsEntity) condition_config.entity_name = entityName.trim();
      await api.watches.create({ name: name.trim(), metric_key: metricKey, condition_config });
      onCreated();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create watch");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "var(--bg-overlay)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 10, padding: 24, width: 420, maxWidth: "calc(100vw - 32px)",
          display: "flex", flexDirection: "column", gap: 14,
          boxShadow: "0 6px 24px rgba(0,0,0,0.10)",
        }}
      >
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 22, color: "var(--text-primary)" , letterSpacing: "-0.01em"}}>
          New watch
        </h2>

        <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Overdue receivables above ₹50k"'
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Metric
          <select value={metricKey} onChange={(e) => setMetricKey(e.target.value as Watch["metric_key"])} style={inputStyle}>
            {METRIC_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>

        {needsEntity && (
          <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Customer name
            <input value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="Customer name" style={inputStyle} />
          </label>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>
            Operator
            <select value={operator} onChange={(e) => setOperator(e.target.value as WatchConditionConfig["operator"])} style={inputStyle}>
              {OPERATOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>
            Threshold
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </label>
        </div>

        {formError && <div style={{ color: "var(--status-danger)", fontSize: 12 }}>{formError}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-v32"
            style={{ padding: "8px 14px", fontSize: 13, borderRadius: 6 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary-v32"
            style={{ padding: "8px 14px", fontSize: 13, borderRadius: 6 }}
          >
            {saving ? "Creating…" : "Create watch"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px 10px",
  fontSize: 13,
  color: "var(--text-primary)",
  background: "var(--bg-elevated)",
  border: "1px solid rgb(var(--c-ink) / 0.12)",
  borderRadius: 6,
  boxSizing: "border-box",
};
