"use client";

import { StepRail } from "@/components/hv/Pieces";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button, Card, EmptyLine, ErrorBanner, SkeletonRows, StatusDot, Subnav, V } from "@/components/v32/ui";
import { IconPlus, IconTrash, IconArrowRight } from "@/components/v32/icons";
import {
  api,
  type CustomWorkflow, type CustomWorkflowRun, type CustomWorkflowRunStep, type Integration, type IntegrationsResponse,
  type WorkflowActionParams, type WorkflowApproval, type WorkflowCatalog, type WorkflowDefinition, type WorkflowOutput,
  type WorkflowStep, type WorkflowTask, type WorkflowTrigger,
} from "@/lib/api";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/locale";

// Workflows: the owner's own automations, built from Starlane's agents and
// the software they connected.
//
//   trigger (a schedule, a Gmail message, a webhook)  →  agent  →  condition  →  action
//
// Everything here comes from the backend catalog (GET /api/custom-workflows/
// catalog): only triggers, agents and actions that really run can be picked;
// the rest are shown as "Coming soon" with the reason, and the backend refuses
// them too. Emails a workflow drafts wait in Approvals until the owner
// approves each one. Runs are real: each step's result is recorded and shown.

type Tab = "workflows" | "approvals" | "tasks";

const WEEKDAYS: { key: NonNullable<Extract<WorkflowTrigger, { type: "schedule" }>["weekday"]>; label: string }[] = [
  { key: "mon", label: "Monday" }, { key: "tue", label: "Tuesday" }, { key: "wed", label: "Wednesday" }, { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" }, { key: "sat", label: "Saturday" }, { key: "sun", label: "Sunday" },
];

const STATUS: Record<CustomWorkflow["status"], { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: V.neutralDot },
  ACTIVE: { label: "On", color: V.positive },
  PAUSED: { label: "Paused", color: V.warning },
};

const RUN_STATUS: Record<CustomWorkflowRun["status"], { label: string; color: string }> = {
  RUNNING: { label: "Running", color: V.warning },
  COMPLETED: { label: "Completed", color: V.positive },
  ENDED_BY_CONDITION: { label: "Stopped at a condition", color: V.neutralDot },
  FAILED: { label: "Failed", color: V.critical },
  BLOCKED: { label: "Blocked by a kill switch", color: V.critical },
};

const STEP_STATUS: Record<CustomWorkflowRunStep["status"], { label: string; color: string }> = {
  DONE: { label: "Done", color: V.positive },
  PASSED: { label: "Condition met", color: V.positive },
  NOT_MET: { label: "Condition not met", color: V.neutralDot },
  SKIPPED: { label: "Skipped", color: V.neutralDot },
  BLOCKED: { label: "Blocked", color: V.critical },
  FAILED: { label: "Failed", color: V.critical },
  WAITING_APPROVAL: { label: "Waiting for your approval", color: V.warning },
};

const APPROVAL_STATUS: Record<WorkflowApproval["status"], { label: string; color: string }> = {
  PENDING: { label: "Waiting for you", color: V.warning },
  SENDING: { label: "Sending", color: V.warning },
  SENT: { label: "Sent", color: V.positive },
  REJECTED: { label: "Rejected", color: V.neutralDot },
  BLOCKED: { label: "Not sent", color: V.critical },
  FAILED: { label: "Failed", color: V.critical },
};

function hourLabel(h: number): string {
  return formatDate(new Date(Date.UTC(2026, 0, 1, h, 0)), { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

function triggerText(t: WorkflowTrigger | undefined, connections: Integration[] = []): string {
  if (!t) return "";
  if (t.type === "manual") return "When you run it";
  if (t.type === "email_received") {
    const bits = [t.fromContains && `from “${t.fromContains}”`, t.subjectContains && `with “${t.subjectContains}” in the subject`].filter(Boolean);
    return `When an email arrives${bits.length ? ` ${bits.join(" ")}` : ""}`;
  }
  if (t.type === "webhook_received") {
    const c = connections.find((x) => x.id === t.connectionId);
    return `When ${c ? c.name : "a webhook"} sends ${t.eventType ? `“${t.eventType}”` : "data"}`;
  }
  const at = hourLabel(t.hour);
  if (t.every === "daily") return `Every day at ${at}`;
  return `Every ${WEEKDAYS.find((d) => d.key === t.weekday)?.label || ""} at ${at}`;
}

function newId(steps: WorkflowStep[], base: string): string {
  let i = 1;
  while (steps.some((s) => s.id === `${base}${i}`)) i++;
  return `${base}${i}`;
}

const kindOf = (unit?: string) => (unit === "text" ? "text" : unit === "any" ? "any" : "number");

const field: React.CSSProperties = { padding: "8px 10px", border: `1px solid ${V.input}`, borderRadius: 6, font: "inherit", fontSize: 13.5, background: "#fff", color: V.ink, minWidth: 0 };
const small: React.CSSProperties = { fontSize: 12, color: V.tertiary };
const lbl: React.CSSProperties = { display: "grid", gap: 4, fontSize: 12.5, color: V.secondary };
const soonPill: React.CSSProperties = { fontSize: 10.5, color: V.tertiary, border: `1px solid ${V.divider}`, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" };
const sectionLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: V.secondary, margin: "0 0 8px" };

type Source = { ref: string; label: string; outputs: WorkflowOutput[] };

/** What the trigger and the agent steps before `index` offer to conditions and {{templates}}. */
function sourcesBefore(index: number, steps: WorkflowStep[], trigger: WorkflowTrigger, catalog: WorkflowCatalog): Source[] {
  const out: Source[] = [];
  const t = catalog.triggers.find((x) => x.type === trigger.type);
  if (t?.outputs?.length) out.push({ ref: "trigger", label: trigger.type === "email_received" ? "The email" : "The webhook data", outputs: t.outputs });
  steps.slice(0, index).forEach((s, i) => {
    if (s.type !== "agent") return;
    const a = catalog.agents.find((m) => m.key === s.agent);
    if (a) out.push({ ref: s.id, label: `${a.name} (step ${i + 1})`, outputs: a.outputs });
  });
  return out;
}

function defaultParams(action: string, trigger: WorkflowTrigger, lastAgent?: string): WorkflowActionParams {
  if (action === "notify_owner") return { title: "", includeSummaryOf: lastAgent };
  if (action === "create_task") return { title: "", dueInDays: 2 };
  if (action === "send_email") return trigger.type === "email_received"
    ? { replyToTrigger: true, to: "{{trigger.fromAddress}}", subject: "Re: {{trigger.subject}}", body: "" }
    : { to: "", subject: "", body: "" };
  if (action === "http_request") return { connectionId: "", method: "POST", path: "", body: "" };
  if (action === "post_slack") return { connectionId: "", message: "" };
  return {};
}

// ── Builder ─────────────────────────────────────────────────────────────

function InsertValues({ sources, onInsert }: { sources: Source[]; onInsert: (token: string) => void }) {
  if (!sources.length) return null;
  return (
    <details>
      <summary style={{ ...small, cursor: "pointer" }}>Insert a value from an earlier step</summary>
      <div className="flex flex-wrap" style={{ gap: 6, marginTop: 6 }}>
        {sources.flatMap((src) => src.outputs.map((o) => {
          const token = o.dynamic ? `{{${src.ref}.${o.key}.field}}` : `{{${src.ref}.${o.key}}}`;
          return (
            <button key={`${src.ref}.${o.key}`} type="button" onClick={() => onInsert(token)} className="hover-dim" title={token}
              style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 999, border: `1px solid ${V.divider}`, background: "#fff", color: V.secondary, cursor: "pointer" }}>
              {src.ref === "trigger" ? "" : `${src.label}: `}{o.dynamic ? "a field it sent (edit “field”)" : o.label}
            </button>
          );
        }))}
      </div>
    </details>
  );
}

function ConnectionPicker({ value, options, onChange, empty }: { value: string; options: Integration[]; onChange: (id: string) => void; empty: string }) {
  if (!options.length) return <p style={{ ...small, margin: 0, color: V.warning }}>{empty} <a href="/sources?tab=apps" style={{ color: V.ink, textDecoration: "underline" }}>Connect one</a>.</p>;
  return (
    <select style={field} value={value} onChange={(e) => onChange(e.target.value)}>
      {!options.some((o) => o.id === value) && <option value="">Pick a connection</option>}
      {options.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status !== "ACTIVE" ? " (off)" : ""}</option>)}
    </select>
  );
}

function StepEditor({ step, index, steps, trigger, catalog, connections, onChange, onRemove, onMove }: {
  step: WorkflowStep; index: number; steps: WorkflowStep[]; trigger: WorkflowTrigger; catalog: WorkflowCatalog; connections: Integration[];
  onChange: (s: WorkflowStep) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const sources = sourcesBefore(index, steps, trigger, catalog);
  const earlierAgents = steps.slice(0, index).filter((s): s is Extract<WorkflowStep, { type: "agent" }> => s.type === "agent");
  const agentName = (key: string) => catalog.agents.find((a) => a.key === key)?.name || key;
  const kind = step.type === "agent" ? "Run an agent" : step.type === "condition" ? "Only continue if" : "Then";

  const actionMeta = step.type === "action" ? catalog.actions.find((a) => a.key === step.action) : undefined;
  const setP = (patch: Partial<WorkflowActionParams>) => step.type === "action" && onChange({ ...step, params: { ...step.params, ...patch } });
  const append = (key: keyof WorkflowActionParams) => (token: string) => {
    if (step.type !== "action") return;
    const cur = String(step.params[key] ?? "");
    setP({ [key]: `${cur}${cur && !cur.endsWith(" ") ? " " : ""}${token}` } as Partial<WorkflowActionParams>);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ width: 24, height: 24, borderRadius: 999, background: V.surface2, color: V.ink, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>{index + 1}</span>
        {index < steps.length - 1 && <span aria-hidden style={{ flex: 1, width: 1, background: V.divider, marginTop: 4 }} />}
      </div>
      <Card style={{ padding: 14, marginBottom: 10 }}>
        <div className="flex items-center justify-between" style={{ gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: V.secondary }}>{kind}</span>
          <div className="flex items-center" style={{ gap: 10 }}>
            <button type="button" className="hover-dim" style={{ ...small, background: "none", border: "none", cursor: index ? "pointer" : "default", opacity: index ? 1 : 0.3 }} disabled={!index} onClick={() => onMove(-1)} aria-label="Move up">↑</button>
            <button type="button" className="hover-dim" style={{ ...small, background: "none", border: "none", cursor: index < steps.length - 1 ? "pointer" : "default", opacity: index < steps.length - 1 ? 1 : 0.3 }} disabled={index >= steps.length - 1} onClick={() => onMove(1)} aria-label="Move down">↓</button>
            <button type="button" className="hover-dim" style={{ background: "none", border: "none", cursor: "pointer", color: V.tertiary, display: "flex" }} onClick={onRemove} aria-label="Remove step"><IconTrash size={14} /></button>
          </div>
        </div>

        {step.type === "agent" && (() => {
          const meta = catalog.agents.find((a) => a.key === step.agent);
          const mismatch = meta?.needsTrigger && !meta.needsTrigger.includes(trigger.type);
          return (
            <div style={{ display: "grid", gap: 10 }}>
              <select style={field} value={step.agent} onChange={(e) => onChange({ ...step, agent: e.target.value, params: undefined })}>
                {catalog.agents.map((a) => (
                  <option key={a.key} value={a.key} disabled={a.availability !== "available"}>{a.name}{a.availability !== "available" ? " (coming soon)" : ""}</option>
                ))}
              </select>
              {meta && <p style={{ ...small, margin: 0 }}>{meta.summary}</p>}
              {mismatch && <p style={{ ...small, margin: 0, color: V.critical }}>This agent reads the email or data that started the workflow. Pick “When an email arrives” or “When another app sends data” above.</p>}
              {meta?.params?.map((p) => (
                <label key={p.key} style={lbl}>{p.label}
                  <input style={{ ...field, maxWidth: 140 }} inputMode="numeric" value={step.params?.[p.key] ?? p.default}
                    onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); onChange({ ...step, params: { ...(step.params || {}), [p.key]: v ? Number(v) : p.default } }); }} />
                </label>
              ))}
            </div>
          );
        })()}

        {step.type === "condition" && (() => {
          const parts = step.signal.split(".");
          const src = sources.find((x) => x.ref === parts[0]);
          const out = src?.outputs.find((o) => o.key === parts[1]);
          const k = kindOf(out?.unit);
          const ops = catalog.operators.filter((o) => !o.for || k === "any" || o.for.includes(k));
          const op = catalog.operators.find((o) => o.key === step.op);
          const numericOp = ["gt", "gte", "lt", "lte"].includes(step.op);
          const wantsNumber = k === "number" || (k === "any" && numericOp);
          if (!sources.length) return <p style={{ ...small, margin: 0, color: V.critical }}>Put an agent step before this condition, or start the workflow from an email or a webhook: a condition checks a value one of them produced.</p>;
          return (
            <div style={{ display: "grid", gap: 8 }}>
              <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                <select style={field} value={out ? `${parts[0]}.${parts[1]}` : ""} onChange={(e) => {
                  const [r, f] = e.target.value.split(".");
                  const o = sources.find((x) => x.ref === r)?.outputs.find((x) => x.key === f);
                  const nk = kindOf(o?.unit);
                  onChange({ ...step, signal: o?.dynamic ? `${r}.${f}.` : `${r}.${f}`, op: nk === "text" ? "eq" : "gt", value: nk === "text" ? "" : 0 });
                }}>
                  {!out && <option value="">Pick a value</option>}
                  {sources.flatMap((s) => s.outputs.map((o) => <option key={`${s.ref}.${o.key}`} value={`${s.ref}.${o.key}`}>{s.label}: {o.label}</option>))}
                </select>
                {out?.dynamic && (
                  <input style={{ ...field, width: 160 }} placeholder="field, e.g. amount" value={parts.slice(2).join(".")}
                    onChange={(e) => onChange({ ...step, signal: `${parts[0]}.${parts[1]}.${e.target.value.replace(/[^A-Za-z0-9_.]/g, "")}` })} />
                )}
                <select style={field} value={step.op} onChange={(e) => onChange({ ...step, op: e.target.value })}>
                  {ops.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                {op?.needsValue && (wantsNumber ? (
                  <input style={{ ...field, width: 140 }} inputMode="decimal" value={step.value ?? ""} placeholder={out?.unit === "money" ? "Amount" : "Number"}
                    onChange={(e) => { const v = e.target.value.replace(/[^0-9.-]/g, ""); onChange({ ...step, value: v === "" ? undefined : Number(v) }); }} />
                ) : (
                  <input style={{ ...field, width: 200 }} value={step.value ?? ""} placeholder={parts[1] === "category" ? "e.g. payment_promise" : "Text"}
                    onChange={(e) => onChange({ ...step, value: e.target.value })} />
                ))}
                {op?.needsValue && out?.unit === "money" && typeof step.value === "number" && <span style={small}>{formatMoney(step.value)}</span>}
              </div>
              {parts[1] === "category" && <p style={{ ...small, margin: 0 }}>Kinds: invoice, payment_sent, payment_promise, dispute, question, other.</p>}
              {k === "text" && <p style={{ ...small, margin: 0 }}>Text is compared without regard to capital letters.</p>}
            </div>
          );
        })()}

        {step.type === "action" && (
          <div style={{ display: "grid", gap: 10 }}>
            <select style={field} value={step.action} onChange={(e) => onChange({ ...step, action: e.target.value, params: defaultParams(e.target.value, trigger, earlierAgents[earlierAgents.length - 1]?.id) })}>
              {catalog.actions.map((a) => (
                <option key={a.key} value={a.key} disabled={a.availability !== "available"}>{a.name}{a.availability !== "available" ? " (coming soon)" : ""}</option>
              ))}
            </select>
            {actionMeta && <p style={{ ...small, margin: 0 }}>{actionMeta.summary}</p>}
            {actionMeta?.flag && actionMeta.enabledOnServer === false && (
              <p style={{ ...small, margin: 0, color: V.warning }}>
                {actionMeta.key === "send_email"
                  ? "Sending to people outside Starlane is switched off on this server, so drafts wait in Approvals and are not sent even when approved."
                  : "Calling other apps is switched off on this server, so this step is recorded as blocked when the workflow runs."}
              </p>
            )}

            {step.action === "notify_owner" && (
              <>
                <input style={field} maxLength={200} placeholder="What the notification says" value={step.params.title || ""} onChange={(e) => setP({ title: e.target.value })} />
                <input style={field} maxLength={600} placeholder="More detail (optional)" value={step.params.message || ""} onChange={(e) => setP({ message: e.target.value || undefined })} />
                <InsertValues sources={sources} onInsert={append("message")} />
                {earlierAgents.length > 0 && (
                  <label style={lbl}>Include the result of
                    <select style={field} value={step.params.includeSummaryOf || ""} onChange={(e) => setP({ includeSummaryOf: e.target.value || undefined })}>
                      <option value="">Nothing</option>
                      {earlierAgents.map((a) => <option key={a.id} value={a.id}>{agentName(a.agent)} (step {steps.indexOf(a) + 1})</option>)}
                    </select>
                  </label>
                )}
              </>
            )}

            {step.action === "create_task" && (
              <>
                <input style={field} maxLength={200} placeholder="The task" value={step.params.title || ""} onChange={(e) => setP({ title: e.target.value })} />
                <textarea style={{ ...field, minHeight: 60 }} maxLength={1000} placeholder="Detail (optional)" value={step.params.detail || ""} onChange={(e) => setP({ detail: e.target.value || undefined })} />
                <InsertValues sources={sources} onInsert={append("detail")} />
                <label style={lbl}>Due in (days, optional)
                  <input style={{ ...field, maxWidth: 120 }} inputMode="numeric" value={step.params.dueInDays ?? ""} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setP({ dueInDays: v === "" ? undefined : Number(v) }); }} />
                </label>
              </>
            )}

            {step.action === "send_email" && (
              <>
                {trigger.type === "email_received" && (
                  <label className="flex items-center" style={{ gap: 8, fontSize: 12.5, color: V.secondary }}>
                    <input type="checkbox" checked={!!step.params.replyToTrigger} onChange={(e) => setP(e.target.checked ? { replyToTrigger: true, to: "{{trigger.fromAddress}}", subject: "Re: {{trigger.subject}}" } : { replyToTrigger: false })} />
                    Reply in the same Gmail thread, to the sender
                  </label>
                )}
                <input style={field} maxLength={300} placeholder="To (an address, or {{trigger.fromAddress}})" value={step.params.to || ""} onChange={(e) => setP({ to: e.target.value })} />
                <input style={field} maxLength={300} placeholder="Subject" value={step.params.subject || ""} onChange={(e) => setP({ subject: e.target.value })} />
                <textarea style={{ ...field, minHeight: 100 }} maxLength={4000} placeholder="The email" value={step.params.body || ""} onChange={(e) => setP({ body: e.target.value })} />
                <InsertValues sources={sources} onInsert={append("body")} />
                <p style={{ ...small, margin: 0 }}>Nothing is sent until you approve it under Approvals. You can edit it there first.</p>
              </>
            )}

            {step.action === "http_request" && (
              <>
                <ConnectionPicker value={step.params.connectionId || ""} options={connections.filter((c) => c.kind === "http_api" && c.preset !== "slack")} onChange={(id) => setP({ connectionId: id })} empty="No API connection yet." />
                <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                  <select style={field} value={step.params.method || "POST"} onChange={(e) => setP({ method: e.target.value })}>
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input style={{ ...field, flex: "1 1 220px" }} maxLength={500} placeholder="/path after the base URL, e.g. /contacts" value={step.params.path || ""} onChange={(e) => setP({ path: e.target.value })} />
                </div>
                <textarea style={{ ...field, minHeight: 90, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5 }} maxLength={8000}
                  placeholder={'JSON body (optional), e.g. {"note": "{{triage.category}} from {{trigger.from}}"}'} value={step.params.body || ""} onChange={(e) => setP({ body: e.target.value })} />
                <InsertValues sources={sources} onInsert={append("body")} />
              </>
            )}

            {step.action === "post_slack" && (
              <>
                <ConnectionPicker value={step.params.connectionId || ""} options={connections.filter((c) => c.kind === "http_api" && c.preset === "slack")} onChange={(id) => setP({ connectionId: id })} empty="No Slack channel connected yet." />
                <textarea style={{ ...field, minHeight: 70 }} maxLength={3000} placeholder="The message" value={step.params.message || ""} onChange={(e) => setP({ message: e.target.value })} />
                <InsertValues sources={sources} onInsert={append("message")} />
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function TriggerPicker({ trigger, setTrigger, catalog, integrations }: {
  trigger: WorkflowTrigger; setTrigger: (t: WorkflowTrigger) => void; catalog: WorkflowCatalog; integrations: IntegrationsResponse | null;
}) {
  const scheduleOn = catalog.triggers.find((t) => t.type === "schedule")?.schedulerEnabled;
  const webhooks = (integrations?.connections || []).filter((c) => c.kind === "webhook_in");
  const gmailAccounts = integrations?.gmail.accounts || [];
  const pick = (type: string) => {
    if (type === "schedule") setTrigger({ type: "schedule", every: "weekly", weekday: "mon", hour: 9 });
    else if (type === "email_received") setTrigger({ type: "email_received" });
    else if (type === "webhook_received") setTrigger({ type: "webhook_received", connectionId: webhooks[0]?.id || "" });
    else setTrigger({ type: "manual" });
  };
  return (
    <div>
      <p style={sectionLabel}>When</p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {catalog.triggers.map((t) => {
          const on = t.availability === "available";
          const selected = trigger.type === t.type;
          return (
            <button key={t.type} type="button" disabled={!on} onClick={() => pick(t.type)} title={on ? t.summary : t.reason}
              style={{ textAlign: "left", padding: 12, borderRadius: 8, border: `1px solid ${selected ? V.ink : V.divider}`, background: selected ? V.surface2 : "#fff", cursor: on ? "pointer" : "default", opacity: on ? 1 : 0.6 }}>
              <div className="flex items-center justify-between" style={{ gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: V.ink }}>{t.name}</span>
                {!on && <span style={soonPill}>Coming soon</span>}
              </div>
              <p style={{ ...small, margin: "4px 0 0", lineHeight: 1.45 }}>{on ? t.summary : t.reason}</p>
            </button>
          );
        })}
      </div>

      {trigger.type === "schedule" && (
        <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 10 }}>
          <select style={field} value={trigger.every} onChange={(e) => setTrigger({ ...trigger, every: e.target.value as "daily" | "weekly", weekday: e.target.value === "weekly" ? trigger.weekday || "mon" : undefined })}>
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
          </select>
          {trigger.every === "weekly" && (
            <select style={field} value={trigger.weekday || "mon"} onChange={(e) => setTrigger({ ...trigger, weekday: e.target.value as typeof WEEKDAYS[number]["key"] })}>
              {WEEKDAYS.map((d) => <option key={d.key} value={d.key}>on {d.label}</option>)}
            </select>
          )}
          <select style={field} value={trigger.hour} onChange={(e) => setTrigger({ ...trigger, hour: Number(e.target.value) })}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>at {hourLabel(h)}</option>)}
          </select>
          <span style={small}>in your business timezone</span>
        </div>
      )}
      {(trigger.type === "schedule" || trigger.type === "email_received") && !scheduleOn && (
        <p style={{ ...small, marginTop: 8, color: V.warning }}>
          {trigger.type === "schedule"
            ? "Scheduled runs are switched off on this workspace for now, so this will only run when you press Run now."
            : "Automatic inbox checks are switched off on this workspace for now. New mail is read when you press Check inbox now under Data sources, or Run now here."}
        </p>
      )}

      {trigger.type === "email_received" && (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {integrations && !gmailAccounts.length && (
            <p style={{ ...small, margin: 0, color: V.warning }}>No Gmail account is connected yet. <a href="/sources?tab=apps" style={{ color: V.ink, textDecoration: "underline" }}>Connect Gmail</a>, then come back.</p>
          )}
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            <label style={{ ...lbl, flex: "1 1 220px" }}>Only from (optional)
              <input style={field} maxLength={120} placeholder="e.g. @acme.com or a name" value={trigger.fromContains || ""} onChange={(e) => setTrigger({ ...trigger, fromContains: e.target.value || undefined })} />
            </label>
            <label style={{ ...lbl, flex: "1 1 220px" }}>Only if the subject contains (optional)
              <input style={field} maxLength={120} placeholder="e.g. invoice" value={trigger.subjectContains || ""} onChange={(e) => setTrigger({ ...trigger, subjectContains: e.target.value || undefined })} />
            </label>
          </div>
        </div>
      )}

      {trigger.type === "webhook_received" && (
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 10 }}>
          <label style={{ ...lbl, flex: "1 1 220px" }}>Which webhook
            <ConnectionPicker value={trigger.connectionId} options={webhooks} onChange={(id) => setTrigger({ ...trigger, connectionId: id })} empty="No incoming webhook yet." />
          </label>
          <label style={{ ...lbl, flex: "1 1 220px" }}>Only this event type (optional)
            <input style={field} maxLength={80} placeholder='the "event" or "type" field, e.g. payment.succeeded' value={trigger.eventType || ""} onChange={(e) => setTrigger({ ...trigger, eventType: e.target.value || undefined })} />
          </label>
        </div>
      )}
    </div>
  );
}

function Builder({ catalog, integrations, initial, onSaved, onCancel }: {
  catalog: WorkflowCatalog; integrations: IntegrationsResponse | null;
  initial: { id?: string; name: string; description?: string | null; definition: WorkflowDefinition };
  onSaved: (w: CustomWorkflow) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description || "");
  const [trigger, setTrigger] = useState<WorkflowTrigger>(() => {
    const t = initial.definition.trigger;
    // A template's webhook trigger starts on the first webhook the owner has.
    if (t.type === "webhook_received" && !t.connectionId) return { ...t, connectionId: integrations?.connections.find((c) => c.kind === "webhook_in")?.id || "" };
    return t;
  });
  const [steps, setSteps] = useState<WorkflowStep[]>(initial.definition.steps);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const connections = integrations?.connections || [];
  const firstAgent = catalog.agents.find((a) => a.availability === "available" && (!a.needsTrigger || a.needsTrigger.includes(trigger.type)));
  const firstAction = catalog.actions.find((a) => a.availability === "available");
  const canCondition = steps.some((s) => s.type === "agent") || !!catalog.triggers.find((t) => t.type === trigger.type)?.outputs?.length;

  const add = (type: WorkflowStep["type"]) => {
    if (steps.length >= catalog.limits.maxSteps) return;
    if (type === "agent" && firstAgent) setSteps((s) => [...s, { id: newId(s, "agent"), type: "agent", agent: firstAgent.key }]);
    if (type === "condition") {
      const src = sourcesBefore(steps.length, steps, trigger, catalog);
      const last = src[src.length - 1];
      const o = last?.outputs[0];
      const text = kindOf(o?.unit) === "text";
      setSteps((s) => [...s, { id: newId(s, "check"), type: "condition", signal: last && o ? `${last.ref}.${o.key}${o.dynamic ? "." : ""}` : "", op: text ? "eq" : "gt", value: text ? "" : 0 }]);
    }
    if (type === "action" && firstAction) {
      const lastAgent = [...steps].reverse().find((s) => s.type === "agent");
      setSteps((s) => [...s, { id: newId(s, "act"), type: "action", action: firstAction.key, params: defaultParams(firstAction.key, trigger, lastAgent?.id) }]);
    }
  };

  const move = (i: number, dir: -1 | 1) => setSteps((s) => {
    const j = i + dir;
    if (j < 0 || j >= s.length) return s;
    const next = s.slice();
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const save = async () => {
    setSaving(true); setErrors([]);
    const definition: WorkflowDefinition = { trigger, steps };
    try {
      const { workflow } = initial.id
        ? await api.customWorkflows.update(initial.id, { name, description, definition })
        : await api.customWorkflows.create({ name, description, definition });
      onSaved(workflow);
    } catch (e) {
      const body = (e as { body?: { errors?: string[] } })?.body;
      setErrors(body?.errors?.length ? body.errors : [e instanceof Error ? e.message : "Could not save the workflow."]);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card style={{ padding: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <input style={{ ...field, fontSize: 16, fontWeight: 600 }} maxLength={80} placeholder="Name this workflow" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={field} maxLength={300} placeholder="What it is for (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </Card>

      <TriggerPicker trigger={trigger} setTrigger={setTrigger} catalog={catalog} integrations={integrations} />

      <div>
        <p style={sectionLabel}>Steps</p>
        {steps.length === 0 && <p style={{ ...small, margin: "0 0 10px" }}>Add an agent to do the work, then a condition and an action if you want one.</p>}
        {steps.map((s, i) => (
          <StepEditor key={s.id} step={s} index={i} steps={steps} trigger={trigger} catalog={catalog} connections={connections}
            onChange={(n) => setSteps((all) => all.map((x, j) => (j === i ? n : x)))}
            onRemove={() => setSteps((all) => all.filter((_, j) => j !== i))}
            onMove={(d) => move(i, d)} />
        ))}
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 4 }}>
          <Button small onClick={() => add("agent")} disabled={steps.length >= catalog.limits.maxSteps}><IconPlus size={13} /> Agent</Button>
          <Button small onClick={() => add("condition")} disabled={steps.length >= catalog.limits.maxSteps || !canCondition}><IconPlus size={13} /> Condition</Button>
          <Button small onClick={() => add("action")} disabled={steps.length >= catalog.limits.maxSteps}><IconPlus size={13} /> Action</Button>
        </div>
        <details style={{ marginTop: 14 }}>
          <summary style={{ ...small, cursor: "pointer" }}>Coming soon to workflows</summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
            {[...catalog.agents, ...catalog.actions].filter((x) => x.availability !== "available").map((x) => (
              <li key={x.key} style={small}><span style={{ color: V.ink }}>{x.name}</span>: {x.reason}</li>
            ))}
          </ul>
        </details>
      </div>

      {errors.length > 0 && (
        <ErrorBanner>
          {errors.length === 1 ? errors[0] : <ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </ErrorBanner>
      )}
      <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
        <Button primary onClick={save} disabled={saving || !name.trim()}>{saving ? "Saving…" : initial.id ? "Save changes" : "Save workflow"}</Button>
        <Button onClick={onCancel}>Cancel</Button>
        <span style={small}>New workflows start as drafts. Turn one on when it looks right.</span>
      </div>
    </div>
  );
}

// ── Runs ────────────────────────────────────────────────────────────────

type RunLike = { status: CustomWorkflowRun["status"]; steps: CustomWorkflowRunStep[]; summary: string | null; error: string | null; startedAt?: string };

function RunView({ run, catalog }: { run: RunLike; catalog: WorkflowCatalog | null }) {
  const st = RUN_STATUS[run.status] || { label: run.status, color: V.neutralDot };
  const label = (s: CustomWorkflowRunStep) => {
    if (s.type === "trigger") return "Trigger";
    if (s.type === "agent") return catalog?.agents.find((a) => a.key === s.agent)?.name || "Agent";
    if (s.type === "condition") return "Condition";
    return "Action";
  };
  const outputText = (s: CustomWorkflowRunStep) => {
    if (!s.outputs || !s.agent) return null;
    const meta = catalog?.agents.find((a) => a.key === s.agent)?.outputs || [];
    const parts = meta.map((o) => {
      const v = s.outputs?.[o.key];
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "string") return `${o.label.replace(/ \(.*\)$/, "")}: ${v}`;
      return `${o.label}: ${o.unit === "money" ? formatMoney(v) : o.unit === "week" ? `week ${v}` : formatNumber(v)}`;
    }).filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
        <StatusDot label={st.label} color={st.color} />
        {run.startedAt && <span style={small}>{formatDateTime(run.startedAt)}</span>}
      </div>
      {run.summary && <p style={{ fontSize: 13, color: V.body, margin: 0 }}>{run.summary}</p>}
      {run.error && <p style={{ fontSize: 12.5, color: V.critical, margin: 0 }}>{run.error}</p>}
      <StepRail
        label="Run steps"
        steps={run.steps.map((s, i) => {
          const ss = STEP_STATUS[s.status] || { label: s.status, color: V.neutralDot };
          const out = outputText(s);
          return {
            key: `${s.id}-${i}`,
            state: s.status === "DONE" || s.status === "PASSED" ? "done" : s.status === "FAILED" || s.status === "BLOCKED" ? "failed" : s.status === "WAITING_APPROVAL" ? "active" : "waiting",
            label: (
              <span className="flex items-center flex-wrap" style={{ gap: 8, opacity: s.status === "SKIPPED" ? 0.6 : 1 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: V.ink }}>{label(s)}</span>
                <span style={{ fontSize: 12, color: ss.color }}>{ss.label}</span>
                {s.durationMs != null && <span style={small}>{s.durationMs < 1000 ? `${s.durationMs} ms` : `${(s.durationMs / 1000).toFixed(1)} s`}</span>}
              </span>
            ),
            detail: (s.summary || out || s.response) ? (
              <>
                {s.summary && <span className="block" style={{ fontSize: 12.5, color: V.secondary }}>{s.summary}</span>}
                {out && <span className="block">{out}</span>}
                {s.response && <span className="block" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-all" }}>{s.response.slice(0, 240)}</span>}
              </>
            ) : null,
          };
        })}
      />
    </div>
  );
}

/** Test a workflow that starts from an email or a webhook: on the latest one, or on a sample (not stored). */
function TestRun({ w, onRun, busy }: { w: CustomWorkflow; onRun: (sample?: Record<string, unknown>) => void; busy: boolean }) {
  const email = w.definition.trigger.type === "email_received";
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [json, setJson] = useState('{\n  "event": "payment.succeeded",\n  "data": { "amount": 1200, "customer": "Acme" }\n}');
  const [err, setErr] = useState<string | null>(null);
  const runSample = () => {
    setErr(null);
    if (email) return onRun({ from, fromAddress: (from.match(/[^\s<>]+@[^\s<>]+/) || [""])[0], subject, body });
    try { const v = JSON.parse(json); if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(); onRun(v); }
    catch { setErr("The sample must be a JSON object."); }
  };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
        <Button small primary onClick={() => onRun()} disabled={busy}>{busy ? "Running…" : email ? "Run on the latest email" : "Run on the latest data received"}</Button>
        <span style={small}>or test with a sample. A sample is not stored, and any email it drafts still waits for your approval.</span>
      </div>
      {email ? (
        <>
          <input style={field} placeholder="From, e.g. Priya <priya@acme.com>" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input style={field} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea style={{ ...field, minHeight: 80 }} placeholder="Message, e.g. We will pay invoice INV-204 for $1,200 by 15 Nov." value={body} onChange={(e) => setBody(e.target.value)} />
        </>
      ) : (
        <textarea style={{ ...field, minHeight: 110, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5 }} value={json} onChange={(e) => setJson(e.target.value)} />
      )}
      <div><Button small onClick={runSample} disabled={busy || (email && !subject.trim() && !body.trim())}>Run with this sample</Button></div>
      {err && <p style={{ ...small, color: V.critical, margin: 0 }}>{err}</p>}
    </div>
  );
}

// ── Approvals and tasks ────────────────────────────────────────────────

function ApprovalCard({ a, onDone }: { a: WorkflowApproval; onDone: () => void }) {
  const open = a.status === "PENDING" || a.status === "BLOCKED";
  const [subject, setSubject] = useState(a.subject);
  const [body, setBody] = useState(a.body);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const st = APPROVAL_STATUS[a.status];
  const decide = async (what: "approve" | "reject") => {
    if (what === "approve" && !window.confirm(`Send this email to ${a.to} from your Gmail?`)) return;
    setBusy(what); setError(null);
    try {
      if (what === "approve") await api.customWorkflows.approve(a.id, { ...(subject !== a.subject ? { subject } : {}), ...(body !== a.body ? { body } : {}) });
      else await api.customWorkflows.reject(a.id);
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "That did not work."); }
    finally { setBusy(null); }
  };
  return (
    <Card style={{ padding: 14 }}>
      <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: V.ink }}>To {a.to}</span>
        <StatusDot label={st.label} color={st.color} />
        <span style={small}>{a.isReply ? "Reply in thread · " : ""}{a.workflowName ? `from “${a.workflowName}” · ` : ""}{formatDateTime(a.createdAt)}</span>
      </div>
      {a.statusReason && <p style={{ fontSize: 12.5, color: a.status === "BLOCKED" || a.status === "FAILED" ? V.critical : V.secondary, margin: "6px 0 0" }}>{a.statusReason}</p>}
      {open ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <input style={field} maxLength={300} value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
          <textarea style={{ ...field, minHeight: 120 }} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Email" />
          <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
            {!(a.status === "BLOCKED" && /do-not-contact/.test(a.statusReason || "")) && (
              <Button small primary onClick={() => decide("approve")} disabled={!!busy || !subject.trim() || !body.trim()}>{busy === "approve" ? "Sending…" : a.status === "BLOCKED" ? "Try again" : "Approve and send"}</Button>
            )}
            <Button small onClick={() => decide("reject")} disabled={!!busy}>{busy === "reject" ? "Rejecting…" : "Reject"}</Button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontSize: 13, color: V.ink, margin: 0, fontWeight: 500 }}>{a.subject}</p>
          <p style={{ fontSize: 12.5, color: V.secondary, margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{a.body.slice(0, 400)}{a.body.length > 400 ? "…" : ""}</p>
          {a.result?.sentFrom && <p style={{ ...small, margin: "6px 0 0" }}>Sent from {a.result.sentFrom}{a.result.alreadySent ? " (it had already gone out; not sent twice)" : ""}.</p>}
        </div>
      )}
      {error && <p style={{ fontSize: 12.5, color: V.critical, margin: "8px 0 0" }}>{error}</p>}
    </Card>
  );
}

function ApprovalsTab({ onCount }: { onCount: (n: number) => void }) {
  const [data, setData] = useState<{ approvals: WorkflowApproval[]; externalSendEnabled: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try { const d = await api.customWorkflows.approvals(); setData(d); onCount(d.approvals.filter((a) => a.status === "PENDING").length); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load approvals."); }
  }, [onCount]);
  useEffect(() => { load(); }, [load]);
  if (error) return <ErrorBanner>{error}</ErrorBanner>;
  if (!data) return <SkeletonRows rows={2} height={90} />;
  const open = data.approvals.filter((a) => a.status === "PENDING" || a.status === "BLOCKED" || a.status === "SENDING");
  const done = data.approvals.filter((a) => !open.includes(a));
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {!data.externalSendEnabled && (
        <p style={{ fontSize: 12.5, color: V.warning, margin: 0 }}>Sending to people outside Starlane is switched off on this server. You can review drafts here; approving one records that it was not sent, and you can approve it again once sending is on.</p>
      )}
      {!open.length && <EmptyLine title="Nothing waiting for you" body="Emails your workflows draft appear here. None is sent until you approve it." />}
      {open.map((a) => <ApprovalCard key={a.id} a={a} onDone={load} />)}
      {done.length > 0 && (
        <>
          <p style={{ ...sectionLabel, margin: "16px 0 0" }}>Decided</p>
          {done.slice(0, 20).map((a) => <ApprovalCard key={a.id} a={a} onDone={load} />)}
        </>
      )}
    </div>
  );
}

function TasksTab({ onCount }: { onCount: (n: number) => void }) {
  const [tasks, setTasks] = useState<WorkflowTask[] | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try { const r = await api.customWorkflows.tasks("all"); setTasks(r.tasks); onCount(r.tasks.filter((t) => t.status === "OPEN").length); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load tasks."); }
  }, [onCount]);
  useEffect(() => { load(); }, [load]);
  const toggle = async (t: WorkflowTask) => {
    try { await (t.status === "OPEN" ? api.customWorkflows.taskDone(t.id) : api.customWorkflows.taskReopen(t.id)); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update the task."); }
  };
  if (error) return <ErrorBanner>{error}</ErrorBanner>;
  if (!tasks) return <SkeletonRows rows={3} height={52} />;
  const list = tasks.filter((t) => (showDone ? true : t.status === "OPEN"));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {!list.length && <EmptyLine title={showDone ? "No tasks yet" : "No open tasks"} body="Tasks your workflows create appear here." />}
      {list.map((t) => (
        <Card key={t.id} style={{ padding: 12 }}>
          <div className="flex items-start" style={{ gap: 10 }}>
            <input type="checkbox" checked={t.status === "DONE"} onChange={() => toggle(t)} aria-label={t.status === "DONE" ? "Reopen" : "Mark done"} style={{ marginTop: 3 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13.5, color: V.ink, margin: 0, fontWeight: 500, textDecoration: t.status === "DONE" ? "line-through" : "none" }}>{t.title}</p>
              {t.detail && <p style={{ fontSize: 12.5, color: V.secondary, margin: "2px 0 0" }}>{t.detail}</p>}
              <p style={{ ...small, margin: "3px 0 0", color: t.status === "OPEN" && t.dueOn && t.dueOn.slice(0, 10) < today ? V.critical : V.tertiary }}>
                {t.dueOn ? `Due ${formatDate(t.dueOn)}` : "No due date"}{t.workflowName ? ` · from “${t.workflowName}”` : ""}
              </p>
            </div>
          </div>
        </Card>
      ))}
      <div><button type="button" className="hover-dim" onClick={() => setShowDone((v) => !v)} style={{ ...small, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>{showDone ? "Hide done tasks" : "Show done tasks"}</button></div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

function WorkflowsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("id");
  const tabParam = params.get("tab");
  const tab: Tab = tabParam === "approvals" || tabParam === "tasks" ? tabParam : "workflows";
  const gmailBack = params.get("gmail");
  const [catalog, setCatalog] = useState<WorkflowCatalog | null>(null);
  const [list, setList] = useState<CustomWorkflow[] | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; name: string; description?: string | null; definition: WorkflowDefinition } | null>(null);
  const [detail, setDetail] = useState<{ workflow: CustomWorkflow; runs: CustomWorkflowRun[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Record<string, RunLike>>({});
  const [pending, setPending] = useState<number | null>(null);
  const [openTasks, setOpenTasks] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, l, i] = await Promise.all([
        api.customWorkflows.catalog(), api.customWorkflows.list(),
        api.integrations.list().catch(() => null),
      ]);
      setCatalog(c); setList(l.workflows); setIntegrations(i);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load workflows."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Counts for the tab labels.
  useEffect(() => {
    api.customWorkflows.approvals("PENDING").then((r) => setPending(r.approvals.length)).catch(() => setPending(null));
    api.customWorkflows.tasks("OPEN").then((r) => setOpenTasks(r.tasks.length)).catch(() => setOpenTasks(null));
  }, []);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    api.customWorkflows.get(openId).then(setDetail).catch((e) => setError(e instanceof Error ? e.message : "Could not load the workflow."));
  }, [openId]);

  const refreshOne = async (id: string) => {
    await load();
    if (openId === id) setDetail(await api.customWorkflows.get(id));
  };

  const act = async (w: CustomWorkflow, what: "run" | "activate" | "pause" | "remove", sample?: Record<string, unknown>) => {
    if (what === "remove" && !window.confirm(`Delete "${w.name}"? Its run history goes with it.`)) return;
    setBusy(`${w.id}:${what}`); setError(null);
    try {
      if (what === "run") {
        const { run } = await api.customWorkflows.run(w.id, sample);
        setLastRun((m) => ({ ...m, [w.id]: run }));
        if (run.steps.some((s) => s.status === "WAITING_APPROVAL")) setPending((n) => (n ?? 0) + run.steps.filter((s) => s.status === "WAITING_APPROVAL").length);
      } else if (what === "activate") await api.customWorkflows.activate(w.id);
      else if (what === "pause") await api.customWorkflows.pause(w.id);
      else { await api.customWorkflows.remove(w.id); if (openId === w.id) router.replace("/workflows"); }
      await refreshOne(w.id).catch(() => load());
    } catch (e) { setError(e instanceof Error ? e.message : "That did not work. Nothing was changed."); }
    finally { setBusy(null); }
  };

  const blank = useMemo<WorkflowDefinition>(() => ({ trigger: { type: "manual" }, steps: [] }), []);
  const onPending = useCallback((n: number) => setPending(n), []);
  const onTasks = useCallback((n: number) => setOpenTasks(n), []);
  const connections = integrations?.connections || [];

  const header = (
    <PageHeader
      title="Workflows"
      subtitle="Chain Starlane's agents and the software you connect into automations of your own: pick what starts it, what the agents do, and what happens with the result."
      right={!editing && tab === "workflows" ? <Button primary onClick={() => setEditing({ name: "", definition: blank })}><IconPlus size={14} /> New workflow</Button> : undefined}
    />
  );

  if (editing && catalog) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        {header}
        <Builder catalog={catalog} integrations={integrations} initial={editing} onCancel={() => setEditing(null)}
          onSaved={(w) => { setEditing(null); load(); router.replace(`/workflows?id=${w.id}`); }} />
      </div>
    );
  }

  const stepWord = (s: WorkflowStep) => s.type === "agent" ? catalog?.agents.find((a) => a.key === s.agent)?.name
    : s.type === "condition" ? "check" : (catalog?.actions.find((a) => a.key === s.action)?.name || "action").toLowerCase();

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {header}
      {gmailBack && (
        <p role="status" style={{ fontSize: 13, margin: 0, color: gmailBack === "connected" ? V.positive : V.critical }}>
          {gmailBack === "connected" ? "Gmail is connected. Workflows that start from an email can now run." : "Gmail was not connected. Try again from Data sources."}
        </p>
      )}
      <Subnav
        items={[
          { key: "workflows", label: "Workflows" },
          { key: "approvals", label: "Approvals", count: pending || null },
          { key: "tasks", label: "Tasks", count: openTasks || null },
        ]}
        active={tab}
        onChange={(k) => router.replace(k === "workflows" ? "/workflows" : `/workflows?tab=${k}`)}
      />

      {tab === "approvals" && <ApprovalsTab onCount={onPending} />}
      {tab === "tasks" && <TasksTab onCount={onTasks} />}

      {tab === "workflows" && (
        <>
          {error && <ErrorBanner>{error} <button type="button" onClick={load} className="hover-dim" style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", color: V.ink }}>Retry</button></ErrorBanner>}
          {list === null && !error && <SkeletonRows rows={3} height={64} />}

          {catalog && list && list.length === 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              <EmptyLine title="No workflows yet" body="Start from one of these, or build your own from scratch." />
            </div>
          )}

          {catalog && list && (
            <div>
              {list.length > 0 && (
                <div style={{ display: "grid", gap: 8 }}>
                  {list.map((w) => {
                    const st = STATUS[w.status];
                    const run = lastRun[w.id];
                    const open = openId === w.id;
                    const fromEvent = w.definition.trigger.type === "email_received" || w.definition.trigger.type === "webhook_received";
                    return (
                      <Card key={w.id} style={{ padding: 14 }}>
                        <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
                          <button type="button" onClick={() => router.replace(open ? "/workflows" : `/workflows?id=${w.id}`)} className="hover-dim" style={{ textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", minWidth: 0, flex: "1 1 280px" }}>
                            <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                              <span style={{ fontSize: 14.5, fontWeight: 600, color: V.ink }}>{w.name}</span>
                              <StatusDot label={st.label} color={st.color} />
                            </div>
                            <p style={{ fontSize: 12.5, color: V.secondary, margin: "4px 0 0" }}>
                              {triggerText(w.definition.trigger, connections)} · {w.definition.steps.length} step{w.definition.steps.length === 1 ? "" : "s"}
                              {w.lastRun ? ` · last run ${formatDateTime(w.lastRun.startedAt)} (${RUN_STATUS[w.lastRun.status]?.label.toLowerCase() || w.lastRun.status})` : " · never run"}
                              {w.nextRunAt ? ` · next ${formatDateTime(w.nextRunAt)}` : ""}
                            </p>
                            {w.description && <p style={{ ...small, margin: "4px 0 0" }}>{w.description}</p>}
                          </button>
                          <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                            {fromEvent
                              ? <Button small primary onClick={() => setTesting(testing === w.id ? null : w.id)} disabled={!!busy}>{testing === w.id ? "Close test" : "Test"}</Button>
                              : <Button small primary onClick={() => act(w, "run")} disabled={!!busy}>{busy === `${w.id}:run` ? "Running…" : "Run now"}</Button>}
                            {w.status === "ACTIVE"
                              ? <Button small onClick={() => act(w, "pause")} disabled={!!busy}>Pause</Button>
                              : <Button small onClick={() => act(w, "activate")} disabled={!!busy}>Turn on</Button>}
                            <Button small onClick={() => setEditing({ id: w.id, name: w.name, description: w.description, definition: w.definition })} disabled={!!busy}>Edit</Button>
                            <button type="button" onClick={() => act(w, "remove")} disabled={!!busy} className="hover-dim" aria-label={`Delete ${w.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: V.tertiary, display: "flex" }}><IconTrash size={14} /></button>
                          </div>
                        </div>
                        {testing === w.id && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${V.divider}` }}>
                            <TestRun w={w} busy={busy === `${w.id}:run`} onRun={(sample) => act(w, "run", sample)} />
                          </div>
                        )}
                        {run && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${V.divider}` }}>
                            <RunView run={run} catalog={catalog} />
                            {run.steps.some((s) => s.status === "WAITING_APPROVAL") && (
                              <p style={{ fontSize: 12.5, margin: "8px 0 0" }}><a href="/workflows?tab=approvals" style={{ color: V.ink, textDecoration: "underline" }}>Review the drafted email</a></p>
                            )}
                          </div>
                        )}
                        {open && detail && detail.workflow.id === w.id && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${V.divider}`, display: "grid", gap: 14 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: V.secondary, margin: 0 }}>Run history</p>
                            {detail.runs.length === 0 && <p style={{ ...small, margin: 0 }}>No runs yet. {fromEvent ? "Press Test to try it." : "Press Run now to try it."}</p>}
                            {detail.runs.slice(0, 10).map((r) => <RunView key={r.id} run={r} catalog={catalog} />)}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}

              <p style={{ ...sectionLabel, margin: "26px 0 8px" }}>Start from a template</p>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                {catalog.templates.map((t) => (
                  <button key={t.key} type="button" onClick={() => setEditing({ name: t.name, description: t.description, definition: t.definition })}
                    className="hover-lift" style={{ textAlign: "left", padding: 14, borderRadius: 10, border: `1px solid ${V.divider}`, background: "#fff", cursor: "pointer" }}>
                    <div className="flex items-center justify-between" style={{ gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: V.ink }}>{t.name}</span>
                      <IconArrowRight size={14} />
                    </div>
                    <p style={{ ...small, margin: "6px 0 0", lineHeight: 1.45 }}>{t.description}</p>
                    <p style={{ ...small, margin: "8px 0 0" }}>{triggerText(t.definition.trigger, connections)} · {t.definition.steps.map(stepWord).join(" → ")}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <DashboardLayout pageTitle="Workflows">
      <Suspense fallback={null}>
        <WorkflowsInner />
      </Suspense>
    </DashboardLayout>
  );
}
