"use client";

import type {
  OwnerBriefingResponse,
  OwnerBriefingAction,
  OwnerBriefingEvidenceContract,
  AgentClaim,
  AgentRecommendation,
} from "@/lib/api";
import {
  FiAlertTriangle, FiArrowRight, FiCheckCircle, FiCpu,
  FiWifiOff, FiShield, FiDatabase, FiInfo,
} from "react-icons/fi";

// ─── Priority / risk colour map ───────────────────────────────────────────────
const RISK_COLOR: Record<string, string> = {
  critical: "#F5424D",
  high:     "#F5A524",
  medium:   "#4F6EF7",
  low:      "#6B7280",
};

function confidenceLabel(c: number): string {
  if (c >= 0.9) return "High";
  if (c >= 0.65) return "Medium";
  return "Low";
}
function confidenceColor(c: number): string {
  if (c >= 0.9) return "#22C55E";
  if (c >= 0.65) return "#F5A524";
  return "#F5424D";
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  data: OwnerBriefingResponse | null;
  loading: boolean;
  error: boolean;
  fetchedAt: Date | null;
}

// ─── Legacy action row (Phase 2C.8 actions without evidence contract) ─────────
function ActionRow({ action }: { action: OwnerBriefingAction }) {
  const color = RISK_COLOR[action.priority] ?? "#6B7280";
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
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

// ─── Verified claim row ───────────────────────────────────────────────────────
function ClaimRow({ claim }: { claim: AgentClaim }) {
  const color = RISK_COLOR[claim.risk_level ?? "low"] ?? "#6B7280";
  const confColor = confidenceColor(claim.confidence);
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-primary leading-snug">{claim.claim}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-2xs" style={{ color: confColor }}>
            {confidenceLabel(claim.confidence)} confidence
          </span>
          {claim.evidence_ids.length > 0 && (
            <span className="text-2xs text-muted flex items-center gap-0.5">
              <FiDatabase size={9} />
              {claim.evidence_ids.length} source{claim.evidence_ids.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Recommendation row ───────────────────────────────────────────────────────
function RecRow({ rec }: { rec: AgentRecommendation }) {
  const color = RISK_COLOR[rec.risk_level] ?? "#6B7280";
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary leading-snug">{rec.title}</p>
        <p className="text-2xs text-muted mt-0.5 leading-relaxed">{rec.description}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {rec.requires_human_approval && (
          <span className="text-2xs bg-warning/10 text-warning px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <FiShield size={8} /> Approval
          </span>
        )}
        <span className="text-2xs text-muted/50">Auto: off</span>
      </div>
    </div>
  );
}

// ─── Evidence contract panel ──────────────────────────────────────────────────
function EvidenceContractPanel({ ec }: { ec: OwnerBriefingEvidenceContract }) {
  const safeClaims = ec.claims.filter(c => c.safe_to_show_claim);
  const safeRecs   = ec.recommendations;

  return (
    <div className="px-3.5 pb-3">
      {/* Summary */}
      <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
        <p className="text-xs text-secondary leading-relaxed">{ec.summary}</p>
      </div>

      {/* Confidence + evidence count bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: confidenceColor(ec.confidence) }} />
          <span className="text-2xs text-muted">
            {confidenceLabel(ec.confidence)} confidence ({Math.round(ec.confidence * 100)}%)
          </span>
        </div>
        <span className="text-2xs text-muted flex items-center gap-0.5">
          <FiDatabase size={9} />
          {ec.evidence.length} evidence source{ec.evidence.length !== 1 ? "s" : ""}
        </span>
        {ec.blocked_claim_count > 0 && (
          <span className="text-2xs text-warning flex items-center gap-0.5">
            <FiInfo size={9} />
            {ec.blocked_claim_count} blocked
          </span>
        )}
      </div>

      {/* Safe claims */}
      {safeClaims.length > 0 && (
        <div className="mb-3">
          <p className="text-2xs text-muted uppercase tracking-wider mb-1">Verified signals</p>
          {safeClaims.slice(0, 4).map(c => <ClaimRow key={c.id} claim={c} />)}
        </div>
      )}

      {/* Recommendations */}
      {safeRecs.length > 0 && (
        <div>
          <p className="text-2xs text-muted uppercase tracking-wider mb-1">Suggested actions</p>
          {safeRecs.slice(0, 3).map(r => <RecRow key={r.id} rec={r} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OwnerBriefingCard({ data, loading, error, fetchedAt }: Props) {
  const isUnavailable = data?.status === "unavailable" || data?.audit_context === "fallback_empty_briefing";
  const ec = data?.evidence_contract;
  const hasVerifiedEvidence = ec ? ec.safe_to_show && ec.evidence.length > 0 : null;

  // ── Loading state ──────────────────────────────────────────────────────────
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

  // ── Error state ────────────────────────────────────────────────────────────
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

  // ── Unavailable / Rust fallback state ──────────────────────────────────────
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

  // ── No verified evidence state (evidence contract present but safe_to_show=false) ──
  if (ec && !ec.safe_to_show) {
    return (
      <div
        className="mx-5 my-3 p-3.5 rounded-xl"
        style={{ background: "rgba(79,110,247,0.03)", border: "1px solid rgba(79,110,247,0.10)" }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <FiCpu size={11} className="text-accent/60" />
          <p className="text-2xs font-bold text-accent/60 uppercase tracking-wider">Atlas Intelligence</p>
          <span className="ml-auto text-2xs text-muted/60">Building evidence</span>
        </div>
        <p className="text-xs text-secondary leading-relaxed">
          No verified evidence yet. Add invoices, customers, payments, sales, or business
          activity so Atlas can generate a safe briefing.
        </p>
        {ec.fallback_reason && (
          <p className="text-2xs text-muted/50 mt-1">
            Reason: {ec.fallback_reason.replace(/_/g, ' ').toLowerCase()}
          </p>
        )}
      </div>
    );
  }

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

      {/* Evidence contract panel (when available and safe) */}
      {ec && ec.safe_to_show ? (
        <EvidenceContractPanel ec={ec} />
      ) : (
        <>
          {/* Legacy cash summary strip (no evidence contract) */}
          {data.cash_summary && (
            <div className="mx-3 mb-2 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-xs text-secondary leading-relaxed">{data.cash_summary}</p>
            </div>
          )}

          {/* Legacy top actions */}
          {data.top_actions.length > 0 ? (
            <div className="px-3.5 pb-3">
              <p className="text-2xs text-muted uppercase tracking-wider mb-1">Suggested Actions</p>
              {data.top_actions.slice(0, 3).map(a => <ActionRow key={a.action_id} action={a} />)}
              {data.total_actions > 3 && (
                <a href="/collections" className="flex items-center gap-1 text-2xs text-accent mt-2 hover:opacity-80">
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
        </>
      )}

      {/* Source / evidence badge */}
      <div className="px-3.5 py-1.5 flex items-center gap-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-2xs text-muted/60">
          {ec
            ? `Evidence contract v${ec.contract_version ?? "?"} · ${ec.evidence.length} sources · ${Math.round((ec.confidence ?? 0) * 100)}% confidence`
            : `Source: ${data.audit_context === "fallback_empty_briefing" ? "fallback" : "Rust · live"}${data.duration_ms > 0 ? ` · ${data.duration_ms}ms` : ""}`
          }
        </span>
      </div>
    </div>
  );
}
