"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import { greeting } from "@/lib/greeting";
import { inrWhole, formatCount, formatClock, formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { PageHeader, Sep, Chevron } from "@/components/v32/ui";
import { IconScan } from "@/components/v32/icons";
import { StatusChip, toneForStatus, type StatusTone } from "@/components/ui/Badge";
import { EvidenceSetDrawer } from "@/components/v32/EvidenceSetDrawer";
import { listThreads, type ScanThread } from "@/lib/scanStore";
import { personFirstName, businessName, plain, SectionHead, QuietLine, QuietError, OFFLINE_LINE } from "@/components/os/bridge/kit";
import type { BridgeView, WatchEvent, FeatureAction, Mission } from "../../packages/contracts/src/features";
import { LIFECYCLE_LABEL } from "../../packages/contracts/src/features";

// The Bridge: the home. One calm read of GET /api/client/bridge (the same
// read the desktop and phone apps use), laid out as an executive workspace:
// header (company, last synced, health), a compact figure strip, then what
// needs you, what changed, decisions forming, missions running and the
// business state underneath. Nothing is computed here beyond counting,
// summing and comparing the rows the server sent.

const KIND_LABEL: Record<string, string> = {
  invoice_overdue: "Collections",
  promise_broken: "Payment promise",
  sync_failed: "Sources",
  sync_stale: "Sources",
  watch_triggered: "Your watch",
};

const TYPE_LABEL: Record<string, string> = { reminder: "Reminder", call: "Call", followup: "Follow-up", follow_up: "Follow-up" };
const typeLabel = (t: string) => TYPE_LABEL[t] || (t ? t.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Decision");

const LIFECYCLE_TONE: Partial<Record<FeatureAction["lifecycle"], StatusTone>> = {
  APPROVAL_REQUIRED: "attention", VALIDATED: "info", PROPOSED: "neutral", BLOCKED: "critical", FAILED: "critical",
};

const HEALTH_TEXT: Record<string, string> = {
  healthy: "Healthy", connected: "Connected", syncing: "Syncing", degraded: "Degraded", stale: "Stale", failed: "Failed",
  auth_expired: "Sign-in expired", disconnected: "Disconnected", not_connected: "Not connected", rate_limited: "Rate limited",
};
const healthText = (key: string) => HEALTH_TEXT[key] || (key ? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "Not known yet");

const isUrgent = (e: WatchEvent) => e.severity === "critical" || e.severity === "high";
const plural = (n: number, one: string, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`;

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
  const [company, setCompany] = useState("");
  const [hello, setHello] = useState("");
  const [ask, setAsk] = useState("");
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
    setCompany(businessName());
    setHello(greeting());
    setRecent(listThreads().slice(0, 3));
    load();
  }, [load]);

  const latest = useMemo(() => data?.attention.watch.latest || [], [data]);
  const decisions = data?.attention.topDecisions || [];
  const prepared = (data?.prepared || []).filter((h) => h.count > 0 && h.first);
  const running = (data?.missions || []).filter((m) => m.status === "active");
  const urgentCount = data?.attention.watch.urgent || 0;
  const decisionCount = data?.attention.decisions || 0;
  const topEvent = latest.find(isUrgent) || null;
  const watchTotal = data ? data.attention.watch.open + data.attention.watch.acknowledged : 0;

  const hi = `${hello || "Hello"}${name ? `, ${name}` : ""}.`;
  const summary = !data
    ? failed ? "" : "Reading your books…"
    : !data.hasData ? "Connect a source and Starlane will show what changed and what needs you."
    : decisionCount + urgentCount === 0 ? "Nothing needs you right now."
    : [
        decisionCount ? `${plural(decisionCount, "decision")} waiting on you` : null,
        urgentCount ? `${plural(urgentCount, "urgent change")} on Watch` : null,
      ].filter(Boolean).join(", ") + ".";

  const submitAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (ask.trim()) router.push(`/scan?q=${encodeURIComponent(ask.trim())}`);
  };

  return (
    <DashboardLayout pageTitle="The Bridge">
      <div className="w-full page-stack" style={{ maxWidth: 1180 }}>
        <PageHeader
          title={company || "The Bridge"}
          subtitle={summary ? `${hi} ${summary}` : hi}
          right={
            <form onSubmit={submitAsk} role="search" className="page-search hidden md:flex" style={{ width: 300 }}>
              <IconScan size={14} />
              <label htmlFor="bridge-ask" className="sr-only">Ask Starlane about your business</label>
              <input id="bridge-ask" value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask about your business" autoComplete="off" enterKeyHint="search" />
            </form>
          }
        >
          {data && <HeaderMeta data={data} />}
        </PageHeader>

        {failed && !data && <QuietError message={`The Bridge didn't load. ${OFFLINE_LINE}`} onRetry={load} />}

        {loading && !data && !failed && <BridgeSkeleton />}

        {data && !data.hasData && <NoBooks />}

        {data && data.hasData && (
          <>
            <Strip data={data} />

            {data.partial && (
              <p className="meta" style={{ margin: "12px 0 0" }}>
                Part of your data couldn&apos;t be read this time, so some sections may be incomplete.{" "}
                <button type="button" onClick={load} className="hover-dim" style={{ color: "var(--ink-2)", textDecoration: "underline", textUnderlineOffset: 3 }}>Try again</button>
              </p>
            )}

            <section aria-labelledby="needs-h">
              <SectionHead id="needs-h" title="What needs you" meta={decisionCount ? formatCount(decisionCount) : undefined} href={decisionCount > decisions.length ? "/prepared" : undefined} linkLabel="All decisions" />
              <NeedsYou decisions={decisions} topEvent={topEvent} watching={watchTotal} onOpenEvent={setOpen} />
            </section>

            <section aria-labelledby="changed-h">
              <SectionHead id="changed-h" title="What changed" href={watchTotal > 0 ? "/watch" : undefined} linkLabel={`All ${formatCount(watchTotal)} on Watch`} />
              {latest.length === 0 ? (
                <QuietLine>Nothing changed that needs a look. Overdue bands, missed promises and sync problems appear here the moment Starlane sees them.</QuietLine>
              ) : (
                <ul className="rf-list">
                  {latest.map((e) => <ChangeRow key={e.id} e={e} onOpen={() => setOpen(e)} />)}
                </ul>
              )}
            </section>

            <div className="rf-cols-2">
              <section aria-labelledby="forming-h" className="min-w-0">
                <SectionHead id="forming-h" title="Decisions forming" href={prepared.length ? "/prepared" : undefined} linkLabel="Prepared" />
                {data.prepared === null ? (
                  <QuietLine>Not known yet. Starlane couldn&apos;t read what is coming due.</QuietLine>
                ) : prepared.length === 0 ? (
                  <QuietLine>Nothing is coming due in the next 30 days.</QuietLine>
                ) : (
                  <ul className="rf-list">
                    {prepared.map((h) => <FormingRow key={h.horizon} h={h} />)}
                  </ul>
                )}
              </section>

              <section aria-labelledby="missions-h" className="min-w-0">
                <SectionHead id="missions-h" title="Missions running" meta={running.length ? formatCount(running.length) : undefined} href="/missions" linkLabel="Missions" />
                {running.length === 0 ? (
                  <QuietLine>No mission is running. Start one from an overdue invoice on Watch.</QuietLine>
                ) : (
                  <ul className="rf-list">
                    {running.slice(0, 4).map((m) => <MissionRow key={m.id} m={m} />)}
                  </ul>
                )}
              </section>
            </div>

            <BusinessState data={data} />
          </>
        )}

        {recent.length > 0 && (
          <section aria-labelledby="recent-h">
            <SectionHead id="recent-h" title="Recent questions" href="/scan/history" linkLabel="All conversations" />
            <ul className="rf-list">
              {recent.map((t) => (
                <li key={t.id}>
                  <Link href={`/scan/${t.id}`} className="rf-row" style={{ gridTemplateColumns: "minmax(0, 1fr) auto 14px", alignItems: "center" }}>
                    <span className="rf-title truncate">{t.title}</span>
                    <span className="rf-time">{plural(t.turns.length, "question")} · {formatRelative(t.updatedAt)}</span>
                    <Chevron size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {open && (
        <EvidenceSetDrawer title={plain(open.title)} record={open.detail || undefined} evidence={open.evidence} onClose={() => setOpen(null)}>
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <Link href="/watch" className="ui-btn ui-btn-secondary ui-btn-sm">View on Watch</Link>
            {open.missionId && <Link href={`/missions/${open.missionId}`} className="ui-btn ui-btn-secondary ui-btn-sm">View its mission</Link>}
          </div>
        </EvidenceSetDrawer>
      )}
    </DashboardLayout>
  );
}

/** Freshness and source health, as one quiet line under the title. */
function HeaderMeta({ data }: { data: BridgeView }) {
  const at = data.dataAsOf || data.sources.find((s) => s.lastSuccessAt)?.lastSuccessAt || null;
  const unhealthy = data.sources.filter((s) => toneForStatus(String(s.health || "").toLowerCase()) !== "positive").length;
  const fresh: { tone: StatusTone; label: string } =
    data.freshness === "none" ? { tone: "unknown", label: "No source syncing yet" }
    : data.freshness === "stale" ? { tone: "critical", label: "Sync stale" }
    : data.freshness === "delayed" ? { tone: "attention", label: "Sync delayed" }
    : { tone: "positive", label: "Up to date" };
  return (
    <div className="flex items-center flex-wrap meta" style={{ gap: 8, marginTop: 10 }}>
      <StatusChip tone={fresh.tone}>{fresh.label}</StatusChip>
      {at && <><Sep /><span title={formatDateTime(at)}>Synced {formatRelative(at) || "recently"}</span></>}
      {data.sources.length > 0 && (
        <>
          <Sep />
          <Link href="/sources" className="hover-dim" style={{ color: unhealthy ? "var(--warning)" : "var(--ink-3)" }}>
            {plural(data.sources.length, "source")}{unhealthy ? `, ${formatCount(unhealthy)} need${unhealthy === 1 ? "s" : ""} a look` : ""}
          </Link>
        </>
      )}
    </div>
  );
}

/** Headline figures straight from `state`, as one compact strip. Unknown stays "Not known yet". */
function Strip({ data }: { data: BridgeView }) {
  const s = data.state;
  const over90 = s?.ageing.find((b) => b.id === "90_plus") || null;
  const urgent = data.attention.watch.urgent;
  const cells: { label: string; value: string; sub?: string; tone?: string }[] = [
    { label: "Owed to you", value: s ? inrWhole(s.openReceivables) : "Not known yet", sub: s ? plural(s.openInvoiceCount, "open invoice") : undefined },
    { label: "Overdue", value: s ? inrWhole(s.overdueReceivables) : "Not known yet", sub: s ? `${plural(s.overdueInvoiceCount, "invoice")} past due` : undefined },
    { label: "Over 90 days", value: over90 ? inrWhole(over90.amount) : s ? inrWhole(0) : "Not known yet", sub: over90 ? plural(over90.count, "invoice") : undefined },
    { label: "Urgent on Watch", value: formatCount(urgent), sub: urgent ? "High or critical" : "Nothing urgent", tone: urgent ? "var(--critical)" : undefined },
  ];
  return (
    <dl className="rf-strip">
      {cells.map((c) => (
        <div key={c.label}>
          <dt>{c.label}</dt>
          <dd>
            <span className="rf-strip-v" style={c.tone ? { color: c.tone } : undefined}>{c.value}</span>
            {c.sub && <span className="rf-strip-s">{c.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function BridgeSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="page-stack">
      <div className="rf-strip">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col" style={{ gap: 8 }}>
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-4 w-28" />
          </div>
        ))}
      </div>
      {[3, 4].map((rows, k) => (
        <div key={k}>
          <div className="skeleton h-3 w-24" style={{ marginBottom: 12 }} />
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center" style={{ gap: 16, height: 52, borderTop: "1px solid var(--line)" }}>
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-3 flex-1 max-w-[420px]" />
              <div className="skeleton h-3 w-16 ml-auto" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function NoBooks() {
  return (
    <section aria-labelledby="nobooks-h" style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
      <h2 id="nobooks-h" style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>Connect your books to begin</h2>
      <p className="prose-measure" style={{ margin: "6px 0 0", fontSize: 13.5 }}>
        Starlane reports only from your own records. Connect Tally or upload a receivables file, and the Bridge fills in after the first sync.
      </p>
      <div className="flex flex-wrap" style={{ gap: 8, marginTop: 16 }}>
        <Link href="/sources/connect" className="ui-btn ui-btn-primary">Connect Tally</Link>
        <Link href="/decisions/import" className="ui-btn ui-btn-secondary">Upload a file</Link>
      </div>
    </section>
  );
}

/** Human attention: each row carries its category, one line of context,
 *  its state, when it was raised and the action. Only the first row gets
 *  the page's one primary button. */
function NeedsYou({ decisions, topEvent, watching, onOpenEvent }: { decisions: FeatureAction[]; topEvent: WatchEvent | null; watching: number; onOpenEvent: (e: WatchEvent) => void }) {
  const rows = decisions.slice(0, 4);

  if (rows.length === 0 && !topEvent) {
    return (
      <QuietLine>
        No decisions need you.{watching > 0 ? ` Starlane is following ${plural(watching, "open change")} on Watch.` : " Starlane is watching your books."}
      </QuietLine>
    );
  }

  if (rows.length === 0 && topEvent) {
    return (
      <ul className="rf-list">
        <li>
          <div className="rf-row rf-needs rf-first">
            <span className="rf-kind rf-desk">{KIND_LABEL[topEvent.kind] || "Watch"}</span>
            <div className="min-w-0">
              <div className="rf-title" style={{ fontWeight: 500 }}>{plain(topEvent.title)}</div>
              {topEvent.detail && <div className="rf-sub">{plain(topEvent.detail)}</div>}
              <div className="rf-mob">
                <StatusChip tone="critical">{topEvent.severity === "critical" ? "Critical" : "Urgent"}</StatusChip>
                <span className="num">{formatClock(topEvent.firstSeenAt)}</span>
              </div>
            </div>
            <span className="rf-desk"><StatusChip tone="critical">{topEvent.severity === "critical" ? "Critical" : "Urgent"}</StatusChip></span>
            <span className="rf-time rf-desk">{formatClock(topEvent.firstSeenAt)}</span>
            <span className="rf-actions">
              <button type="button" onClick={() => onOpenEvent(topEvent)} className="ui-btn ui-btn-primary ui-btn-sm">View evidence</button>
            </span>
          </div>
        </li>
      </ul>
    );
  }

  return (
    <ul className="rf-list">
      {rows.map((a, i) => {
        const tone = LIFECYCLE_TONE[a.lifecycle] || "neutral";
        const state = LIFECYCLE_LABEL[a.lifecycle] || "Waiting on you";
        return (
          <li key={a.id}>
            <div className={`rf-row rf-needs ${i === 0 ? "rf-first" : ""}`}>
              <span className="rf-kind rf-desk">{typeLabel(a.type)}</span>
              <div className="min-w-0">
                <Link href={actionHref(a)} className="rf-title hover-dim" style={{ fontWeight: i === 0 ? 500 : 400 }}>{plain(a.title)}</Link>
                {a.description && <div className="rf-sub">{plain(a.description)}</div>}
                <div className="rf-mob">
                  <span>{typeLabel(a.type)}</span>
                  <StatusChip tone={tone}>{state}</StatusChip>
                  {a.riskLevel === "high" && <StatusChip tone="critical">High risk</StatusChip>}
                </div>
              </div>
              <span className="rf-desk">
                <span className="flex flex-col" style={{ gap: 2 }}>
                  <StatusChip tone={tone}>{state}</StatusChip>
                  {a.riskLevel === "high" && <StatusChip tone="critical">High risk</StatusChip>}
                </span>
              </span>
              <span className="rf-time rf-desk" title={formatDateTime(a.createdAt)}>{formatClock(a.createdAt)}</span>
              <span className="rf-actions">
                {i === 0
                  ? <Link href={actionHref(a)} className="ui-btn ui-btn-primary ui-btn-sm">Handle it</Link>
                  : <Link href={actionHref(a)} className="ui-btn ui-btn-ghost ui-btn-sm">Review</Link>}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ChangeRow({ e, onOpen }: { e: WatchEvent; onOpen: () => void }) {
  const metric = eventMetric(e);
  const status: { tone: StatusTone; label: string } | null =
    e.severity === "critical" ? { tone: "critical", label: "Critical" }
    : e.severity === "high" ? { tone: "critical", label: "Urgent" }
    : e.state === "acknowledged" ? { tone: "neutral", label: "Seen" }
    : null;
  return (
    <li>
      <button type="button" onClick={onOpen} className="rf-row rf-change" aria-label={`${plain(e.title)}: view evidence`}>
        <span className="rf-kind rf-desk">{KIND_LABEL[e.kind] || "Watch"}</span>
        <span className="min-w-0 block">
          <span className="rf-title block">{plain(e.title)}</span>
          {e.detail && <span className="rf-sub block">{plain(e.detail)}</span>}
          <span className="rf-mob">
            <span>{KIND_LABEL[e.kind] || "Watch"}</span>
            {status && <StatusChip tone={status.tone}>{status.label}</StatusChip>}
            <span className="num">{formatClock(e.firstSeenAt)}</span>
          </span>
        </span>
        <span className="rf-desk">{status ? <StatusChip tone={status.tone}>{status.label}</StatusChip> : null}</span>
        <span className="rf-fig">{metric || ""}</span>
        <span className="rf-time rf-desk" title={formatDateTime(e.firstSeenAt)}>{formatClock(e.firstSeenAt)}</span>
        <span className="rf-desk" style={{ alignSelf: "center" }}><Chevron size={13} /></span>
      </button>
    </li>
  );
}

function FormingRow({ h }: { h: NonNullable<BridgeView["prepared"]>[number] }) {
  const f = h.first!;
  return (
    <li>
      <Link href={f.route || "/prepared"} className="rf-row" style={{ gridTemplateColumns: "minmax(0, 1fr) auto 14px" }}>
        <span className="rf-kind" style={{ gridColumn: "1 / -1" }}>{h.label}{h.count > 1 ? ` · ${plural(h.count, "item")}` : ""}</span>
        <span className="rf-title min-w-0">{plain(f.title)}</span>
        <span className="rf-fig">{f.amount != null ? inrWhole(f.amount) : ""}</span>
        <span style={{ alignSelf: "center", gridRow: "span 2" }}><Chevron size={13} /></span>
        {f.reason && <span className="rf-sub min-w-0" style={{ gridColumn: "1 / 3" }}>{plain(f.reason)}</span>}
      </Link>
    </li>
  );
}

function MissionRow({ m }: { m: Mission }) {
  const p = m.progress;
  const ratio = p ? Math.max(0, Math.min(1, p.ratio)) : null;
  return (
    <li>
      <Link href={`/missions/${m.id}`} className="rf-row" style={{ gridTemplateColumns: "minmax(0, 1fr) auto 14px" }}>
        <span className="min-w-0 block">
          <span className="rf-title block truncate">{plain(m.title)}</span>
          {p ? (
            <span className="flex items-center" style={{ gap: 10, marginTop: 4 }}>
              <span className="rf-bar" style={{ width: 96 }} aria-hidden="true"><span style={{ width: `${(ratio || 0) * 100}%` }} /></span>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}><span className="num" style={{ color: "var(--ink-2)" }}>{inrWhole(p.collected)}</span> of <span className="num">{inrWhole(p.targetAmount)}</span></span>
            </span>
          ) : (
            <span className="rf-sub block truncate">{plain(m.objective)}</span>
          )}
        </span>
        <span className="rf-time" style={{ alignSelf: "start", paddingTop: 2 }} title={m.endsAt ? formatDateTime(m.endsAt) : undefined}>
          {p?.daysLeft != null ? `${plural(p.daysLeft, "day")} left` : m.endsAt ? `Ends ${formatDate(m.endsAt)}` : ""}
        </span>
        <span style={{ alignSelf: "center" }}><Chevron size={13} /></span>
      </Link>
    </li>
  );
}

const AGE_COLS = "minmax(0, 1fr) 44px 52px 96px";

/** Business state: where the receivables sit, who owes the most and the
 *  sources behind every figure. */
function BusinessState({ data }: { data: BridgeView }) {
  const s = data.state;
  const total = s ? s.ageing.reduce((sum, b) => sum + b.amount, 0) : 0;
  return (
    <section aria-labelledby="state-h">
      <SectionHead id="state-h" title="Business state" right={s ? <span className="meta">as of {formatClock(s.evidence.computedAt || data.generatedAt)}</span> : undefined} />
      <div className="rf-cols-3" style={{ marginTop: 4 }}>
        <div className="min-w-0">
          <div className="rf-head" style={{ gridTemplateColumns: AGE_COLS }}>
            <span>By age</span><span /><span style={{ textAlign: "right" }}>Invoices</span><span style={{ textAlign: "right" }}>Amount</span>
          </div>
          {!s || s.ageing.length === 0 ? <QuietLine>Not known yet.</QuietLine> : (
            <ul className="rf-list">
              {s.ageing.map((b) => (
                <li key={b.id}>
                  <div className="rf-row" style={{ gridTemplateColumns: AGE_COLS, padding: "9px 0", alignItems: "center" }}>
                    <span className="rf-sub truncate" style={{ color: "var(--body)" }}>{b.label}</span>
                    <span className="rf-bar" aria-hidden="true">{total > 0 && <span style={{ width: `${(b.amount / total) * 100}%` }} />}</span>
                    <span className="rf-time" style={{ color: "var(--ink-2)" }}>{formatCount(b.count)}</span>
                    <span className="rf-fig">{inrWhole(b.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          <div className="rf-head" style={{ gridTemplateColumns: "minmax(0, 1fr) 72px 104px" }}>
            <span>Most overdue</span><span style={{ textAlign: "right" }}>Oldest</span><span style={{ textAlign: "right" }}>Overdue</span>
          </div>
          {!s || s.topOverdue.length === 0 ? <QuietLine>No customer is overdue.</QuietLine> : (
            <ul className="rf-list">
              {s.topOverdue.slice(0, 5).map((c) => (
                <li key={c.key}>
                  <div className="rf-row" style={{ gridTemplateColumns: "minmax(0, 1fr) 72px 104px", padding: "9px 0" }}>
                    <span className="min-w-0">
                      <span className="rf-sub block truncate" style={{ color: "var(--ink)" }}>{c.name}</span>
                      <span className="rf-kind block">{plural(c.count, "invoice")}</span>
                    </span>
                    <span className="rf-time" style={{ color: "var(--ink-2)" }}>{formatCount(c.oldestDays)}d</span>
                    <span className="rf-fig">{inrWhole(c.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          <div className="rf-head" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
            <span>Sources</span><span style={{ textAlign: "right" }}>Last synced</span>
          </div>
          {data.sources.length === 0 ? <QuietLine>No source connected yet.</QuietLine> : (
            <ul className="rf-list">
              {data.sources.map((src) => {
                const key = String(src.health || "").toLowerCase();
                return (
                  <li key={src.id}>
                    <Link href="/sources" className="rf-row" style={{ gridTemplateColumns: "minmax(0, 1fr) auto", padding: "9px 0" }}>
                      <span className="min-w-0">
                        <span className="rf-sub block truncate" style={{ color: "var(--ink)" }}>{src.name}</span>
                        <StatusChip tone={toneForStatus(key)}>{healthText(key)}</StatusChip>
                      </span>
                      <span className="rf-time" title={src.lastSuccessAt ? formatDateTime(src.lastSuccessAt) : undefined}>
                        {src.lastSuccessAt ? formatRelative(src.lastSuccessAt) : "Never"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
