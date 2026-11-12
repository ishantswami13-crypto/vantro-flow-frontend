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

export function Section({ title, aside, children }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3" style={{ marginBottom: 10 }}>
        <h2 className="hv-block-title" style={{ margin: 0 }}>{title}</h2>
        {aside && <div style={{ fontSize: 12.5, color: "#6E6A63" }}>{aside}</div>}
      </div>
      {children}
    </section>
  );
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
