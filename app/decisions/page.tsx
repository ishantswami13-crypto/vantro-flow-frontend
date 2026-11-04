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
import { C, ConfidencePill, HealthStrip, Notice, Pill, SectionLabel, Skeleton, Stat } from "@/components/decisions/ui";
import { decisionsApi, money, relTime, shortDate, daysUntil, STATUS_LABEL, type DecisionListItem, type DiscoverResponse } from "@/lib/decisions";

const STALE_AFTER_MS = 30 * 60 * 1000;

function deadlineText(d: DecisionListItem): { text: string; tone?: "bad" | "warn" } | null {
  const days = daysUntil(d.deadline || d.window?.latestSafeAt || null);
  if (days == null) return null;
  if (days < 0) return { text: `Window closed ${-days} day${days === -1 ? "" : "s"} ago`, tone: "bad" };
  if (days === 0) return { text: "Decide today", tone: "bad" };
  if (days <= 7) return { text: `Decide within ${days} day${days === 1 ? "" : "s"}`, tone: "warn" };
  return { text: `Decide by ${shortDate(d.deadline)}` };
}

const STATUS_TONE: Record<string, "neutral" | "good" | "warn" | "bad" | "accent"> = {
  OPEN: "warn", NEEDS_INFORMATION: "neutral", SELECTED: "accent", APPROVED: "accent", EXECUTING: "accent",
  SHADOWED: "neutral", EXECUTED: "good", VERIFIED: "good", REJECTED: "neutral", EXPIRED: "bad", RESOLVED: "good", SUPERSEDED: "neutral",
};

function IconDoc() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 1.8h5.2L12.5 5v9.2H4z" /><path d="M9 1.8V5.2h3.5M6 8.5h4.5M6 11h3" /></svg>;
}

/** One row of the decisions table, laid out like Harvey's review table. */
function DecisionRow({ d, onOpen }: { d: DecisionListItem; onOpen: () => void }) {
  const dl = deadlineText(d);
  const atRisk = d.materiality?.expectedUncollected90 ?? d.materiality?.workingCapitalTiedUp ?? d.materiality?.revenueExposure ?? null;
  const sub = d.whyNow && d.whyNow.length > 0 ? d.whyNow[0] : d.collisions && d.collisions.length > 0 ? `Linked to ${d.collisions.length} other decision${d.collisions.length === 1 ? "" : "s"}` : null;
  return (
    <tr className="dt-row" onClick={onOpen}>
      <td className="dt-main">
        <div className="flex items-start gap-2 min-w-0">
          <span className="dt-ic"><IconDoc /></span>
          <div className="min-w-0">
            <Link href={`/decisions/${d.id}`} className="dt-title" onClick={(e) => e.stopPropagation()}>{d.title}</Link>
            {sub && <p className="dt-sub">{sub}</p>}
            <div className="dt-mobile">
              <Pill tone={STATUS_TONE[d.status] || "neutral"}>{STATUS_LABEL[d.status] || d.status}</Pill>
              {atRisk != null && <span className="tabular-nums">{money(atRisk, d.currency)}</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="dt-col"><Pill tone={STATUS_TONE[d.status] || "neutral"}>{STATUS_LABEL[d.status] || d.status}</Pill></td>
      <td className="dt-col dt-sugg">
        {d.recommendation
          ? <span className="inline-flex items-center gap-1.5"><span className="dt-ic dt-ic-sm"><StarlaneMark variant="glyph" size={8} /></span>{d.recommendation.informationFirst ? "Find out first" : d.recommendation.label}</span>
          : <span style={{ color: "#A8A39A" }}>Weighing options…</span>}
        <div className="mt-1"><ConfidencePill band={d.confidence?.band} score={d.confidence?.score} /></div>
      </td>
      <td className="dt-col tabular-nums" style={{ color: C.body }}>{atRisk != null ? money(atRisk, d.currency) : "—"}</td>
      <td className="dt-col dt-right" style={{ color: dl?.tone ? C[dl.tone] : "#8F8A81" }}>
        {dl ? dl.text : d.updatedAt ? relTime(d.updatedAt) : "—"}
      </td>
    </tr>
  );
}

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
      <div className="max-w-[1100px] mx-auto px-2 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
          <h1 className="hv-title" style={{ color: "#0F0E0D", fontSize: 38, lineHeight: 1.05, letterSpacing: "-0.02em", fontFamily: "var(--serif, 'Newsreader', Georgia, serif)", fontWeight: 400 }}>Decisions</h1>
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
                  Upload the receivables file you already have (CSV or Excel), or connect Tally. Starlane needs your own history to find decisions; it never invents one.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <Button size="sm" onClick={() => router.push("/decisions/import")}>Upload a file</Button>
                  <Button size="sm" variant="secondary" onClick={() => router.push("/sources")}>Connect Tally</Button>
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
        {decisions.length > 0 && (
          <div className="dt-wrap">
            <table className="dt">
              <thead>
                <tr><th scope="col">Decision</th><th scope="col" className="dt-col">Status</th><th scope="col" className="dt-col">Starlane suggests</th><th scope="col" className="dt-col">At stake</th><th scope="col" className="dt-col dt-right">Deadline</th></tr>
              </thead>
              <tbody>
                {decisions.map((d) => (
                  <DecisionRow key={d.id} d={d} onOpen={() => router.push(`/decisions/${d.id}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

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
