import React from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "muted" | "gold";

interface BadgeProps { children: React.ReactNode; variant?: BadgeVariant; className?: string; }

// Older call sites use Badge; it now draws the shared status chip.
const TO_TONE: Record<BadgeVariant, StatusTone> = {
  default: "neutral", success: "positive", warning: "attention", danger: "critical",
  accent: "info", muted: "unknown", gold: "attention",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return <StatusChip tone={TO_TONE[variant]} className={className}>{children}</StatusChip>;
}

export function ScoreBadge({ score }: { score: number }) {
  const tone: StatusTone = score >= 70 ? "positive" : score >= 40 ? "attention" : "critical";
  return <StatusChip tone={tone}><span className="tabular-nums">{score}%</span></StatusChip>;
}

/** The one status language: positive, attention, critical, info, neutral,
 *  and unknown (we don't have the data yet, never shown as good). */
export type StatusTone = "positive" | "attention" | "critical" | "info" | "neutral" | "unknown";

export function StatusChip({ tone = "neutral", children, className = "", title }: { tone?: StatusTone; children: React.ReactNode; className?: string; title?: string }) {
  const cls = tone === "neutral" ? "chip" : `chip chip-${tone}`;
  return <span className={`${cls} ${className}`} title={title}>{children}</span>;
}

/** Map the many backend status words onto the one status language. */
export function toneForStatus(status: string | null | undefined): StatusTone {
  const s = String(status || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (!s || s === "unknown" || s === "not_reported" || s === "pending_data") return "unknown";
  if (/(fail|error|overdue|critical|broken|blocked|rejected|revoked|disputed|high_risk|breach)/.test(s)) return "critical";
  if (/(warn|delay|stale|attention|at_risk|due|pending|review|awaiting|paused|medium)/.test(s)) return "attention";
  if (/(ok|healthy|paid|done|complete|success|approved|active|connected|on_track|verified|resolved|low_risk)/.test(s)) return "positive";
  if (/(running|syncing|draft|new|scheduled|queued|info)/.test(s)) return "info";
  return "neutral";
}
