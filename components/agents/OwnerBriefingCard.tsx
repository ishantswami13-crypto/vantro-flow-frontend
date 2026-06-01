"use client";

import type { OwnerBriefingResponse, OwnerBriefingAction } from "@/lib/api";
import { FiAlertTriangle, FiArrowRight, FiCheckCircle, FiCpu, FiWifiOff } from "react-icons/fi";

// ─── Priority color map ───────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  critical: "#F5424D",
  high:     "#F5A524",
  medium:   "#4F6EF7",
  low:      "#6B7280",
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  data: OwnerBriefingResponse | null;
  loading: boolean;
  error: boolean;
  /** Timestamp when data was last fetched */
  fetchedAt: Date | null;
}

// ─── Action row ───────────────────────────────────────────────────────────────
function ActionRow({ action }: { action: OwnerBriefingAction }) {
  const color = PRIORITY_COLOR[action.priority] ?? "#6B7280";
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
      <div
        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
        style={{ background: color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary leading-snug">{action.title}</p>
        <p className="text-2xs text-muted mt-0.5 leading-relaxed">{action.suggested_next_step}</p>
      </div>
      {action.approval_required && (
        <span className="text-2xs bg-warning/10 text-warning px-1.5 py-0.5 rounded flex-shrink-0">
          Approval
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OwnerBriefingCard({ data, loading, error, fetchedAt }: Props) {
  const isUnavailable = data?.status === "unavailable" || data?.audit_context === "fallback_empty_briefing";

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="mx-5 my-3 p-3.5 rounded-xl"
        style={{ background: "rgba(79,110,247,0.04)", border: "1px solid rgba(79,110,247,0.12)" }}
      >
        <div className="flex items-center gap-1.5 mb-2.5">
          <FiCpu size={11} className="text-accent" />
          <p className="text-2xs font-bold text-accent uppercase tracking-wider">Atlas Intelligence</p>
        </div>
        <div className="flex gap-1.5 items-center">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
          <span className="text-xs text-muted ml-1">Business signals loading...</span>
        </div>
      </div>
    );
  }

  // ── Error state (network/server error) ───────────────────────────────────
  if (error) {
    return (
      <div
        className="mx-5 my-3 p-3.5 rounded-xl"
        style={{ background: "rgba(245,66,77,0.04)", border: "1px solid rgba(245,66,77,0.12)" }}
      >
        <div className="flex items-center gap-1.5">
          <FiAlertTriangle size={11} className="text-danger" />
          <p className="text-2xs font-bold text-danger uppercase tracking-wider">Atlas Intelligence</p>
          <span className="ml-auto text-2xs text-muted">Unavailable</span>
        </div>
        <p className="text-xs text-muted mt-1.5">
          Could not load business signals. Check your connection or try again.
        </p>
      </div>
    );
  }

  // ── Unavailable/fallback state — show clearly, no fake data ──────────────
  if (!data || isUnavailable) {
    return (
      <div
        className="mx-5 my-3 p-3.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-1.5">
          <FiWifiOff size={11} className="text-muted" />
          <p className="text-2xs font-bold text-muted uppercase tracking-wider">Atlas Intelligence</p>
          <span className="ml-auto text-2xs text-muted/60">Offline</span>
        </div>
        <p className="text-xs text-muted mt-1.5">
          AI engine temporarily offline. Use the normal dashboard views.
        </p>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  const visibleActions = data.top_actions.slice(0, 3);
  const cashSection = data.sections.find(s => s.section_id === "cash_receivables");
  const openCount = cashSection?.items.length ?? 0;

  const fetchedTime = fetchedAt
    ? fetchedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      className="mx-5 my-3 rounded-xl overflow-hidden"
      style={{ background: "rgba(79,110,247,0.04)", border: "1px solid rgba(79,110,247,0.15)" }}
    >
      {/* Header */}
      <div className="px-3.5 pt-3 pb-2 flex items-center gap-1.5">
        <FiCpu size={11} className="text-accent" />
        <p className="text-2xs font-bold text-accent uppercase tracking-wider">Atlas Intelligence</p>
        <div className="ml-auto flex items-center gap-1.5">
          <FiCheckCircle size={9} className="text-success" />
          <span className="text-2xs text-muted">{fetchedTime ?? ""}</span>
        </div>
      </div>

      {/* Cash summary strip */}
      {data.cash_summary && (
        <div
          className="mx-3 mb-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <p className="text-xs text-secondary leading-relaxed">{data.cash_summary}</p>
          {openCount > 0 && (
            <p className="text-2xs text-muted mt-0.5">{openCount} invoice(s) shown</p>
          )}
        </div>
      )}

      {/* Top actions */}
      {visibleActions.length > 0 ? (
        <div className="px-3.5 pb-3">
          <p className="text-2xs text-muted uppercase tracking-wider mb-1">Suggested Actions</p>
          {visibleActions.map(a => (
            <ActionRow key={a.action_id} action={a} />
          ))}
          {data.total_actions > 3 && (
            <a
              href="/collections"
              className="flex items-center gap-1 text-2xs text-accent mt-2 hover:opacity-80"
            >
              <FiArrowRight size={10} />
              {data.total_actions - 3} more actions in Collections
            </a>
          )}
        </div>
      ) : (
        <div className="px-3.5 pb-3">
          <p className="text-xs text-muted">No priority actions right now.</p>
        </div>
      )}

      {/* Source badge */}
      <div
        className="px-3.5 py-1.5 flex items-center gap-1.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <span className="text-2xs text-muted/60">
          Source: {data.audit_context === "fallback_empty_briefing" ? "fallback" : "Rust · live"}
          {data.duration_ms > 0 && ` · ${data.duration_ms}ms`}
        </span>
      </div>
    </div>
  );
}
