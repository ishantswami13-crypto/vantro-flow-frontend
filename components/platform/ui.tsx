"use client";

// Shared pieces for the platform screens (agents, knowledge, organization,
// approvals, command center). Display only: every value comes from
// /api/platform, and permissions are decided by the server.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PlatformError, platformApi, statusColor, STATUS_LABEL, AGENT_STATUS_LABEL, ORG_CHANGED_EVENT, activeOrgId, type ExecStatus, type AgentStatus, type Measured, type Workspace } from "@/lib/platform";
import { ErrorBanner, EmptyLine, SkeletonRows, Button } from "@/components/v32/ui";

/** The active organization id, re-read when the switcher changes it. */
export function useActiveOrg(): string | null {
  const [org, setOrg] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setOrg(activeOrgId());
    read();
    window.addEventListener(ORG_CHANGED_EVENT, read);
    return () => window.removeEventListener(ORG_CHANGED_EVENT, read);
  }, []);
  return org;
}

/** Cached workspace for the active organization (same query as the sidebar). */
export function useWorkspace() {
  const org = useActiveOrg();
  return useQuery<Workspace, Error>({
    queryKey: ["platform", "workspace", org],
    queryFn: () => platformApi.workspace(),
    staleTime: 60_000,
    retry: (n, err) => !(err instanceof PlatformError && [401, 403, 404, 503].includes(err.status)) && n < 2,
  });
}

export function can(ws: Workspace | undefined, permission: string): boolean {
  return !!ws?.permissions?.includes(permission);
}

export function isPlatformNotReady(err: unknown): boolean {
  // 503 PLATFORM_NOT_READY: migration not applied. A bare 404 (no platform
  // error code) means an older backend without /api/platform. A 404 that
  // carries a code (NOT_FOUND) is a real "this item does not exist".
  return err instanceof PlatformError && (err.code === "PLATFORM_NOT_READY" || (err.status === 404 && err.code === "ERROR"));
}

export function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

/** Error line for a platform call; says plainly when the platform is not installed yet. */
export function PlatformErrorBanner({ error, what }: { error: unknown; what: string }) {
  if (!error) return null;
  if (isPlatformNotReady(error)) {
    return (
      <div className="pf-note is-warn" role="status">
        The agent platform is not switched on for this workspace yet. {what} will appear here once it is. Your existing screens keep working.
      </div>
    );
  }
  return <ErrorBanner>{what} could not be loaded: {messageOf(error)}</ErrorBanner>;
}

export function Loading({ rows = 3, height = 52 }: { rows?: number; height?: number }) {
  return <SkeletonRows rows={rows} height={height} />;
}

export function ExecStatusChip({ status }: { status: ExecStatus }) {
  const tone = status === "completed" ? "is-good" : status === "failed" ? "is-bad" : status === "awaiting_approval" || status === "queued" ? "is-warn" : "";
  return <span className={`pf-chip ${tone}`}><i aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: statusColor(status), display: "inline-block" }} />{STATUS_LABEL[status] || status}</span>;
}

export function AgentStatusChip({ status }: { status: AgentStatus }) {
  const tone = status === "active" ? "is-good" : status === "disabled" ? "is-warn" : "";
  return <span className={`pf-chip ${tone}`}>{AGENT_STATUS_LABEL[status] || status}</span>;
}

export function Chip({ children, tone }: { children: React.ReactNode; tone?: "good" | "warn" | "bad" }) {
  return <span className={`pf-chip ${tone ? `is-${tone}` : ""}`}>{children}</span>;
}

export function duration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "–";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  return `${m} min ${Math.round(s % 60)} s`;
}

export function when(iso: string | null | undefined): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** A measured value, or the reason it is not measured. Never a made-up number. */
/** Money in the organization's price currency; small amounts keep enough decimals to be honest. */
export function money(v: number, currency: string): string {
  const digits = v === 0 ? 2 : v < 0.01 ? 4 : v < 1 ? 3 : 2;
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v); }
  catch { return `${v.toFixed(digits)} ${currency}`; }
}

export function MeasuredKpi<T>({ label, m, format }: { label: string; m: Measured<T>; format: (v: T) => string }) {
  return (
    <div className="pf-kpi">
      {m.available ? <div className="pf-kpi-v">{format(m.value)}</div> : <div className="pf-kpi-v is-na" title={m.reason}>Not measured</div>}
      <div className="pf-kpi-l">{label}{!m.available && <span style={{ display: "block", color: "#9A968E", marginTop: 3 }}>{m.reason}</span>}</div>
    </div>
  );
}

export function Kpi({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const body = (<><div className="pf-kpi-v">{value}</div><div className="pf-kpi-l">{label}</div></>);
  return href ? <Link href={href} className="pf-kpi hover-lift" style={{ display: "block" }}>{body}</Link> : <div className="pf-kpi">{body}</div>;
}

export function Field({ label, hint, children, htmlFor }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="pf-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="pf-hint">{hint}</span>}
    </div>
  );
}

/** A titled group. Drawn as a panel unless `plain` (a heading over the content). */
export function Section({ title, aside, children, plain, description }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; plain?: boolean; description?: React.ReactNode }) {
  if (!plain) return <Panel title={title} aside={aside} description={description}>{children}</Panel>;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3" style={{ marginBottom: 12 }}>
        <h2 className="hv-block-title" style={{ margin: 0 }}>{title}</h2>
        {aside && <div className="ws-section-aside">{aside}</div>}
      </div>
      {description && <p style={{ margin: "-6px 0 12px", fontSize: 13, color: "#6B675F", lineHeight: 1.5 }}>{description}</p>}
      {children}
    </section>
  );
}

/** A titled card holding one group of settings or one list. */
export function Panel({ title, aside, description, children }: { title?: React.ReactNode; aside?: React.ReactNode; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ws-panel">
      {(title || aside) && (
        <div className="ws-panel-head">
          <div className="min-w-0">
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {aside && <div className="ws-panel-aside">{aside}</div>}
        </div>
      )}
      <div className="ws-panel-body">{children}</div>
    </section>
  );
}

/** One figure in a band: a counted value, or a measured value that may say
 *  why it is not measured. Never a made-up number. */
export type BandCell =
  | { label: string; value: React.ReactNode; href?: string; note?: React.ReactNode }
  | { label: string; measured: Measured<any>; format: (v: any) => string; href?: string };

/** Headline figures in one card, split by hairlines. */
export function StatBand({ title, aside, cells }: { title?: React.ReactNode; aside?: React.ReactNode; cells: BandCell[] }) {
  return (
    <div>
      {title && <div className="ws-band-title">{title}{aside && <span>{aside}</span>}</div>}
      <div className="ws-band" style={{ ["--cols" as string]: cells.length } as React.CSSProperties}>
        {cells.map((c) => {
          let value: React.ReactNode; let note: React.ReactNode = null; let na = false; let title: string | undefined;
          if ("measured" in c) {
            if (c.measured.available) value = c.format(c.measured.value);
            else { value = "—"; na = true; note = c.measured.reason; title = `Not measured: ${c.measured.reason}`; }
          } else { value = c.value; note = c.note ?? null; }
          const body = (
            <>
              <div className="ws-cell-l">{c.label}</div>
              <div className={`ws-cell-v ${na ? "is-na" : ""}`} aria-label={na ? "Not measured" : undefined}>{value}</div>
              {note && <div className="ws-cell-n">{na ? <>Not measured. {note}</> : note}</div>}
            </>
          );
          return c.href
            ? <Link key={c.label} href={c.href} className="ws-cell" title={title}>{body}</Link>
            : <div key={c.label} className="ws-cell" title={title}>{body}</div>;
        })}
      </div>
    </div>
  );
}

/** Things that need someone, each with a tone rule on the left. */
export function AlertList({ alerts }: { alerts: { title: string; detail?: string | null; href?: string | null; severity?: string }[] }) {
  if (!alerts.length) return null;
  return (
    <div className="ws-alerts" role="region" aria-label="Needs attention">
      {alerts.map((a, i) => {
        const high = a.severity === "high";
        const inner = (
          <>
            <span className="ws-alert-ic" aria-hidden>!</span>
            <div className="min-w-0" style={{ flex: 1 }}>
              <div className="ws-alert-t"><span className="sr-only">{high ? "Needs attention: " : "Check: "}</span>{a.title}</div>
              {a.detail && <div className="ws-alert-d">{a.detail}</div>}
            </div>
            {a.href && <span aria-hidden style={{ color: "#9A958C" }}>→</span>}
          </>
        );
        const cls = `ws-alert ${high ? "is-high" : ""}`;
        return a.href ? <Link key={i} href={a.href} className={cls}>{inner}</Link> : <div key={i} className={cls}>{inner}</div>;
      })}
    </div>
  );
}

/** A framed empty state for a page's main area. */
export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="ws-empty fade-once">
      {icon && <span className="ws-empty-ic" aria-hidden>{icon}</span>}
      <div className="ws-empty-t">{title}</div>
      {body && <div className="ws-empty-b">{body}</div>}
      {action && <div className="ws-empty-a">{action}</div>}
    </div>
  );
}

/** Serif initial on an ink tile, the mark for an agent or template. */
export function Monogram({ name, size = 40 }: { name: string; size?: number }) {
  return <span className="ws-mono" aria-hidden style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }}>{(name || "?").trim().charAt(0).toUpperCase()}</span>;
}

/** Small async-action helper: busy flag and error message for one button. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true); setError(null);
    try { return await fn(); } catch (e) { setError(messageOf(e)); return undefined; } finally { setBusy(false); }
  }
  return { busy, error, setError, run };
}

export function InlineError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p role="alert" style={{ color: "#A64F4B", fontSize: 12.5, margin: "6px 0 0" }}>{error}</p>;
}
