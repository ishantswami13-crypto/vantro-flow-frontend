"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Watch } from "@/lib/api";
import { formatDateTime, formatRelative, formatCount } from "@/lib/format";
import { PageHeader, Subnav, SkeletonRows } from "@/components/v32/ui";
import { IconPlus } from "@/components/v32/icons";
import { StatusChip } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { QuietError, QuietLine } from "@/components/os/bridge/kit";
import { conditionText, watchStatus } from "@/components/os/watch/conditions";
import { NewWatchModal } from "@/components/os/watch/NewWatchModal";
import WatchEvents from "@/components/features/WatchEvents";
import { WatchBrief, ObjectivesPanel } from "@/components/os/WatchPanels";

// Watch: the conditions a person asked Starlane to keep an eye on
// (lib/routes/watches.js: create, list, pause, resume, delete, check now,
// plus a 15-minute cron), what Watch raised from the books
// (GET /api/client/watch), the morning brief and objectives.

type TabKey = "active" | "changed" | "paused" | "all";

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
  const notify = useToast();
  const [tab, setTab] = useState<TabKey>("active");
  const [watches, setWatches] = useState<Watch[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Watch | null>(null);

  // Prefill from the Lens drawer's "Watch" action: ?prefill_metric=...&prefill_entity=...
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
    setFailed(false);
    try {
      const res = await api.watches.list();
      setWatches(res.watches);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(w: Watch, what: string, fn: () => Promise<unknown>, done?: string) {
    setBusyId(w.id);
    try {
      await fn();
      await load();
      if (done) notify(done, "positive");
    } catch {
      notify(`Couldn't ${what}. Check your connection and try again.`, "critical");
    } finally {
      setBusyId(null);
    }
  }

  const list = watches || [];
  const counts = {
    active: list.filter((w) => w.status === "active").length,
    changed: list.filter((w) => w.status === "active" && w.last_triggered_at).length,
    paused: list.filter((w) => w.status === "paused").length,
    all: list.length,
  };
  const filtered =
    tab === "active" ? list.filter((w) => w.status === "active") :
    tab === "paused" ? list.filter((w) => w.status === "paused") :
    tab === "changed" ? list.filter((w) => w.status === "active" && w.last_triggered_at) :
    list;
  const triggered = list.filter((w) => watchStatus(w).label === "Triggered").length;
  const hasAny = list.length > 0;

  const subtitle = loading && !watches ? "Loading what Starlane is watching…"
    : failed && !watches ? "What Starlane watches for you, checked every 15 minutes."
    : !hasAny ? "Tell Starlane what to keep an eye on. It checks every 15 minutes and tells you when something is met."
    : `Watching ${formatCount(list.length)} condition${list.length === 1 ? "" : "s"} for you. ${triggered === 0 ? "None are triggered." : `${formatCount(triggered)} ${triggered === 1 ? "is" : "are"} triggered.`}`;

  const newWatchButton = (
    <button type="button" onClick={() => setShowModal(true)} className="ui-btn ui-btn-primary">
      <IconPlus size={14} />New watch
    </button>
  );

  return (
    <DashboardLayout pageTitle="Watch">
      <div className="w-full page-stack" style={{ maxWidth: 1180 }}>
        {/* One primary action: in the header once there are watches, in the empty state before. */}
        <PageHeader title="Watch" subtitle={subtitle} right={hasAny ? newWatchButton : undefined} />

        <section aria-label="Watch conditions">
          {failed && !watches ? (
            <QuietError onRetry={load} />
          ) : loading && !watches ? (
            <SkeletonRows rows={4} height={46} />
          ) : !hasAny ? (
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              <p className="prose-measure" style={{ margin: 0, fontSize: 13.5 }}>
                Nothing is being watched yet. Pick a figure, such as overdue receivables or one customer&apos;s exposure, and a threshold; Starlane checks it against your live data and raises it when it&apos;s met.
              </p>
              <div style={{ marginTop: 14 }}>{newWatchButton}</div>
            </div>
          ) : (
            <>
              <Subnav
                label="Watch conditions"
                active={tab}
                onChange={(k) => setTab(k as TabKey)}
                items={[
                  { key: "active", label: "Active", count: counts.active },
                  { key: "changed", label: "Has triggered", count: counts.changed },
                  { key: "paused", label: "Paused", count: counts.paused },
                  { key: "all", label: "All", count: counts.all },
                ]}
              />
              <div style={{ marginTop: 12 }}>
                {filtered.length === 0 ? (
                  <QuietLine>
                    {tab === "changed" ? "Nothing has triggered yet. A watch appears here once it has been met."
                      : tab === "paused" ? "No paused watches. A paused watch is not checked until you resume it."
                      : "No active watches. Resume a paused watch or create a new one."}
                  </QuietLine>
                ) : (
                  <ConditionsTable rows={filtered} busyId={busyId}
                    onCheck={(w) => run(w, "check this watch", () => api.watches.evaluate(w.id), "Checked just now")}
                    onToggle={(w) => run(w, w.status === "paused" ? "resume this watch" : "pause this watch",
                      () => api.watches.update(w.id, { status: w.status === "paused" ? "active" : "paused" }),
                      w.status === "paused" ? "Watch resumed" : "Watch paused")}
                    onDelete={(w) => setConfirmDelete(w)}
                  />
                )}
              </div>
            </>
          )}
        </section>

        <WatchEvents />

        <div className="rf-cols-2" style={{ alignItems: "start" }}>
          <WatchBrief />
          <ObjectivesPanel />
        </div>
      </div>

      <NewWatchModal
        key={showModal ? "open" : "closed"}
        open={showModal}
        prefillMetric={prefillMetric}
        prefillEntity={prefillEntity}
        onClose={() => setShowModal(false)}
        onCreated={() => { setShowModal(false); notify("Watch created", "positive"); load(); }}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this watch?"
        description={confirmDelete ? `“${confirmDelete.name}” stops being checked and its history is removed. This can't be undone.` : undefined}
        footer={
          <>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button type="button" className="ui-btn ui-btn-danger" onClick={() => {
              const w = confirmDelete; setConfirmDelete(null);
              if (w) run(w, "delete this watch", () => api.watches.remove(w.id), "Watch deleted");
            }}>Delete</button>
          </>
        }
      />
    </DashboardLayout>
  );
}

const COLS = "minmax(0, 0.8fr) minmax(0, 1.4fr) 160px 92px 92px 172px";

function ConditionsTable({ rows, busyId, onCheck, onToggle, onDelete }: {
  rows: Watch[]; busyId: string | null;
  onCheck: (w: Watch) => void; onToggle: (w: Watch) => void; onDelete: (w: Watch) => void;
}) {
  return (
    <div role="table" aria-label="Watch conditions">
      <div role="row" className="rf-head" style={{ gridTemplateColumns: COLS }}>
        <span role="columnheader">Watching</span>
        <span role="columnheader">Condition</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Last triggered</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Last checked</span>
        <span role="columnheader"><span className="sr-only">Actions</span></span>
      </div>
      <div role="rowgroup" className="rf-list rf-watch">
        {rows.map((w) => {
          const s = watchStatus(w);
          const busy = busyId === w.id;
          return (
            <div key={w.id} role="row" className="rf-row rf-hover" style={{ alignItems: "center", opacity: busy ? 0.6 : 1, borderBottom: "1px solid var(--line)" }}>
              <span role="cell" className="rf-title min-w-0" style={{ fontWeight: 500 }}>{w.name}</span>
              <span role="cell" className="rf-sub min-w-0">{conditionText(w)}</span>
              <span role="cell" className="flex items-center flex-wrap" style={{ gap: 10 }}>
                <StatusChip tone={s.tone}>{s.label}</StatusChip>
                <span className="rf-mob" style={{ marginTop: 0 }}>Checked {w.last_evaluated_at ? formatRelative(w.last_evaluated_at) : "never"}</span>
              </span>
              <span role="cell" className="rf-time rf-desk" title={w.last_triggered_at ? formatDateTime(w.last_triggered_at) : undefined}>
                {w.last_triggered_at ? formatRelative(w.last_triggered_at) : "Never"}
              </span>
              <span role="cell" className="rf-time rf-desk" title={w.last_evaluated_at ? formatDateTime(w.last_evaluated_at) : undefined}>
                {w.last_evaluated_at ? formatRelative(w.last_evaluated_at) : "Never"}
              </span>
              <span role="cell" className="rf-actions rf-reveal" style={{ gap: 0 }}>
                <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy || w.status === "paused"} onClick={() => onCheck(w)}>Check now</button>
                <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={() => onToggle(w)}>{w.status === "paused" ? "Resume" : "Pause"}</button>
                <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" style={{ color: "var(--critical)" }} disabled={busy} onClick={() => onDelete(w)} aria-label={`Delete ${w.name}`}>Delete</button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
