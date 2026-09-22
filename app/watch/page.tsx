"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Watch, WatchConditionConfig } from "@/lib/api";

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
  if (w.status === "paused") return { label: "Paused", color: "#63635F" };
  if (w.last_triggered_at && w.last_evaluated_at && w.last_triggered_at === w.last_evaluated_at) {
    return { label: "Triggered", color: "#E8462B" };
  }
  if (w.last_triggered_at) return { label: "Watching", color: "#C98A1C" };
  return { label: "Nominal", color: "#1FB870" };
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
  const [showModal, setShowModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Prefill from the Lens drawer's "Watch" action (see
  // components/ui/LensDrawer.tsx) — ?prefill_metric=...&prefill_entity=...
  const prefillMetric = searchParams.get("prefill_metric");
  const prefillEntity = searchParams.get("prefill_entity");

  useEffect(() => {
    if (prefillMetric) {
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
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(w: Watch) {
    setBusyId(w.id);
    try {
      await api.watches.remove(w.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
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
      setError(e instanceof Error ? e.message : "Evaluate failed");
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

  return (
    <DashboardLayout pageTitle="Watch">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 400,
              fontSize: 26,
              color: "#191917",
            }}
          >
            Watch
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="hover-dim"
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: "#FFFFFF",
              background: "#191917",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            New watch
          </button>
        </div>

        <div style={{ fontSize: 13.5, color: "#63635F" }}>
          {loading
            ? "Loading watch conditions…"
            : list.length === 0
              ? "No watch conditions configured yet."
              : `${list.length} watch condition${list.length === 1 ? "" : "s"} configured.`}
        </div>

        <nav
          aria-label="Secondary"
          style={{ display: "flex", alignItems: "center", gap: 22, borderBottom: "1px solid #EBEAE6", marginBottom: 4 }}
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

        <div
          style={{
            flex: 1,
            minHeight: 0,
            boxSizing: "border-box",
            background: "#FFFFFF",
            border: "1px solid rgba(25,25,23,0.10)",
            borderRadius: 8,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 2fr 1fr 1fr",
              padding: "10px 14px",
              background: "#F3F2EE",
              fontSize: 11,
              letterSpacing: 0.5,
              color: "#63635F",
            }}
          >
            <span>WATCHING</span>
            <span>CONDITION</span>
            <span>STATUS</span>
            <span style={{ textAlign: "right" }}>LAST CHECKED</span>
          </div>

          {error && (
            <div style={{ padding: "16px 14px", color: "#E8462B", fontSize: 13 }}>
              {error}
            </div>
          )}

          {!error && loading && (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "#63635F", fontSize: 13.5 }}>
              Loading…
            </div>
          )}

          {!error && !loading && filtered.length === 0 && (
            <div className="fade-once py-10 text-center" style={{ padding: "40px 24px" }}>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917", marginBottom: 6 }}>
                {tab === "active" && "No active watch conditions"}
                {tab === "changed" && "No status changes to show"}
                {tab === "paused" && "No paused watches"}
                {tab === "history" && "No watch history yet"}
              </p>
              <p className="v32-body max-w-md mx-auto" style={{ color: "#63635F" }}>
                {tab === "active" && 'Create one with "New watch" to have Starlane re-evaluate a condition against live data every 15 minutes, or check it on demand.'}
                {tab === "changed" && "This lists watches whose status just moved into a triggered state."}
                {tab === "paused" && "Paused watches stop being evaluated by the 15-minute cron until resumed."}
                {tab === "history" && "Once watches exist and are evaluated, their trigger history will show here."}
              </p>
            </div>
          )}

          {!error && !loading && filtered.map((w) => {
            const s = statusOf(w);
            const pulsing = s.label !== "Nominal";
            return (
              <div
                key={w.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.2fr 2fr 1fr 1fr",
                  padding: "12px 14px",
                  borderTop: "1px solid #EBEAE6",
                  alignItems: "center",
                  fontSize: 13,
                  color: "#191917",
                }}
              >
                <span style={{ fontWeight: 500 }}>{w.name}</span>
                <span style={{ color: "#63635F" }}>{conditionLabel(w)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    className={pulsing ? "pulse-dot" : undefined}
                    style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block" }}
                  />
                  {s.label}
                </span>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                  <span style={{ color: "#63635F", fontSize: 12 }}>{formatChecked(w)}</span>
                  <button
                    onClick={() => handleEvaluate(w)}
                    disabled={busyId === w.id}
                    className="hover-dim"
                    style={{ fontSize: 11, background: "none", border: "none", color: "#696D86", cursor: "pointer" }}
                    title="Evaluate now"
                  >
                    Check now
                  </button>
                  <button
                    onClick={() => handlePauseResume(w)}
                    disabled={busyId === w.id}
                    className="hover-dim"
                    style={{ fontSize: 11, background: "none", border: "none", color: "#696D86", cursor: "pointer" }}
                  >
                    {w.status === "paused" ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => handleDelete(w)}
                    disabled={busyId === w.id}
                    className="hover-dim"
                    style={{ fontSize: 11, background: "none", border: "none", color: "#E8462B", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </span>
              </div>
            );
          })}
        </div>
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
        position: "fixed", inset: 0, background: "rgba(25,25,23,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF", borderRadius: 10, padding: 24, width: 420,
          display: "flex", flexDirection: "column", gap: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 20, color: "#191917" }}>
          New watch
        </h2>

        <label style={{ fontSize: 12, color: "#63635F" }}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Overdue receivables above ₹50k"'
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: 12, color: "#63635F" }}>
          Metric
          <select value={metricKey} onChange={(e) => setMetricKey(e.target.value as Watch["metric_key"])} style={inputStyle}>
            {METRIC_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>

        {needsEntity && (
          <label style={{ fontSize: 12, color: "#63635F" }}>
            Customer name
            <input value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="Customer name" style={inputStyle} />
          </label>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ fontSize: 12, color: "#63635F", flex: 1 }}>
            Operator
            <select value={operator} onChange={(e) => setOperator(e.target.value as WatchConditionConfig["operator"])} style={inputStyle}>
              {OPERATOR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, color: "#63635F", flex: 1 }}>
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

        {formError && <div style={{ color: "#E8462B", fontSize: 12 }}>{formError}</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
          <button
            type="button"
            onClick={onClose}
            className="hover-dim"
            style={{ padding: "8px 14px", fontSize: 13, background: "none", border: "1px solid #EBEAE6", borderRadius: 6, cursor: "pointer", color: "#191917" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="hover-dim"
            style={{ padding: "8px 14px", fontSize: 13, fontWeight: 500, background: "#191917", color: "#FFFFFF", border: "none", borderRadius: 6, cursor: "pointer" }}
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
  color: "#191917",
  background: "#FAFAF8",
  border: "1px solid #EBEAE6",
  borderRadius: 6,
  boxSizing: "border-box",
};
