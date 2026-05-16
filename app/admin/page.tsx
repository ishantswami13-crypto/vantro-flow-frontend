"use client";

import { useState, useEffect } from "react";
import { FiZap, FiUsers, FiTrendingUp, FiDatabase, FiDollarSign, FiRefreshCw } from "react-icons/fi";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

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

export default function AdminPage() {
  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  const load = async () => {
    setLoading(true); setError("");
    const token = typeof window !== "undefined" ? localStorage.getItem("vantro_token") : null;
    if (!token) { setError("Not logged in"); setLoading(false); return; }
    try {
      const res = await fetch(`${BASE}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-bg p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center">
            <FiZap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-primary text-lg">Vantro Admin</h1>
            <p className="text-xs text-muted">Founder analytics — private</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-2 text-secondary border border-border hover:bg-surface-3 transition-all disabled:opacity-50">
          <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-danger-dim border border-danger/30 rounded-lg text-sm text-danger">
          {error} — Make sure your email is in the ADMIN_EMAILS Railway env var.
        </div>
      )}

      {loading && !stats && (
        <div className="text-center py-16 text-sm text-muted animate-pulse">Loading stats...</div>
      )}

      {stats && (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Users",      value: stats.total_users,      icon: FiUsers,      color: "#0066FF" },
              { label: "Signups Today",    value: stats.signups_today,    icon: FiTrendingUp, color: "#10D98A" },
              { label: "Signups (7d)",     value: stats.signups_last_7d,  icon: FiTrendingUp, color: "#F5A524" },
              { label: "Paid Users",       value: stats.paid_users,       icon: FiDollarSign, color: "#10D98A" },
              { label: "Free Users",       value: stats.free_users,       icon: FiUsers,      color: "#8899AA" },
              { label: "With Data",        value: stats.users_with_data,  icon: FiDatabase,   color: "#9B6DFF" },
              { label: "Total Invoices",   value: stats.total_invoices,   icon: FiDatabase,   color: "#0066FF" },
              { label: "MRR (₹)",          value: `₹${stats.mrr_inr.toLocaleString("en-IN")}`, icon: FiDollarSign, color: "#10D98A" },
            ].map(m => (
              <div key={m.label} className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs text-muted mb-1">{m.label}</p>
                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Recent signups */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-sm font-bold text-primary">Recent Signups</p>
            </div>
            <div className="divide-y divide-border/50">
              {stats.recent_signups.length === 0 && (
                <div className="px-5 py-6 text-sm text-muted text-center">No signups yet.</div>
              )}
              {stats.recent_signups.map((u, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-surface-2/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-primary">{u.business || "—"}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.plan !== "free" ? "bg-success-dim text-success" : "bg-surface-2 text-muted"}`}>
                      {u.plan}
                    </span>
                    <p className="text-2xs text-muted mt-1">{fmtDate(u.joined)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
