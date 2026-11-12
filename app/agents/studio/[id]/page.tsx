"use client";

// Agent Studio: one custom agent through its six stages.
//   Objective       what it is for, its instructions and expected results
//   Knowledge/tools which collections it may read and which tools it may call
//   Configure       triggers, limits, approvals, model, input/output fields, sharing
//   Test            a test run of the saved draft (writes become dry runs)
//   Deploy          checks, publish an immutable version, turn on or off
//   Monitor         its runs, and a live run
// Everything is validated again by the server (normalizeDefinition); the
// studio only edits the draft. Publishing needs a passing test of the exact
// draft, and turning it on re-runs the checks.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { API_BASE } from "@/lib/api";
import { PageHeader, Button, EmptyLine, ago } from "@/components/v32/ui";
import { IconCopy } from "@/components/v32/icons";
import {
  platformApi, RISK_LABEL, describeTrigger, newIdempotencyKey,
  type AgentDefinition, type AgentDetail, type Field as DefField, type Trigger, type ToolInfo,
} from "@/lib/platform";
import {
  useActiveOrg, useWorkspace, can, Field, Section, Chip, AgentStatusChip, ExecStatusChip, Loading, PlatformErrorBanner,
  useAction, InlineError, duration, when,
} from "@/components/platform/ui";
import { useExecution, RunBody } from "@/components/platform/RunView";

type Stage = "objective" | "knowledge" | "configure" | "test" | "deploy" | "monitor";
const STAGES: { key: Stage; label: string }[] = [
  { key: "objective", label: "Objective" },
  { key: "knowledge", label: "Knowledge and tools" },
  { key: "configure", label: "Configure" },
  { key: "test", label: "Test" },
  { key: "deploy", label: "Deploy" },
  { key: "monitor", label: "Monitor" },
];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);

// ── Small editors ──────────────────────────────────────────────────────
function FieldsEditor({ value, onChange, disabled, what }: { value: DefField[]; onChange: (v: DefField[]) => void; disabled: boolean; what: string }) {
  const set = (i: number, patch: Partial<DefField>) => onChange(value.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  return (
    <div className="pf-stack" style={{ gap: 8 }}>
      {value.length === 0 && <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No {what} fields.</p>}
      {value.map((f, i) => (
        <div key={i} className="flex flex-wrap items-center" style={{ gap: 8 }}>
          <input aria-label={`${what} field name`} className="pf-input" style={{ width: 170 }} value={f.name} disabled={disabled} placeholder="field_name" onChange={(e) => set(i, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} />
          <select aria-label={`${what} field type`} className="pf-select" style={{ width: 110 }} value={f.type} disabled={disabled} onChange={(e) => set(i, { type: e.target.value as DefField["type"] })}>
            <option value="text">Text</option><option value="number">Number</option><option value="boolean">Yes or no</option>
          </select>
          <input aria-label={`${what} field description`} className="pf-input" style={{ flex: 1, minWidth: 160 }} value={f.description} disabled={disabled} placeholder="What it is" onChange={(e) => set(i, { description: e.target.value })} />
          <label className="pf-toggle"><input type="checkbox" checked={f.required} disabled={disabled} onChange={(e) => set(i, { required: e.target.checked })} />Required</label>
          {!disabled && <Button small onClick={() => onChange(value.filter((_, k) => k !== i))}>Remove</Button>}
        </div>
      ))}
      {!disabled && value.length < 20 && <div><Button small onClick={() => onChange([...value, { name: "", type: "text", required: false, description: "" }])}>Add a field</Button></div>}
    </div>
  );
}

function ToolRow({ t, granted, requiresApproval, disabled, onToggle, onApproval }: { t: ToolInfo; granted: boolean; requiresApproval: boolean; disabled: boolean; onToggle: (on: boolean) => void; onApproval: (on: boolean) => void }) {
  const unavailable = t.status !== "available";
  return (
    <div className="pf-row" style={{ alignItems: "flex-start" }}>
      <input type="checkbox" aria-label={`Allow ${t.name}`} checked={granted} disabled={disabled || (t.status === "planned" && !granted)} onChange={(e) => onToggle(e.target.checked)} style={{ marginTop: 3, accentColor: "#191917" }} />
      <div className="pf-row-main">
        <div className="pf-row-title" style={{ whiteSpace: "normal" }}>{t.name} <span style={{ color: "#8F8A81", fontSize: 12 }}>· {RISK_LABEL[t.risk]}</span></div>
        <div className="pf-row-sub" style={{ whiteSpace: "normal" }}>{t.description}</div>
        {unavailable && <div style={{ fontSize: 12, color: "#8C6826", marginTop: 3 }}>{t.status === "planned" ? "Planned. Not built yet." : t.reason || t.status.replace(/_/g, " ")}</div>}
        {granted && (
          <label className="pf-toggle" style={{ marginTop: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={requiresApproval || t.alwaysRequiresApproval} disabled={disabled || t.alwaysRequiresApproval} onChange={(e) => onApproval(e.target.checked)} />
            {t.alwaysRequiresApproval ? "Always waits for a person's approval" : "Wait for a person's approval before each use"}
          </label>
        )}
      </div>
      <Chip tone={t.status === "available" ? "good" : t.status === "planned" ? undefined : "warn"}>{t.status === "available" ? "Available" : t.status === "planned" ? "Planned" : t.status === "disabled_by_policy" ? "Off by policy" : "Needs setup"}</Chip>
    </div>
  );
}

/** Instruction plus the agent's declared input fields; builds the run input. */
function RunInputs({ def, prefix, onChange }: { def: AgentDefinition; prefix: string; onChange: (input: Record<string, unknown>) => void }) {
  const [instruction, setInstruction] = useState("");
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  useEffect(() => {
    const input: Record<string, unknown> = {};
    if (instruction.trim()) input.instruction = instruction.trim();
    for (const f of def.input_schema.fields) {
      const v = values[f.name];
      if (v === undefined || v === "") continue;
      input[f.name] = f.type === "number" ? Number(v) : v;
    }
    onChange(input);
  }, [instruction, values, def.input_schema.fields, onChange]);
  return (
    <>
      <Field label="Instruction for this run" htmlFor={`${prefix}-instr`} hint="Optional. What you would ask the agent to do right now.">
        <textarea id={`${prefix}-instr`} className="pf-textarea" rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
      </Field>
      {def.input_schema.fields.length > 0 && (
        <div className="pf-grid2">
          {def.input_schema.fields.map((f) => (
            <Field key={f.name} label={`${f.name}${f.required ? " (required)" : ""}`} hint={f.description || undefined} htmlFor={`${prefix}-${f.name}`}>
              {f.type === "boolean" ? (
                <label className="pf-toggle"><input id={`${prefix}-${f.name}`} type="checkbox" checked={values[f.name] === true} onChange={(e) => setValues({ ...values, [f.name]: e.target.checked })} />Yes</label>
              ) : (
                <input id={`${prefix}-${f.name}`} className="pf-input" type={f.type === "number" ? "number" : "text"} value={String(values[f.name] ?? "")} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />
              )}
            </Field>
          ))}
        </div>
      )}
    </>
  );
}

// ── Stages ─────────────────────────────────────────────────────────────
function TestStage({ agent, dirty, canTest }: { agent: AgentDetail; dirty: boolean; canTest: boolean }) {
  const qc = useQueryClient();
  const def = agent.definition;
  const [input, setInput] = useState<Record<string, unknown>>({});
  const [execId, setExecId] = useState<string | null>(agent.lastTest?.id || null);
  const act = useAction();
  const ex = useExecution(execId);
  useEffect(() => {
    if (ex.data && !["queued", "running"].includes(ex.data.status)) qc.invalidateQueries({ queryKey: ["platform", "agent", agent.id] });
  }, [ex.data?.status, agent.id, qc, ex.data]);

  async function start() {
    const r = await act.run(() => platformApi.test(agent.id, input));
    if (r) setExecId(r.executionId);
  }

  return (
    <div className="pf-stack">
      <div className="pf-note">A test runs the saved draft exactly as a live run would, except that tools which write anything (tasks, notifications, calls to other systems) are recorded as dry runs and do nothing. Publishing requires a completed test of the current draft.</div>
      {dirty && <div className="pf-note is-warn">You have unsaved changes. Save them first: tests run the saved draft.</div>}
      {agent.lastTest && (
        <p style={{ fontSize: 12.5, color: "#6E6A63", margin: 0 }}>
          Last test: <ExecStatusChip status={agent.lastTest.status} /> {agent.lastTest.finishedAt ? `· ${ago(agent.lastTest.finishedAt)}` : ""} · {agent.lastTest.matchesDraft ? "matches the current draft" : "the draft has changed since"}
        </p>
      )}
      <RunInputs def={def} prefix="t" onChange={setInput} />
      <div className="flex items-center" style={{ gap: 10 }}>
        <Button primary disabled={!canTest || dirty || act.busy} onClick={start}>{act.busy ? "Starting…" : "Run a test"}</Button>
        {!canTest && <span style={{ fontSize: 12.5, color: "#8F8A81" }}>Only people who can edit this agent can test it.</span>}
      </div>
      <InlineError error={act.error} />
      {execId && (
        <Section title="Test run" aside={<Link href={`/command/runs/${execId}`}>Open the full run</Link>}>
          {ex.isLoading ? <Loading rows={2} /> : ex.data ? (
            <div className="pf-stack">
              <div className="flex items-center" style={{ gap: 8, fontSize: 12.5, color: "#6E6A63" }}><ExecStatusChip status={ex.data.status} /> {duration(ex.data.durationMs)} · {ex.data.modelCalls} model call(s), {ex.data.toolCalls} tool call(s)</div>
              <RunBody ex={ex.data} />
            </div>
          ) : <PlatformErrorBanner error={ex.error} what="The test run" />}
        </Section>
      )}
    </div>
  );
}

function DeployStage({ agent, dirty, canEditAgent }: { agent: AgentDetail; dirty: boolean; canEditAgent: boolean }) {
  const qc = useQueryClient();
  const checks = useQuery({ queryKey: ["platform", "agent-checks", agent.id, agent.draftDiffersFromPublished, agent.status], queryFn: () => platformApi.checks(agent.id) });
  const [notes, setNotes] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  const version = useQuery({ queryKey: ["platform", "agent-version", agent.id, viewVersion], queryFn: () => platformApi.version(agent.id, viewVersion as number), enabled: viewVersion != null });
  const act = useAction();
  const refresh = () => qc.invalidateQueries({ queryKey: ["platform"] });
  const blocking = (checks.data?.checks || []).filter((c) => c.blocking && !c.ok);
  const tested = !!agent.lastTest && agent.lastTest.status === "completed" && agent.lastTest.matchesDraft;
  const hasWebhook = agent.definition.triggers.some((t) => t.type === "webhook");
  const hookUrl = token ? `${API_BASE.replace(/\/$/, "")}/api/platform/hooks/agents/${token}` : null;

  return (
    <div className="pf-stack">
      <Section title="Checks" aside={<button type="button" onClick={() => checks.refetch()} style={{ textDecoration: "underline" }}>Check again</button>}>
        {checks.isLoading ? <Loading rows={3} height={40} /> : checks.error ? <PlatformErrorBanner error={checks.error} what="Checks" /> : (
          <div className="pf-list">
            {(checks.data?.checks || []).map((c) => (
              <div key={c.key} className="pf-row">
                <div className="pf-row-main"><div className="pf-row-title" style={{ whiteSpace: "normal" }}>{c.message}</div></div>
                <Chip tone={c.ok ? "good" : c.blocking ? "bad" : "warn"}>{c.ok ? "OK" : c.blocking ? "Blocks deploy" : "Note"}</Chip>
              </div>
            ))}
            <div className="pf-row">
              <div className="pf-row-main"><div className="pf-row-title" style={{ whiteSpace: "normal" }}>{tested ? "The current draft passed a test run." : agent.lastTest?.status === "completed" ? "The draft changed after the last test. Test it again." : "Run a test of the current draft (Test stage)."}</div></div>
              <Chip tone={tested ? "good" : "bad"}>{tested ? "OK" : "Blocks publish"}</Chip>
            </div>
          </div>
        )}
      </Section>

      <Section title="Publish a version">
        <div className="pf-stack" style={{ gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#43433F" }}>Publishing freezes the current draft as version {(agent.publishedVersion || 0) + 1}. Versions cannot be changed afterwards; live runs use the published version.</p>
          <Field label="What changed" htmlFor="pub-notes"><input id="pub-notes" className="pf-input" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note for the version history" /></Field>
          <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
            <Button primary disabled={!canEditAgent || dirty || !tested || blocking.length > 0 || !agent.draftDiffersFromPublished || act.busy} onClick={() => act.run(async () => { await platformApi.publish(agent.id, notes || undefined); setNotes(""); await refresh(); })}>
              Publish version {(agent.publishedVersion || 0) + 1}
            </Button>
            {!agent.draftDiffersFromPublished && agent.publishedVersion != null && <span style={{ fontSize: 12.5, color: "#8F8A81" }}>The draft matches version {agent.publishedVersion}.</span>}
          </div>
        </div>
      </Section>

      <Section title="Status">
        <div className="pf-stack" style={{ gap: 10 }}>
          <div className="flex items-center" style={{ gap: 8 }}><AgentStatusChip status={agent.status} /><span style={{ fontSize: 12.5, color: "#6E6A63" }}>{agent.status === "active" ? `Running version ${agent.publishedVersion}${agent.nextScheduledAt ? `, next scheduled ${when(agent.nextScheduledAt)}` : ""}.` : agent.publishedVersion ? "Published but not on. Turn it on to allow live runs and triggers." : "Not published yet."}</span></div>
          {canEditAgent && (
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {agent.status !== "active" && agent.status !== "archived" && (
                <Button primary disabled={act.busy || agent.publishedVersion == null} onClick={() => act.run(async () => { const r = await platformApi.activate(agent.id); if (r.webhookToken) setToken(r.webhookToken); await refresh(); })}>Turn on</Button>
              )}
              {agent.status === "active" && <Button disabled={act.busy} onClick={() => act.run(async () => { await platformApi.deactivate(agent.id); await refresh(); })}>Turn off</Button>}
              {agent.status !== "archived" && <Button disabled={act.busy} onClick={() => { if (window.confirm("Archive this agent? It stops running and moves to Disabled and archived. You can restore it.")) act.run(async () => { await platformApi.archive(agent.id); await refresh(); }); }}>Archive</Button>}
              {agent.status === "archived" && <Button disabled={act.busy} onClick={() => act.run(async () => { await platformApi.restore(agent.id); await refresh(); })}>Restore</Button>}
              {hasWebhook && agent.hasWebhook && <Button disabled={act.busy} onClick={() => { if (window.confirm("Replace the webhook address? The old one stops working immediately.")) act.run(async () => { const r = await platformApi.rotateWebhook(agent.id); setToken(r.webhookToken); }); }}>New webhook address</Button>}
            </div>
          )}
          {token && hookUrl && (
            <div className="pf-note is-warn">
              <div style={{ marginBottom: 6 }}>Webhook address. It is shown once; Starlane keeps only a hash of it. POST JSON to it to start a run.</div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <code className="pf-pre" style={{ flex: 1, padding: "6px 8px" }}>{hookUrl}</code>
                <Button small onClick={() => navigator.clipboard?.writeText(hookUrl)}><IconCopy size={12} /> Copy</Button>
              </div>
            </div>
          )}
          <InlineError error={act.error} />
        </div>
      </Section>

      <Section title="Versions">
        {agent.versions.length === 0 ? <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No published versions yet.</p> : (
          <div className="pf-list">
            {agent.versions.map((v) => (
              <Fragment key={v.version}>
                <button type="button" className="pf-row w-full text-left" aria-expanded={viewVersion === v.version} onClick={() => setViewVersion(viewVersion === v.version ? null : v.version)}>
                  <div className="pf-row-main">
                    <div className="pf-row-title">Version {v.version}{v.version === agent.publishedVersion ? " (current)" : ""}</div>
                    <div className="pf-row-sub">{when(v.publishedAt)}{v.publishedBy ? ` by ${v.publishedBy}` : ""}{v.notes ? ` · ${v.notes}` : ""} · {v.checksum.slice(0, 12)}</div>
                  </div>
                </button>
                {viewVersion === v.version && <div style={{ padding: "0 16px 14px" }}>{version.isLoading ? <Loading rows={1} /> : version.data ? <pre className="pf-pre">{JSON.stringify(version.data.version.definition, null, 2)}</pre> : <PlatformErrorBanner error={version.error} what="This version" />}</div>}
              </Fragment>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function MonitorStage({ agent }: { agent: AgentDetail }) {
  const router = useRouter();
  const runs = useQuery({ queryKey: ["platform", "agent-runs", agent.id], queryFn: () => platformApi.executions({ agentId: agent.id, limit: 50 }), refetchInterval: 10_000 });
  const [input, setInput] = useState<Record<string, unknown>>({});
  const [key, setKey] = useState(() => newIdempotencyKey());
  // A new idempotency key per distinct input: a double click sends the same run once.
  const onInput = useCallback((i: Record<string, unknown>) => { setInput(i); setKey(newIdempotencyKey()); }, []);
  const act = useAction();
  const list = runs.data?.executions || [];
  const done = list.filter((r) => r.mode === "live" && ["completed", "failed"].includes(r.status));
  const ok = done.filter((r) => r.status === "completed").length;
  return (
    <div className="pf-stack">
      {agent.canRun ? (
        <Section title="Run now">
          <div className="pf-stack" style={{ gap: 10 }}>
            <RunInputs def={agent.definition} prefix="r" onChange={onInput} />
            <p style={{ fontSize: 12, color: "#8F8A81", margin: 0 }}>Live runs use published version {agent.publishedVersion}. Steps that need approval pause the run until someone decides.</p>
            <div><Button primary disabled={act.busy} onClick={() => act.run(async () => { const r = await platformApi.run(agent.id, input, key); router.push(`/command/runs/${r.executionId}`); })}>Start a live run</Button></div>
            <InlineError error={act.error} />
          </div>
        </Section>
      ) : <div className="pf-note">{agent.status === "active" ? "Your role can view this agent's runs but not start them." : "Turn the agent on (Deploy stage) to run it live."}</div>}

      <Section title="Runs" aside={done.length ? `${ok} of ${done.length} finished live runs completed in this list` : undefined}>
        {runs.isLoading ? <Loading rows={3} /> : runs.error ? <PlatformErrorBanner error={runs.error} what="Runs" /> : list.length === 0 ? <EmptyLine title="No runs yet" body="Tests and live runs will appear here." /> : (
          <div className="pf-list">
            {list.map((r) => (
              <Link key={r.id} href={`/command/runs/${r.id}`} className="pf-row">
                <div className="pf-row-main">
                  <div className="pf-row-title">{r.mode === "test" ? "Test" : "Live"} · {r.trigger}{r.agentVersion != null ? ` · v${r.agentVersion}` : ""}</div>
                  <div className="pf-row-sub">{when(r.createdAt)} · {duration(r.durationMs)} · {r.requestedByEmail || "trigger"}{r.errorClass ? ` · ${r.errorClass.replace(/_/g, " ").toLowerCase()}` : ""}</div>
                </div>
                <ExecStatusChip status={r.status} />
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────
export default function AgentStudioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const org = useActiveOrg();
  const ws = useWorkspace();
  const q = useQuery({ queryKey: ["platform", "agent", id], queryFn: () => platformApi.agent(id).then((r) => r.agent), retry: false });
  const tools = useQuery({ queryKey: ["platform", "tools", org], queryFn: () => platformApi.tools() });
  const collections = useQuery({ queryKey: ["platform", "collections", org], queryFn: () => platformApi.collections() });
  const teams = useQuery({ queryKey: ["platform", "teams", org], queryFn: () => platformApi.teams() });
  const agent = q.data;

  const [stage, setStage] = useState<Stage>("objective");
  const [def, setDef] = useState<AgentDefinition | null>(null);
  const [visibility, setVisibility] = useState<"private" | "team" | "organization">("private");
  const [teamId, setTeamId] = useState<string>("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const save = useAction();
  const dup = useAction();

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("stage") as Stage | null;
    if (s && STAGES.some((x) => x.key === s)) setStage(s);
  }, []);
  // Load the draft into the editor once per saved version of it.
  useEffect(() => {
    if (agent && loadedFor !== `${agent.id}:${agent.updatedAt}`) {
      setDef(agent.definition);
      setVisibility(agent.visibility);
      setTeamId(agent.teamId || "");
      setLoadedFor(`${agent.id}:${agent.updatedAt}`);
    }
  }, [agent, loadedFor]);

  const dirty = useMemo(() => !!agent && !!def && (JSON.stringify(def) !== JSON.stringify(agent.definition) || visibility !== agent.visibility || (visibility === "team" && teamId !== (agent.teamId || ""))), [agent, def, visibility, teamId]);
  const editable = !!agent?.canEdit && agent.status !== "archived";

  function go(s: Stage) {
    setStage(s);
    const url = new URL(window.location.href);
    url.searchParams.set("stage", s);
    window.history.replaceState(null, "", url.toString());
  }
  const patch = (p: Partial<AgentDefinition>) => setDef((d) => (d ? { ...d, ...p } : d));
  async function saveDraft() {
    if (!def) return;
    const ok = await save.run(async () => { await platformApi.updateAgent(id, { definition: def, visibility, teamId: visibility === "team" ? teamId || null : null }); return true; });
    if (ok) await qc.invalidateQueries({ queryKey: ["platform"] });
  }

  const toolList = tools.data?.tools || [];
  const granted = new Map((def?.tools || []).map((t) => [t.key, t]));
  const schedule = def?.triggers.find((t) => t.type === "schedule") as Extract<Trigger, { type: "schedule" }> | undefined;
  const webhook = !!def?.triggers.some((t) => t.type === "webhook");
  const setTriggers = (sched: Extract<Trigger, { type: "schedule" }> | null, hook: boolean) =>
    patch({ triggers: [{ type: "manual" }, ...(sched ? [sched] : []), ...(hook ? [{ type: "webhook" } as Trigger] : [])] });

  return (
    <DashboardLayout pageTitle={agent?.name || "Agent studio"}>
      <PageHeader
        title={agent?.name || "Agent studio"}
        subtitle={agent ? <span className="flex items-center flex-wrap" style={{ gap: 8 }}><AgentStatusChip status={agent.status} />{agent.publishedVersion != null ? `Version ${agent.publishedVersion} published` : "Draft, not published"}{agent.draftDiffersFromPublished && agent.publishedVersion != null ? " · unpublished changes" : ""}{agent.ownerEmail ? ` · owner ${agent.ownerEmail}` : ""}</span> : undefined}
        right={agent && <>
          {can(ws.data, "agents.create") && <Button disabled={dup.busy} onClick={() => dup.run(async () => { const r = await platformApi.duplicate(agent.id); router.push(`/agents/studio/${r.id}`); })}>Duplicate</Button>}
          {editable && <Button primary disabled={!dirty || save.busy} onClick={saveDraft}>{save.busy ? "Saving…" : dirty ? "Save draft" : "Saved"}</Button>}
        </>}
      />
      <InlineError error={save.error || dup.error} />

      {q.isLoading && <div style={{ marginTop: 22 }}><Loading rows={4} height={60} /></div>}
      {q.error && <div style={{ marginTop: 22 }}><PlatformErrorBanner error={q.error} what="This agent" /></div>}

      {agent && def && (
        <>
          <nav className="pf-stages" aria-label="Studio stages">
            {STAGES.map((s, i) => (
              <button key={s.key} type="button" className={`pf-stage ${stage === s.key ? "is-on" : ""}`} aria-current={stage === s.key ? "step" : undefined} onClick={() => go(s.key)}>
                <b>{i + 1}</b>{s.label}
              </button>
            ))}
          </nav>
          {!agent.canEdit && <div className="pf-note" style={{ marginBottom: 16 }}>You can view this agent but not change it. Its owner or an organization admin can.</div>}
          {agent.status === "archived" && <div className="pf-note" style={{ marginBottom: 16 }}>This agent is archived. Restore it in the Deploy stage to change it.</div>}

          <div className="fade-once" style={{ maxWidth: 920 }}>
            {stage === "objective" && (
              <div className="pf-stack">
                <div className="pf-grid2">
                  <Field label="Name" htmlFor="name"><input id="name" className="pf-input" maxLength={80} value={def.name} disabled={!editable} onChange={(e) => patch({ name: e.target.value })} /></Field>
                  <Field label="Short description" htmlFor="desc"><input id="desc" className="pf-input" maxLength={500} value={def.description} disabled={!editable} onChange={(e) => patch({ description: e.target.value })} /></Field>
                </div>
                <Field label="Objective" htmlFor="obj" hint="The job, in one or two sentences. The agent sees this on every run."><textarea id="obj" className="pf-textarea" rows={3} maxLength={2000} value={def.objective} disabled={!editable} onChange={(e) => patch({ objective: e.target.value })} /></Field>
                <Field label="Instructions" htmlFor="instr" hint="How to do the job: steps, tone, what to check, what never to do."><textarea id="instr" className="pf-textarea" rows={9} maxLength={8000} value={def.instructions} disabled={!editable} onChange={(e) => patch({ instructions: e.target.value })} /></Field>
                <div className="pf-grid2">
                  <Field label="Expected results" htmlFor="outs" hint="One per line."><textarea id="outs" className="pf-textarea" rows={4} value={def.expected_outputs.join("\n")} disabled={!editable} onChange={(e) => patch({ expected_outputs: lines(e.target.value) })} /></Field>
                  <Field label="Success criteria" htmlFor="succ" hint="One per line. How you will judge a good run."><textarea id="succ" className="pf-textarea" rows={4} value={def.success_criteria.join("\n")} disabled={!editable} onChange={(e) => patch({ success_criteria: lines(e.target.value) })} /></Field>
                </div>
              </div>
            )}

            {stage === "knowledge" && (
              <div className="pf-stack">
                <Section title="Knowledge" aside={<Link href="/knowledge">Manage collections</Link>}>
                  {collections.isLoading ? <Loading rows={2} /> : collections.error ? <PlatformErrorBanner error={collections.error} what="Collections" /> : (collections.data?.collections || []).length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No knowledge collections yet. Create one in Knowledge and add documents; then grant it here.</p>
                  ) : (
                    <div className="pf-list">
                      {(collections.data?.collections || []).map((c) => {
                        const on = def.knowledge.collection_ids.includes(c.id);
                        return (
                          <label key={c.id} className="pf-row" style={{ cursor: editable ? "pointer" : "default" }}>
                            <input type="checkbox" checked={on} disabled={!editable} style={{ accentColor: "#191917" }} onChange={(e) => patch({ knowledge: { collection_ids: e.target.checked ? [...def.knowledge.collection_ids, c.id] : def.knowledge.collection_ids.filter((x) => x !== c.id) } })} />
                            <div className="pf-row-main"><div className="pf-row-title">{c.name}</div><div className="pf-row-sub">{c.scope === "personal" ? "Personal" : c.scope === "team" ? `Team${c.teamName ? `: ${c.teamName}` : ""}` : "Organization"} · {c.documentCount} document{c.documentCount === 1 ? "" : "s"}</div></div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: "#8F8A81", margin: "8px 0 0" }}>An agent never reads more than the person it runs for could read. With no collection chosen, knowledge tools search everything that person can read.</p>
                </Section>
                <Section title="Tools" aside={`${def.tools.length} of 20`}>
                  {tools.isLoading ? <Loading rows={3} /> : tools.error ? <PlatformErrorBanner error={tools.error} what="Tools" /> : (
                    <div className="pf-list">
                      {toolList.map((t) => (
                        <ToolRow key={t.key} t={t} granted={granted.has(t.key)} requiresApproval={!!granted.get(t.key)?.requires_approval} disabled={!editable}
                          onToggle={(on) => patch({ tools: on ? [...def.tools, { key: t.key, requires_approval: t.alwaysRequiresApproval }] : def.tools.filter((x) => x.key !== t.key) })}
                          onApproval={(on) => patch({ tools: def.tools.map((x) => (x.key === t.key ? { ...x, requires_approval: on } : x)) })} />
                      ))}
                    </div>
                  )}
                </Section>
              </div>
            )}

            {stage === "configure" && (
              <div className="pf-stack">
                <Section title="When it runs">
                  <div className="pf-stack" style={{ gap: 10 }}>
                    <label className="pf-toggle"><input type="checkbox" checked disabled />On demand (always available)</label>
                    <label className="pf-toggle"><input type="checkbox" checked={!!schedule} disabled={!editable} onChange={(e) => setTriggers(e.target.checked ? { type: "schedule", every: "day", at_hour: 8 } : null, webhook)} />On a schedule</label>
                    {schedule && (
                      <div className="flex flex-wrap items-center" style={{ gap: 8, paddingLeft: 24 }}>
                        <select aria-label="Every" className="pf-select" style={{ width: 120 }} value={schedule.every} disabled={!editable} onChange={(e) => { const every = e.target.value as "hour" | "day" | "week"; setTriggers(every === "hour" ? { type: "schedule", every } : every === "day" ? { type: "schedule", every, at_hour: schedule.at_hour ?? 8 } : { type: "schedule", every, at_hour: schedule.at_hour ?? 8, weekday: schedule.weekday || "mon" }, webhook); }}>
                          <option value="hour">Every hour</option><option value="day">Every day</option><option value="week">Every week</option>
                        </select>
                        {schedule.every === "week" && (
                          <select aria-label="Weekday" className="pf-select" style={{ width: 100 }} value={schedule.weekday || "mon"} disabled={!editable} onChange={(e) => setTriggers({ ...schedule, weekday: e.target.value }, webhook)}>
                            {WEEKDAYS.map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                          </select>
                        )}
                        {schedule.every !== "hour" && (
                          <select aria-label="Hour" className="pf-select" style={{ width: 100 }} value={schedule.at_hour ?? 8} disabled={!editable} onChange={(e) => setTriggers({ ...schedule, at_hour: Number(e.target.value) }, webhook)}>
                            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                          </select>
                        )}
                        <span style={{ fontSize: 12, color: "#8F8A81" }}>{describeTrigger(schedule)}, in the organization&apos;s time zone{ws.data?.organization.timezone ? ` (${ws.data.organization.timezone})` : ""}</span>
                      </div>
                    )}
                    <label className="pf-toggle"><input type="checkbox" checked={webhook} disabled={!editable} onChange={(e) => setTriggers(schedule || null, e.target.checked)} />When another system posts an event (webhook)</label>
                  </div>
                </Section>
                <Section title="Limits">
                  <div className="pf-grid2">
                    {([["max_steps", "Most model steps per run", 1, 25], ["max_tool_calls", "Most tool calls per run", 0, 50], ["timeout_seconds", "Time limit (seconds)", 10, 600], ["max_retries", "Retries after a temporary failure", 0, 5]] as const).map(([k, label, min, max]) => (
                      <Field key={k} label={label} htmlFor={`lim-${k}`} hint={`${min} to ${max}`}>
                        <input id={`lim-${k}`} type="number" className="pf-input" min={min} max={max} value={def.limits[k]} disabled={!editable} onChange={(e) => patch({ limits: { ...def.limits, [k]: Math.max(min, Math.min(max, Number(e.target.value) || min)) } })} />
                      </Field>
                    ))}
                  </div>
                </Section>
                <Section title="Approvals">
                  <div className="pf-stack" style={{ gap: 10 }}>
                    <label className="pf-toggle"><input type="checkbox" checked={def.approval.always_for_writes} disabled={!editable} onChange={(e) => patch({ approval: { ...def.approval, always_for_writes: e.target.checked } })} />Every tool that changes something waits for approval</label>
                    <Field label="Who can approve" htmlFor="approver"><select id="approver" className="pf-select" style={{ maxWidth: 260 }} value={def.approval.approver_role} disabled={!editable} onChange={(e) => patch({ approval: { ...def.approval, approver_role: e.target.value as AgentDefinition["approval"]["approver_role"] } })}>
                      <option value="member">A member or above</option><option value="admin">An admin or the owner</option><option value="owner">Only the owner</option>
                    </select></Field>
                    <p style={{ fontSize: 12, color: "#8F8A81", margin: 0 }}>Tools that act outside Starlane or touch money always wait for approval, whatever is set here.</p>
                  </div>
                </Section>
                <Section title="Model">
                  <Field label="Model" htmlFor="model" hint={`"auto" uses the organization's configured provider. ${ws.data?.model.configured ? "" : "No model is configured on this server yet."}`}>
                    <input id="model" className="pf-input" style={{ maxWidth: 260 }} value={def.model} disabled={!editable} onChange={(e) => patch({ model: e.target.value.trim() || "auto" })} />
                  </Field>
                </Section>
                <Section title="Input fields"><FieldsEditor what="input" value={def.input_schema.fields} disabled={!editable} onChange={(f) => patch({ input_schema: { fields: f } })} /></Section>
                <Section title="Output fields"><FieldsEditor what="output" value={def.output_schema.fields} disabled={!editable} onChange={(f) => patch({ output_schema: { fields: f } })} /></Section>
                <Section title="Sharing">
                  <div className="pf-grid2">
                    <Field label="Who can see and run it" htmlFor="vis"><select id="vis" className="pf-select" value={visibility} disabled={!editable} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
                      <option value="private">Only me</option><option value="team">A team</option><option value="organization">Everyone in the organization</option>
                    </select></Field>
                    {visibility === "team" && (
                      <Field label="Team" htmlFor="team"><select id="team" className="pf-select" value={teamId} disabled={!editable} onChange={(e) => setTeamId(e.target.value)}>
                        <option value="">Choose a team</option>
                        {(teams.data?.teams || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select></Field>
                    )}
                  </div>
                </Section>
              </div>
            )}

            {stage === "test" && <TestStage agent={agent} dirty={dirty} canTest={agent.canEdit} />}
            {stage === "deploy" && <DeployStage agent={agent} dirty={dirty} canEditAgent={agent.canEdit} />}
            {stage === "monitor" && <MonitorStage agent={agent} />}

            {dirty && stage !== "test" && stage !== "deploy" && (
              <div className="flex items-center" style={{ gap: 10, marginTop: 22 }}>
                <Button primary disabled={save.busy} onClick={saveDraft}>{save.busy ? "Saving…" : "Save draft"}</Button>
                <Button onClick={() => { setDef(agent.definition); setVisibility(agent.visibility); setTeamId(agent.teamId || ""); }}>Discard changes</Button>
                <InlineError error={save.error} />
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
