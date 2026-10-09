"use client";

import React, { useEffect, useState } from "react";
import { api, Watch, WatchConditionConfig } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { METRIC_OPTIONS, OPERATOR_OPTIONS } from "./conditions";
import { inrWhole, formatCount } from "@/lib/format";

/** Create a watch condition (POST /api/watches). */
export function NewWatchModal({ open, onClose, onCreated, prefillMetric, prefillEntity }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillMetric?: string | null;
  prefillEntity?: string | null;
}) {
  const initialMetric = (METRIC_OPTIONS.find((m) => m.value === prefillMetric)?.value as Watch["metric_key"] | undefined) || "receivables_overdue_amount";
  const [name, setName] = useState(prefillEntity ? `${prefillEntity} exposure` : "");
  const [metricKey, setMetricKey] = useState<Watch["metric_key"]>(initialMetric);
  const [operator, setOperator] = useState<WatchConditionConfig["operator"]>("gte");
  const [threshold, setThreshold] = useState("");
  const [entityName, setEntityName] = useState(prefillEntity || "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Start in the name field. The dialog focuses its first control (the close
  // button) on open, so move focus once that has happened.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => document.getElementById("nw-name")?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const metric = METRIC_OPTIONS.find((m) => m.value === metricKey);
  const needsEntity = metric?.needsEntity;
  // The sentence Starlane will check, read back from the form as typed.
  const t = threshold.trim() === "" ? NaN : Number(threshold);
  const preview = Number.isFinite(t)
    ? `${metric?.short || ""}${needsEntity && entityName.trim() ? ` for ${entityName.trim()}` : ""} ${OPERATOR_OPTIONS.find((o) => o.value === operator)?.short || ""} ${metric?.unit === "days" ? `${formatCount(t)} days` : inrWhole(t)}`
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const n = Number(threshold);
    if (!name.trim()) return setFormError("Give the watch a name.");
    // Number("") is 0, so an empty box would silently become a threshold of 0.
    if (!threshold.trim()) return setFormError("Enter a threshold.");
    if (Number.isNaN(n)) return setFormError("The threshold must be a number.");
    if (needsEntity && !entityName.trim()) return setFormError("Enter the customer this watch is about.");
    setSaving(true);
    try {
      const condition_config: WatchConditionConfig = { operator, threshold: n };
      if (needsEntity) condition_config.entity_name = entityName.trim();
      await api.watches.create({ name: name.trim(), metric_key: metricKey, condition_config });
      onCreated();
    } catch {
      setFormError("Couldn't create the watch. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New watch"
      description="Starlane checks the condition against your live data every 15 minutes and tells you when it is met."
      width={460}
      footer={
        <>
          <button type="button" onClick={onClose} className="ui-btn ui-btn-secondary">Cancel</button>
          <button type="submit" form="new-watch-form" disabled={saving} className="ui-btn ui-btn-primary">{saving ? "Creating…" : "Create watch"}</button>
        </>
      }
    >
      <form id="new-watch-form" onSubmit={submit} className="flex flex-col" style={{ gap: 14 }}>
        <Field label="Name" htmlFor="nw-name">
          <input id="nw-name" className="ui-input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Overdue above ₹5 lakh" maxLength={120} />
        </Field>
        <Field label="What to watch" htmlFor="nw-metric">
          <select id="nw-metric" className="ui-input w-full" value={metricKey} onChange={(e) => setMetricKey(e.target.value as Watch["metric_key"])}>
            {METRIC_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        {needsEntity && (
          <Field label="Customer" htmlFor="nw-entity">
            <input id="nw-entity" className="ui-input w-full" value={entityName} onChange={(e) => setEntityName(e.target.value)} placeholder="Customer name, as in your books" />
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
          <Field label="Condition" htmlFor="nw-op">
            <select id="nw-op" className="ui-input w-full" value={operator} onChange={(e) => setOperator(e.target.value as WatchConditionConfig["operator"])}>
              {OPERATOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label={metric?.unit === "days" ? "Threshold (days)" : "Threshold (₹)"} htmlFor="nw-th">
            <input id="nw-th" className="ui-input w-full num" type="number" inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder={metric?.unit === "days" ? "45" : "500000"} />
          </Field>
        </div>
        <p aria-live="polite" style={{ margin: 0, padding: "10px 0 0", borderTop: "1px solid var(--line)", fontSize: 12.5, color: preview ? "var(--body)" : "var(--ink-3)" }}>
          {preview ? <>Raises when <span style={{ color: "var(--ink)" }}>{preview}</span>.</> : "Enter a threshold to see the condition."}
        </p>
        {formError && <p role="alert" style={{ margin: 0, fontSize: 12.5, color: "var(--critical)" }}>{formError}</p>}
      </form>
    </Modal>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-w-0" style={{ gap: 6 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>{label}</label>
      {children}
    </div>
  );
}
