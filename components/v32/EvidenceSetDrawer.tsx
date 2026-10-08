"use client";

// The Evidence drawer (handoff §10) for the backend's EvidenceSet shape:
// Source → Values → Why → Confidence, each figure labelled with what kind
// of figure it is (fact, calculated, estimate…). Display only.

import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import type { EvidenceSet, EvidenceItem } from "../../packages/contracts/src/features";
import { inrWhole, formatDateTime, formatCount } from "@/lib/format";
import css from "@/components/intelligence/evidence.module.css";

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
        <span className={css.kvLabel}>{label}</span>
        <span className={`${css.kvValue} ${mono ? "num" : ""}`}>{value}</span>
      </div>
      {note && <div className={css.kvNote}>{note}</div>}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={css.group}>
      <div className={css.groupHead}><h3 className="section-label" style={{ margin: 0 }}>{label}</h3></div>
      <div style={{ borderTop: "1px solid var(--line)" }}>{children}</div>
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
      eyebrow={<span className="section-label" style={{ margin: 0 }}>Evidence</span>}
      titleSize={18}
      subtitle={record}
      footer="Every figure in Starlane traces back to its source record here."
    >
      <Section label="Source">
        <Row label="System" value={(evidence?.sources || []).map((s) => SOURCE[s] || s).join(", ") || "—"} />
        {when && <Row label="Computed" value={when} mono />}
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
          <p className={css.prose} style={{ paddingTop: 8 }}>{evidence.summary}</p>
        </Section>
      )}
      {children}
    </Drawer>
  );
}
