"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Watch, WatchConditionConfig } from "@/lib/api";
import { WatchBrief, ObjectivesPanel } from "@/components/os/WatchPanels";
import { Button, PageHeader, formatAmount } from "@/components/v32/ui";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { api as apiAll, getUser } from "@/lib/api";
import { money } from "@/lib/decisions";
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
  const raw = w.condition_config?.threshold;
  const threshold = typeof raw === "number"
    ? (w.metric_key === "cash_forecast_runway_days" ? formatAmount(raw, "days") : raw.toLocaleString("en-US"))
    : raw;
  const suffix = w.metric_key === "customer_exposure_amount" && w.condition_config?.entity_name
    ? ` (${w.condition_config.entity_name})`
    : "";
  return `${metric} ${op} ${threshold}${suffix}`;
}

function statusOf(w: Watch): { label: string; color: string } {
  if (w.status === "paused") return { label: "Paused", color: "#63635F" };
  if (w.last_triggered_at && w.last_evaluated_at && w.last_triggered_at === w.last_evaluated_at) {
    return { label: "Triggered", color: "#A64F4B" };
  }
  // Triggered at some earlier check, clear at the latest one.
  if (w.last_triggered_at) return { label: "Clear now, triggered before", color: "#8C6826" };
  return { label: w.last_evaluated_at ? "Clear" : "Not checked yet", color: w.last_evaluated_at ? "#477054" : "#6E6E69" };
}

function formatChecked(w: Watch): string {
  if (!w.last_evaluated_at) return "Never";
  const d = new Date(w.last_evaluated_at);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
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
    <DashboardLayout pageTitle="Monitors">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <PageHeader
          title="Monitors"
          subtitle="Conditions Starlane re-checks against your own data every 15 minutes"
          right={<Button primary small onClick={() => setShowModal(true)}><IconPlus size={13} />New monitor</Button>}
        />

        <div className="sp-summary" style={{ marginBottom: 0 }}>
          <span className="sp-summary-m"><StarlaneMark variant="glyph" size={9} /></span>
          {loading
            ? "Loading what Starlane is watching…"
            : list.length === 0
              ? "Starlane is not watching any of your own conditions yet. Add one below in a click."
              : `Starlane is watching ${list.length} condition${list.length === 1 ? "" : "s"} for you. ${triggeredCount === 0 ? "None need a look." : `${triggeredCount} need${triggeredCount === 1 ? "s" : ""} a look.`}`}
        </div>

        <div className="sp-stats" style={{ marginBottom: 0 }}>
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : list.filter((w) => w.status === "active").length}</div><div className="sp-stat-l">Watching</div></div>
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : triggeredCount}</div><div className="sp-stat-l">Triggered now</div></div>
          <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : list.filter((w) => w.status === "paused").length}</div><div className="sp-stat-l">Paused</div></div>
        </div>

        <nav aria-label="Secondary" className="sp-pills" style={{ marginBottom: -8 }}>
          {TABS.map((t) => {
            const n = t.key === "active" ? list.filter((w) => w.status === "active").length
              : t.key === "paused" ? list.filter((w) => w.status === "paused").length
              : t.key === "changed" ? list.filter((w) => w.status === "active" && w.last_triggered_at).length
              : list.length;
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={t.key === tab} className={`sp-pill ${t.key === tab ? "is-on" : ""}`}>
                {t.label}{watches ? ` (${n})` : ""}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            boxSizing: "border-box",
            background: "#FFFFFF",
            border: "1px solid rgba(25,25,23,0.10)",
            borderRadius: 12,
            boxShadow: "0 1px 2px rgba(15,14,13,0.03)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="watch-grid watch-head meta"
            style={{
              padding: "10px 16px",
              background: "#F6F5F1",
              borderBottom: "1px solid rgba(25,25,23,0.08)",
              fontSize: 10,
              color: "#63635F",
            }}
          >
            <span>Watching</span>
            <span>Condition</span>
            <span>Status</span>
            <span style={{ textAlign: "right" }}>Last checked</span>
          </div>

          {actionError && (
            <div role="alert" style={{ padding: "10px 14px", color: "#A64F4B", fontSize: 13 }}>
              {actionError}
            </div>
          )}
          {error && (
            <div role="alert" style={{ padding: "16px 14px", color: "#A64F4B", fontSize: 13 }}>
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
              <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: 16, color: "#191917", marginBottom: 6 }}>
                {tab === "active" && "No active watch conditions"}
                {tab === "changed" && "No status changes to show"}
                {tab === "paused" && "No paused watches"}
                {tab === "history" && "No watch history yet"}
              </p>
              <p className="v32-body max-w-md mx-auto" style={{ color: "#63635F" }}>
                {tab === "active" && 'Create one with "New monitor" to have Starlane re-evaluate a condition against live data every 15 minutes, or check it on demand.'}
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
                  padding: "16px 16px",
                  minHeight: 52,
                  boxSizing: "border-box",
                  borderBottom: "1px solid rgba(25,25,23,0.06)",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 500, color: "#191917" }}>{w.name}</span>
                <span style={{ fontSize: 12.5, color: "#63635F", fontVariantNumeric: "tabular-nums" }}>{conditionLabel(w)}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: s.color }}>
                  <span className="sq" aria-hidden="true" />
                  {s.label}
                </span>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                  <span className="watch-row-actions flex items-center" style={{ gap: 10 }}>
                  <button
                    onClick={() => handleEvaluate(w)}
                    disabled={busyId === w.id}
                    className="hover-dim"
                    style={{ fontSize: 11.5, background: "none", border: "none", color: "#63635F", cursor: "pointer" }}
                    title="Evaluate now"
                  >
                    Check now
                  </button>
                  <button
                    onClick={() => handlePauseResume(w)}
                    disabled={busyId === w.id}
                    className="hover-dim"
                    style={{ fontSize: 11.5, background: "none", border: "none", color: "#63635F", cursor: "pointer" }}
                  >
                    {w.status === "paused" ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={() => handleDelete(w)}
                    disabled={busyId === w.id}
                    className="hover-dim"
                    style={{ fontSize: 11.5, background: "none", border: "none", color: "#A64F4B", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                  </span>
                  <span className="meta" style={{ color: "#63635F", fontSize: 10.5, whiteSpace: "nowrap" }}>{formatChecked(w)}</span>
                </span>
              </div>
            );
          })}
        </div>

        {!loading && !error && <SuggestedMonitors existing={list} onCreated={load} />}

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
        position: "fixed", inset: 0, background: "rgba(20,20,18,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF", border: "1px solid #E5E4DF", borderRadius: 10, padding: 24, width: 420, maxWidth: "calc(100vw - 32px)",
          display: "flex", flexDirection: "column", gap: 14,
          boxShadow: "0 6px 24px rgba(0,0,0,0.10)",
        }}
      >
        <h2 style={{ margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: 20, color: "#191917" }}>
          New monitor
        </h2>

        <label style={{ fontSize: 12, color: "#63635F" }}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Overdue receivables above 50k"'
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

        {formError && <div style={{ color: "#A64F4B", fontSize: 12 }}>{formError}</div>}

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
            {saving ? "Creating…" : "Create monitor"}
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
  background: "#FFFFFF",
  border: "1px solid rgba(25,25,23,0.12)",
  borderRadius: 6,
  boxSizing: "border-box",
};

// Ready monitors built from the tenant's own invoices: the overdue total and
// the largest customer's balance today, so a rise from here triggers. One
// click creates the real watch through the same API as "New monitor".
function SuggestedMonitors({ existing, onCreated }: { existing: Watch[]; onCreated: () => void }) {
  const [rows, setRows] = useState<{ key: string; name: string; metric: Watch["metric_key"]; cfg: WatchConditionConfig; why: string }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const u = getUser();
    if (!u?.id) { setRows([]); return; }
    apiAll.invoices.list(u.id).then((r) => {
      const today = Date.now();
      const open = (r.invoices || []).filter((i) => i.payment_status !== "Paid").map((i) => ({
        name: i.customer_name || "",
        amt: Math.max(0, Number(i.invoice_amount) - Number(i.payment_amount || 0)),
        late: i.due_date ? (today - Date.parse(i.due_date.slice(0, 10))) / 86_400_000 : Number(i.days_overdue || 0),
      }));
      const overdue = open.filter((o) => o.late > 0).reduce((s, o) => s + o.amt, 0);
      const by = new Map<string, number>();
      for (const o of open) by.set(o.name, (by.get(o.name) || 0) + o.amt);
      const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
      const step = 100_000;
      const out = [];
      if (overdue > 0) {
        const t = Math.ceil(overdue / step) * step;
        out.push({ key: "overdue", name: `Overdue above ${money(t)}`, metric: "receivables_overdue_amount" as const, cfg: { operator: "gt" as const, threshold: t }, why: `Overdue is ${money(overdue)} today` });
      }
      out.push({ key: "runway", name: "Cash runway under 30 days", metric: "cash_forecast_runway_days" as const, cfg: { operator: "lt" as const, threshold: 30 }, why: "From the cash forecast" });
      if (top && top[1] > 0) {
        const t = Math.ceil(top[1] / step) * step;
        out.push({ key: "top", name: `${top[0]} owes more than ${money(t)}`, metric: "customer_exposure_amount" as const, cfg: { operator: "gt" as const, threshold: t, entity_name: top[0] }, why: `Owes ${money(top[1])} today, the most of any customer` });
      }
      setRows(out);
    }).catch(() => setRows([]));
  }, []);
  const have = new Set(existing.map((w) => `${w.metric_key}|${w.condition_config?.entity_name || ""}`));
  const shown = (rows || []).filter((r) => !have.has(`${r.metric}|${r.cfg.entity_name || ""}`));
  if (!shown.length) return null;
  async function add(r: (typeof shown)[number]) {
    setBusy(r.key); setErr(null);
    try { await api.watches.create({ name: r.name, metric_key: r.metric, condition_config: r.cfg }); onCreated(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not add the monitor"); }
    finally { setBusy(null); }
  }
  return (
    <section>
      <h2 className="sp-h">Suggested monitors</h2>
      <p className="sp-sub">Worked out from your invoices today. Add one and Starlane checks it every 15 minutes.</p>
      {err && <p role="alert" style={{ color: "#A64F4B", fontSize: 12.5, margin: "0 0 8px" }}>{err}</p>}
      <div className="sp-table">
        <div className="sp-tr sp-th sp-tr-3 sp-tr-why"><span>Monitor</span><span>Why</span><span className="sp-right" /></div>
        {shown.map((r) => (
          <div key={r.key} className="sp-tr sp-tr-3 sp-tr-why">
            <span className="sp-td-main"><span className="sp-doc"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M1.5 8h3l2-4.5 3 9 2-4.5h3" /></svg></span><span className="truncate">{r.name}</span></span>
            <span className="sp-td">{r.why}</span>
            <span className="sp-right"><button type="button" className="sp-btn" disabled={busy === r.key} onClick={() => add(r)}>{busy === r.key ? "Adding…" : "Add"}</button></span>
          </div>
        ))}
      </div>
    </section>
  );
}
