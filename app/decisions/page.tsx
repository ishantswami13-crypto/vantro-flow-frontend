"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { C, ConfidencePill, HealthStrip, Notice, Pill } from "@/components/decisions/ui";
import { PageHeader, Subnav, Figure, EmptyLine, SkeletonRows, Chevron } from "@/components/v32/ui";
import { IconRefresh, IconUpload, IconAlert } from "@/components/v32/icons";
import { PageBody, RetryLine, SectionHead, amount, cleanTitle, humaneError } from "@/components/os/prepared/kit";
import { decisionsApi, relTime, daysUntil, STATUS_LABEL, type DecisionListItem, type DiscoverResponse } from "@/lib/decisions";
import { formatDate, formatCount } from "@/lib/format";

const STALE_AFTER_MS = 30 * 60 * 1000;

function deadlineText(d: DecisionListItem): { text: string; tone?: "bad" | "warn" } | null {
  const days = daysUntil(d.deadline || d.window?.latestSafeAt || null);
  if (days == null) return null;
  if (days < 0) return { text: `Window closed ${-days} day${days === -1 ? "" : "s"} ago`, tone: "bad" };
  if (days === 0) return { text: "Decide today", tone: "bad" };
  if (days <= 7) return { text: `Decide within ${days} day${days === 1 ? "" : "s"}`, tone: "warn" };
  return { text: `Decide by ${formatDate(d.deadline)}` };
}

function DecisionRow({ d }: { d: DecisionListItem }) {
  const dl = deadlineText(d);
  const atRisk = d.materiality?.expectedUncollected90 ?? d.materiality?.workingCapitalTiedUp ?? d.materiality?.revenueExposure ?? null;
  const live = d.status === "OPEN" || d.status === "NEEDS_INFORMATION" || d.status === "SELECTED" || d.status === "APPROVED";
  return (
    <Link
      href={`/decisions/${d.id}`}
      className="row-hover flex flex-col sm:flex-row sm:items-start"
      style={{ gap: 16, padding: "18px 12px", margin: "0 -12px", borderRadius: 8, borderBottom: `1px solid ${C.line}` }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center" style={{ gap: 8, fontSize: 12, color: C.faint }}>
          <Pill tone={!live ? "neutral" : d.status === "NEEDS_INFORMATION" ? "warn" : d.status === "OPEN" ? "accent" : "good"}>{STATUS_LABEL[d.status] || d.status}</Pill>
          {dl && <span style={{ color: dl.tone ? C[dl.tone] : C.faint }}>{dl.text}</span>}
          {d.collisions && d.collisions.length > 0 && <span>Linked to {d.collisions.length} other decision{d.collisions.length === 1 ? "" : "s"}</span>}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 500, color: C.ink, lineHeight: 1.45 }}>{cleanTitle(d.title)}</p>
        {d.whyNow && d.whyNow.length > 0 && (
          <p className="line-clamp-2" style={{ margin: "4px 0 0", fontSize: 13, color: C.muted, lineHeight: 1.55, maxWidth: 720 }}>{d.whyNow.slice(0, 2).join(". ")}.</p>
        )}
        <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 10 }}>
          {d.recommendation && <span style={{ fontSize: 12.5, color: C.body }}>{d.recommendation.informationFirst ? "Starlane suggests finding out first" : `Starlane suggests: ${d.recommendation.label}`}</span>}
          <ConfidencePill band={d.confidence?.band} score={d.confidence?.score} />
        </div>
      </div>
      <div className="flex sm:flex-col items-baseline sm:items-end shrink-0" style={{ gap: 4 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: atRisk != null ? C.ink : C.faint, fontVariantNumeric: "tabular-nums" }}>{atRisk != null ? amount(atRisk, d.currency) : "Not known yet"}</span>
        <span style={{ fontSize: 12, color: C.faint }}>at stake if ignored</span>
      </div>
      <span className="hidden sm:inline-flex" style={{ paddingTop: 6 }}><Chevron /></span>
    </Link>
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
      <PageBody>
        <PageHeader
          title="Decisions"
          subtitle="What needs your judgement, by when, and what each choice is likely to cost or return. Worked out from your own ledger."
          right={
            <>
              <Link href="/decisions/import" className="ui-btn ui-btn-ghost ui-btn-sm">Bring data</Link>
              <Link href="/decisions/proof" className="ui-btn ui-btn-ghost ui-btn-sm">Track record</Link>
              <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" disabled={discover.isPending} onClick={() => discover.mutate()}>
                <IconRefresh size={13} /> {discover.isPending ? "Analysing…" : "Refresh"}
              </button>
            </>
          }
        />

        {t && !t.stops.allowed && (
          <Notice tone="bad" title="Starlane is stopped">
            {t.stops.blockedBy.map((b) => b.reason).join(" ")} Analysis and actions are paused until the stop is cleared in Control.
          </Notice>
        )}
        {discover.isError && <RetryLine error={humaneError(discover.error, "Starlane couldn't refresh your decisions just now. Try again in a moment.")} onRetry={() => discover.mutate()} />}
        {lastRun && lastRun.degraded.length > 0 && (
          <Notice tone="warn" title="Part of the analysis didn't run">
            {lastRun.degraded.map((d) => d.detector).join(", ")} could not be checked this time. Decisions from the other sources are shown.
          </Notice>
        )}

        {/* Command figures */}
        {today.isLoading && <div className="skeleton" style={{ height: 112, borderRadius: 12 }} />}
        {today.isError && <RetryLine error={today.error} onRetry={() => today.refetch()} fallback="Starlane couldn't load today's summary just now. Try again in a moment." />}
        {t && (
          <section aria-label="Today" style={{ background: "var(--surface)", border: "1px solid var(--line-card)", borderRadius: 12, padding: "20px 22px" }}>
            <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 24 }}>
              <Figure value={formatCount(t.command.open + t.command.awaitingApproval)} label={t.command.awaitingApproval ? `Need your decision, ${t.command.awaitingApproval} awaiting approval` : "Need your decision"} />
              <Figure value={formatCount(t.command.deadlinesThisWeek)} label="Deadlines this week" tone={t.command.deadlinesThisWeek ? "var(--warning)" : undefined} />
              <Figure value={atStake.length ? atStake.map(([cur, v]) => amount(v, cur)).join(" + ") : "Not known yet"} label="Expected unpaid in 90 days if ignored" />
              <Figure value={formatCount(t.command.underWatch)} label={t.command.offTrack ? `Being verified, ${t.command.offTrack} off track` : "Being verified against forecasts"} tone={t.command.offTrack ? "var(--critical)" : undefined} />
            </div>
            <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.faint }}>
              <span>Analysed {relTime(t.lastDiscovery?.at)}</span>
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
        <div>
          <Subnav
            label="Decisions"
            active={scope}
            onChange={(k) => setScope(k as "active" | "closed")}
            items={[{ key: "active", label: "Open", count: scope === "active" && list.data ? decisions.length : null }, { key: "closed", label: "Closed", count: scope === "closed" && list.data ? decisions.length : null }]}
          />

          {list.isLoading && <SkeletonRows rows={3} height={96} />}
          {list.isError && <div style={{ marginTop: 16 }}><RetryLine error={list.error} onRetry={() => list.refetch()} fallback="Starlane couldn't load your decisions just now. Try again in a moment." /></div>}
          {!list.isLoading && !list.isError && decisions.length === 0 && (
            discover.isPending ? (
              <p style={{ fontSize: 14, color: C.muted, padding: "24px 0" }}>Analysing your receivables…</p>
            ) : t && t.receivables.invoices === 0 ? (
              <EmptyLine
                icon={<IconUpload size={17} />}
                title="No data to decide on yet"
                body="Upload the receivables file you already have (CSV or Excel), or connect Tally. Starlane needs your own history to find decisions; it never invents one."
                action={
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => router.push("/decisions/import")}>Upload a file</button>
                    <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => router.push("/sources")}>Connect Tally</button>
                  </div>
                }
              />
            ) : (
              <EmptyLine
                title={scope === "active" ? "Nothing needs a decision right now" : "No closed decisions yet"}
                body={scope === "active"
                  ? "Starlane found nothing material that changed. Smaller or disputed balances are being watched, not escalated."
                  : "Decisions appear here once they are verified, rejected or resolved on their own."}
              />
            )
          )}
          <div>
            {decisions.map((d) => <DecisionRow key={d.id} d={d} />)}
          </div>
        </div>

        {lastRun && lastRun.watched.length > 0 && scope === "active" && (
          <section>
            <SectionHead title="Watching, not escalating" hint="Smaller or disputed balances Starlane keeps an eye on." />
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {lastRun.watched.slice(0, 8).map((w, i) => (
                <li key={i} className="flex" style={{ gap: 10, fontSize: 13, color: C.muted, padding: "8px 0", borderTop: `1px solid ${C.line}` }}>
                  <span aria-hidden="true" style={{ color: C.faint, display: "inline-flex", paddingTop: 2 }}><IconAlert size={13} /></span>
                  <span><span style={{ color: C.ink }}>{w.customer || "Order to cash"}</span>: {w.reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {t && (
          <section>
            <SectionHead title="How much to trust this" />
            <HealthStrip dimensions={t.health.dimensions} />
          </section>
        )}
      </PageBody>
    </DashboardLayout>
  );
}
