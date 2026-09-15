"use client";
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getUser } from "@/lib/api";
import {
  FiZap, FiCheckCircle, FiXCircle, FiAlertTriangle,
  FiMessageSquare, FiTrendingDown, FiPackage, FiClock,
  FiRefreshCw, FiChevronDown, FiChevronUp, FiSend, FiCopy,
} from "react-icons/fi";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Priority = "urgent" | "high" | "medium" | "low";
type Status = "pending" | "approved" | "rejected" | "done";

interface AiAction {
  id: string;
  action_type: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  suggested_by: string;
  requires_approval: boolean;
  recommended_message?: string;
  reason_json?: Record<string, unknown>;
  risk_level: string;
  created_at: string;
  customers?: { name: string; phone: string } | null;
}

interface Counts { urgent?: number; high?: number; medium?: number; low?: number }

// Four priority tiers don't need four hues. Only urgent/high are genuinely
// alarming; medium/low are neutral grades, not a yellow/blue rainbow (blue
// especially, since it's the app's own interactive-accent color elsewhere).
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string }> = {
  urgent: { label: "Urgent",  color: "text-danger",   bg: "bg-danger-dim",   border: "border-danger/30" },
  high:   { label: "High",    color: "text-warning",  bg: "bg-warning/10",   border: "border-warning/30" },
  medium: { label: "Medium",  color: "text-secondary",bg: "bg-surface-2",    border: "border-border" },
  low:    { label: "Low",     color: "text-muted",    bg: "bg-surface-2",    border: "border-border" },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  SEND_POLITE_REMINDER:   <FiMessageSquare size={16} />,
  SEND_FIRM_REMINDER:     <FiAlertTriangle size={16} />,
  ESCALATE_TO_OWNER:      <FiAlertTriangle size={16} />,
  LOW_STOCK_ALERT:        <FiPackage size={16} />,
  CASHFLOW_RISK:          <FiTrendingDown size={16} />,
  STOP_CREDIT_WARNING:    <FiAlertTriangle size={16} />,
  SUPPLIER_PAYMENT_DUE:   <FiClock size={16} />,
  DAILY_OWNER_BRIEFING:   <FiZap size={16} />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ActionCard({ action, onUpdate }: { action: AiAction; onUpdate: (id: string, status: Status) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waSending, setWaSending] = useState<"idle" | "sending" | "sent" | "error" | "unconfigured">("idle");
  const [waCopied, setWaCopied] = useState(false);
  const pc = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.medium;

  const isMessageAction = /reminder|message|follow.*up|collection/i.test(action.action_type + " " + action.title);

  const handleAction = async (status: Status) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vantro_token");
      const res = await fetch(`${BASE}/api/ai-actions/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (res.ok) onUpdate(action.id, status);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setWaSending("sending");
    try {
      const token = localStorage.getItem("vantro_token");
      const res = await fetch(`${BASE}/api/ai-actions/${action.id}/send-whatsapp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 503) {
        setWaSending("unconfigured");
      } else if (res.ok && data.success) {
        setWaSending("sent");
        onUpdate(action.id, "done");
      } else {
        setWaSending("error");
      }
    } catch {
      setWaSending("error");
    }
  };

  const copyMessage = () => {
    const msg = action.recommended_message || action.description || action.title;
    navigator.clipboard.writeText(msg).then(() => { setWaCopied(true); setTimeout(() => setWaCopied(false), 2000); });
  };

  return (
    <div className={`rounded-xl border ${pc.border} ${pc.bg} p-4 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-0.5 ${pc.color} flex-shrink-0`}>
            {ACTION_ICONS[action.action_type] || <FiZap size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${pc.bg} ${pc.color} border ${pc.border}`}>
                {pc.label}
              </span>
              {action.requires_approval && (
                <span className="text-[10px] text-secondary border border-border rounded-full px-2 py-0.5">
                  Needs approval
                </span>
              )}
              <span className="text-[11px] text-muted">{timeAgo(action.created_at)}</span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-primary leading-snug">{action.title}</p>
            {action.customers && (
              <p className="text-xs text-secondary mt-0.5">
                {action.customers.name}{action.customers.phone ? ` · ${action.customers.phone}` : ""}
              </p>
            )}
            {action.description && (
              <p className="text-xs text-secondary mt-1 leading-relaxed">{action.description}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="text-muted hover:text-secondary flex-shrink-0 mt-0.5"
        >
          {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>
      </div>

      {expanded && action.recommended_message && (
        <div className="mt-3 ml-7 p-3 bg-surface-2 rounded-lg border border-border">
          <p className="text-[11px] text-muted uppercase tracking-wide mb-1">Suggested message</p>
          <p className="text-xs text-secondary leading-relaxed whitespace-pre-wrap">{action.recommended_message}</p>
        </div>
      )}

      <div className="mt-3 ml-7 flex flex-wrap gap-2">
        <button
          onClick={() => handleAction("approved")}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-dim border border-success/30 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-50"
        >
          <FiCheckCircle size={13} /> Approve
        </button>
        {isMessageAction && waSending !== "sent" && (
          <button
            onClick={handleSendWhatsApp}
            disabled={waSending === "sending"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-dim border border-success/30 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-50"
          >
            <FiSend size={13} />
            {waSending === "sending" ? "Sending…" : "Send via WhatsApp"}
          </button>
        )}
        {waSending === "sent" && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-dim border border-success/30 text-success text-xs font-medium">
            <FiCheckCircle size={13} /> Sent
          </span>
        )}
        {(waSending === "unconfigured" || waSending === "error") && (
          <button
            onClick={copyMessage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-secondary text-xs font-medium hover:bg-surface-3 transition-colors"
          >
            <FiCopy size={13} /> {waCopied ? "Copied!" : "Copy message"}
          </button>
        )}
        <button
          onClick={() => handleAction("done")}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-secondary text-xs font-medium hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          Done
        </button>
        <button
          onClick={() => handleAction("rejected")}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-muted text-xs font-medium hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          <FiXCircle size={13} /> Dismiss
        </button>
      </div>
      {waSending === "unconfigured" && (
        <p className="ml-7 mt-1.5 text-[11px] text-warning">
          WhatsApp not configured — set TWILIO_WHATSAPP_NUMBER in Railway to enable sending.
        </p>
      )}
    </div>
  );
}

export default function AiActionsPage() {
  const [actions, setActions] = useState<AiAction[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [filter, setFilter] = useState<"all" | Priority>("all");
  const [statusTab, setStatusTab] = useState<"pending" | "done">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const user = getUser();
      if (!user) { setError("Not logged in"); return; }
      const token = localStorage.getItem("vantro_token");
      const status = statusTab === "done" ? "all" : "pending";
      const url = `${BASE}/api/ai-actions?status=${statusTab === "done" ? "done" : "pending"}&limit=100`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setActions(data.actions || []);
      setCounts(data.counts || {});
    } catch {
      setError("Could not load actions. Make sure you are connected.");
    } finally {
      setLoading(false);
    }
  }, [statusTab]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const handleUpdate = (id: string, status: Status) => {
    setActions(prev => prev.filter(a => a.id !== id));
    if (status !== "rejected") {
      setCounts(prev => {
        const action = actions.find(a => a.id === id);
        if (!action) return prev;
        const p = action.priority;
        return { ...prev, [p]: Math.max(0, (prev[p as Priority] || 0) - 1) };
      });
    }
  };

  const filtered = filter === "all" ? actions : actions.filter(a => a.priority === filter);
  const totalPending = Object.values(counts).reduce((s, v) => s + (v || 0), 0);

  const PRIORITY_ORDER: Priority[] = ["urgent", "high", "medium", "low"];
  const grouped = PRIORITY_ORDER.reduce<Record<string, AiAction[]>>((acc, p) => {
    const items = filtered.filter(a => a.priority === p);
    if (items.length) acc[p] = items;
    return acc;
  }, {});

  return (
    <DashboardLayout pageTitle="Action Center">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <FiZap className="text-warning" size={20} />
              Action Center
            </h1>
            <p className="text-sm text-secondary mt-0.5">
              {totalPending > 0
                ? `${totalPending} action${totalPending !== 1 ? "s" : ""} need your attention`
                : "You're all caught up"}
            </p>
          </div>
          <button
            onClick={fetchActions}
            className="p-2 rounded-lg bg-surface-2 border border-border text-secondary hover:text-primary transition-colors"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Summary badges */}
        {totalPending > 0 && (
          <div className="flex gap-2 flex-wrap">
            {(["urgent", "high", "medium", "low"] as Priority[]).map(p => {
              const n = counts[p] || 0;
              if (!n) return null;
              const pc = PRIORITY_CONFIG[p];
              return (
                <button
                  key={p}
                  onClick={() => setFilter(filter === p ? "all" : p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${pc.color} ${pc.border} ${filter === p ? pc.bg : "bg-transparent opacity-70 hover:opacity-100"}`}
                >
                  {pc.label}: {n}
                </button>
              );
            })}
          </div>
        )}

        {/* Status tabs */}
        <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border">
          {(["pending", "done"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setStatusTab(tab); setFilter("all"); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                statusTab === tab
                  ? "bg-surface-3 text-primary"
                  : "text-secondary hover:text-secondary"
              }`}
            >
              {tab === "pending" ? `Pending${totalPending > 0 ? ` (${totalPending})` : ""}` : "Completed"}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl bg-surface-2 border border-border animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-secondary">
            <FiAlertTriangle size={32} className="mx-auto mb-3 text-muted" />
            <p>{error}</p>
            <button onClick={fetchActions} className="mt-3 text-sm text-accent hover:underline">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FiCheckCircle size={40} className="mx-auto mb-3 text-success/60" />
            <p className="text-secondary font-medium">
              {statusTab === "pending" ? "No pending actions" : "No completed actions"}
            </p>
            <p className="text-sm text-muted mt-1">
              {statusTab === "pending"
                ? "Cortex will surface actions here as your business generates data."
                : "Approved and done actions will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([priority, items]) => (
              <div key={priority}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${PRIORITY_CONFIG[priority as Priority].color}`}>
                  {PRIORITY_CONFIG[priority as Priority].label} · {items.length}
                </p>
                <div className="space-y-3">
                  {items.map(action => (
                    <ActionCard key={action.id} action={action} onUpdate={handleUpdate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
