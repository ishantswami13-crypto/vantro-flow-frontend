"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import { greeting } from "@/lib/greeting";
import { inrWhole, formatCount, formatClock, formatDate, formatRelative } from "@/lib/format";
import { V, Chevron, IconTile, SkeletonRows } from "@/components/v32/ui";
import { IconScan, IconCalendar, IconRupee, IconPromise, IconSync, IconWatch, IconPrepared, IconSources, IconCheck } from "@/components/v32/icons";
import { StatusChip, toneForStatus, type StatusTone } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { EvidenceSetDrawer } from "@/components/v32/EvidenceSetDrawer";
import { ScanComposer } from "@/components/scan/ScanComposer";
import { listThreads, type ScanThread } from "@/lib/scanStore";
import { personFirstName, plain, SectionHead, QuietLine, OFFLINE_LINE } from "@/components/os/bridge/kit";
import type { BridgeView, WatchEvent, FeatureAction, Mission } from "../../packages/contracts/src/features";
import { LIFECYCLE_LABEL } from "../../packages/contracts/src/features";

// The Bridge: the home. One calm read of GET /api/client/bridge (the same
// read the desktop and phone apps use), in the order a person needs it:
// what needs you now, what changed, what is prepared, what is coming up and
// whether the sources behind it are healthy. Nothing is computed here beyond
// counting and summing the rows the server sent.

const KIND_LABEL: Record<string, string> = {
  invoice_overdue: "Collections",
  promise_broken: "Payment promise",
  sync_failed: "Sources",
  sync_stale: "Sources",
  watch_triggered: "Your watch",
};

const LIFECYCLE_TONE: Partial<Record<FeatureAction["lifecycle"], StatusTone>> = {
  APPROVAL_REQUIRED: "attention", VALIDATED: "info", PROPOSED: "neutral", BLOCKED: "critical", FAILED: "critical",
};

const isUrgent = (e: WatchEvent) => e.severity === "critical" || e.severity === "high";

/** The one figure worth showing beside an event: a money value from its own evidence. */
function eventMetric(e: WatchEvent): string | null {
  const facts = e.evidence?.facts || [];
  const money = facts.find((x) => x.unit === "INR" && typeof x.value === "number");
  if (money && typeof money.value === "number") return inrWhole(money.value);
  const days = facts.find((x) => /days/i.test(x.label) && typeof x.value === "number");
  if (days && typeof days.value === "number") return `${formatCount(days.value)} days`;
  return null;
}

function actionHref(a: FeatureAction) {
  return a.missionId ? `/missions/${a.missionId}` : "/prepared";
}

export default function BridgePage() {
  const router = useRouter();
  const [data, setData] = useState<BridgeView | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [hello, setHello] = useState("");
  const [scan, setScan] = useState("");
  const [open, setOpen] = useState<WatchEvent | null>(null);
  const [recent, setRecent] = useState<ScanThread[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    request<BridgeView>("/api/client/bridge")
      .then((d) => setData(d))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setName(personFirstName());
    setHello(greeting());
    setRecent(listThreads().slice(0, 3));
    load();
  }, [load]);

  const latest = useMemo(() => data?.attention.watch.latest || [], [data]);
  const decisions = data?.attention.topDecisions || [];
  const prepared = (data?.prepared || []).filter((h) => h.count > 0 && h.first);
  const upcoming = (data?.missions || []).filter((m) => m.status === "active" && m.endsAt);
  const urgentCount = data?.attention.watch.urgent || 0;
  const decisionCount = data?.attention.decisions || 0;
  const topEvent = latest.find(isUrgent) || null;

  const subtitle = !data
    ? failed ? "" : "Reading your books…"
    : !data.hasData ? "Connect a source and Starlane will tell you what changed and what needs you."
    : decisionCount + urgentCount === 0 ? "Nothing needs you right now. Starlane is watching the rest."
    : [
        decisionCount ? `${formatCount(decisionCount)} decision${decisionCount === 1 ? "" : "s"} waiting on you` : null,
        urgentCount ? `${formatCount(urgentCount)} urgent item${urgentCount === 1 ? "" : "s"}` : null,
      ].filter(Boolean).join(" and ") + ".";

  return (
    <DashboardLayout pageTitle="The Bridge">
      <div className="w-full flex flex-col" style={{ maxWidth: 1180, gap: 32 }}>
        {/* Greeting */}
        <header className="fade-once flex items-start justify-between flex-wrap" style={{ gap: 16 }}>
          <div className="min-w-0">
            <h1 style={{ margin: 0, fontFamily: V.serif, fontWeight: 400, fontSize: 28, letterSpacing: "-0.3px", color: V.ink }}>
              {hello || "Hello"}{name ? `, ${name}` : ""}
            </h1>
            {subtitle && <p style={{ margin: "6px 0 0", fontSize: 14, color: V.secondary }}>{subtitle}</p>}
          </div>
          {data && <Freshness data={data} />}
        </header>

        {/* Ask */}
        <div style={{ maxWidth: 720, marginTop: -8 }}>
          <ScanComposer
            id="bridge-scan"
            value={scan}
            onChange={setScan}
            onSubmit={() => { if (scan.trim()) router.push(`/scan?q=${encodeURIComponent(scan.trim())}`); }}
            submitting={false}
            placeholder="Ask Starlane about your business"
          />
        </div>

        {failed && !data && (
          <div style={{ border: `1px solid ${V.divider}`, borderRadius: 12, background: V.surface }}>
            <ErrorState title="The Bridge didn't load" message={OFFLINE_LINE} onRetry={load} />
          </div>
        )}

        {loading && !data && !failed && (
          <>
            <FiguresSkeleton />
            <SkeletonRows rows={3} height={64} />
          </>
        )}

        {data && !data.hasData && <NoBooks />}

        {data && data.hasData && (
          <>
            <Figures data={data} />

            {data.partial && (
              <p style={{ margin: "-12px 0 0", fontSize: 12.5, color: V.tertiary }}>
                Part of your data couldn&apos;t be read this time, so some sections may be incomplete.{" "}
                <button type="button" onClick={load} className="hover-dim" style={{ color: V.secondary, textDecoration: "underline", textUnderlineOffset: 3 }}>Try again</button>
              </p>
            )}

            <div className="flex flex-col lg:flex-row" style={{ gap: 40 }}>
              {/* Main column */}
              <div className="min-w-0 flex flex-col" style={{ flex: 1, gap: 36 }}>
                <section aria-labelledby="needs-h">
                  <SectionHead id="needs-h" title="Needs you now" meta={decisionCount ? formatCount(decisionCount) : undefined} />
                  <NeedsYou decisions={decisions} topEvent={topEvent} onOpenEvent={setOpen} />
                </section>

                <section aria-labelledby="changed-h">
                  <SectionHead
                    id="changed-h"
                    title="What changed"
                    href={data.attention.watch.open + data.attention.watch.acknowledged > 0 ? "/watch" : undefined}
                    linkLabel={`All ${formatCount(data.attention.watch.open + data.attention.watch.acknowledged)} on Watch`}
                  />
                  {latest.length === 0 ? (
                    <QuietLine>Nothing changed that needs a look. Overdue bands, missed promises and sync problems appear here the moment Starlane sees them.</QuietLine>
                  ) : (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", borderTop: `1px solid ${V.divider}` }}>
                      {latest.map((e) => <ChangeRow key={e.id} e={e} onOpen={() => setOpen(e)} />)}
                    </ul>
                  )}
                </section>
              </div>

              {/* Rail */}
              <aside className="min-w-0 w-full lg:w-[320px] lg:shrink-0 flex flex-col" style={{ gap: 32 }}>
                <section aria-labelledby="prep-h">
                  <SectionHead id="prep-h" title="Prepared for you" href={prepared.length ? "/prepared" : undefined} linkLabel="Open" />
                  {data.prepared === null ? (
                    <QuietLine>Not known yet. Starlane couldn&apos;t read what is coming due.</QuietLine>
                  ) : prepared.length === 0 ? (
                    <QuietLine>Nothing is due to be prepared.</QuietLine>
                  ) : (
                    <ul style={listReset}>
                      {prepared.map((h) => (
                        <RailRow
                          key={h.horizon}
                          href={h.first!.route || "/prepared"}
                          icon={<IconPrepared size={15} />}
                          title={plain(h.first!.title)}
                          context={`${h.label}${h.count > 1 ? ` · ${formatCount(h.count)} items` : ""}`}
                          meta={h.first!.amount != null ? inrWhole(h.first!.amount) : undefined}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="up-h">
                  <SectionHead id="up-h" title="Upcoming" href={upcoming.length ? "/missions" : undefined} linkLabel="Missions" />
                  {upcoming.length === 0 ? (
                    <QuietLine>No mission deadline coming up.</QuietLine>
                  ) : (
                    <ul style={listReset}>
                      {upcoming.slice(0, 3).map((m) => <MissionRow key={m.id} m={m} />)}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="src-h">
                  <SectionHead id="src-h" title="Sources" href="/sources" linkLabel="Manage" />
                  <SourceList sources={data.sources} />
                </section>
              </aside>
            </div>
          </>
        )}

        {/* Recent work on this device */}
        {recent.length > 0 && (
          <section aria-labelledby="recent-h" className="fade-once">
            <SectionHead id="recent-h" title="Pick up where you left off" href="/scan/history" linkLabel="All conversations" />
            <div className="lib-grid">
              {recent.map((t) => (
                <Link key={t.id} href={`/scan/${t.id}`} className="lib-card" style={{ gap: 8 }}>
                  <IconTile size={30}><IconScan size={14} /></IconTile>
                  <div className="truncate" style={{ fontSize: 13.5, color: V.ink }}>{t.title}</div>
                  <div className="lib-tag tabular-nums">{t.turns.length} {t.turns.length === 1 ? "question" : "questions"} · {formatRelative(t.updatedAt)}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {open && (
        <EvidenceSetDrawer title={plain(open.title)} record={open.detail || undefined} evidence={open.evidence} onClose={() => setOpen(null)}>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <Link href="/watch" className="ui-btn ui-btn-secondary ui-btn-sm">Open in Watch</Link>
            {open.missionId && <Link href={`/missions/${open.missionId}`} className="ui-btn ui-btn-secondary ui-btn-sm">Open its mission</Link>}
          </div>
        </EvidenceSetDrawer>
      )}
    </DashboardLayout>
  );
}

const listReset: React.CSSProperties = { margin: 0, padding: 0, listStyle: "none" };

function Freshness({ data }: { data: BridgeView }) {
  const at = data.dataAsOf || data.sources.find((s) => s.lastSuccessAt)?.lastSuccessAt || null;
  if (data.freshness === "none") return <StatusChip tone="unknown">No source syncing yet</StatusChip>;
  if (data.freshness === "stale") return <StatusChip tone="critical" title={at ? formatDate(at) : undefined}>Sync stale · {formatRelative(at) || "a while ago"}</StatusChip>;
  if (data.freshness === "delayed") return <StatusChip tone="attention">Sync delayed · {formatRelative(at) || "a while ago"}</StatusChip>;
  return <span className="tabular-nums" style={{ fontSize: 12.5, color: V.tertiary, paddingTop: 10 }}>Synced {formatRelative(at) || "recently"}</span>;
}

/** Headline figures straight from `state`. Unknown stays "Not known yet". */
function Figures({ data }: { data: BridgeView }) {
  const s = data.state;
  const urgent = data.attention.watch.urgent;
  const cells: { label: string; value: string; sub?: string; tone?: string }[] = [
    { label: "Owed to you", value: s ? inrWhole(s.openReceivables) : "Not known yet", sub: s ? `${formatCount(s.openInvoiceCount)} open invoice${s.openInvoiceCount === 1 ? "" : "s"}` : undefined },
    { label: "Overdue", value: s ? inrWhole(s.overdueReceivables) : "Not known yet", sub: s ? `${formatCount(s.overdueInvoiceCount)} invoice${s.overdueInvoiceCount === 1 ? "" : "s"} past due` : undefined },
    { label: "Urgent", value: formatCount(urgent), sub: urgent ? "High or critical on Watch" : "Nothing urgent", tone: urgent ? V.critical : undefined },
    { label: "Waiting on you", value: formatCount(data.attention.decisions), sub: data.attention.decisions ? "Decisions to review" : "No decisions waiting" },
  ];
  return (
    <div className="fade-once grid grid-cols-2 md:grid-cols-4" style={{ borderTop: `1px solid ${V.divider}`, borderBottom: `1px solid ${V.divider}` }}>
      {cells.map((c, i) => (
        <div
          key={c.label}
          className="min-w-0 bridge-fig"
          style={{ padding: "18px 16px 18px 20px" }}
        >
          <div style={{ fontSize: 12.5, color: V.secondary }}>{c.label}</div>
          <div className="tabular-nums truncate text-[22px] md:text-[28px]" style={{ fontFamily: V.serif, lineHeight: 1.15, marginTop: 6, color: c.tone || V.ink, fontVariantNumeric: "tabular-nums" }}>
            {c.value}
          </div>
          {c.sub && <div className="truncate tabular-nums" style={{ fontSize: 12, color: V.tertiary, marginTop: 4 }}>{c.sub}</div>}
        </div>
      ))}
      <style>{`
        .bridge-fig { border-left: 1px solid var(--line); }
        .bridge-fig:first-child { border-left: none; padding-left: 0 !important; }
        @media (max-width: 767px) {
          .bridge-fig:nth-child(odd) { border-left: none; padding-left: 0 !important; }
          .bridge-fig:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
        }
      `}</style>
    </div>
  );
}

function FiguresSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 24, padding: "18px 0", borderTop: `1px solid ${V.divider}`, borderBottom: `1px solid ${V.divider}` }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col" style={{ gap: 10 }}>
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-6 w-28" />
        </div>
      ))}
    </div>
  );
}

function NoBooks() {
  return (
    <div className="fade-once" style={{ border: `1px solid ${V.divider}`, borderRadius: 12, background: V.surface, padding: "28px 28px" }}>
      <div className="flex items-start flex-wrap" style={{ gap: 18 }}>
        <IconTile size={40}><IconSources size={18} /></IconTile>
        <div className="flex-1 min-w-[220px]">
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: V.ink }}>Connect your books to begin</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: V.secondary, lineHeight: 1.6, maxWidth: 560 }}>
            Starlane reports only from your own records. Connect Tally or upload a receivables file, and the Bridge fills in after the first sync.
          </p>
          <div className="flex flex-wrap" style={{ gap: 8, marginTop: 16 }}>
            <Link href="/sources" className="ui-btn ui-btn-primary">Connect a source</Link>
            <Link href="/decisions/import" className="ui-btn ui-btn-secondary">Upload a file</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The one thing to do now, with its one primary action, then the rest. */
function NeedsYou({ decisions, topEvent, onOpenEvent }: { decisions: FeatureAction[]; topEvent: WatchEvent | null; onOpenEvent: (e: WatchEvent) => void }) {
  const top = decisions[0];
  const rest = decisions.slice(1, 4);

  if (!top && !topEvent) {
    return (
      <div className="flex items-center" style={{ gap: 14, padding: "18px 20px", border: `1px solid ${V.divider}`, borderRadius: 12, background: V.surface }}>
        <IconTile size={34} tone="positive"><IconCheck size={16} /></IconTile>
        <div className="min-w-0">
          <div style={{ fontSize: 14, color: V.ink }}>Nothing needs you right now.</div>
          <div style={{ fontSize: 12.5, color: V.secondary, marginTop: 2 }}>When a decision or an urgent change comes up, it appears here first.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${V.divider}`, borderRadius: 12, background: V.surface, overflow: "hidden" }}>
      {top ? (
        <div style={{ padding: "20px 22px" }}>
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 10 }}>
            <StatusChip tone={LIFECYCLE_TONE[top.lifecycle] || "neutral"}>{LIFECYCLE_LABEL[top.lifecycle] || "Waiting on you"}</StatusChip>
            {top.riskLevel === "high" && <StatusChip tone="critical">High risk</StatusChip>}
            <span className="tabular-nums" style={{ fontSize: 12, color: V.tertiary }}>Raised {formatClock(top.createdAt)}</span>
          </div>
          <div style={{ fontSize: 18, lineHeight: 1.35, color: V.ink, fontWeight: 500, letterSpacing: "-0.1px" }}>{plain(top.title)}</div>
          {top.description && <p className="tabular-nums" style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.6, color: V.body, maxWidth: 640 }}>{plain(top.description)}</p>}
          <div className="flex items-center flex-wrap" style={{ gap: 10, marginTop: 16 }}>
            <Link href={actionHref(top)} className="ui-btn ui-btn-primary">Review and decide</Link>
            {top.missionId && <span style={{ fontSize: 12.5, color: V.tertiary }}>Part of a mission</span>}
          </div>
        </div>
      ) : topEvent ? (
        <div style={{ padding: "20px 22px" }}>
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 10 }}>
            <StatusChip tone="critical">{topEvent.severity === "critical" ? "Critical" : "Urgent"}</StatusChip>
            <span className="tabular-nums" style={{ fontSize: 12, color: V.tertiary }}>Seen {formatClock(topEvent.firstSeenAt)}</span>
          </div>
          <div style={{ fontSize: 18, lineHeight: 1.35, color: V.ink, fontWeight: 500 }}>{plain(topEvent.title)}</div>
          {topEvent.detail && <p className="tabular-nums" style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.6, color: V.body }}>{plain(topEvent.detail)}</p>}
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={() => onOpenEvent(topEvent)} className="ui-btn ui-btn-primary">See why</button>
          </div>
        </div>
      ) : null}

      {rest.length > 0 && (
        <ul style={{ ...listReset, borderTop: `1px solid ${V.divider}` }}>
          {rest.map((a) => (
            <li key={a.id} style={{ borderTop: `1px solid ${V.divider}`, marginTop: -1 }}>
              <Link href={actionHref(a)} className="row-hover flex items-center" style={{ gap: 12, padding: "12px 22px", minHeight: 52 }}>
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: 13.5, color: V.ink }}>{plain(a.title)}</div>
                  <div className="truncate tabular-nums" style={{ fontSize: 12.5, color: V.secondary, marginTop: 1 }}>{plain(a.description) || LIFECYCLE_LABEL[a.lifecycle]}</div>
                </div>
                <span className="shrink-0 tabular-nums hidden sm:inline" style={{ fontSize: 12, color: V.tertiary }}>{formatClock(a.createdAt)}</span>
                <Chevron size={13} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: string }) {
  if (kind === "invoice_overdue") return <IconRupee size={15} />;
  if (kind === "promise_broken") return <IconPromise size={15} />;
  if (kind === "sync_failed" || kind === "sync_stale") return <IconSync size={15} />;
  return <IconWatch size={15} />;
}

function ChangeRow({ e, onOpen }: { e: WatchEvent; onOpen: () => void }) {
  const metric = eventMetric(e);
  return (
    <li style={{ borderBottom: `1px solid ${V.divider}` }}>
      <button type="button" onClick={onOpen} className="row-hover w-full text-left flex items-start" style={{ gap: 14, padding: "14px 8px", margin: "0 -8px", width: "calc(100% + 16px)", borderRadius: 8 }}>
        <IconTile size={32}><KindIcon kind={e.kind} /></IconTile>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 12, color: V.tertiary }}>{KIND_LABEL[e.kind] || "Watch"}</span>
            {e.severity === "critical" && <StatusChip tone="critical">Critical</StatusChip>}
            {e.severity === "high" && <StatusChip tone="critical">Urgent</StatusChip>}
            {e.state === "acknowledged" && <StatusChip tone="neutral">Seen</StatusChip>}
          </div>
          <div style={{ fontSize: 14, color: V.ink, lineHeight: 1.45 }}>{plain(e.title)}</div>
          {e.detail && <div className="tabular-nums" style={{ fontSize: 12.5, color: V.secondary, marginTop: 2, lineHeight: 1.5 }}>{plain(e.detail)}</div>}
        </div>
        <div className="shrink-0 flex flex-col items-end" style={{ gap: 4, paddingTop: 1 }}>
          {metric && <span className="tabular-nums" style={{ fontSize: 13.5, color: V.ink }}>{metric}</span>}
          <span className="tabular-nums" style={{ fontSize: 12, color: V.tertiary }}>{formatClock(e.firstSeenAt)}</span>
        </div>
      </button>
    </li>
  );
}

function RailRow({ href, icon, title, context, meta }: { href: string; icon: React.ReactNode; title: string; context?: string | null; meta?: string }) {
  return (
    <li style={{ borderTop: `1px solid ${V.divider}` }}>
      <Link href={href} className="row-hover flex items-start" style={{ gap: 12, padding: "12px 8px", margin: "0 -8px", borderRadius: 8 }}>
        <span className="shrink-0 inline-flex" style={{ color: V.secondary, marginTop: 2 }} aria-hidden="true">{icon}</span>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13.5, color: V.ink, lineHeight: 1.45 }}>{title}</div>
          {context && <div className="truncate tabular-nums" style={{ fontSize: 12, color: V.tertiary, marginTop: 2 }}>{context}</div>}
        </div>
        {meta && <span className="shrink-0 tabular-nums" style={{ fontSize: 13, color: V.ink, marginTop: 1 }}>{meta}</span>}
      </Link>
    </li>
  );
}

function MissionRow({ m }: { m: Mission }) {
  const p = m.progress;
  const ratio = p ? Math.max(0, Math.min(1, p.ratio)) : null;
  return (
    <li style={{ borderTop: `1px solid ${V.divider}` }}>
      <Link href={`/missions/${m.id}`} className="row-hover flex items-start" style={{ gap: 12, padding: "12px 8px", margin: "0 -8px", borderRadius: 8 }}>
        <span className="shrink-0 inline-flex" style={{ color: V.secondary, marginTop: 2 }} aria-hidden="true"><IconCalendar size={15} /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between" style={{ gap: 8 }}>
            <span className="truncate" style={{ fontSize: 13.5, color: V.ink }}>{plain(m.title)}</span>
            <span className="shrink-0 tabular-nums" style={{ fontSize: 12, color: V.tertiary }}>Ends {formatDate(m.endsAt)}</span>
          </div>
          {p ? (
            <>
              <div className="tabular-nums" style={{ fontSize: 12, color: V.secondary, marginTop: 3 }}>
                {inrWhole(p.collected)} of {inrWhole(p.targetAmount)}
                {p.daysLeft != null ? ` · ${formatCount(p.daysLeft)} day${p.daysLeft === 1 ? "" : "s"} left` : ""}
              </div>
              {ratio != null && (
                <div aria-hidden="true" style={{ height: 3, borderRadius: 2, background: "var(--surface-2)", marginTop: 8, overflow: "hidden" }}>
                  <div style={{ width: `${ratio * 100}%`, height: "100%", background: "var(--ink-2)", borderRadius: 2 }} />
                </div>
              )}
            </>
          ) : (
            <div className="truncate" style={{ fontSize: 12, color: V.tertiary, marginTop: 3 }}>{plain(m.objective)}</div>
          )}
        </div>
      </Link>
    </li>
  );
}

const HEALTH_TEXT: Record<string, string> = {
  healthy: "Healthy", connected: "Connected", syncing: "Syncing", degraded: "Degraded", stale: "Stale", failed: "Failed",
  auth_expired: "Sign-in expired", disconnected: "Disconnected", not_connected: "Not connected", rate_limited: "Rate limited",
};

function SourceList({ sources }: { sources: BridgeView["sources"] }) {
  if (sources.length === 0) return <QuietLine>No source connected yet.</QuietLine>;
  return (
    <ul style={listReset}>
      {sources.map((s) => {
        const key = String(s.health || "").toLowerCase();
        return (
          <li key={s.id} className="flex items-center" style={{ gap: 12, padding: "11px 0", borderTop: `1px solid ${V.divider}` }}>
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontSize: 13.5, color: V.ink }}>{s.name}</div>
              <div className="tabular-nums" style={{ fontSize: 12, color: V.tertiary, marginTop: 1 }}>
                {s.lastSuccessAt ? `Last synced ${formatRelative(s.lastSuccessAt)}` : "Never synced"}
              </div>
            </div>
            <StatusChip tone={toneForStatus(key)}>{HEALTH_TEXT[key] || (key ? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Not known yet")}</StatusChip>
          </li>
        );
      })}
    </ul>
  );
}

