"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { request, getUser } from "@/lib/api";
import { greeting, firstName } from "@/lib/greeting";
import { SkeletonRows, Chevron } from "@/components/v32/ui";
import { EvidenceSetDrawer } from "@/components/v32/EvidenceSetDrawer";
import { ScanComposer } from "@/components/scan/ScanComposer";
import { inr, count, ago, exact, shortDate } from "@/lib/format";
import type { BridgeView, WatchEvent, FeatureAction, Mission } from "../../packages/contracts/src/features";
import { LIFECYCLE_LABEL } from "../../packages/contracts/src/features";

// The Bridge: the workspace an owner opens first. What needs them, what
// changed, what Starlane is running and the state of the business, all from
// GET /api/client/bridge (the same read the desktop and phone apps use).
// Nothing is computed here beyond arranging what the server sent.

const KIND: Record<string, string> = {
  invoice_overdue: "Collections",
  promise_broken: "Payment promise",
  sync_failed: "Source",
  sync_stale: "Source",
  watch_triggered: "Watch",
};

const FRESH: Record<string, { tone: string; word: string }> = {
  fresh: { tone: "success", word: "Live" },
  delayed: { tone: "warning", word: "Delayed" },
  stale: { tone: "danger", word: "Stale" },
  none: { tone: "neutral", word: "No source yet" },
};

const urgent = (e: WatchEvent) => e.severity === "critical" || e.severity === "high";

/** The one figure worth showing beside an event, from its own evidence. */
function impact(e: WatchEvent): string | null {
  const f = e.evidence?.facts?.find((x) => x.kind === "calculated" && typeof x.value === "number");
  if (!f || typeof f.value !== "number") return null;
  if (!f.value) return null;
  if (f.unit === "INR") return inr(f.value);
  if (/days?/i.test(f.label)) return `${count(f.value)} days`;
  return count(f.value);
}

export default function BridgePage() {
  const router = useRouter();
  const [data, setData] = useState<BridgeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [scan, setScan] = useState("");
  const [open, setOpen] = useState<{ title: string; record?: string; evidence: WatchEvent["evidence"] } | null>(null);

  useEffect(() => {
    setName(firstName());
    setWorkspace(getUser()?.business_name || "");
    request<BridgeView>("/api/client/bridge")
      .then(setData)
      .catch((e: Error) => setError(e.message || "The Bridge could not be loaded."));
  }, []);

  const latest = useMemo(() => data?.attention.watch.latest || [], [data]);
  const needs = latest.filter(urgent);
  const changed = latest.filter((e) => !urgent(e));
  const decisions = data?.attention.topDecisions || [];
  const running = (data?.missions || []).filter((m) => m.status === "active");
  const prepared = (data?.prepared || []).filter((h) => h.count > 0 && h.first);
  const source = data?.sources.find((s) => s.lastSuccessAt) || data?.sources[0] || null;
  const asOf = data?.dataAsOf || source?.lastSuccessAt || null;
  const fresh = FRESH[data?.freshness || "none"] || FRESH.none;
  const needCount = (data?.attention.watch.urgent || 0) + (data?.attention.decisions || 0);
  const st = data?.state;

  return (
    <DashboardLayout pageTitle="Bridge">
      <div className="sl-rise" style={{ maxWidth: 1180 }}>
        {/* Header: who, how fresh, how healthy */}
        <header className="flex items-end justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <h1 className="sl-page-title">{greeting()}{name ? `, ${name}` : ""}</h1>
            <p className="sl-page-sub">
              {!data ? " "
                : !data.hasData ? "Connect a source and Starlane will tell you what changed."
                : needCount === 0 ? "Nothing needs you right now. Starlane is watching your books."
                : `${needCount} ${needCount === 1 ? "thing needs" : "things need"} you. ${latest.length} change${latest.length === 1 ? "" : "s"} since the last sync.`}
            </p>
          </div>
          {data && (
            <div className="flex items-center gap-4 sl-meta">
              {workspace && <span>{workspace}</span>}
              <Link href="/sources" className={`sl-status sl-status--${fresh.tone}`} title={asOf ? `Business data as of ${exact(asOf)}` : "No source has synced yet"}>
                <span className="sl-dot" aria-hidden="true" />
                {source?.name ? `${source.name} · ` : ""}{fresh.word}{asOf && data.freshness !== "none" ? ` · ${ago(asOf)}` : ""}
              </Link>
            </div>
          )}
        </header>

        <div style={{ maxWidth: 680, marginTop: 20 }}>
          <ScanComposer
            id="bridge-scan"
            value={scan}
            onChange={setScan}
            onSubmit={() => { if (scan.trim()) router.push(`/scan?q=${encodeURIComponent(scan.trim())}`); }}
            submitting={false}
            placeholder="Ask about your business"
          />
        </div>

        {error && <p role="alert" className="sl-empty" style={{ color: "var(--status-danger)" }}>{error}</p>}

        {/* One hairline strip of the figures that drive decisions */}
        {data?.hasData && st && (
          <div className="sl-strip" style={{ marginTop: 28 }}>
            <StripCell href="/collections" label="Overdue receivables" value={inr(st.overdueReceivables, st.currency)} sub={`${count(st.overdueInvoiceCount)} of ${count(st.openInvoiceCount)} invoices`} danger={st.overdueReceivables > 0} />
            <StripCell href="/collections" label="Open receivables" value={inr(st.openReceivables, st.currency)} sub={`${count(st.openInvoiceCount)} invoices`} />
            <StripCell href="/prepared" label="Needs you" value={count(needCount)} sub={needCount ? "decisions and alerts" : "nothing waiting"} />
            <StripCell href="/missions" label="Missions running" value={count(running.length)} sub={running.length ? "in progress" : "none active"} />
          </div>
        )}

        {!data && !error && <div style={{ marginTop: 28 }}><SkeletonRows rows={4} height={44} /></div>}

        {data && !data.hasData && (
          <section className="sl-section">
            <div className="sl-section-head"><span className="sl-label">Get started</span></div>
            <p className="sl-empty"><strong>No books connected yet.</strong>Starlane reports from your own records only. Connect Tally or upload a receivables file and this fills in on the next sync.</p>
            <div className="flex gap-2"><Link href="/sources" className="sl-btn sl-btn--primary">Connect a source</Link><Link href="/decisions/import" className="sl-btn">Upload a file</Link></div>
          </section>
        )}

        {data?.hasData && (
          <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]" style={{ columnGap: 48 }}>
            <div className="min-w-0">
              {/* What needs you */}
              <section className="sl-section">
                <SectionHead label="What needs you" count={needCount} href="/prepared" linkText="Prepared" />
                {decisions.length === 0 && needs.length === 0 && (
                  <p className="sl-empty">No decision is waiting on you. Starlane is monitoring {data.attention.watch.open || "your"} open item{data.attention.watch.open === 1 ? "" : "s"}.</p>
                )}
                {decisions.slice(0, 4).map((a) => <DecisionRow key={a.id} a={a} />)}
                {needs.map((e) => <EventRow key={e.id} e={e} attention onOpen={() => setOpen({ title: e.title, record: e.detail || undefined, evidence: e.evidence })} />)}
              </section>

              {/* What changed */}
              <section className="sl-section">
                <SectionHead label="What changed" count={changed.length} href="/watch" linkText={data.attention.watch.open > latest.length ? `All ${data.attention.watch.open} on Watch` : "Watch"} />
                {changed.length === 0 && <p className="sl-empty">Nothing else changed since the last sync.</p>}
                {changed.map((e) => <EventRow key={e.id} e={e} onOpen={() => setOpen({ title: e.title, record: e.detail || undefined, evidence: e.evidence })} />)}
              </section>
            </div>

            <div className="min-w-0">
              {/* Missions running */}
              <section className="sl-section">
                <SectionHead label="Missions running" count={running.length} href="/missions" linkText="Missions" />
                {running.length === 0 && <p className="sl-empty">No mission is running. Open a decision and choose Handle it.</p>}
                {running.slice(0, 4).map((m) => <MissionRow key={m.id} m={m} />)}
              </section>

              {/* Business state: receivables by age */}
              {st && (
                <section className="sl-section">
                  <SectionHead label="Receivables by age" action={<button type="button" className="sl-btn sl-btn--ghost" onClick={() => setOpen({ title: "Receivables by age", evidence: st.evidence })}>Evidence</button>} />
                  <AgeingTable rows={st.ageing} currency={st.currency} />
                  {st.topOverdue.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p className="sl-label" style={{ marginBottom: 4 }}>Largest overdue</p>
                      {st.topOverdue.slice(0, 3).map((c) => (
                        <Link key={c.key} href={`/scan?q=${encodeURIComponent(c.name)}`} className="sl-row" style={{ padding: "8px 8px" }}>
                          <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, color: "var(--text-primary)" }}>{c.name}</span>
                          <span className="sl-meta">{c.oldestDays}d</span>
                          <span className="sl-num" style={{ fontSize: 12.5, color: "var(--text-primary)", minWidth: 84, textAlign: "right" }}>{inr(c.amount, st.currency)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Prepared */}
              <section className="sl-section">
                <SectionHead label="Prepared" href="/prepared" linkText="Open" />
                {prepared.length === 0 && <p className="sl-empty">Nothing is due to be prepared.</p>}
                {prepared.map((h) => (
                  <Link key={h.horizon} href={h.first!.route || "/prepared"} className="sl-row">
                    <div className="flex-1 min-w-0">
                      <div className="sl-row-kind">{h.label}</div>
                      <div className="sl-row-title truncate">{h.first!.title}</div>
                      <div className="sl-row-sub truncate">{h.first!.reason}</div>
                    </div>
                    <span className="sl-meta">{h.count > 1 ? `${h.count} items` : "Ready"}</span>
                    <Chevron size={13} />
                  </Link>
                ))}
              </section>
            </div>
          </div>
        )}
      </div>

      {open && (
        <EvidenceSetDrawer title={open.title} record={open.record} evidence={open.evidence} onClose={() => setOpen(null)}>
          <Link href="/watch" className="sl-btn">Open in Watch</Link>
        </EvidenceSetDrawer>
      )}
    </DashboardLayout>
  );
}

function SectionHead({ label, count: n, href, linkText, action }: { label: string; count?: number; href?: string; linkText?: string; action?: React.ReactNode }) {
  return (
    <div className="sl-section-head">
      <span className="sl-label">{label}{n ? <span style={{ marginLeft: 6, color: "var(--text-secondary)" }}>{n}</span> : null}</span>
      {action || (href && <Link href={href} className="sl-meta hover:text-[var(--text-primary)]">{linkText} →</Link>)}
    </div>
  );
}

function StripCell({ href, label, value, sub, danger }: { href: string; label: string; value: string; sub: string; danger?: boolean }) {
  return (
    <Link href={href} className="sl-strip-cell block min-w-0">
      <div className="sl-label">{label}</div>
      <div className="sl-kpi sl-strip-value" style={{ marginTop: 6, color: danger ? "var(--status-danger)" : undefined }}>{value}</div>
      <div className="sl-meta" style={{ marginTop: 2 }}>{sub}</div>
    </Link>
  );
}

function EventRow({ e, attention, onOpen }: { e: WatchEvent; attention?: boolean; onOpen: () => void }) {
  const fig = impact(e);
  return (
    <button type="button" onClick={onOpen} className={`sl-row ${attention ? "sl-row--attention" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="sl-row-kind">{KIND[e.kind] || "Watch"}</div>
        <div className="sl-row-title">{e.title}</div>
        {e.detail && <div className="sl-row-sub">{e.detail}</div>}
      </div>
      <div className="shrink-0 text-right" style={{ minWidth: 96 }}>
        {fig && <div className="sl-num" style={{ fontSize: 13, color: "var(--text-primary)" }}>{fig}</div>}
        <div className="sl-meta" title={exact(e.firstSeenAt)}>{ago(e.firstSeenAt)}</div>
      </div>
      <Chevron size={13} />
    </button>
  );
}

function DecisionRow({ a }: { a: FeatureAction }) {
  return (
    <Link href={a.missionId ? `/missions/${a.missionId}` : "/prepared"} className="sl-row sl-row--attention">
      <div className="flex-1 min-w-0">
        <div className="sl-row-kind">Decision{a.riskLevel === "high" ? " · High risk" : ""}</div>
        <div className="sl-row-title">{a.title}</div>
        <div className="sl-row-sub truncate">{a.description || LIFECYCLE_LABEL[a.lifecycle]}</div>
      </div>
      <div className="shrink-0 text-right" style={{ minWidth: 96 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 500 }}>{a.requiresApproval ? "Approve" : "Review"}</div>
        <div className="sl-meta" title={exact(a.createdAt)}>{ago(a.createdAt)}</div>
      </div>
      <Chevron size={13} />
    </Link>
  );
}

function MissionRow({ m }: { m: Mission }) {
  const p = m.progress;
  const pct = p ? Math.max(0, Math.min(1, p.ratio || 0)) : 0;
  return (
    <Link href={`/missions/${m.id}`} className="sl-row" style={{ alignItems: "flex-start" }}>
      <div className="flex-1 min-w-0">
        <div className="sl-row-title truncate">{m.title}</div>
        <div className="sl-row-sub truncate">{p ? `${inr(p.collected)} of ${inr(p.targetAmount)}` : m.objective}</div>
        {p && (
          <div aria-hidden="true" style={{ marginTop: 7, height: 2, background: "var(--border-default)", borderRadius: 1 }}>
            <div style={{ width: `${pct * 100}%`, height: 2, background: "var(--text-primary)", borderRadius: 1, transition: "width var(--dur-slow) var(--ease)" }} />
          </div>
        )}
      </div>
      <span className="sl-meta shrink-0">{m.endsAt ? `ends ${shortDate(m.endsAt)}` : ""}</span>
    </Link>
  );
}

function AgeingTable({ rows: all, currency }: { rows: Array<{ id: string; label: string; amount: number; count: number }>; currency: string }) {
  let rows = all;
  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
  if (!rows.length || total === 0) return <p className="sl-empty">No open receivables.</p>;
  // Only the bands that hold money; empty bands are noise here.
  rows = rows.filter((r) => r.amount > 0 || r.count > 0);
  return (
    <table className="sl-table" style={{ marginTop: 2 }}>
      <thead><tr><th>Age</th><th className="num">Invoices</th><th className="num">Amount</th><th className="num" style={{ width: 52 }}>Share</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={r.amount ? "strong" : ""}>{r.label}</td>
            <td className="num">{count(r.count)}</td>
            <td className={`num ${r.amount ? "strong" : ""}`}>{inr(r.amount, currency)}</td>
            <td className="num" style={{ color: "var(--text-tertiary)" }}>{total ? Math.round((r.amount / total) * 100) : 0}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
