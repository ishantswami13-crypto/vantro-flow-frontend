"use client";

import Link from "next/link";
import type {
  OwnerBriefingResponse,
  OwnerBriefingAction,
  OwnerBriefingEvidenceContract,
  AgentClaim,
  AgentRecommendation,
} from "@/lib/api";
import { formatClock, formatCount } from "@/lib/format";
import { StatusChip, type StatusTone } from "@/components/ui/Badge";
import { IconArrowRight, IconSparkle } from "@/components/v32/icons";
import { plain } from "@/components/os/bridge/kit";

// The owner briefing (Rust sidecar behind the RAG evidence contract). Only
// critical and high risk read as alarming; medium and low stay neutral.
const RISK_TONE: Record<string, StatusTone> = { critical: "critical", high: "attention", medium: "neutral", low: "neutral" };
const RISK_LABEL: Record<string, string> = { critical: "Critical", high: "High" };

function confidence(c: number): { label: string; tone: StatusTone } {
  if (c >= 0.9) return { label: "High confidence", tone: "positive" };
  if (c >= 0.65) return { label: "Medium confidence", tone: "attention" };
  return { label: "Low confidence", tone: "critical" };
}

interface Props {
  data: OwnerBriefingResponse | null;
  loading: boolean;
  error: boolean;
  fetchedAt: Date | null;
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="mx-5 my-3" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }} aria-label="Owner briefing">
      <div className="flex items-center" style={{ gap: 8, padding: "14px 18px 0" }}>
        <span aria-hidden="true" className="inline-flex" style={{ color: "var(--ink-2)" }}><IconSparkle size={14} /></span>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Today&apos;s briefing</h2>
        {right && <span className="ml-auto inline-flex items-center" style={{ gap: 8 }}>{right}</span>}
      </div>
      <div style={{ padding: "10px 18px 16px" }}>{children}</div>
    </section>
  );
}

function Line({ title, body, chip }: { title: string; body?: string | null; chip?: React.ReactNode }) {
  return (
    <div className="flex items-start" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid var(--line)" }}>
      <div className="flex-1 min-w-0">
        <p className="tabular-nums" style={{ margin: 0, fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>{plain(title)}</p>
        {body && <p className="tabular-nums" style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{plain(body)}</p>}
      </div>
      {chip && <span className="shrink-0 flex items-center" style={{ gap: 6 }}>{chip}</span>}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "12px 0 4px", fontSize: 12, color: "var(--ink-3)" }}>{children}</p>;
}

function ActionRow({ action }: { action: OwnerBriefingAction }) {
  const risk = RISK_LABEL[action.priority];
  return (
    <Line
      title={action.title}
      body={action.suggested_next_step}
      chip={<>
        {risk && <StatusChip tone={RISK_TONE[action.priority]}>{risk}</StatusChip>}
        {action.approval_required && <StatusChip tone="info">Needs approval</StatusChip>}
      </>}
    />
  );
}

function ClaimRow({ claim }: { claim: AgentClaim }) {
  const c = confidence(claim.confidence);
  const n = claim.evidence_ids.length;
  return (
    <Line
      title={claim.claim}
      body={`${c.label}${n > 0 ? ` · ${formatCount(n)} source${n === 1 ? "" : "s"}` : ""}`}
      chip={RISK_LABEL[claim.risk_level ?? "low"] ? <StatusChip tone={RISK_TONE[claim.risk_level ?? "low"]}>{RISK_LABEL[claim.risk_level ?? "low"]}</StatusChip> : null}
    />
  );
}

function RecRow({ rec }: { rec: AgentRecommendation }) {
  return (
    <Line
      title={rec.title}
      body={rec.description}
      chip={<>
        {RISK_LABEL[rec.risk_level] && <StatusChip tone={RISK_TONE[rec.risk_level]}>{RISK_LABEL[rec.risk_level]}</StatusChip>}
        {rec.requires_human_approval && <StatusChip tone="info">Needs approval</StatusChip>}
      </>}
    />
  );
}

function EvidencePanel({ ec }: { ec: OwnerBriefingEvidenceContract }) {
  const claims = ec.claims.filter((c) => c.safe_to_show_claim);
  return (
    <>
      <p className="tabular-nums" style={{ margin: 0, fontSize: 13.5, color: "var(--body)", lineHeight: 1.6 }}>{plain(ec.summary)}</p>
      {claims.length > 0 && (
        <>
          <SubLabel>What the books show</SubLabel>
          {claims.slice(0, 4).map((c) => <ClaimRow key={c.id} claim={c} />)}
        </>
      )}
      {ec.recommendations.length > 0 && (
        <>
          <SubLabel>Suggested next steps</SubLabel>
          {ec.recommendations.slice(0, 3).map((r) => <RecRow key={r.id} rec={r} />)}
        </>
      )}
      <p className="tabular-nums" style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ink-3)" }}>
        Based on {formatCount(ec.evidence.length)} source{ec.evidence.length === 1 ? "" : "s"}
        {ec.blocked_claim_count > 0 ? ` · ${formatCount(ec.blocked_claim_count)} unsupported point${ec.blocked_claim_count === 1 ? "" : "s"} left out` : ""}
      </p>
    </>
  );
}

export default function OwnerBriefingCard({ data, loading, error, fetchedAt }: Props) {
  const isUnavailable = data?.status === "unavailable" || data?.audit_context === "fallback_empty_briefing";
  const ec = data?.evidence_contract;

  if (loading) {
    return (
      <Shell>
        <div role="status" aria-busy="true" aria-label="Loading" className="flex flex-col" style={{ gap: 8 }}>
          <div className="skeleton h-3 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>Couldn&apos;t reach Starlane for today&apos;s briefing. Check your connection and refresh to try again.</p>
      </Shell>
    );
  }

  if (!data || isUnavailable) {
    return (
      <Shell right={<StatusChip tone="unknown">Not available</StatusChip>}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>The briefing isn&apos;t available right now. Everything else on this page is read straight from your books.</p>
      </Shell>
    );
  }

  if (ec && !ec.safe_to_show) {
    return (
      <Shell right={<StatusChip tone="unknown">Not enough data yet</StatusChip>}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
          Starlane only briefs from evidence it can check. Add invoices, customers, payments or sales and the briefing appears here.
        </p>
      </Shell>
    );
  }

  const conf = ec && ec.safe_to_show ? confidence(ec.confidence) : null;
  return (
    <Shell right={<>
      {conf && <StatusChip tone={conf.tone}>{conf.label}</StatusChip>}
      {fetchedAt && <span className="tabular-nums" style={{ fontSize: 12, color: "var(--ink-3)" }}>{formatClock(fetchedAt)}</span>}
    </>}>
      {ec && ec.safe_to_show ? (
        <EvidencePanel ec={ec} />
      ) : (
        <>
          {data.cash_summary && <p className="tabular-nums" style={{ margin: 0, fontSize: 13.5, color: "var(--body)", lineHeight: 1.6 }}>{plain(data.cash_summary)}</p>}
          {data.top_actions.length > 0 ? (
            <>
              <SubLabel>Suggested next steps</SubLabel>
              {data.top_actions.slice(0, 3).map((a) => <ActionRow key={a.action_id} action={a} />)}
              {data.total_actions > 3 && (
                <Link href="/collections" className="hover-dim inline-flex items-center" style={{ gap: 4, marginTop: 10, fontSize: 12.5, color: "var(--ink-2)" }}>
                  {formatCount(data.total_actions - 3)} more in Collections<IconArrowRight size={12} />
                </Link>
              )}
            </>
          ) : (
            <p style={{ margin: data.cash_summary ? "10px 0 0" : 0, fontSize: 13, color: "var(--ink-2)" }}>No priority actions right now.</p>
          )}
        </>
      )}
    </Shell>
  );
}
