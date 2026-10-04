"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request } from "@/lib/api";
import { greeting, firstName } from "@/lib/greeting";
import { V, Sep, Mono, Chevron, Label, ErrorBanner, SkeletonRows, EmptyLine, Rule, ago, clockTime } from "@/components/v32/ui";
import { IconSearch, IconClock, IconFileCheck, IconCalendar } from "@/components/v32/icons";
import { EvidenceSetDrawer } from "@/components/v32/EvidenceSetDrawer";
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
  if (f.unit === "INR") return `₹${Math.round(f.value).toLocaleString("en-IN")}`;
  if (/days?/i.test(f.label)) return `${f.value} days`;
  return f.value.toLocaleString("en-IN");
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

  useEffect(() => {
    setName(firstName());
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

  return (
    <DashboardLayout pageTitle="The Bridge">
      <div className="fade-once">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 style={{ margin: "0 0 4px", fontFamily: V.serif, fontWeight: 400, fontSize: 26, color: V.ink }}>
              {greeting()}{name ? `, ${name}` : ""}
            </h1>
            <div style={{ fontSize: 13, color: V.secondary }}>
              {!data ? " "
                : !data.hasData ? "Connect a source and Starlane will tell you what changed."
                : changes === 0 ? "Nothing new needs a look since the last sync."
                : `${changes} meaningful change${changes === 1 ? "" : "s"} worth a look`}
            </div>
          </div>
          <div className="flex items-center flex-wrap" style={{ gap: 16 }}>
            {data && (
              <div style={{ fontSize: 12, color: data.freshness === "stale" ? V.critical : data.freshness === "delayed" ? V.warning : V.tertiary }}>
                {fresh.text(syncAt)}
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); router.push(scan.trim() ? `/scan?q=${encodeURIComponent(scan.trim())}` : "/scan"); }}
              className="flex items-center"
              style={{ gap: 8, border: `1px solid ${V.input}`, borderRadius: 6, padding: "7px 12px", background: "transparent" }}
            >
              <IconSearch size={13} style={{ color: V.secondary }} />
              <label htmlFor="bridge-scan" className="sr-only">Scan your business</label>
              <input
                id="bridge-scan"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                placeholder="Scan"
                style={{ width: 90, background: "none", border: "none", outline: "none", boxShadow: "none", color: V.ink, fontSize: 13 }}
              />
            </form>
          </div>
        </div>

        {data && data.hasData && (
          <>
          <Rule style={{ marginTop: 14 }} />
          <div className="flex items-center flex-wrap" style={{ gap: 10, paddingTop: 14, fontSize: 13, color: V.body }}>
            <span><Mono size={13} color={urgent.length ? V.critical : V.ink}>{urgent.length}</Mono> need attention</span>
            <Sep />
            <span><Mono size={13}>{data.attention.decisions}</Mono> waiting on your decision</span>
            <Sep />
            <span style={{ color: V.secondary }}>everything else stable</span>
          </div>
          </>
        )}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="fade-once flex flex-col lg:flex-row" style={{ gap: 32 }}>
        {/* What changed */}
        <div className="min-w-0 flex flex-col" style={{ flex: 1.2, gap: 22 }}>
          <div>
            <div style={{ fontFamily: V.serif, fontSize: 16, color: V.ink, marginBottom: 6 }}>What changed</div>
            {!data && !error && <SkeletonRows rows={3} height={84} />}
            {data && !data.hasData && (
              <EmptyLine
                title="No books connected yet."
                body="Starlane reports changes from your own records only. Connect Tally or upload a receivables file and this fills in on the next sync."
                action={<div className="flex gap-2"><Link href="/sources" className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12, borderRadius: 6 }}>Connect a source</Link><Link href="/decisions/import" className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12, borderRadius: 6 }}>Upload a file</Link></div>}
              />
            )}
            {data && data.hasData && latest.length === 0 && (
              <EmptyLine title="Nothing changed that needs a look." body="Overdue bands, broken promises and sync problems appear here the moment Starlane sees them." />
            )}
            {urgent.length > 0 && <Label style={{ marginBottom: 2 }}>Needs attention</Label>}
            {urgent.map((e, i) => <IntelRow key={e.id} e={e} i={i} onOpen={() => setOpen(e)} />)}
            {other.length > 0 && <Label style={{ margin: "14px 0 2px" }}>Worth watching</Label>}
            {other.map((e, i) => <IntelRow key={e.id} e={e} i={urgent.length + i} onOpen={() => setOpen(e)} />)}
            {data && data.attention.watch.open > latest.length && (
              <Link href="/watch" className="hover-dim inline-block" style={{ fontSize: 12.5, color: V.secondary, marginTop: 10 }}>
                All {data.attention.watch.open} open items on Watch →
              </Link>
            )}
          </div>
        </div>

        {/* Needs you / Prepared / Upcoming */}
        <div className="min-w-0 flex flex-col w-full lg:max-w-[320px]" style={{ flex: 1, gap: 24 }}>
          <div>
            <div style={{ fontFamily: V.serif, fontSize: 15, color: V.ink, marginBottom: 8 }}>Needs you</div>
            {!data && !error && <SkeletonRows rows={2} height={46} />}
            {data && decisions.length === 0 && <p style={{ fontSize: 12.5, color: V.secondary, padding: "4px 0" }}>No decision is waiting on you.</p>}
            {decisions.slice(0, 4).map((a, i) => <NeedsYouRow key={a.id} a={a} i={i} emphasized={i === 0} />)}
          </div>

          <div>
            <div style={{ fontFamily: V.serif, fontSize: 15, color: V.ink, marginBottom: 8 }}>Prepared for you</div>
            {data && prepared.length === 0 && <p style={{ fontSize: 12.5, color: V.secondary, padding: "4px 0" }}>Nothing is due to be prepared.</p>}
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
          </div>

          <div>
            <div style={{ fontFamily: V.serif, fontSize: 15, color: V.ink, marginBottom: 8 }}>Upcoming</div>
            {data && upcoming.length === 0 && <p style={{ fontSize: 12.5, color: V.secondary, padding: "4px 0" }}>No mission deadline coming up.</p>}
            {upcoming.slice(0, 3).map((m) => (
              <SideRow
                key={m.id}
                href={`/missions/${m.id}`}
                icon={<IconCalendar size={15} />}
                title={m.title}
                context={m.objective}
                meta={m.endsAt ? new Date(m.endsAt).toLocaleDateString("en-IN", { weekday: "short" }) : ""}
              />
            ))}
          </div>
        </div>
      </div>

      {open && (
        <EvidenceSetDrawer title={open.title} record={open.detail || undefined} evidence={open.evidence} onClose={() => setOpen(null)}>
          <div className="flex gap-2">
            <Link href="/watch" className="btn-secondary-v32" style={{ padding: "6px 12px", fontSize: 12, borderRadius: 6 }}>Open in Watch</Link>
          </div>
        </EvidenceSetDrawer>
      )}
    </DashboardLayout>
  );
}

function IntelRow({ e, i = 0, onOpen }: { e: WatchEvent; i?: number; onOpen: () => void }) {
  const metric = eventMetric(e);
  return (
    <button type="button" onClick={onOpen} className="rise-in row-hover w-full text-left flex items-start" style={{ gap: 14, padding: "12px 10px", margin: "0 -10px", width: "calc(100% + 20px)", borderBottom: `1px solid ${V.divider}`, borderRadius: 6, animationDelay: `${80 + i * 55}ms` }}>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 11, letterSpacing: "0.6px", textTransform: "uppercase", color: V.secondary, marginBottom: 2 }}>{KIND_LABEL[e.kind] || "Watch"}</div>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: V.ink, marginBottom: 2 }}>{e.title}</div>
        {e.detail && <div style={{ fontSize: 13, color: V.body, marginBottom: 3 }}>{e.detail}</div>}
        <div className="flex items-center" style={{ gap: 10 }}>
          {metric && <Mono>{metric}</Mono>}
          <span style={{ fontSize: 12, color: V.tertiary }}>{e.evidence?.facts?.length ? "From your books" : "Starlane"} · {clockTime(e.firstSeenAt)}</span>
        </div>
      </div>
      <Chevron />
    </button>
  );
}

function NeedsYouRow({ a, i = 0, emphasized }: { a: FeatureAction; i?: number; emphasized: boolean }) {
  return (
    <Link
      href={a.missionId ? `/missions/${a.missionId}` : "/prepared"}
      className="rise-in row-hover flex items-center"
      style={{ gap: 10, padding: "9px 10px", borderRadius: 7, border: `1px solid ${emphasized ? V.emphasis : "transparent"}`, animationDelay: `${160 + i * 55}ms` }}
    >
      <span className="shrink-0 flex items-center justify-center" style={{ width: 15, height: 15, color: V.secondary }}><IconClock size={15} /></span>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 13, color: V.ink }}>{a.title}</div>
        <div className="truncate" style={{ fontSize: 11.5, color: V.secondary }}>{a.description || LIFECYCLE_LABEL[a.lifecycle]}</div>
      </div>
      <span className="shrink-0" style={{ fontSize: 11, color: V.tertiary }}>{clockTime(a.createdAt)}</span>
      <Chevron size={13} />
    </Link>
  );
}

function SideRow({ href, icon, title, context, meta }: { href: string; icon: React.ReactNode; title: string; context?: string | null; meta?: string }) {
  return (
    <Link href={href} className="row-hover flex items-center" style={{ gap: 10, padding: "9px 10px", borderRadius: 7 }}>
      <span className="shrink-0 flex items-center justify-center" style={{ width: 15, height: 15, color: V.secondary }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 13, color: V.ink }}>{title}</div>
        {context && <div className="truncate" style={{ fontSize: 11.5, color: V.secondary }}>{context}</div>}
      </div>
      {meta && <span className="shrink-0" style={{ fontSize: 11, color: V.tertiary }}>{meta}</span>}
      <Chevron size={13} />
    </Link>
  );
}
