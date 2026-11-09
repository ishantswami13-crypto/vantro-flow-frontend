"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiRefreshCw, FiAlertTriangle } from "react-icons/fi";
import StarlaneMark from "@/components/brand/StarlaneMark";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { C, HealthStrip, Notice, Pill, SectionLabel, Skeleton, Stat } from "@/components/decisions/ui";
import { DecisionTable } from "@/components/decisions/DecisionTable";
import { decisionsApi, money, relTime, type DiscoverResponse } from "@/lib/decisions";

const STALE_AFTER_MS = 30 * 60 * 1000;

export default function DecisionsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [scope, setScope] = useState<"active" | "closed">("active");
  const [lastRun, setLastRun] = useState<DiscoverResponse | null>(null);
  const autoRan = useRef(false);

  const today = useQuery({ queryKey: ["decisions-today"], queryFn: decisionsApi.today, staleTime: 15_000 });
  const list = useQuery({ queryKey: ["decisions", scope], queryFn: () => decisionsApi.list(scope), staleTime: 15_000 });

  const discover = useMutation({
    mutationFn: decisionsApi.discover,
    onSuccess: (r) => {
      setLastRun(r);
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["decisions-today"] });
    },
  });

  // Refresh automatically when the last analysis is missing or old. The
  // engine is deterministic and scoped to this business; it changes nothing
  // outside Starlane's own decision records.
  useEffect(() => {
    if (autoRan.current || !today.data) return;
    const at = today.data.lastDiscovery?.at;
    if (!at || Date.now() - new Date(at).getTime() > STALE_AFTER_MS) {
      autoRan.current = true;
      discover.mutate();
    }
  }, [today.data, discover]);

  const t = today.data;
  const decisions = list.data?.decisions || [];
  const atStake = t ? Object.entries(t.command.expectedUncollectedIfIgnored) : [];

  return (
    <DashboardLayout pageTitle="Decisions">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
          <h1 className="hv-title" style={{ color: "#0F0E0D", fontSize: 37, lineHeight: 1.08, letterSpacing: "-0.012em", fontFamily: "var(--serif, 'Newsreader', Georgia, serif)", fontWeight: 400 }}>Decisions</h1>
          <div className="flex items-center gap-3">
            <Link href="/decisions/import" className="text-[13px] hover-dim" style={{ color: C.muted }}>Bring data</Link>
            <Link href="/decisions/proof" className="text-[13px] hover-dim" style={{ color: C.muted }}>Track record</Link>
            <Button variant="secondary" size="sm" loading={discover.isPending} icon={<FiRefreshCw size={13} />} onClick={() => discover.mutate()}>
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-[14px] max-w-[700px] mb-8" style={{ color: C.muted }}>
          What needs your judgement, by when, and what each choice is likely to cost or return. Worked out from your own ledger; every number links to its evidence.
        </p>

        {t && !t.stops.allowed && (
          <div className="mb-6">
            <Notice tone="bad" title="Starlane is stopped">
              {t.stops.blockedBy.map((b) => b.reason).join(" ")} Analysis and actions are paused until the stop is cleared in Control.
            </Notice>
          </div>
        )}
        {discover.isError && (
          <div className="mb-6">
            <Notice tone="bad" title="Couldn't refresh decisions">{(discover.error as Error).message}</Notice>
          </div>
        )}
        {lastRun && lastRun.degraded.length > 0 && (
          <div className="mb-6">
            <Notice tone="warn" title="Part of the analysis didn't run">
              {lastRun.degraded.map((d) => `${d.detector}: ${d.error}`).join("; ")}. Decisions from the other sources are shown.
            </Notice>
          </div>
        )}

        {/* Summary: Harvey's auto-review line, then light stat tiles */}
        {today.isLoading && <div className="skeleton h-24 w-full rounded-xl mb-8" />}
        {today.isError && <div className="mb-8"><ErrorState title="Couldn't load today's summary" message={(today.error as Error).message} onRetry={() => today.refetch()} /></div>}
        {t && (
          <section className="mb-9">
            <p className="ds-line">
              <span className="cc-banner-mark"><StarlaneMark variant="glyph" size={10} /></span>
              <b>Starlane analysed your ledger</b>&nbsp;<span>{relTime(t.lastDiscovery?.at)}</span>
              <span className="ds-meta">
                {t.pilotMode === "SHADOW" ? <Pill tone="accent" title="Nothing is executed; Starlane records what it would have done">Shadow mode</Pill> : <Pill tone="good">Live mode</Pill>}
                {!t.externalSendEnabled && <Pill>Customer messages: drafts only</Pill>}
                <Link href="/control/decisions" className="hover-dim" style={{ color: C.muted }}>Controls</Link>
              </span>
            </p>
            <div className="ds-tiles">
              <div className="ds-tile"><Stat label="Need your decision" value={t.command.open + t.command.awaitingApproval} sub={t.command.awaitingApproval ? `${t.command.awaitingApproval} waiting for approval` : undefined} /></div>
              <div className="ds-tile"><Stat label="Deadline this week" value={t.command.deadlinesThisWeek} tone={t.command.deadlinesThisWeek ? "warn" : undefined} /></div>
              <div className="ds-tile"><Stat label="At stake if ignored, next 90 days" value={atStake.length ? atStake.map(([cur, v]) => money(v, cur)).join(" + ") : money(0)} /></div>
              <div className="ds-tile"><Stat label="Being verified" value={t.command.underWatch} tone={t.command.offTrack ? "bad" : undefined} sub={t.command.offTrack ? `${t.command.offTrack} off track` : undefined} /></div>
            </div>
          </section>
        )}

        {/* Inbox */}
        <div className="hv-tabs flex items-center gap-1 mb-2">
          {(["active", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => setScope(s)}
              className="hv-tab text-[13px]"
              style={{ padding: "5px 11px", borderRadius: 6, fontWeight: 500, color: scope === s ? "#0F0E0D" : "#6E6A63", background: scope === s ? "#ECEAE4" : "transparent" }}
            >
              {s === "active" ? "Open" : "Closed"}{scope === s && list.data ? ` (${decisions.length})` : ""}
            </button>
          ))}
        </div>

        {list.isLoading && <Skeleton rows={3} />}
        {list.isError && <div className="mt-6"><ErrorState title="Couldn't load decisions" message={(list.error as Error).message} onRetry={() => list.refetch()} /></div>}
        {!list.isLoading && !list.isError && decisions.length === 0 && (
          <div className="py-16 text-center">
            {discover.isPending ? (
              <p className="text-[14px]" style={{ color: C.muted }}>Analysing your receivables…</p>
            ) : t && t.receivables.invoices === 0 ? (
              <>
                <p className="text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>No data to decide on yet</p>
                <p className="text-[13px] mt-1.5 max-w-[460px] mx-auto" style={{ color: C.faint }}>
                  Upload the receivables file you already have (CSV or Excel), or connect your accounting system. Starlane needs your own history to find decisions; it never invents one.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <Button size="sm" onClick={() => router.push("/decisions/import")}>Upload a file</Button>
                  <Button size="sm" variant="secondary" onClick={() => router.push("/sources")}>Connect a data source</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[15px]" style={{ color: C.ink, fontWeight: 500 }}>{scope === "active" ? "Nothing needs a decision right now" : "No closed decisions yet"}</p>
                <p className="text-[13px] mt-1.5 max-w-[480px] mx-auto" style={{ color: C.faint }}>
                  {scope === "active"
                    ? "Starlane found nothing material that changed. Smaller or disputed balances are being watched, not escalated."
                    : "Decisions appear here once they are verified, rejected or resolved on their own."}
                </p>
              </>
            )}
          </div>
        )}
        {decisions.length > 0 && <DecisionTable decisions={decisions} onOpen={(d) => router.push(`/decisions/${d.id}`)} />}

        {lastRun && lastRun.watched.length > 0 && scope === "active" && (
          <section className="mt-10">
            <SectionLabel>Watching, not escalating</SectionLabel>
            <ul className="space-y-2">
              {lastRun.watched.slice(0, 8).map((w, i) => (
                <li key={i} className="text-[13px] flex gap-2" style={{ color: C.muted }}>
                  <FiAlertTriangle className="mt-[3px] shrink-0" size={12} style={{ color: C.faint }} />
                  <span><span style={{ color: C.body }}>{w.customer || "Order to cash"}</span>: {w.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {t && (
          <section className="mt-12">
            <SectionLabel>How much to trust this</SectionLabel>
            <HealthStrip dimensions={t.health.dimensions} />
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
