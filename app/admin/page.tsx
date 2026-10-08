"use client";
import { authHeaders, isLoggedIn } from "@/lib/api";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Figure, SkeletonRows } from "@/components/v32/ui";
import { IconRefresh } from "@/components/v32/icons";
import { StatusChip } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import Button from "@/components/ui/Button";
import { formatCount, formatDateTime, formatRelative, inrWhole } from "@/lib/format";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

// Founder analytics (GET /api/admin/stats, ADMIN_EMAILS on the backend).
// Private; the backend refuses anyone else.

interface AdminStats {
  total_users: number;
  signups_last_7d: number;
  signups_today: number;
  paid_users: number;
  free_users: number;
  users_with_data: number;
  total_invoices: number;
  mrr_inr: number;
  recent_signups: { email: string; business: string; plan: string; joined: string }[];
}

type Failure = "signed_out" | "forbidden" | "offline";
const FAILURE: Record<Failure, { title: string; message: string }> = {
  signed_out: { title: "You're signed out", message: "Sign in with an admin account to see these numbers." },
  forbidden: { title: "Admins only", message: "These numbers are limited to Starlane admins. Your account isn't on the admin list." },
  offline: { title: "Couldn't load admin stats", message: "Couldn't reach Starlane. Check your connection and try again." },
};

export default function AdminPage() {
  const [stats, setStats]     = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<Failure | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setFailure(null);
    if (!isLoggedIn()) { setFailure("signed_out"); setLoading(false); return; }
    try {
      const res = await fetch(`${BASE}/api/admin/stats`, {
        headers: { ...authHeaders() }, credentials: "include",
      });
      if (res.status === 401) { setFailure("signed_out"); return; }
      if (res.status === 403) { setFailure("forbidden"); return; }
      const data = await res.json();
      if (!res.ok || !data.stats) throw new Error("bad response");
      setStats(data.stats);
    } catch {
      setFailure("offline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const figures = stats ? [
    { label: "Users", value: formatCount(stats.total_users) },
    { label: "Signed up today", value: formatCount(stats.signups_today) },
    { label: "Signed up in 7 days", value: formatCount(stats.signups_last_7d) },
    { label: "Monthly recurring revenue", value: inrWhole(stats.mrr_inr) },
  ] : [];
  const secondary = stats ? [
    { label: "Paid users", value: formatCount(stats.paid_users) },
    { label: "Free users", value: formatCount(stats.free_users) },
    { label: "Users with data", value: formatCount(stats.users_with_data) },
    { label: "Invoices", value: formatCount(stats.total_invoices) },
  ] : [];

  return (
    <DashboardLayout pageTitle="Admin">
      <style>{`
        .adm-row { display: grid; align-items: center; gap: 4px 16px; padding: 10px 0; min-height: 48px;
          grid-template-columns: minmax(0, 1fr) auto; }
        .adm-head { display: none; }
        @media (min-width: 760px) {
          .adm-row { grid-template-columns: minmax(0, 1fr) 120px 140px; }
          .adm-head { display: grid; min-height: 0; padding: 0 0 8px; }
        }
        .adm-sub { display: flex; flex-wrap: wrap; gap: 6px 28px; margin-top: 16px; font-size: 12.5px; color: var(--ink-3); }
        .adm-sub b { font-weight: 400; color: var(--ink); font-family: var(--font-mono); font-size: 12.5px; margin-left: 6px; }
      `}</style>
      <div style={{ maxWidth: 1180, display: "flex", flexDirection: "column", gap: 32 }}>
        <PageHeader
          title="Admin"
          subtitle="Founder analytics. Private to Starlane admins."
          right={
            <div className="flex items-center" style={{ gap: 8 }}>
              <Link href="/admin/access" className="ui-btn ui-btn-ghost">Access review</Link>
              <Link href="/admin/errors" className="ui-btn ui-btn-ghost">Errors</Link>
              <Button variant="secondary" onClick={load} loading={loading} icon={<IconRefresh size={14} />}>Refresh stats</Button>
            </div>
          }
        />

        {failure && <ErrorState title={FAILURE[failure].title} message={FAILURE[failure].message} onRetry={failure === "offline" ? load : undefined} />}
        {loading && !stats && !failure && <SkeletonRows rows={4} />}

        {stats && (
          <>
            <div className="fade-once">
              <div className="ops-figures">
                {figures.map((m) => <Figure key={m.label} value={m.value} label={m.label} />)}
              </div>
              <dl className="adm-sub" style={{ margin: "16px 0 0" }}>
                {secondary.map((m) => <div key={m.label} className="flex items-baseline"><dt>{m.label}</dt><dd style={{ margin: 0 }}><b>{m.value}</b></dd></div>)}
              </dl>
            </div>

            <section>
              <h2 className="section-label">Recent signups</h2>
              {stats.recent_signups.length === 0 ? (
                <p className="ops-list" style={{ margin: 0, padding: "12px 0", fontSize: 13, color: "var(--ink-2)", borderBottom: "1px solid var(--line)" }}>No signups yet. New accounts appear here as they are created.</p>
              ) : (
                <div>
                  <div className="adm-row adm-head ops-head" aria-hidden="true"><span>Business</span><span>Plan</span><span style={{ textAlign: "right" }}>Joined</span></div>
                  {stats.recent_signups.map((u, i) => (
                    <div key={`${u.email}-${i}`} className="adm-row ops-row">
                      <div className="min-w-0">
                        <div className="truncate" style={{ fontSize: 13.5, color: "var(--ink)" }}>{u.business || <span style={{ color: "var(--ink-3)" }}>No business name</span>}</div>
                        <div className="truncate" style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{u.email}</div>
                      </div>
                      <div><StatusChip tone={u.plan !== "free" ? "positive" : "neutral"}>{u.plan.replace(/^./, (c) => c.toUpperCase())}</StatusChip></div>
                      <div className="hidden md:block tabular-nums" style={{ fontSize: 12.5, color: "var(--ink-2)", textAlign: "right" }} title={formatDateTime(u.joined)}>{formatRelative(u.joined).replace(/^./, (c) => c.toUpperCase())}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
