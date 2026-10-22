"use client";

// The Evidence drawer for one decision: every item the engine recorded,
// grouped by what kind of claim it is, with its source record, when it was
// observed and how it was calculated. Display only; nothing here is
// inferred on the client.

import React from "react";
import { Drawer } from "@/components/ui/Drawer";
import { EVIDENCE_LABEL, type Decision } from "@/lib/decisions";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { amount, prettyDates } from "@/components/os/prepared/kit";
import css from "@/components/intelligence/evidence.module.css";

const ORDER = ["OBSERVED_FACT", "CALCULATED_FACT", "OBSERVED_ASSOCIATION", "SIMULATED", "ASSUMPTION"];
const TABLE_LABEL: Record<string, string> = { invoices: "Invoices", payments: "Payments", disputes: "Disputes", customers: "Customers" };

function shortId(id?: string): string | null {
  if (!id) return null;
  return id.length > 10 ? id.slice(0, 8) : id;
}

export function DecisionEvidenceDrawer({ d, onClose }: { d: Decision; onClose: () => void }) {
  const kinds = Array.from(new Set([...ORDER.filter((k) => d.evidence.some((e) => e.kind === k)), ...d.evidence.map((e) => e.kind)]));
  const sources = new Set(d.evidence.map((e) => e.source?.table).filter(Boolean) as string[]);
  return (
    <Drawer
      titleId="decision-evidence-title"
      title="Why Starlane recommends this"
      eyebrow={<span className="section-label" style={{ margin: 0 }}>Evidence</span>}
      titleSize={18}
      subtitle={d.title}
      onClose={onClose}
      footer="Conclusion → analysis → evidence → source record. Every figure on the decision traces back to here."
    >
      <div className={css.stats}>
        <span><b>{d.evidence.length}</b> item{d.evidence.length === 1 ? "" : "s"}</span>
        {sources.size > 0 && <span>From {Array.from(sources).map((t) => TABLE_LABEL[t] || t).join(", ").toLowerCase()}</span>}
        {d.asOf && <span>Data as of {formatDate(d.asOf)}</span>}
        <span title={formatDateTime(d.updatedAt)}>Analysed {formatRelative(d.updatedAt)}</span>
      </div>

      {kinds.map((kind) => {
        const items = d.evidence.filter((e) => e.kind === kind);
        return (
          <div key={kind} className={css.group}>
            <div className={css.groupHead}>
              <h3 className="section-label" style={{ margin: 0 }}>{EVIDENCE_LABEL[kind] || kind}</h3>
              <span className={css.count}>{items.length}</span>
            </div>
            <ul className={css.items}>
              {items.map((e, i) => {
                const src = e.source;
                const ref = shortId(src?.id || src?.invoiceId);
                return (
                  <li key={`${kind}-${i}`} className={css.item}>
                    <div className={css.head}>
                      <span className={css.label}>{e.label}</span>
                      {typeof e.value === "number" && Number.isFinite(e.value) && <span className={css.value}>{amount(e.value, d.currency)}</span>}
                    </div>
                    <p className={css.detail}>{prettyDates(e.detail)}</p>
                    {e.calculation && <p className={css.calc}><span>Calculation</span>{e.calculation}</p>}
                    {(src?.table || ref || e.observedAt) && (
                      <div className={css.src}>
                        {src?.table && <span className={css.kind}>{TABLE_LABEL[src.table] || src.table}</span>}
                        {ref && <span className={css.ref} title={src?.id || src?.invoiceId}>{ref}</span>}
                        {e.observedAt && <span title={formatDateTime(e.observedAt)}>observed {formatRelative(e.observedAt)}</span>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {d.assumptions.length > 0 && (
        <div className={css.group}>
          <div className={css.groupHead}>
            <h3 className="section-label" style={{ margin: 0 }}>Assumptions</h3>
            <span className={css.count}>{d.assumptions.length}</span>
          </div>
          <ul className={css.items}>
            {d.assumptions.map((a, i) => (
              <li key={i} className={css.item}>
                <span className={css.label} style={{ fontWeight: 400 }}>{a.label}</span>
                {(a.detail || a.basis) && <p className={css.detail} style={{ color: "var(--ink-3)" }}>{a.detail || a.basis}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(d.analysis?.method) && (
        <div className={css.group}>
          <div className={css.groupHead}><h3 className="section-label" style={{ margin: 0 }}>Method</h3></div>
          <ul className={css.items}>
            {(d.analysis?.method as string[]).map((m, i) => <li key={i} className={css.item}><p className={css.detail} style={{ margin: 0 }}>{m}</p></li>)}
            {d.modelVersions && (
              <li className={css.item}><div className={css.src} style={{ marginTop: 0 }}>{Object.values(d.modelVersions).map((v) => <span key={String(v)} className={css.ref}>{String(v)}</span>)}</div></li>
            )}
          </ul>
        </div>
      )}
    </Drawer>
  );
}
