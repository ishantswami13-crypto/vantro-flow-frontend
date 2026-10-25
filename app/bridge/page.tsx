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
import type { BridgeView, WatchEvent, FeatureAction } from "../../packages/contracts/src/features";
import { LIFECYCLE_LABEL } from "../../packages/contracts/src/features";

// Home (the Bridge route): what changed, what needs you, what is
// prepared and what is coming up — all from GET /api/client/bridge, the same
// read the desktop and phone apps use. Nothing here is computed in the
// browser beyond counting the rows the server sent.

const KIND_LABEL: Record<string, string> = {
  invoice_overdue: "Collections",
  promise_broken: "Payment promise",
  sync_failed: "Sources",
  sync_stale: "Sources",
  watch_triggered: "Monitor",
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

  // Decisions only: prepared items mostly belong to those same decisions.
  const waiting = data?.attention.decisions ?? decisions.length;

  return (
    <DashboardLayout pageTitle="Home">
      <div className="hm">
        <header className="hm-head fade-once">
          <p className="meta" suppressHydrationWarning>{dateLine}</p>
          <h1>{greeting()}{name ? `, ${name}` : ""}</h1>
          <p className="hm-sub">
            {!data ? "\u00a0"
              : !data.hasData ? "Connect a source and Starlane will tell you what changed."
              : changes === 0 ? "Nothing new needs a look since the last sync."
              : <>{changes} {changes === 1 ? "thing" : "things"} changed since the last sync{waiting > 0 ? <>, and {waiting} {waiting === 1 ? "decision is" : "decisions are"} waiting on you</> : null}.</>}
          </p>
          <div className="hm-composer">
            <ScanComposer
              id="bridge-scan"
              value={scan}
              onChange={setScan}
              onSubmit={() => { if (scan.trim()) router.push(`/scan?q=${encodeURIComponent(scan.trim())}`); }}
              submitting={false}
              placeholder="Ask about your customers, cash or stock"
            />
          </div>
          {data && (
            <p className="hm-fresh" style={{ color: data.freshness === "stale" ? V.critical : data.freshness === "delayed" ? V.warning : V.tertiary }}>
              <i className="sq" style={{ color: fresh.color }} />
              {fresh.text(syncAt)}
            </p>
          )}
        </header>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {/* What changed */}
        <section className="hm-sec fade-once" aria-labelledby="hm-changed">
          <div className="hm-sec-head">
            <h2 id="hm-changed">What changed</h2>
            {data && data.attention.watch.open > 0 && <Link href="/watch" className="hm-link">All monitors</Link>}
          </div>
          <div className="hm-list">
            {!data && !error && <div style={{ padding: "0 20px" }}><SkeletonRows rows={3} height={72} /></div>}
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
              <p className="hm-none">Nothing changed that needs a look. Overdue bands, broken promises and sync problems appear here the moment Starlane sees them.</p>
            )}
            {[...urgent, ...other].map((e, i) => <IntelRow key={e.id} e={e} i={i} onOpen={() => setOpen(e)} />)}
            {data && data.attention.watch.open > latest.length && (
              <Link href="/watch" className="hm-more">{data.attention.watch.open - latest.length} more on Monitors</Link>
            )}
          </div>
        </section>

        {/* Waiting on you: decisions, then what Starlane prepared */}
        <section className="hm-sec fade-once" aria-labelledby="hm-waiting">
          <div className="hm-sec-head">
            <h2 id="hm-waiting">Waiting on you</h2>
            <Link href="/prepared" className="hm-link">All approvals</Link>
          </div>
          <div className="hm-list">
            {!data && !error && <div style={{ padding: "0 20px" }}><SkeletonRows rows={2} height={56} /></div>}
            {data && decisions.length === 0 && prepared.length === 0 && <p className="hm-none">Nothing is waiting on you.</p>}
            {decisions.slice(0, 4).map((a) => (
              <PlainRow
                key={a.id}
                href={a.missionId ? `/missions/${a.missionId}` : "/prepared"}
                kind="Decision"
                title={a.title}
                context={a.description || LIFECYCLE_LABEL[a.lifecycle]}
                meta={clockTime(a.createdAt)}
              />
            ))}
            {prepared.map((h) => (
              <PlainRow
                key={h.horizon}
                href={h.first!.route || "/prepared"}
                kind="Prepared"
                title={h.first!.title}
                context={h.first!.reason}
                meta={h.count > 1 ? `${h.count} items` : "Ready"}
              />
            ))}
          </div>
        </section>

        {upcoming.length > 0 && (
          <section className="hm-sec fade-once" aria-labelledby="hm-upcoming">
            <div className="hm-sec-head">
              <h2 id="hm-upcoming">Coming up</h2>
              <Link href="/missions" className="hm-link">All tasks</Link>
            </div>
            <div className="hm-list">
              {upcoming.slice(0, 3).map((m) => (
                <PlainRow
                  key={m.id}
                  href={`/missions/${m.id}`}
                  kind="Task"
                  title={m.title}
                  context={m.objective}
                  meta={m.endsAt ? `Ends ${new Date(m.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
                />
              ))}
            </div>
          </section>
        )}

        {recent.length > 0 && (
          <section className="hm-sec fade-once" aria-labelledby="hm-recent">
            <div className="hm-sec-head">
              <h2 id="hm-recent">Recent questions</h2>
              <Link href="/scan/history" className="hm-link">History</Link>
            </div>
            <div className="hm-list">
              {recent.map((t) => (
                <PlainRow
                  key={t.id}
                  href={`/scan/${t.id}`}
                  title={t.title}
                  meta={`${t.turns.length} ${t.turns.length === 1 ? "question" : "questions"} · ${timeAgo(t.updatedAt)}`}
                />
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

function IntelRow({ e, i = 0, onOpen }: { e: WatchEvent; i?: number; onOpen: () => void }) {
  const metric = eventMetric(e);
  const tone = isUrgent(e) ? "risk" : "warn";
  return (
    <button type="button" onClick={onOpen} className={`hm-row t-${tone} rise-in`} style={{ animationDelay: `${60 + i * 45}ms` }}>
      <span className="hm-mark" aria-hidden="true"><i className="sq" /></span>
      <span className="hm-body">
        <span className="hm-kind meta">{KIND_LABEL[e.kind] || "Monitor"}<span className="sr-only">,</span> <span className="hm-time">{clockTime(e.firstSeenAt)}</span></span>
        <span className="hm-title">{e.title}</span>
        {e.detail && <span className="hm-detail">{e.detail}</span>}
      </span>
      {metric && <span className="hm-fig">{metric}</span>}
      <Chevron size={13} />
    </button>
  );
}

function PlainRow({ href, kind, title, context, meta }: { href: string; kind?: string; title: string; context?: string | null; meta?: string }) {
  return (
    <Link href={href} className="hm-row">
      <span className="hm-body">
        {kind && <span className="hm-kind meta">{kind}</span>}
        <span className="hm-title">{title}</span>
        {context && <span className="hm-detail hm-clip">{context}</span>}
      </span>
      {meta && <span className="hm-meta meta">{meta}</span>}
      <Chevron size={13} />
    </Link>
  );
}
