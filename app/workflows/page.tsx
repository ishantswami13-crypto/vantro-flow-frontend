"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button, Card, EmptyLine, ErrorBanner, SkeletonRows, StatusDot, V } from "@/components/v32/ui";
import { IconPlus, IconTrash, IconArrowRight } from "@/components/v32/icons";
import {
  api,
  type CustomWorkflow, type CustomWorkflowRun, type CustomWorkflowRunStep,
  type WorkflowCatalog, type WorkflowDefinition, type WorkflowStep, type WorkflowTrigger,
} from "@/lib/api";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/locale";

// Workflows: the owner's own automations, built from Starlane's agents.
//
//   trigger  →  agent  →  condition  →  action
//
// Everything here comes from the backend catalog (GET /api/custom-workflows/
// catalog): only triggers, agents and actions that really run can be picked;
// the rest are shown as "Coming soon" with the reason, and the backend refuses
// them too. Runs are real: each step's result is recorded and shown.

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
};

function hourLabel(h: number): string {
  return formatDate(new Date(Date.UTC(2026, 0, 1, h, 0)), { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

function triggerText(t: WorkflowTrigger | undefined): string {
  if (!t) return "";
  if (t.type === "manual") return "When you run it";
  const at = hourLabel(t.hour);
  if (t.every === "daily") return `Every day at ${at}`;
  return `Every ${WEEKDAYS.find((d) => d.key === t.weekday)?.label || ""} at ${at}`;
}

function newId(steps: WorkflowStep[], base: string): string {
  let i = 1;
  while (steps.some((s) => s.id === `${base}${i}`)) i++;
  return `${base}${i}`;
}

const field: React.CSSProperties = { padding: "8px 10px", border: `1px solid ${V.input}`, borderRadius: 6, font: "inherit", fontSize: 13.5, background: "#fff", color: V.ink, minWidth: 0 };
const small: React.CSSProperties = { fontSize: 12, color: V.tertiary };
const soonPill: React.CSSProperties = { fontSize: 10.5, color: V.tertiary, border: `1px solid ${V.divider}`, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" };

// ── Builder ─────────────────────────────────────────────────────────────

function StepEditor({ step, index, steps, catalog, onChange, onRemove, onMove }: {
  step: WorkflowStep; index: number; steps: WorkflowStep[]; catalog: WorkflowCatalog;
  onChange: (s: WorkflowStep) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const earlierAgents = steps.slice(0, index).filter((s): s is Extract<WorkflowStep, { type: "agent" }> => s.type === "agent");
  const agentName = (key: string) => catalog.agents.find((a) => a.key === key)?.name || key;
  const kind = step.type === "agent" ? "Run an agent" : step.type === "condition" ? "Only continue if" : "Then";

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
          return (
            <div style={{ display: "grid", gap: 10 }}>
              <select style={field} value={step.agent} onChange={(e) => onChange({ ...step, agent: e.target.value, params: undefined })}>
                {catalog.agents.map((a) => (
                  <option key={a.key} value={a.key} disabled={a.availability !== "available"}>{a.name}{a.availability !== "available" ? " (coming soon)" : ""}</option>
                ))}
              </select>
              {meta && <p style={{ ...small, margin: 0 }}>{meta.summary}</p>}
              {meta?.params?.map((p) => (
                <label key={p.key} style={{ display: "grid", gap: 4, fontSize: 12.5, color: V.secondary }}>{p.label}
                  <input style={{ ...field, maxWidth: 140 }} inputMode="numeric" value={step.params?.[p.key] ?? p.default}
                    onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); onChange({ ...step, params: { ...(step.params || {}), [p.key]: v ? Number(v) : p.default } }); }} />
                </label>
              ))}
            </div>
          );
        })()}

        {step.type === "condition" && (() => {
          const [ref, out] = step.signal.split(".");
          const agent = earlierAgents.find((a) => a.id === ref);
          const outputs = agent ? catalog.agents.find((a) => a.key === agent.agent)?.outputs || [] : [];
          const op = catalog.operators.find((o) => o.key === step.op);
          const unit = outputs.find((o) => o.key === out)?.unit;
          if (!earlierAgents.length) return <p style={{ ...small, margin: 0, color: V.critical }}>Put an agent step before this condition: a condition checks a number an agent produced.</p>;
          return (
            <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
              <select style={field} value={step.signal} onChange={(e) => onChange({ ...step, signal: e.target.value })}>
                {!agent && <option value={step.signal}>Pick a result</option>}
                {earlierAgents.flatMap((a) => (catalog.agents.find((m) => m.key === a.agent)?.outputs || []).map((o) => (
                  <option key={`${a.id}.${o.key}`} value={`${a.id}.${o.key}`}>{agentName(a.agent)} (step {steps.indexOf(a) + 1}): {o.label}</option>
                )))}
              </select>
              <select style={field} value={step.op} onChange={(e) => onChange({ ...step, op: e.target.value })}>
                {catalog.operators.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              {op?.needsValue && (
                <input style={{ ...field, width: 140 }} inputMode="decimal" value={step.value ?? ""} placeholder={unit === "money" ? "Amount" : "Number"}
                  onChange={(e) => { const v = e.target.value.replace(/[^0-9.-]/g, ""); onChange({ ...step, value: v === "" ? undefined : Number(v) }); }} />
              )}
              {op?.needsValue && unit === "money" && step.value != null && <span style={small}>{formatMoney(step.value)}</span>}
            </div>
          );
        })()}

        {step.type === "action" && (
          <div style={{ display: "grid", gap: 10 }}>
            <select style={field} value={step.action} onChange={(e) => onChange({ ...step, action: e.target.value })}>
              {catalog.actions.map((a) => (
                <option key={a.key} value={a.key} disabled={a.availability !== "available"}>{a.name}{a.availability !== "available" ? " (coming soon)" : ""}</option>
              ))}
            </select>
            <input style={field} maxLength={140} placeholder="What the notification says" value={step.params.title}
              onChange={(e) => onChange({ ...step, params: { ...step.params, title: e.target.value } })} />
            {earlierAgents.length > 0 && (
              <label style={{ display: "grid", gap: 4, fontSize: 12.5, color: V.secondary }}>Include the result of
                <select style={field} value={step.params.includeSummaryOf || ""} onChange={(e) => onChange({ ...step, params: { ...step.params, includeSummaryOf: e.target.value || undefined } })}>
                  <option value="">Nothing</option>
                  {earlierAgents.map((a) => <option key={a.id} value={a.id}>{agentName(a.agent)} (step {steps.indexOf(a) + 1})</option>)}
                </select>
              </label>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function Builder({ catalog, initial, onSaved, onCancel }: {
  catalog: WorkflowCatalog;
  initial: { id?: string; name: string; description?: string | null; definition: WorkflowDefinition };
  onSaved: (w: CustomWorkflow) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description || "");
  const [trigger, setTrigger] = useState<WorkflowTrigger>(initial.definition.trigger);
  const [steps, setSteps] = useState<WorkflowStep[]>(initial.definition.steps);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const scheduleOn = catalog.triggers.find((t) => t.type === "schedule")?.schedulerEnabled;
  const firstAgent = catalog.agents.find((a) => a.availability === "available");
  const firstAction = catalog.actions.find((a) => a.availability === "available");

  const add = (type: WorkflowStep["type"]) => {
    if (steps.length >= catalog.limits.maxSteps) return;
    if (type === "agent" && firstAgent) setSteps((s) => [...s, { id: newId(s, "agent"), type: "agent", agent: firstAgent.key }]);
    if (type === "condition") {
      const lastAgent = [...steps].reverse().find((s) => s.type === "agent") as Extract<WorkflowStep, { type: "agent" }> | undefined;
      const out = lastAgent ? catalog.agents.find((a) => a.key === lastAgent.agent)?.outputs[0]?.key : undefined;
      setSteps((s) => [...s, { id: newId(s, "check"), type: "condition", signal: lastAgent && out ? `${lastAgent.id}.${out}` : "", op: "gt", value: 0 }]);
    }
    if (type === "action" && firstAction) {
      const lastAgent = [...steps].reverse().find((s) => s.type === "agent");
      setSteps((s) => [...s, { id: newId(s, "notify"), type: "action", action: firstAction.key, params: { title: "", includeSummaryOf: lastAgent?.id } }]);
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

      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: V.secondary, margin: "0 0 8px" }}>When</p>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
          {catalog.triggers.map((t) => {
            const on = t.availability === "available";
            const selected = trigger.type === t.type;
            return (
              <button key={t.type} type="button" disabled={!on}
                onClick={() => setTrigger(t.type === "schedule" ? { type: "schedule", every: "weekly", weekday: "mon", hour: 9 } : { type: "manual" })}
                title={on ? t.summary : t.reason}
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
        {trigger.type === "schedule" && !scheduleOn && (
          <p style={{ ...small, marginTop: 8, color: V.warning }}>Scheduled runs are switched off on this workspace for now, so this will only run when you press Run now.</p>
        )}
      </div>

      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: V.secondary, margin: "0 0 8px" }}>Steps</p>
        {steps.length === 0 && <p style={{ ...small, margin: "0 0 10px" }}>Add an agent to do the work, then a condition and an action if you want one.</p>}
        {steps.map((s, i) => (
          <StepEditor key={s.id} step={s} index={i} steps={steps} catalog={catalog}
            onChange={(n) => setSteps((all) => all.map((x, j) => (j === i ? n : x)))}
            onRemove={() => setSteps((all) => all.filter((_, j) => j !== i))}
            onMove={(d) => move(i, d)} />
        ))}
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 4 }}>
          <Button small onClick={() => add("agent")} disabled={steps.length >= catalog.limits.maxSteps}><IconPlus size={13} /> Agent</Button>
          <Button small onClick={() => add("condition")} disabled={steps.length >= catalog.limits.maxSteps || !steps.some((s) => s.type === "agent")}><IconPlus size={13} /> Condition</Button>
          <Button small onClick={() => add("action")} disabled={steps.length >= catalog.limits.maxSteps}><IconPlus size={13} /> Action</Button>
        </div>
        <details style={{ marginTop: 14 }}>
          <summary style={{ ...small, cursor: "pointer" }}>Coming soon to workflows</summary>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
            {[...catalog.agents, ...catalog.actions].filter((x) => x.availability !== "available").map((x) => (
              <li key={"key" in x ? x.key : ""} style={small}><span style={{ color: V.ink }}>{x.name}</span>: {x.reason}</li>
            ))}
          </ul>
        </details>
      </div>

      {errors.length > 0 && (
        <ErrorBanner>
          {errors.length === 1 ? errors[0] : <ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </ErrorBanner>
      )}
      <div className="flex items-center" style={{ gap: 10 }}>
        <Button primary onClick={save} disabled={saving || !name.trim()}>{saving ? "Saving…" : initial.id ? "Save changes" : "Save workflow"}</Button>
        <Button onClick={onCancel}>Cancel</Button>
        <span style={small}>New workflows start as drafts. Turn one on when it looks right.</span>
      </div>
    </div>
  );
}

// ── Runs ────────────────────────────────────────────────────────────────

function RunView({ run, catalog }: { run: { status: CustomWorkflowRun["status"]; steps: CustomWorkflowRunStep[]; summary: string | null; error: string | null; startedAt?: string }; catalog: WorkflowCatalog | null }) {
  const st = RUN_STATUS[run.status] || { label: run.status, color: V.neutralDot };
  const label = (s: CustomWorkflowRunStep) => {
    if (s.type === "agent") return catalog?.agents.find((a) => a.key === s.agent)?.name || "Agent";
    if (s.type === "condition") return "Condition";
    return "Action";
  };
  const outputText = (s: CustomWorkflowRunStep) => {
    if (!s.outputs || !s.agent) return null;
    const meta = catalog?.agents.find((a) => a.key === s.agent)?.outputs || [];
    const parts = meta.map((o) => {
      const v = s.outputs?.[o.key];
      if (v === null || v === undefined) return null;
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
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
        {run.steps.map((s, i) => {
          const ss = STEP_STATUS[s.status] || { label: s.status, color: V.neutralDot };
          const out = outputText(s);
          return (
            <li key={`${s.id}-${i}`} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: 8, opacity: s.status === "SKIPPED" ? 0.55 : 1 }}>
              <span style={{ ...small, fontWeight: 600 }}>{i + 1}.</span>
              <div style={{ minWidth: 0 }}>
                <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: V.ink }}>{label(s)}</span>
                  <StatusDot label={ss.label} color={ss.color} />
                  {s.durationMs != null && <span style={small}>{s.durationMs < 1000 ? `${s.durationMs} ms` : `${(s.durationMs / 1000).toFixed(1)} s`}</span>}
                </div>
                {s.summary && <p style={{ fontSize: 12.5, color: V.secondary, margin: "2px 0 0" }}>{s.summary}</p>}
                {out && <p style={{ ...small, margin: "2px 0 0" }}>{out}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

function WorkflowsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("id");
  const [catalog, setCatalog] = useState<WorkflowCatalog | null>(null);
  const [list, setList] = useState<CustomWorkflow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; name: string; description?: string | null; definition: WorkflowDefinition } | null>(null);
  const [detail, setDetail] = useState<{ workflow: CustomWorkflow; runs: CustomWorkflowRun[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Record<string, { status: CustomWorkflowRun["status"]; steps: CustomWorkflowRunStep[]; summary: string | null; error: string | null }>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, l] = await Promise.all([api.customWorkflows.catalog(), api.customWorkflows.list()]);
      setCatalog(c); setList(l.workflows);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load workflows."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    api.customWorkflows.get(openId).then(setDetail).catch((e) => setError(e instanceof Error ? e.message : "Could not load the workflow."));
  }, [openId]);

  const refreshOne = async (id: string) => {
    await load();
    if (openId === id) setDetail(await api.customWorkflows.get(id));
  };

  const act = async (w: CustomWorkflow, what: "run" | "activate" | "pause" | "remove") => {
    if (what === "remove" && !window.confirm(`Delete "${w.name}"? Its run history goes with it.`)) return;
    setBusy(`${w.id}:${what}`); setError(null);
    try {
      if (what === "run") {
        const { run } = await api.customWorkflows.run(w.id);
        setLastRun((m) => ({ ...m, [w.id]: run }));
      } else if (what === "activate") await api.customWorkflows.activate(w.id);
      else if (what === "pause") await api.customWorkflows.pause(w.id);
      else { await api.customWorkflows.remove(w.id); if (openId === w.id) router.replace("/workflows"); }
      await refreshOne(w.id).catch(() => load());
    } catch (e) { setError(e instanceof Error ? e.message : "That did not work. Nothing was changed."); }
    finally { setBusy(null); }
  };

  const blank = useMemo<WorkflowDefinition>(() => ({ trigger: { type: "manual" }, steps: [] }), []);

  const header = (
    <PageHeader
      title="Workflows"
      subtitle="Chain Starlane's agents into automations of your own: pick when it runs, what the agents do, and what happens with the result."
      right={!editing ? <Button primary onClick={() => setEditing({ name: "", definition: blank })}><IconPlus size={14} /> New workflow</Button> : undefined}
    />
  );

  if (editing && catalog) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        {header}
        <Builder catalog={catalog} initial={editing} onCancel={() => setEditing(null)}
          onSaved={(w) => { setEditing(null); load(); router.replace(`/workflows?id=${w.id}`); }} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {header}
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
                return (
                  <Card key={w.id} style={{ padding: 14 }}>
                    <div className="flex items-start justify-between flex-wrap" style={{ gap: 12 }}>
                      <button type="button" onClick={() => router.replace(open ? "/workflows" : `/workflows?id=${w.id}`)} className="hover-dim" style={{ textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", minWidth: 0, flex: "1 1 280px" }}>
                        <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 600, color: V.ink }}>{w.name}</span>
                          <StatusDot label={st.label} color={st.color} />
                        </div>
                        <p style={{ fontSize: 12.5, color: V.secondary, margin: "4px 0 0" }}>
                          {triggerText(w.definition.trigger)} · {w.definition.steps.length} step{w.definition.steps.length === 1 ? "" : "s"}
                          {w.lastRun ? ` · last run ${formatDateTime(w.lastRun.startedAt)} (${RUN_STATUS[w.lastRun.status]?.label.toLowerCase() || w.lastRun.status})` : " · never run"}
                          {w.nextRunAt ? ` · next ${formatDateTime(w.nextRunAt)}` : ""}
                        </p>
                        {w.description && <p style={{ ...small, margin: "4px 0 0" }}>{w.description}</p>}
                      </button>
                      <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
                        <Button small primary onClick={() => act(w, "run")} disabled={!!busy}>{busy === `${w.id}:run` ? "Running…" : "Run now"}</Button>
                        {w.status === "ACTIVE"
                          ? <Button small onClick={() => act(w, "pause")} disabled={!!busy}>Pause</Button>
                          : <Button small onClick={() => act(w, "activate")} disabled={!!busy}>Turn on</Button>}
                        <Button small onClick={() => setEditing({ id: w.id, name: w.name, description: w.description, definition: w.definition })} disabled={!!busy}>Edit</Button>
                        <button type="button" onClick={() => act(w, "remove")} disabled={!!busy} className="hover-dim" aria-label={`Delete ${w.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: V.tertiary, display: "flex" }}><IconTrash size={14} /></button>
                      </div>
                    </div>
                    {run && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${V.divider}` }}>
                        <RunView run={run} catalog={catalog} />
                      </div>
                    )}
                    {open && detail && detail.workflow.id === w.id && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${V.divider}`, display: "grid", gap: 14 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: V.secondary, margin: 0 }}>Recent runs</p>
                        {detail.runs.length === 0 && <p style={{ ...small, margin: 0 }}>No runs yet. Press Run now to try it.</p>}
                        {detail.runs.slice(0, 5).map((r) => <RunView key={r.id} run={r} catalog={catalog} />)}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <p style={{ fontSize: 12, fontWeight: 600, color: V.secondary, margin: "26px 0 8px" }}>Start from a template</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {catalog.templates.map((t) => (
              <button key={t.key} type="button" onClick={() => setEditing({ name: t.name, description: t.description, definition: t.definition })}
                className="hover-lift" style={{ textAlign: "left", padding: 14, borderRadius: 10, border: `1px solid ${V.divider}`, background: "#fff", cursor: "pointer" }}>
                <div className="flex items-center justify-between" style={{ gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: V.ink }}>{t.name}</span>
                  <IconArrowRight size={14} />
                </div>
                <p style={{ ...small, margin: "6px 0 0", lineHeight: 1.45 }}>{t.description}</p>
                <p style={{ ...small, margin: "8px 0 0" }}>{triggerText(t.definition.trigger)} · {t.definition.steps.map((s) => s.type === "agent" ? catalog.agents.find((a) => a.key === s.agent)?.name : s.type === "condition" ? "check" : "notify").join(" → ")}</p>
              </button>
            ))}
          </div>
        </div>
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
