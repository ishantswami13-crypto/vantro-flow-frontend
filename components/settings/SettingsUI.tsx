"use client";

import React from "react";
import Button from "@/components/ui/Button";
import { IconCheck } from "@/components/v32/icons";

// Building blocks for the Settings sections: one section per topic on the
// shared canvas (small tracked label, a line of description, fields), a
// segmented control, a switch and a footer row with the section's one save
// action. No boxes: hairlines and spacing carry the structure.

export function Panel({ title, description, children, footer, id }: {
  title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; id?: string;
}) {
  return (
    <section aria-labelledby={id} className="set-panel">
      <div style={{ marginBottom: 16 }}>
        <h2 id={id} className="section-label" style={{ margin: 0 }}>{title}</h2>
        {description && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 620 }}>{description}</p>}
      </div>
      <div>{children}</div>
      {footer && (
        <div className="flex items-center justify-end flex-wrap" style={{ gap: 10, marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          {footer}
        </div>
      )}
    </section>
  );
}

/** A sub-heading inside a panel, separated by a hairline. */
export function Group({ title, hint, children, first }: { title: string; hint?: React.ReactNode; children: React.ReactNode; first?: boolean }) {
  return (
    <div style={{ borderTop: first ? "none" : "1px solid var(--line)", paddingTop: first ? 0 : 20, marginTop: first ? 0 : 20 }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{title}</div>
      {hint && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.5 }}>{hint}</div>}
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

export function Fields({ children }: { children: React.ReactNode }) {
  return <div className="set-fields">{children}</div>;
}

export function Field({ label, htmlFor, hint, children, wide }: { label: string; htmlFor: string; hint?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "set-wide" : undefined} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <label htmlFor={htmlFor} style={{ fontSize: 12, color: "var(--ink-2)" }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>{hint}</span>}
    </div>
  );
}

/** Input with a fixed prefix (+91). */
export function Prefixed({ prefix, children }: { prefix: string; children: React.ReactNode }) {
  return (
    <div className="flex items-stretch" style={{ minWidth: 0 }}>
      <span aria-hidden="true" className="inline-flex items-center tabular-nums" style={{ padding: "0 10px", fontSize: 13, color: "var(--ink-3)", border: "1px solid var(--line-input)", borderRight: "none", borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)", background: "var(--surface-2)" }}>{prefix}</span>
      <div className="flex-1 min-w-0 set-prefixed">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="set-seg">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange} className="set-switch" />
  );
}

/** Footer: inline status on the left of the one save action. */
export function SaveBar({ saving, saved, error, label, disabled, extra }: {
  saving: boolean; saved: boolean; error?: string | null; label: string; disabled?: boolean; extra?: React.ReactNode;
}) {
  return (
    <>
      {error && <span role="alert" style={{ fontSize: 12.5, color: "var(--critical)", marginRight: "auto", lineHeight: 1.5 }}>{error}</span>}
      {!error && saved && (
        <span role="status" className="inline-flex items-center" style={{ gap: 6, fontSize: 12.5, color: "var(--positive)", marginRight: "auto" }}>
          <IconCheck size={13} /> Saved
        </span>
      )}
      {extra}
      <Button type="submit" variant="primary" loading={saving} disabled={disabled}>{label}</Button>
    </>
  );
}

/** Shared styles for the Settings page; rendered once. */
export function SettingsStyles() {
  return (
    <style>{`
      .set-layout { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); align-items: start; }
      @media (min-width: 900px) { .set-layout { grid-template-columns: 184px minmax(0, 720px); gap: 48px; } }
      .set-nav { display: flex; gap: 2px; overflow-x: auto; border-bottom: 1px solid var(--line); scrollbar-width: none; }
      .set-nav::-webkit-scrollbar { display: none; }
      .set-nav button { background: none; border-top: none; border-left: none; border-right: none; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 10px; white-space: nowrap; font-size: 13px; color: var(--ink-2); padding: 8px 10px; border-radius: 6px 6px 0 0; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: background-color var(--dur-instant) var(--ease), color var(--dur-instant) var(--ease); }
      .set-nav button[aria-current="page"] { color: var(--ink); border-bottom-color: var(--accent); }
      .set-nav button:hover { color: var(--ink); }
      .set-nav .set-on { margin-left: auto; font-size: 11px; color: var(--ink-3); }
      @media (min-width: 900px) {
        .set-nav { flex-direction: column; border-bottom: none; position: sticky; top: 16px; margin-left: -10px; }
        .set-nav button { border-radius: 6px; border-bottom: none; margin: 0; padding: 0 10px; height: 30px; }
        .set-nav button[aria-current="page"] { background: rgb(var(--tk-ink) / 0.055); font-weight: 500; }
        .set-nav button:hover:not([aria-current="page"]) { background: var(--surface-2); }
      }
      .set-stack { display: flex; flex-direction: column; gap: 40px; }
      .set-fields { display: grid; gap: 14px 16px; grid-template-columns: minmax(0, 1fr); }
      @media (min-width: 640px) { .set-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); } .set-wide { grid-column: 1 / -1; } }
      .set-prefixed .ui-input { border-top-left-radius: 0; border-bottom-left-radius: 0; }
      .ui-input[readonly] { color: var(--ink-2); background: var(--surface-2); }
      select.ui-input { appearance: auto; padding-right: 8px; }
      .set-seg { display: inline-flex; padding: 2px; border-radius: 8px; background: transparent; box-shadow: inset 0 0 0 1px var(--line); max-width: 100%; overflow-x: auto; }
      .set-seg button { height: 26px; padding: 0 12px; font-size: 12.5px; border-radius: 6px; color: var(--ink-2); background: none; border: none; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; transition: color var(--dur-instant) var(--ease); }
      .set-seg button:hover { color: var(--ink); }
      .set-seg button[aria-checked="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 0 0 1px var(--line-card); }
      .set-switch { position: relative; width: 32px; height: 18px; border-radius: 9px; flex-shrink: 0; cursor: pointer; border: none;
        background: rgb(var(--tk-ink) / 0.16); transition: background-color var(--dur-fast, 160ms) var(--ease, ease); }
      .set-switch::after { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 7px; background: var(--surface);
        box-shadow: 0 1px 2px rgba(0,0,0,0.25); transition: transform var(--dur-fast, 160ms) var(--ease, ease); }
      .set-switch[aria-checked="true"] { background: var(--ink); }
      .set-switch[aria-checked="true"]::after { transform: translateX(14px); background: var(--bg); }
      .set-switch:disabled { opacity: 0.5; cursor: default; }
      .set-layout input[type="radio"] { accent-color: var(--ink); width: 14px; height: 14px; flex-shrink: 0; }
      .set-list { border-top: 1px solid var(--line); }
      .set-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; min-height: 52px; border-bottom: 1px solid var(--line); }
      .set-choice { display: flex; align-items: center; gap: 12px; padding: 10px 0; min-height: 42px; border-bottom: 1px solid var(--line); cursor: pointer;
        transition: background-color var(--dur-instant) var(--ease), box-shadow var(--dur-instant) var(--ease); }
      .set-choice:hover { background: var(--surface-2); box-shadow: -10px 0 0 var(--surface-2), 10px 0 0 var(--surface-2); }
      .set-note { margin: 0; padding: 2px 0 2px 12px; box-shadow: inset 2px 0 0 var(--line-strong); }
    `}</style>
  );
}
