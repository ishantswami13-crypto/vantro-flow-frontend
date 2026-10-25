"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import { greeting, firstName } from "@/lib/greeting";
import { V, Chevron, ErrorBanner, SkeletonRows, EmptyLine, ago, clockTime, formatAmount } from "@/components/v32/ui";
import { EvidenceSetDrawer } from "@/components/v32/EvidenceSetDrawer";
import { ScanComposer } from "@/components/scan/ScanComposer";
import { listThreads, type ScanThread } from "@/lib/scanStore";
import { timeAgo } from "@/lib/recents";
import type { BridgeView, WatchEvent, FeatureAction, Mission } from "../../packages/contracts/src/features";
import { LIFECYCLE_LABEL } from "../../packages/contracts/src/features";

// Home (the Bridge route): where the money stands, what changed, what needs
// you and what is coming up — all from GET /api/client/bridge, the same read
// the desktop and phone apps use. The browser only adds up and divides the
// figures the server sent (the over-30 bands, the overdue share); it never
// estimates anything.

const KIND_LABEL: Record<string, string> = {
  invoice_overdue: "Collections",
  promise_broken: "Payment promise",
  sync_failed: "Sources",
  sync_stale: "Sources",
  watch_triggered: "Monitor",
};

const ACTION_LABEL: Record<string, string> = {
  CONTACT_CUSTOMER: "Collections",
  HOLD_CREDIT: "Credit",
  CREATE_PO: "Purchasing",
};

// Ageing bands run from calm to urgent, one hue deepening. Text never sits on these.
const BAND_COLOR: Record<string, string> = {
  current: "#D8D4C8",
  "1_7": "#CDB68A",
  "8_30": "#B98F55",
  "31_90": "#A3634C",
  "90_plus": "#6F3430",
};

const SUGGESTED = [
  "Who owes us the most?",
  "What falls due this week?",
  "Which customers broke a promise?",
];

function isUrgent(e: WatchEvent) {
  return e.severity === "critical" || e.severity === "high";
}

/** The one figure worth showing next to an event: a calculated value from its own evidence. */
function eventMetric(e: WatchEvent): string | null {
  const f = e.evidence?.facts?.find((x) => x.kind === "calculated" && typeof x.value === "number");
  if (!f || typeof f.value !== "number") return null;
  if (!f.unit && /days?/i.test(f.label)) return `${f.value} days`;
  return formatAmount(f.value, f.unit);
}

/** A large figure with its currency set small beside it: "USD 1,252,700". */
function Money({ value, currency }: { value: number; currency: string }) {
  if (currency === "INR") return <>{formatAmount(value, "INR")}</>;
  return (
    <>
      <span className="hx-cur">{currency}</span>
      {Math.round(value).toLocaleString("en-US")}
    </>
  );
}

const FRESHNESS: Record<string, { color: string; text: (at: string | null) => string }> = {
  fresh: { color: V.positive, text: (at) => `Synced ${ago(at) || "recently"}` },
  delayed: { color: V.warning, text: (at) => `Sync delayed · ${ago(at) || "a while ago"}` },
  stale: { color: V.critical, text: (at) => `Sync stale · ${ago(at) || "a while ago"}` },
  none: { color: V.neutralDot, text: () => "No source syncing yet" },
};

export default function BridgePage() {
  const router = useRouter();
  const [data, setData] = useState<BridgeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scan, setScan] = useState("");
  const [open, setOpen] = useState<WatchEvent | null>(null);
  const [recent, setRecent] = useState<ScanThread[]>([]);
  const [dateLine, setDateLine] = useState("");
  const [hello, setHello] = useState("Welcome back");

  useEffect(() => {
    setName(firstName());
    setHello(greeting());
    setRecent(listThreads().slice(0, 3));
    setDateLine(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }));
    request<BridgeView>("/api/client/bridge")
      .then(setData)
      .catch((e: Error) => setError(e.message || "Home could not be loaded."));
  }, []);

  const latest = useMemo(() => data?.attention.watch.latest || [], [data]);
  const feed = useMemo(() => [...latest.filter(isUrgent), ...latest.filter((e) => !isUrgent(e))], [latest]);
  const decisions = data?.attention.topDecisions || [];
  const prepared = (data?.prepared || []).filter((h) => h.count > 0 && h.first);
  const upcoming = (data?.missions || []).filter((m) => m.status === "active" && m.endsAt);
  const syncAt = data?.dataAsOf || data?.sources.find((s) => s.lastSuccessAt)?.lastSuccessAt || null;
  const fresh = FRESHNESS[data?.freshness || "none"] || FRESHNESS.none;
  const changes = latest.length;
  const waiting = data?.attention.decisions ?? decisions.length;
  const ask = (q: string) => router.push(`/scan?q=${encodeURIComponent(q)}`);

  return (
    <DashboardLayout pageTitle="Home">
      <div className="hx">
        {/* Greeting and the one question box */}
        <header className="hx-head fade-once">
          <div className="hx-eyebrow">
            <span className="meta" suppressHydrationWarning>{dateLine || " "}</span>
            {data && (
              <span className="hx-sync meta" style={{ color: data.freshness === "stale" ? V.critical : data.freshness === "delayed" ? V.warning : V.tertiary }}>
                <i className="hx-pulse" style={{ color: fresh.color }} aria-hidden="true" />
                {fresh.text(syncAt)}
              </span>
            )}
          </div>
          <h1>{hello}{name ? `, ${name}` : ""}.</h1>
          <p className="hx-sub">
            {!data ? " "
              : !data.hasData ? "Connect a source and Starlane will tell you what changed."
              : changes === 0 ? "Nothing new needs a look since the last sync."
              : <>{changes} {changes === 1 ? "thing" : "things"} changed since the last sync{waiting > 0 ? <>, and <strong>{waiting} {waiting === 1 ? "decision is" : "decisions are"} waiting on you</strong></> : null}.</>}
          </p>
          <div className="hx-composer">
            <ScanComposer
              id="bridge-scan"
              value={scan}
              onChange={setScan}
              onSubmit={() => { if (scan.trim()) ask(scan.trim()); }}
              submitting={false}
              placeholder="Ask about your customers, cash or stock"
            />
            <div className="hx-chips" aria-label="Suggested questions">
              {SUGGESTED.map((q) => (
                <button key={q} type="button" className="hx-chip" onClick={() => ask(q)}>{q}</button>
              ))}
            </div>
          </div>
        </header>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {/* Where the money stands */}
        {data?.state && <Position state={data.state} />}

        <div className="hx-grid">
          <div className="hx-main">
            {/* What changed: a timeline of what the monitors saw */}
            <section className="hx-sec fade-once" aria-labelledby="hx-changed">
              <div className="hx-sec-head">
                <h2 id="hx-changed">What changed {data && data.attention.watch.open > 0 && <span className="hx-count">{data.attention.watch.open}</span>}</h2>
                {data && data.attention.watch.open > 0 && <Link href="/watch" className="hx-link">All monitors</Link>}
              </div>
              <div className="hx-card">
                {!data && !error && <div style={{ padding: "0 22px" }}><SkeletonRows rows={3} height={72} /></div>}
                {data && !data.hasData && (
                  <div style={{ padding: "4px 22px" }}>
                    <EmptyLine
                      title="No books connected yet."
                      body="Starlane reports changes from your own records only. Connect Tally or upload a receivables file and this fills in on the next sync."
                      action={<div className="flex gap-2"><Link href="/sources" className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12 }}>Connect a source</Link><Link href="/decisions/import" className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12 }}>Upload a file</Link></div>}
                    />
                  </div>
                )}
                {data && data.hasData && latest.length === 0 && (
                  <p className="hx-none">Nothing changed that needs a look. Overdue bands, broken promises and sync problems appear here the moment Starlane sees them.</p>
                )}
                {feed.length > 0 && (
                  <ol className="hx-feed">
                    {feed.map((e, i) => <FeedRow key={e.id} e={e} i={i} onOpen={() => setOpen(e)} />)}
                  </ol>
                )}
                {data && data.attention.watch.open > latest.length && (
                  <Link href="/watch" className="hx-more">{data.attention.watch.open - latest.length} more on Monitors <Chevron size={12} /></Link>
                )}
              </div>
            </section>
            {/* Coming up: active tasks, by end date */}
            {upcoming.length > 0 && (
              <section className="hx-sec fade-once" aria-labelledby="hx-upcoming">
                <div className="hx-sec-head">
                  <h2 id="hx-upcoming">Coming up</h2>
                  <Link href="/missions" className="hx-link">Tasks</Link>
                </div>
                <div className="hx-card">
                  {upcoming.slice(0, 3).map((m) => <TaskRow key={m.id} m={m} />)}
                </div>
              </section>
            )}
          </div>

          <div className="hx-side">
            {/* Waiting on you */}
            <section className="hx-sec fade-once" aria-labelledby="hx-waiting">
              <div className="hx-sec-head">
                <h2 id="hx-waiting">Waiting on you {waiting > 0 && <span className="hx-count is-ink">{waiting}</span>}</h2>
                <Link href="/prepared" className="hx-link">Approvals</Link>
              </div>
              <div className="hx-card">
                {!data && !error && <div style={{ padding: "0 18px" }}><SkeletonRows rows={2} height={56} /></div>}
                {data && decisions.length === 0 && prepared.length === 0 && <p className="hx-none">Nothing is waiting on you.</p>}
                {decisions.slice(0, 4).map((a) => <DecisionRow key={a.id} a={a} />)}
                {prepared.map((h) => (
                  <Link key={h.horizon} href={h.first!.route || "/prepared"} className="hx-wait">
                    <span className="hx-wait-kind meta">Prepared · {h.label}</span>
                    <span className="hx-wait-title">{h.first!.title}</span>
                    <span className="hx-wait-ctx">{h.first!.reason}</span>
                    <span className="hx-wait-foot meta">{h.count > 1 ? `${h.count} items ready` : "Ready"}<Chevron size={11} /></span>
                  </Link>
                ))}
              </div>
            </section>

          </div>
        </div>

        {recent.length > 0 && (
          <section className="hx-sec fade-once" aria-labelledby="hx-recent">
            <div className="hx-sec-head">
              <h2 id="hx-recent">Pick up where you left off</h2>
              <Link href="/scan/history" className="hx-link">History</Link>
            </div>
            <div className="hx-recent">
              {recent.map((t) => (
                <Link key={t.id} href={`/scan/${t.id}`} className="hx-q">
                  <span className="hx-q-title">{t.title}</span>
                  <span className="hx-q-meta meta">{t.turns.length} {t.turns.length === 1 ? "question" : "questions"} · {timeAgo(t.updatedAt)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {open && (
        <EvidenceSetDrawer title={open.title} record={open.detail || undefined} evidence={open.evidence} onClose={() => setOpen(null)}>
          <div className="flex gap-2">
            <Link href="/watch" className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12 }}>Open in Monitors</Link>
          </div>
        </EvidenceSetDrawer>
      )}
    </DashboardLayout>
  );
}

/** Open receivables, the overdue share, the ageing spread and who owes the most. */
function Position({ state }: { state: NonNullable<BridgeView["state"]> }) {
  const { currency, openReceivables: open, overdueReceivables: overdue } = state;
  const over30 = state.ageing.filter((b) => b.id === "31_90" || b.id === "90_plus").reduce((s, b) => s + b.amount, 0);
  const over30Count = state.ageing.filter((b) => b.id === "31_90" || b.id === "90_plus").reduce((s, b) => s + b.count, 0);
  const share = open > 0 ? (overdue / open) * 100 : 0;
  const bandTotal = state.ageing.reduce((s, b) => s + b.amount, 0);
  const top = state.topOverdue.slice(0, 4);
  const topMax = Math.max(1, ...top.map((c) => c.amount));

  return (
    <section className="hx-pos fade-once" aria-labelledby="hx-pos">
      <div className="hx-sec-head">
        <h2 id="hx-pos">Where the money stands</h2>
        <Link href="/customers" className="hx-link">Customers</Link>
      </div>
      <div className="hx-card hx-pos-card">
        <div className="hx-figs">
          <div className="hx-fig">
            <p className="meta">Open receivables</p>
            <p className="hx-big"><Money value={open} currency={currency} /></p>
            <p className="hx-fig-sub">{state.openInvoiceCount} open {state.openInvoiceCount === 1 ? "invoice" : "invoices"}</p>
          </div>
          <div className="hx-fig">
            <p className="meta">Overdue</p>
            <p className="hx-big t-warn-ink"><Money value={overdue} currency={currency} /></p>
            <p className="hx-fig-sub">{share.toFixed(1)}% of open · {state.overdueInvoiceCount} {state.overdueInvoiceCount === 1 ? "invoice" : "invoices"}</p>
          </div>
          <div className="hx-fig">
            <p className="meta">Over 30 days</p>
            <p className="hx-big t-risk-ink"><Money value={over30} currency={currency} /></p>
            <p className="hx-fig-sub">{over30Count} {over30Count === 1 ? "invoice" : "invoices"} past the 30-day mark</p>
          </div>
        </div>

        {bandTotal > 0 && (
          <div className="hx-ageing">
            <p className="meta hx-ageing-label">Ageing</p>
            <div className="hx-bar" role="img" aria-label={state.ageing.map((b) => `${b.label}: ${formatAmount(b.amount, currency)}`).join(", ")}>
              {state.ageing.filter((b) => b.amount > 0).map((b) => (
                <span key={b.id} style={{ flexGrow: b.amount, background: BAND_COLOR[b.id] || "#C9C6BC" }} />
              ))}
            </div>
            <ul className="hx-legend">
              {state.ageing.map((b) => (
                <li key={b.id}>
                  <i style={{ background: BAND_COLOR[b.id] || "#C9C6BC" }} aria-hidden="true" />
                  <span className="hx-legend-label">{b.label}</span>
                  <span className="hx-legend-amt">{formatAmount(b.amount, currency)}</span>
                  <span className="hx-legend-n meta">{b.count} inv</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {top.length > 0 && (
          <div className="hx-top">
            <p className="meta hx-ageing-label">Largest overdue</p>
            <ul>
              {top.map((c) => (
                <li key={c.key}>
                  <span className="hx-top-name">{c.name}</span>
                  <span className="hx-top-track" aria-hidden="true"><span style={{ width: `${(c.amount / topMax) * 100}%` }} /></span>
                  <span className="hx-top-amt">{formatAmount(c.amount, currency)}</span>
                  <span className="hx-top-days meta">{c.oldestDays}d oldest</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function FeedRow({ e, i = 0, onOpen }: { e: WatchEvent; i?: number; onOpen: () => void }) {
  const metric = eventMetric(e);
  const tone = isUrgent(e) ? "risk" : "warn";
  return (
    <li className={`hx-ev t-${tone} rise-in`} style={{ animationDelay: `${60 + i * 45}ms` }}>
      <button type="button" onClick={onOpen} className="hx-ev-btn">
        <span className="hx-ev-time meta">{clockTime(e.firstSeenAt)}</span>
        <span className="hx-ev-node" aria-hidden="true" />
        <span className="hx-ev-body">
          <span className="hx-ev-kind meta">{KIND_LABEL[e.kind] || "Monitor"}{isUrgent(e) ? " · Urgent" : ""}</span>
          <span className="hx-ev-title">{e.title}</span>
          {e.detail && <span className="hx-ev-detail">{e.detail}</span>}
        </span>
        {metric && <span className="hx-ev-fig">{metric}</span>}
      </button>
    </li>
  );
}

function DecisionRow({ a }: { a: FeatureAction }) {
  return (
    <Link href={a.missionId ? `/missions/${a.missionId}` : "/prepared"} className="hx-wait">
      <span className="hx-wait-kind meta"><i className="sq" style={{ color: V.ink, width: 6, height: 6 }} aria-hidden="true" /> Decision · {ACTION_LABEL[a.type] || "Action"}</span>
      <span className="hx-wait-title">{a.title}</span>
      {(a.description || LIFECYCLE_LABEL[a.lifecycle]) && <span className="hx-wait-ctx">{a.description || LIFECYCLE_LABEL[a.lifecycle]}</span>}
      <span className="hx-wait-foot meta">Review · {clockTime(a.createdAt)}<Chevron size={11} /></span>
    </Link>
  );
}

function TaskRow({ m }: { m: Mission }) {
  const end = m.endsAt ? new Date(m.endsAt) : null;
  const ratio = m.progress && Number.isFinite(m.progress.ratio) ? Math.max(0, Math.min(1, m.progress.ratio)) : null;
  return (
    <Link href={`/missions/${m.id}`} className="hx-task">
      {end && (
        <span className="hx-date" aria-label={`Ends ${end.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}>
          <span className="hx-date-m meta">{end.toLocaleDateString("en-GB", { month: "short" })}</span>
          <span className="hx-date-d">{end.getDate()}</span>
        </span>
      )}
      <span className="hx-task-body">
        <span className="hx-wait-title">{m.title}</span>
        <span className="hx-wait-ctx">{m.objective}</span>
        {ratio !== null && (
          <span className="hx-prog" aria-label={`${Math.round(ratio * 100)}% of target collected`}>
            <span style={{ width: `${ratio * 100}%` }} />
          </span>
        )}
      </span>
    </Link>
  );
}
