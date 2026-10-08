"use client";

// The Evidence drawer (handoff §10) for the backend's EvidenceSet shape:
// Source → Values → Why → Confidence, each figure labelled with what kind
// of figure it is (fact, calculated, estimate…). Display only.

import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import type { EvidenceSet, EvidenceItem } from "../../packages/contracts/src/features";
import { inrWhole, formatDateTime, formatCount } from "@/lib/format";

const KIND: Record<string, string> = { fact: "Fact", calculated: "Calculated", assumption: "Assumption", estimate: "Estimate", model: "Model" };
const SOURCE: Record<string, string> = { invoices: "Invoices in Starlane", payments: "Payments", tally: "Tally", your_books: "Your books" };

export function showValue(v: unknown, unit?: string): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return unit === "INR" ? inrWhole(v) : formatCount(v);
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function Row({ label, value, mono, note }: { label: string; value: React.ReactNode; mono?: boolean; note?: string }) {
  return (
    <div style={{ padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
      <div className="flex items-baseline justify-between gap-4">
        <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{label}</span>
        <span className="text-right" style={{ fontSize: 13, color: "var(--ink)", fontVariantNumeric: mono ? "tabular-nums" : undefined }}>{value}</span>
      </div>
      {note && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{note}</div>}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

export function EvidenceSetDrawer({ title, record, evidence, onClose, children }: {
  title: string;
  record?: string;
  evidence: EvidenceSet | null | undefined;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const facts: EvidenceItem[] = evidence?.facts || [];
  const when = evidence?.computedAt ? formatDateTime(evidence.computedAt) : null;
  return (
    <Drawer
      titleId="evidence-set-drawer-title"
      title={title}
      onClose={onClose}
      eyebrow="Evidence"
      titleSize={19}
      subtitle={record ? <span style={{ fontSize: 12.5 }}>{record}</span> : undefined}
      footer="Every figure in Starlane traces back to its source record here."
    >
      <Section label="Source">
        <Row label="System" value={(evidence?.sources || []).map((s) => SOURCE[s] || s).join(", ") || "—"} />
        {when && <Row label="Computed" value={when} />}
        {evidence?.method && <Row label="Method" value={evidence.method} />}
      </Section>
      {facts.length > 0 && (
        <Section label="Values">
          {facts.map((f, i) => (
            <Row key={`${f.label}-${i}`} label={f.label} value={showValue(f.value, f.unit)} mono={typeof f.value === "number"} note={[KIND[f.kind] || f.kind, f.note].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}
      {evidence?.summary && (
        <Section label="Why this supports the conclusion">
          <p style={{ fontSize: 13, color: "var(--body)", lineHeight: 1.6 }}>{evidence.summary}</p>
        </Section>
      )}
      {children}
    </Drawer>
  );
}
