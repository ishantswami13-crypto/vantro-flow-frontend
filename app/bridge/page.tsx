"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import { greeting, firstName } from "@/lib/greeting";
import { V, Chevron, ErrorBanner, SkeletonRows, EmptyLine, IconTile, ago, clockTime, formatAmount } from "@/components/v32/ui";
import { IconScan, IconClock, IconFileCheck, IconCalendar, IconRupee, IconPromise, IconSync, IconWatch } from "@/components/v32/icons";
import { EvidenceSetDrawer } from "@/components/v32/EvidenceSetDrawer";
import { ScanComposer } from "@/components/scan/ScanComposer";
import { listThreads, type ScanThread } from "@/lib/scanStore";
import { timeAgo } from "@/lib/recents";
import type { BridgeView, WatchEvent, FeatureAction } from "../../packages/contracts/src/features";
import { LIFECYCLE_LABEL } from "../../packages/contracts/src/features";

// The Bridge (Version 32 home): what changed, what needs you, what is
// prepared and what is coming up — all from GET /api/client/bridge, the same
// read the desktop and phone apps use. Nothing here is computed in the
// browser beyond counting the rows the server sent.

const KIND_LABEL: Record<string, string> = {
  invoice_overdue: "Collections",
  promise_broken: "Payment promise",
  sync_failed: "Sources",
  sync_stale: "Sources",
  watch_triggered: "Watch",
};

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

const FRESHNESS: Record<string, { color: string; text: (at: string | null) => string }> = {
  fresh: { color: V.positive, text: (at) => `Last synced ${ago(at) || "recently"}` },
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

  useEffect(() => {
    setName(firstName());
    setRecent(listThreads().slice(0, 3));
    request<BridgeView>("/api/client/bridge")
      .then(setData)
      .catch((e: Error) => setError(e.message || "The Bridge could not be loaded."));
  }, []);

  const latest = useMemo(() => data?.attention.watch.latest || [], [data]);
  const urgent = latest.filter(isUrgent);
  const other = latest.filter((e) => !isUrgent(e));
  const decisions = data?.attention.topDecisions || [];
  const prepared = (data?.prepared || []).filter((h) => h.count > 0 && h.first);
  const upcoming = (data?.missions || []).filter((m) => m.status === "active" && m.endsAt);
  const syncAt = data?.dataAsOf || data?.sources.find((s) => s.lastSuccessAt)?.lastSuccessAt || null;
  const fresh = FRESHNESS[data?.freshness || "none"] || FRESHNESS.none;
  const changes = latest.length;

  const now = new Date();
  const dateLine = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <DashboardLayout pageTitle="The Bridge">
      <div className="fade-once">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="meta" style={{ margin: "0 0 10px", color: V.tertiary }} suppressHydrationWarning>{dateLine}</p>
            <h1 style={{ margin: 0, fontFamily: V.serif, fontWeight: 400, fontSize: 40, lineHeight: 1.04, letterSpacing: "-0.022em", color: V.ink }}>
              {greeting()}{name ? `, ${name}` : ""}
            </h1>
            <div style={{ fontSize: 14.5, color: V.secondary, marginTop: 10 }}>
              {!data ? "\u00a0"
                : !data.hasData ? "Connect a source and Starlane will tell you what changed."
                : changes === 0 ? "Nothing new needs a look since the last sync."
                : `${changes} meaningful change${changes === 1 ? "" : "s"} since the last sync.`}
            </div>
          </div>
          {data && (
            <p className="flex items-center" style={{ gap: 8, margin: 0, fontSize: 12.5, color: data.freshness === "stale" ? V.critical : data.freshness === "delayed" ? V.warning : V.secondary }}>
              <i className="sq" style={{ color: fresh.color }} />
              {fresh.text(syncAt)}
            </p>
          )}
        </div>

        {/* Ask first: the Scan box under the greeting. */}
        <div style={{ maxWidth: 760, marginTop: 26 }}>
          <ScanComposer
            id="bridge-scan"
            value={scan}
            onChange={setScan}
            onSubmit={() => { if (scan.trim()) router.push(`/scan?q=${encodeURIComponent(scan.trim())}`); }}
            submitting={false}
            placeholder="Ask Starlane about your business"
          />
        </div>

        {data && data.hasData && (
          <dl className="br-figs">
            {/* The server's count over every open event (the same rule Today and
                the morning brief use), not just the rows shown below. */}
            <div><dt>Need attention</dt><dd style={{ color: data.attention.watch.urgent ? V.critical : V.ink }}>{data.attention.watch.urgent}</dd></div>
            <div><dt>Waiting on your decision</dt><dd>{data.attention.decisions}</dd></div>
            <div><dt>Prepared for you</dt><dd>{prepared.reduce((n, h) => n + h.count, 0)}</dd></div>
            <div><dt>Open on Watch</dt><dd>{data.attention.watch.open}</dd></div>
          </dl>
        )}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="fade-once br-grid">
        {/* What changed */}
        <section className="br-panel min-w-0" aria-labelledby="br-changed">
          <div className="br-bar">
            <h2 id="br-changed">What changed</h2>
            {data && data.hasData && <span className="meta">{latest.length} shown</span>}
          </div>
          {!data && !error && <div style={{ padding: "0 20px" }}><SkeletonRows rows={3} height={84} /></div>}
          {data && !data.hasData && (
            <div style={{ padding: "4px 20px" }}>
              <EmptyLine
                title="No books connected yet."
                body="Starlane reports changes from your own records only. Connect Tally or upload a receivables file and this fills in on the next sync."
                action={<div className="flex gap-2"><Link href="/sources" className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12 }}>Connect a source</Link><Link href="/decisions/import" className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12 }}>Upload a file</Link></div>}
              />
            </div>
          )}
          {data && data.hasData && latest.length === 0 && (
            <div style={{ padding: "4px 20px" }}>
              <EmptyLine title="Nothing changed that needs a look." body="Overdue bands, broken promises and sync problems appear here the moment Starlane sees them." />
            </div>
          )}
          {urgent.length > 0 && <p className="br-group meta">Needs attention</p>}
          {urgent.map((e, i) => <IntelRow key={e.id} e={e} i={i} onOpen={() => setOpen(e)} />)}
          {other.length > 0 && <p className="br-group meta">Worth watching</p>}
          {other.map((e, i) => <IntelRow key={e.id} e={e} i={urgent.length + i} onOpen={() => setOpen(e)} />)}
          {data && data.attention.watch.open > latest.length && (
            <Link href="/watch" className="br-more hover-dim">
              All {data.attention.watch.open} open items on Watch<span aria-hidden="true"> →</span>
            </Link>
          )}
        </section>

        {/* Needs you / Prepared / Upcoming */}
        <div className="min-w-0 flex flex-col" style={{ gap: 16 }}>
          <section className="br-panel" aria-labelledby="br-needs">
            <div className="br-bar"><h2 id="br-needs">Needs you</h2>{data && <span className="meta">{decisions.length}</span>}</div>
            {!data && !error && <div style={{ padding: "0 16px" }}><SkeletonRows rows={2} height={46} /></div>}
            {data && decisions.length === 0 && <p className="br-none">No decision is waiting on you.</p>}
            {decisions.slice(0, 4).map((a, i) => <NeedsYouRow key={a.id} a={a} i={i} emphasized={i === 0} />)}
          </section>

          <section className="br-panel" aria-labelledby="br-prepared">
            <div className="br-bar"><h2 id="br-prepared">Prepared for you</h2></div>
            {data && prepared.length === 0 && <p className="br-none">Nothing is due to be prepared.</p>}
            {prepared.map((h) => (
              <SideRow
                key={h.horizon}
                href={h.first!.route || "/prepared"}
                icon={<IconFileCheck size={15} />}
                title={h.first!.title}
                context={h.first!.reason}
                meta={h.count > 1 ? `${h.count} items` : "Ready"}
              />
            ))}
          </section>

          <section className="br-panel" aria-labelledby="br-upcoming">
            <div className="br-bar"><h2 id="br-upcoming">Upcoming</h2></div>
            {data && upcoming.length === 0 && <p className="br-none">No mission deadline coming up.</p>}
            {upcoming.slice(0, 3).map((m) => (
              <SideRow
                key={m.id}
                href={`/missions/${m.id}`}
                icon={<IconCalendar size={15} />}
                title={m.title}
                context={m.objective}
                meta={m.endsAt ? new Date(m.endsAt).toLocaleDateString("en-GB", { weekday: "short" }) : ""}
              />
            ))}
          </section>
        </div>
      </div>

      {/* Recent work: conversations on this device. */}
      {recent.length > 0 && (
        <div className="fade-once" style={{ marginTop: 8 }}>
          <div className="flex items-baseline justify-between" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontFamily: V.serif, fontWeight: 400, fontSize: 20, color: V.ink }}>Pick up where you left off</h2>
            <Link href="/scan/history" style={{ fontSize: 12.5, color: V.secondary }}>All conversations</Link>
          </div>
          <div className="lib-grid">
            {recent.map((t, i) => (
              <Link key={t.id} href={`/scan/${t.id}`} className="lib-card rise-in" style={{ animationDelay: `${i * 40}ms`, gap: 8 }}>
                <IconTile size={30}><IconScan size={14} /></IconTile>
                <div className="truncate" style={{ fontSize: 13.5, color: V.ink }}>{t.title}</div>
                <div className="lib-tag">{t.turns.length} {t.turns.length === 1 ? "question" : "questions"} · {timeAgo(t.updatedAt)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {open && (
        <EvidenceSetDrawer title={open.title} record={open.detail || undefined} evidence={open.evidence} onClose={() => setOpen(null)}>
          <div className="flex gap-2">
            <Link href="/watch" className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12 }}>Open in Watch</Link>
          </div>
        </EvidenceSetDrawer>
      )}
    </DashboardLayout>
  );
}

function KindIcon({ kind }: { kind: string }) {
  if (kind === "invoice_overdue") return <IconRupee size={16} />;
  if (kind === "promise_broken") return <IconPromise size={16} />;
  if (kind === "sync_failed" || kind === "sync_stale") return <IconSync size={16} />;
  return <IconWatch size={16} />;
}

function IntelRow({ e, i = 0, onOpen }: { e: WatchEvent; i?: number; onOpen: () => void }) {
  const metric = eventMetric(e);
  const tone = isUrgent(e) ? "risk" : "warn";
  return (
    <button type="button" onClick={onOpen} className={`br-row t-${tone} rise-in row-hover`} style={{ animationDelay: `${80 + i * 55}ms` }}>
      <div className="min-w-0">
        <p className="br-kind meta"><span aria-hidden="true" className="br-ico"><KindIcon kind={e.kind} /></span>{KIND_LABEL[e.kind] || "Watch"}</p>
        <p className="br-title">{e.title}</p>
        {e.detail && <p className="br-detail">{e.detail}</p>}
        <p className="br-src meta">{e.evidence?.facts?.length ? "From your books" : "Starlane"} · {clockTime(e.firstSeenAt)}</p>
      </div>
      {metric && <p className="br-fig">{metric}</p>}
      <Chevron />
    </button>
  );
}

function NeedsYouRow({ a, i = 0, emphasized }: { a: FeatureAction; i?: number; emphasized: boolean }) {
  return (
    <Link
      href={a.missionId ? `/missions/${a.missionId}` : "/prepared"}
      className="rise-in row-hover flex items-center"
      style={{ gap: 10, padding: "11px 16px", borderTop: `1px solid ${V.divider}`, boxShadow: emphasized ? `inset 2px 0 0 ${V.critical}` : undefined, animationDelay: `${160 + i * 55}ms` }}
    >
      <span className="shrink-0 flex items-center justify-center" style={{ width: 15, height: 15, color: V.secondary }}><IconClock size={15} /></span>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 13, color: V.ink }}>{a.title}</div>
        <div className="truncate" style={{ fontSize: 11.5, color: V.secondary }}>{a.description || LIFECYCLE_LABEL[a.lifecycle]}</div>
      </div>
      <span className="shrink-0 meta" style={{ fontSize: 10, color: V.tertiary }}>{clockTime(a.createdAt)}</span>
      <Chevron size={13} />
    </Link>
  );
}

function SideRow({ href, icon, title, context, meta }: { href: string; icon: React.ReactNode; title: string; context?: string | null; meta?: string }) {
  return (
    <Link href={href} className="row-hover flex items-center" style={{ gap: 10, padding: "11px 16px", borderTop: `1px solid ${V.divider}` }}>
      <span className="shrink-0 flex items-center justify-center" style={{ width: 15, height: 15, color: V.secondary }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 13, color: V.ink }}>{title}</div>
        {context && <div className="truncate" style={{ fontSize: 11.5, color: V.secondary }}>{context}</div>}
      </div>
      {meta && <span className="shrink-0 meta" style={{ fontSize: 10, color: V.tertiary }}>{meta}</span>}
      <Chevron size={13} />
    </Link>
  );
}
