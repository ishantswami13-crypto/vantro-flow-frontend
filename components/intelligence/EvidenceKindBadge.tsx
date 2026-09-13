import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { EvidenceKind } from "@/lib/api";

// Never blur these — this mapping is the entire point of the evidence
// chain: a reader must be able to tell a fact from an assumption from a
// forecast at a glance, not by reading carefully.
const KIND_LABEL: Record<EvidenceKind, string> = {
  OBSERVED_FACT: "Observed",
  CALCULATED_FACT: "Calculated",
  ASSUMPTION: "Assumption",
  FORECAST: "Forecast",
  EXTERNAL_EVIDENCE: "External",
  INTERNAL_EVIDENCE: "Internal",
};

const KIND_VARIANT: Record<EvidenceKind, "success" | "accent" | "warning" | "default" | "muted"> = {
  OBSERVED_FACT: "success",
  CALCULATED_FACT: "accent",
  ASSUMPTION: "warning",
  FORECAST: "warning",
  EXTERNAL_EVIDENCE: "default",
  INTERNAL_EVIDENCE: "muted",
};

export function EvidenceKindBadge({ kind }: { kind: EvidenceKind }) {
  return <Badge variant={KIND_VARIANT[kind]}>{KIND_LABEL[kind]}</Badge>;
}

export function ConfidenceBadge({ level }: { level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" }) {
  if (level === "UNKNOWN") return <Badge variant="muted">Confidence unknown</Badge>;
  const variant = level === "HIGH" ? "success" : level === "MEDIUM" ? "warning" : "danger";
  return <Badge variant={variant}>{level} confidence</Badge>;
}
