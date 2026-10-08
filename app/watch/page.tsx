"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, Watch } from "@/lib/api";
import { formatDateTime, formatRelative, formatCount } from "@/lib/format";
import { PageHeader, Subnav, SkeletonRows } from "@/components/v32/ui";
import { IconPlus, IconWatch } from "@/components/v32/icons";
import { StatusChip } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { QuietError } from "@/components/os/bridge/kit";
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
      <div className="w-full flex flex-col" style={{ maxWidth: 1180, gap: 40 }}>
        <div className="flex flex-col" style={{ gap: 20 }}>
          {/* One primary action: in the header once there are watches, in the empty state before. */}
          <PageHeader title="Watch" subtitle={subtitle} right={hasAny ? newWatchButton : undefined} />

          {failed && !watches ? (
            <QuietError onRetry={load} />
          ) : loading && !watches ? (
            <SkeletonRows rows={4} height={52} />
          ) : !hasAny ? (
            <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)" }}>
              <EmptyState
                icon={<IconWatch size={18} />}
                title="Nothing is being watched yet"
                message="Pick a figure, such as overdue receivables or one customer's exposure, and a threshold. Starlane checks it against your live data and raises it when it's met."
                action={newWatchButton}
              />
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 12 }}>
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
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<IconWatch size={18} />}
                  title={tab === "changed" ? "Nothing has triggered" : tab === "paused" ? "No paused watches" : "No active watches"}
                  message={tab === "changed" ? "Watches that have been met at least once appear here." : tab === "paused" ? "A paused watch is not checked until you resume it." : "Resume a paused watch or create a new one."}
                />
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
          )}
        </div>

        <WatchEvents />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" style={{ gap: 40 }}>
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

const GRID = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_150px_96px_196px]";

function ConditionsTable({ rows, busyId, onCheck, onToggle, onDelete }: {
  rows: Watch[]; busyId: string | null;
  onCheck: (w: Watch) => void; onToggle: (w: Watch) => void; onDelete: (w: Watch) => void;
}) {
  return (
    <div role="table" aria-label="Watch conditions" style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", overflow: "hidden" }}>
      <div role="row" className={`hidden lg:grid ${GRID}`} style={{ gap: 16, padding: "10px 18px", fontSize: 12, color: "var(--ink-3)", borderBottom: "1px solid var(--line)" }}>
        <span role="columnheader">Watching</span>
        <span role="columnheader">Condition</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Last checked</span>
        <span role="columnheader"><span className="sr-only">Actions</span></span>
      </div>
      <style>{`
        @media (hover: hover) and (min-width: 1024px) {
          .wl-actions { opacity: 0; transition: opacity 120ms ease; }
          .group:hover .wl-actions, .group:focus-within .wl-actions { opacity: 1; }
        }
      `}</style>
      {rows.map((w, i) => {
        const s = watchStatus(w);
        const busy = busyId === w.id;
        return (
          <div
            key={w.id}
            role="row"
            className={`group row-hover grid grid-cols-1 ${GRID} lg:items-center`}
            style={{ gap: "6px 16px", padding: "12px 18px", minHeight: 52, borderTop: i ? "1px solid var(--line)" : undefined, opacity: busy ? 0.6 : 1 }}
          >
            <span role="cell" className="lg:truncate" style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{w.name}</span>
            <span role="cell" className="tabular-nums" style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>{conditionText(w)}</span>
            <span role="cell" className="flex items-center flex-wrap" style={{ gap: 10 }}>
              <StatusChip tone={s.tone}>{s.label}</StatusChip>
              <span className="lg:hidden tabular-nums" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                Checked {w.last_evaluated_at ? formatRelative(w.last_evaluated_at) : "never"}
              </span>
            </span>
            <span role="cell" className="hidden lg:block tabular-nums text-right" style={{ fontSize: 12.5, color: "var(--ink-3)" }} title={w.last_evaluated_at ? formatDateTime(w.last_evaluated_at) : undefined}>
              {w.last_evaluated_at ? formatRelative(w.last_evaluated_at) : "Never"}
            </span>
            <span role="cell" className="wl-actions flex items-center lg:justify-end" style={{ gap: 2, marginLeft: -10 }}>
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy || w.status === "paused"} onClick={() => onCheck(w)}>Check now</button>
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled={busy} onClick={() => onToggle(w)}>{w.status === "paused" ? "Resume" : "Pause"}</button>
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" style={{ color: "var(--critical)" }} disabled={busy} onClick={() => onDelete(w)} aria-label={`Delete ${w.name}`}>Delete</button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
