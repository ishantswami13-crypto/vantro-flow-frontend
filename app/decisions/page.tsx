"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiChevronRight, FiRefreshCw, FiAlertTriangle } from "react-icons/fi";
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

function DecisionRow({ d, onOpen }: { d: DecisionListItem; onOpen: () => void }) {
  const dl = deadlineText(d);
  const atRisk = d.materiality?.expectedUncollected90 ?? d.materiality?.workingCapitalTiedUp ?? d.materiality?.revenueExposure ?? null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left flex items-start gap-4 py-6 transition-colors"
      style={{ borderBottom: `1px solid ${C.line}` }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = C.wash)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      <span aria-hidden="true" className="mt-2 rounded-full shrink-0 id-gradient" style={{ width: 7, height: 7, opacity: d.status === "OPEN" || d.status === "NEEDS_INFORMATION" ? 1 : 0.35 }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[12px]" style={{ color: C.faint }}>
          <span>{STATUS_LABEL[d.status] || d.status}</span>
          {dl && <span style={{ color: dl.tone ? C[dl.tone] : C.faint, fontWeight: dl.tone ? 500 : 400 }}>· {dl.text}</span>}
          {d.collisions && d.collisions.length > 0 && <span>· Linked to {d.collisions.length} other decision{d.collisions.length === 1 ? "" : "s"}</span>}
        </div>
        <p className="text-[16px] mt-1 leading-snug" style={{ color: C.ink, fontWeight: 500 }}>{d.title}</p>
        {d.whyNow && d.whyNow.length > 0 && (
          <p className="text-[13px] mt-1 leading-[1.5] max-w-[680px] line-clamp-2" style={{ color: C.muted }}>{d.whyNow.slice(0, 2).join(". ")}.</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {atRisk != null && <span className="text-[12px] tabular-nums" style={{ color: C.body }}>{money(atRisk, d.currency)} at stake if ignored</span>}
          {d.recommendation && (
            <Pill tone="accent">{d.recommendation.informationFirst ? "Find out first" : `Suggests: ${d.recommendation.label}`}</Pill>
          )}
          <ConfidencePill band={d.confidence?.band} score={d.confidence?.score} />
        </div>
      </div>
      <FiChevronRight className="shrink-0 mt-2" size={16} style={{ color: "var(--ink-3)" }} />
    </button>
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
          <h1 className="text-[30px] lg:text-[34px]" style={{ color: C.ink }}>Decisions</h1>
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

        {/* Command header */}
        {today.isLoading && <div className="skeleton h-24 w-full rounded-xl mb-8" />}
        {today.isError && <div className="mb-8"><ErrorState title="Couldn't load today's summary" message={(today.error as Error).message} onRetry={() => today.refetch()} /></div>}
        {t && (
          <section className="rounded-2xl px-5 py-5 mb-10" style={{ background: "var(--surface)", border: `1px solid ${C.line}` }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Stat label="Need your decision" value={t.command.open + t.command.awaitingApproval} sub={t.command.awaitingApproval ? `${t.command.awaitingApproval} waiting for approval` : "options analysed"} />
              <Stat label="Deadline this week" value={t.command.deadlinesThisWeek} tone={t.command.deadlinesThisWeek ? "warn" : undefined} sub="before the window closes" />
              <Stat
                label="At stake if ignored"
                value={atStake.length ? atStake.map(([cur, v]) => money(v, cur)).join(" + ") : money(0)}
                sub="expected unpaid in 90 days, open decisions"
              />
              <Stat label="Being verified" value={t.command.underWatch} tone={t.command.offTrack ? "bad" : undefined} sub={t.command.offTrack ? `${t.command.offTrack} off track` : "outcomes checked against forecasts"} />
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 text-[12px]" style={{ borderTop: `1px solid ${C.line}`, color: C.faint }}>
              <span>Analysed {relTime(t.lastDiscovery?.at)}</span>
              <span>·</span>
              {t.pilotMode === "SHADOW" ? (
                <Pill tone="accent" title="Nothing is executed; Starlane records what it would have done">Shadow mode</Pill>
              ) : (
                <Pill tone="good">Live mode</Pill>
              )}
              {!t.externalSendEnabled && <Pill>Customer messages: drafts only</Pill>}
              <Link href="/control/decisions" className="hover-dim ml-auto" style={{ color: C.muted }}>Controls</Link>
            </div>
          </section>
        )}

        {/* Inbox */}
        <div className="flex items-center gap-5 mb-1" style={{ borderBottom: `1px solid ${C.line}` }}>
          {(["active", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className="py-2 text-[13px]"
              style={{ color: scope === s ? C.ink : C.muted, fontWeight: scope === s ? 500 : 400, borderBottom: `2px solid ${scope === s ? C.accent : "transparent"}` }}
            >
              {s === "active" ? "Open" : "Closed"}
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
        {decisions.map((d) => (
          <DecisionRow key={d.id} d={d} onOpen={() => router.push(`/decisions/${d.id}`)} />
        ))}

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
