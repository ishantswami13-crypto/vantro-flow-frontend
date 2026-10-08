"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { C, ConfidencePill, HealthStrip, Notice, Pill } from "@/components/decisions/ui";
import { PageHeader, Subnav, Figure, SkeletonRows, Chevron } from "@/components/v32/ui";
import { IconRefresh, IconUpload } from "@/components/v32/icons";
import { EmptyNote, PageBody, RetryLine, SectionHead, amount, cleanTitle, humaneError } from "@/components/os/prepared/kit";
import css from "@/components/os/prepared/inbox.module.css";
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
  const days = daysUntil(d.deadline || d.window?.latestSafeAt || null);
  const atRisk = d.materiality?.expectedUncollected90 ?? d.materiality?.workingCapitalTiedUp ?? d.materiality?.revenueExposure ?? null;
  const live = d.status === "OPEN" || d.status === "NEEDS_INFORMATION" || d.status === "SELECTED" || d.status === "APPROVED";
  const urgent = live && days != null && days <= 3;
  return (
    <Link href={`/decisions/${d.id}`} className={`${css.linkRow} ${urgent ? css.attention : ""}`}>
      <div className="min-w-0">
        <div className={css.meta}>
          <Pill tone={!live ? "neutral" : d.status === "NEEDS_INFORMATION" ? "warn" : d.status === "OPEN" ? "neutral" : "good"}>{STATUS_LABEL[d.status] || d.status}</Pill>
          {dl && <span style={{ color: dl.tone === "bad" ? C.bad : undefined }}>{dl.text}</span>}
          {d.collisions && d.collisions.length > 0 && <span>Linked to {d.collisions.length} other decision{d.collisions.length === 1 ? "" : "s"}</span>}
        </div>
        <p className={css.title}>{cleanTitle(d.title)}</p>
        {d.whyNow && d.whyNow.length > 0 && (
          <p className={`${css.why} line-clamp-2`} style={{ margin: "2px 0 0" }}>{d.whyNow.slice(0, 2).join(". ")}.</p>
        )}
        {d.recommendation && (
          <div className="flex flex-wrap items-center" style={{ gap: "2px 12px", marginTop: 6, fontSize: 12.5 }}>
            <span style={{ color: C.faint }}>{d.recommendation.informationFirst ? "Recommended: find out first" : <>Recommended: <span style={{ color: C.body }}>{d.recommendation.label}</span></>}</span>
            <ConfidencePill band={d.confidence?.band} score={d.confidence?.score} />
          </div>
        )}
      </div>
      <div className={css.stake}>
        {atRisk != null ? <div className={css.stakeValue}>{amount(atRisk, d.currency)}</div> : <div className={css.stakeNone}>Not estimated</div>}
        {atRisk != null && <div className={css.stakeNote}>at stake if ignored</div>}
      </div>
      <span className={css.chev}><Chevron /></span>
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
                <IconRefresh size={13} /> {discover.isPending ? "Analysing…" : "Analyse now"}
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

        {/* Today, as a quiet strip of figures */}
        {today.isLoading && <div className="skeleton" style={{ height: 76, borderRadius: 6 }} />}
        {today.isError && <RetryLine error={today.error} onRetry={() => today.refetch()} fallback="Starlane couldn't load today's summary just now. Try again in a moment." />}
        {t && (
          <section aria-label="Today">
            <div className={css.strip}>
              <Figure value={formatCount(t.command.open + t.command.awaitingApproval)} label={t.command.awaitingApproval ? `Need your decision, ${t.command.awaitingApproval} awaiting approval` : "Need your decision"} />
              <Figure value={formatCount(t.command.deadlinesThisWeek)} label="Deadlines this week" />
              <Figure value={atStake.length ? atStake.map(([cur, v]) => amount(v, cur)).join(" + ") : "Not estimated"} label="Expected unpaid in 90 days if ignored" />
              <Figure value={formatCount(t.command.underWatch)} label={t.command.offTrack ? `Being verified, ${t.command.offTrack} off track` : "Being verified against forecasts"} tone={t.command.offTrack ? "var(--critical)" : undefined} />
            </div>
            <div className={css.stripMeta}>
              <span>Analysed {relTime(t.lastDiscovery?.at)}</span>
              <span title={t.pilotMode === "SHADOW" ? "Nothing is executed; Starlane records what it would have done" : undefined}>{t.pilotMode === "SHADOW" ? "Shadow mode" : "Live mode"}</span>
              {!t.externalSendEnabled && <span>Customer messages are drafts only</span>}
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

          {list.isLoading && <SkeletonRows rows={3} height={88} />}
          {list.isError && <div style={{ marginTop: 16 }}><RetryLine error={list.error} onRetry={() => list.refetch()} fallback="Starlane couldn't load your decisions just now. Try again in a moment." /></div>}
          {!list.isLoading && !list.isError && decisions.length === 0 && (
            discover.isPending ? (
              <p style={{ fontSize: 13, color: C.muted, padding: "16px 0", margin: 0 }}>Analysing your receivables…</p>
            ) : t && t.receivables.invoices === 0 ? (
              <EmptyNote
                action={
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => router.push("/decisions/import")}><IconUpload size={13} /> Upload a file</button>
                    <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => router.push("/sources")}>Connect Tally</button>
                  </div>
                }
              >
                No data to decide on yet. Upload the receivables file you already have, or connect Tally; Starlane only finds decisions in your own history.
              </EmptyNote>
            ) : (
              <EmptyNote>
                {scope === "active"
                  ? "No decisions need you. Nothing material changed; smaller or disputed balances are being watched, not escalated."
                  : "No closed decisions yet. Decisions appear here once they are verified, rejected or resolved on their own."}
              </EmptyNote>
            )
          )}
          {decisions.length > 0 && <div style={{ marginTop: 4 }}>{decisions.map((d) => <DecisionRow key={d.id} d={d} />)}</div>}
        </div>

        {lastRun && lastRun.watched.length > 0 && scope === "active" && (
          <section>
            <SectionHead title="Watching, not escalating" hint="Smaller or disputed balances Starlane keeps an eye on." />
            <ul style={{ margin: 0, padding: 0, listStyle: "none", borderTop: `1px solid ${C.line}` }}>
              {lastRun.watched.slice(0, 8).map((w, i) => (
                <li key={i} className="grid" style={{ gridTemplateColumns: "minmax(140px, 220px) minmax(0, 1fr)", columnGap: 24, fontSize: 13, padding: "10px 0", borderBottom: `1px solid ${C.line}` }}>
                  <span style={{ color: C.ink }}>{w.customer || "Order to cash"}</span>
                  <span style={{ color: C.muted }}>{w.reason}</span>
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
