"use client";

// Agent factory: build several agents at once from a department pack, a set
// of templates, a connected app, or plain-language objectives. Everything it
// makes is a draft. Nothing runs live until a person tests, publishes and
// activates it, and any step that acts outside Starlane still waits for
// approval. The optional test run never carries out writes.

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button, Subnav } from "@/components/v32/ui";
import { platformApi, type FactoryBuild, type FactoryOverview, type FactoryRequest, type FactoryTemplate } from "@/lib/platform";
import { useActiveOrg, useWorkspace, can, PlatformErrorBanner, Loading, Chip, when, Section, Field, useAction, InlineError, Monogram } from "@/components/platform/ui";

type Mode = "pack" | "templates" | "connection" | "objectives";

function Missing({ t }: { t: { missing: { name: string; reason: string | null }[] } }) {
  if (!t.missing.length) return null;
  return <div style={{ fontSize: 12, color: "#8C6826", marginTop: 3 }}>Needs: {t.missing.map((m) => `${m.name}${m.reason ? ` (${m.reason})` : ""}`).join("; ")}</div>;
}

export default function FactoryPage() {
  const org = useActiveOrg();
  const ws = useWorkspace();
  const qc = useQueryClient();
  const build = can(ws.data, "factory.build");
  const q = useQuery({ queryKey: ["platform", "factory", org], queryFn: () => platformApi.factory(), retry: false });
  const [mode, setMode] = useState<Mode>("pack");
  const [autoTest, setAutoTest] = useState(true);
  const [result, setResult] = useState<FactoryBuild | null>(null);
  const act = useAction();
  const run = (req: FactoryRequest) => act.run(async () => {
    const r = await platformApi.buildAgents({ ...req, autoTest });
    setResult(r);
    qc.invalidateQueries({ queryKey: ["platform", "factory"] });
    qc.invalidateQueries({ queryKey: ["platform", "agents"] });
  });
  const d = q.data;

  return (
    <DashboardLayout pageTitle="Agent factory">
      <PageHeader eyebrow="Workspace" divider title="Agent factory" subtitle="Build a team of agents in one step. Each one starts as a draft you test and publish.">
        <Subnav label="Build from" active={mode} onChange={(k) => setMode(k as Mode)} items={[
          { key: "pack", label: "Department packs" },
          { key: "templates", label: "Templates" },
          { key: "connection", label: "A connected app" },
          { key: "objectives", label: "Objectives" },
        ]} />
      </PageHeader>
      <div className="pf-stack fade-once" style={{ marginTop: 18 }}>
        <PlatformErrorBanner error={q.error} what="The agent factory" />
        {ws.data && !build && <div className="pf-note">Your role ({ws.data.role}) can see what the factory offers. An admin or owner builds agents.</div>}
        {build && <label className="pf-toggle"><input type="checkbox" checked={autoTest} onChange={(e) => setAutoTest(e.target.checked)} />Queue a test run for each new agent (test runs never change anything)</label>}
        {result && <BuildResult r={result} onClose={() => setResult(null)} />}
        <InlineError error={act.error} />
        {q.isLoading && <Loading rows={4} />}
        {d && mode === "pack" && (
          <div className="pf-stack" style={{ gap: 12 }}>
            {d.packs.map((p) => (
              <Section key={p.key} title={p.name} description={p.description} aside={build ? <Button small primary disabled={act.busy} onClick={() => run({ source: "pack", pack: p.key })}>Build {p.templates.length} agents</Button> : null}>
                <div className="pf-list">{p.templates.map((t) => <TemplateRow key={t.key} t={t} />)}</div>
              </Section>
            ))}
          </div>
        )}
        {d && mode === "templates" && <PickTemplates templates={d.templates} build={build} busy={act.busy} max={d.limits.maxPerBuild} onBuild={(keys) => run({ source: "templates", templateKeys: keys })} />}
        {d && mode === "connection" && <FromConnection d={d} build={build} busy={act.busy} onBuild={(id, actions) => run({ source: "connection", connectionId: id, includeActions: actions })} />}
        {d && mode === "objectives" && <FromObjectives build={build} busy={act.busy} onBuild={(list) => run({ source: "objectives", objectives: list })} />}
        {d && d.builds.length > 0 && (
          <Section title="Recent builds">
            <div className="pf-list">
              {d.builds.map((b) => (
                <div key={b.id} className="pf-row">
                  <div className="pf-row-main">
                    <div className="pf-row-title">{b.agentCount} agent{b.agentCount === 1 ? "" : "s"} from {b.source === "pack" ? `the ${String(b.request.pack || "")} pack` : b.source}</div>
                    <div className="pf-row-sub">{b.requestedBy || "Someone"} · {when(b.createdAt)}{b.testCount ? ` · ${b.testCount} test runs` : ""}{b.skipped.length ? ` · ${b.skipped.length} skipped` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </DashboardLayout>
  );
}

function TemplateRow({ t, children }: { t: FactoryTemplate; children?: React.ReactNode }) {
  return (
    <div className="pf-row" style={{ alignItems: "flex-start" }}>
      {children}
      <Monogram name={t.name} size={30} />
      <div className="pf-row-main">
        <div className="pf-row-title">{t.name}</div>
        <div className="pf-row-sub" style={{ whiteSpace: "normal" }}>{t.description}</div>
        <Missing t={t} />
      </div>
      <Chip tone={t.ready ? "good" : "warn"}>{t.ready ? "Ready" : "Needs setup"}</Chip>
    </div>
  );
}

function PickTemplates({ templates, build, busy, max, onBuild }: { templates: FactoryTemplate[]; build: boolean; busy: boolean; max: number; onBuild: (keys: string[]) => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const toggle = (k: string) => { const n = new Set(sel); if (n.has(k)) n.delete(k); else n.add(k); setSel(n); };
  return (
    <Section title="Choose templates" aside={build ? <Button small primary disabled={busy || sel.size === 0 || sel.size > max} onClick={() => onBuild([...sel])}>Build {sel.size || ""} agent{sel.size === 1 ? "" : "s"}</Button> : null}>
      <div className="pf-list">
        {templates.map((t) => (
          <TemplateRow key={t.key} t={t}>{build && <input type="checkbox" aria-label={`Include ${t.name}`} checked={sel.has(t.key)} onChange={() => toggle(t.key)} style={{ marginTop: 8, accentColor: "#191917" }} />}</TemplateRow>
        ))}
      </div>
    </Section>
  );
}

function FromConnection({ d, build, busy, onBuild }: { d: FactoryOverview; build: boolean; busy: boolean; onBuild: (id: string, actions: boolean) => void }) {
  const [id, setId] = useState("");
  const [actions, setActions] = useState(false);
  if (!d.connections.length) {
    return <div className="pf-note">No active connected apps yet. <Link className="underline" href="/connectors">Connect an app</Link> and the factory can build an agent that works in it.</div>;
  }
  const c = d.connections.find((x) => x.id === id);
  return (
    <Section title="An agent for one connected app" description="It reads live data from the app. With actions allowed, it can also propose changes, and each one waits for a person to approve the exact request.">
      <div className="pf-stack" style={{ gap: 12 }}>
        <Field label="App" htmlFor="fc-app">
          <select id="fc-app" className="pf-select" value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Choose an app</option>
            {d.connections.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.operationCounts.read} read, {x.operationCounts.external} that change data)</option>)}
          </select>
        </Field>
        {c && c.operationCounts.external > 0 && <label className="pf-toggle"><input type="checkbox" checked={actions} onChange={(e) => setActions(e.target.checked)} />Let it propose changes in {c.name} (always for approval)</label>}
        {build && <div><Button primary disabled={busy || !id} onClick={() => onBuild(id, actions)}>Build agent</Button></div>}
      </div>
    </Section>
  );
}

function FromObjectives({ build, busy, onBuild }: { build: boolean; busy: boolean; onBuild: (list: string[]) => void }) {
  const [text, setText] = useState("");
  const list = text.split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <Section title="Describe what each agent should do" description="One objective per line, up to five. Each is drafted into an agent definition with the tools it needs; you review every draft before it can run.">
      <div className="pf-stack" style={{ gap: 12 }}>
        <textarea className="pf-textarea" rows={6} value={text} onChange={(e) => setText(e.target.value)} aria-label="Objectives"
          placeholder={"Summarise new support tickets every morning and flag the urgent ones\nKeep CRM contacts tidy: find duplicates and missing emails"} />
        {list.length > 5 && <InlineError error="Up to 5 objectives per build." />}
        {build && <div><Button primary disabled={busy || !list.length || list.length > 5} onClick={() => onBuild(list)}>{busy ? "Drafting…" : `Draft ${list.length || ""} agent${list.length === 1 ? "" : "s"}`}</Button></div>}
      </div>
    </Section>
  );
}

function BuildResult({ r, onClose }: { r: FactoryBuild; onClose: () => void }) {
  return (
    <Section title={`Built ${r.created.length} draft agent${r.created.length === 1 ? "" : "s"}`} aside={<Button small onClick={onClose}>Close</Button>}
      description="Open each one to review it, check its test run, then publish and activate it.">
      <div className="pf-list">
        {r.created.map((c) => (
          <div key={c.id} className="pf-row" style={{ alignItems: "flex-start" }}>
            <div className="pf-row-main">
              <div className="pf-row-title"><Link className="underline" href={`/agents/${encodeURIComponent(c.id)}`}>{c.name}</Link></div>
              <div className="pf-row-sub" style={{ whiteSpace: "normal" }}>
                {c.draftedBy ? `Drafted by ${c.draftedBy}` : c.templateKey ? "From a template" : "From a connected app"}
                {c.testExecutionId && <> · <Link className="underline" href={`/agents/${encodeURIComponent(c.id)}/run/${c.testExecutionId}`}>test run</Link></>}
                {c.testError ? ` · Test not queued: ${c.testError}` : ""}
              </div>
              <Missing t={c} />
            </div>
            <Chip tone={c.ready ? "good" : "warn"}>{c.ready ? "Draft, ready to test" : "Draft, needs setup"}</Chip>
          </div>
        ))}
        {r.skipped.map((s, i) => (
          <div key={`s${i}`} className="pf-row"><div className="pf-row-main"><div className="pf-row-title">{s.name}</div><div className="pf-row-sub">Skipped: {s.reason}</div></div><Chip>Skipped</Chip></div>
        ))}
      </div>
    </Section>
  );
}
