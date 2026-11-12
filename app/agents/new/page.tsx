"use client";

// New agent, stage 1 (Objective). The person describes the work in plain
// language; the server drafts a definition (with the configured model, or
// with its rule-based drafter when no model is set, and it says which). The
// draft is only a starting point: nothing is saved until "Create draft",
// and the studio validates every field again on the server.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button } from "@/components/v32/ui";
import { platformApi, RISK_LABEL, describeTrigger, type Draft } from "@/lib/platform";
import { useActiveOrg, useWorkspace, can, Field, Section, Chip, useAction, InlineError, PlatformErrorBanner } from "@/components/platform/ui";

const EXAMPLES = [
  "Every Monday at 9, summarize open supplier bills due this week and create a task for anything over budget.",
  "Answer questions from our policy documents and always cite the document you used.",
  "Each morning, brief the leadership team on yesterday's agent runs, failures and pending approvals.",
];

export default function NewAgentPage() {
  const router = useRouter();
  const org = useActiveOrg();
  const ws = useWorkspace();
  const teams = useQuery({ queryKey: ["platform", "teams", org], queryFn: () => platformApi.teams(), enabled: !!ws.data });
  const [objective, setObjective] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [visibility, setVisibility] = useState<"private" | "team" | "organization">("private");
  const [teamId, setTeamId] = useState<string>("");
  const drafting = useAction();
  const creating = useAction();
  const canCreate = can(ws.data, "agents.create");

  async function makeDraft() {
    const d = await drafting.run(() => platformApi.draft(objective));
    if (d) setDraft(d);
  }
  async function create() {
    if (!draft) return;
    const r = await creating.run(() => platformApi.createAgent({ definition: draft.definition, visibility, teamId: visibility === "team" ? teamId || null : null }));
    if (r) router.push(`/agents/studio/${r.id}?stage=knowledge`);
  }

  return (
    <DashboardLayout pageTitle="New agent">
      <PageHeader title="New agent" subtitle="Describe the work. Starlane drafts the agent, and you review every part of it before it runs." right={<Button href="/agents?view=templates">Start from a template</Button>} />
      <div className="pf-stack fade-once" style={{ marginTop: 22, maxWidth: 880 }}>
        <PlatformErrorBanner error={ws.error} what="Agent creation" />
        {ws.data && !canCreate && <div className="pf-note">Your role in this organization ({ws.data.role}) can view agents but not create them.</div>}

        <Field label="What should this agent do?" htmlFor="objective" hint="Say what it works on, when it runs, what it should produce, and anything it must never do.">
          <textarea id="objective" className="pf-textarea" rows={5} maxLength={2000} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="For example: answer questions from our HR handbook and cite the section." />
        </Field>
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {EXAMPLES.map((e) => <button key={e} type="button" className="pf-chip" style={{ cursor: "pointer", whiteSpace: "normal", textAlign: "left" }} onClick={() => setObjective(e)}>{e}</button>)}
        </div>
        <div className="flex items-center" style={{ gap: 10 }}>
          <Button primary disabled={!canCreate || objective.trim().length < 10 || drafting.busy} onClick={makeDraft}>{drafting.busy ? "Drafting…" : draft ? "Draft again" : "Draft the agent"}</Button>
          {objective.trim().length > 0 && objective.trim().length < 10 && <span style={{ fontSize: 12.5, color: "#8F8A81" }}>A little more detail, please.</span>}
        </div>
        <InlineError error={drafting.error} />

        {draft && (
          <>
            <div className="pf-note">
              {draft.draftedBy === "rules"
                ? "Drafted by Starlane's built-in rules because no AI model is configured on this server. Check each part; you can change all of it in the studio."
                : `Drafted with ${draft.draftedBy.replace(/^model:/, "")}. Check each part; you can change all of it in the studio.`}
            </div>
            <Section title={draft.definition.name}>
              <div className="pf-stack" style={{ gap: 12 }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#2B2926" }}>{draft.definition.objective}</p>
                {draft.definition.instructions && <pre className="pf-pre">{draft.definition.instructions}</pre>}
                <div className="pf-grid2">
                  <div>
                    <div style={{ fontSize: 12.5, color: "#6E6A63", marginBottom: 6 }}>Tools and what they may do</div>
                    {draft.permissions.length === 0 ? <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No tools. The agent only answers from its instructions.</p> : (
                      <div className="pf-list">
                        {draft.permissions.map((p) => (
                          <div key={p.tool} className="pf-row">
                            <div className="pf-row-main"><div className="pf-row-title">{p.name}</div><div className="pf-row-sub">{RISK_LABEL[p.risk]}</div></div>
                            {p.requiresApproval && <Chip tone="warn">Needs approval</Chip>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, color: "#6E6A63", marginBottom: 6 }}>Runs</div>
                    <div className="flex flex-wrap" style={{ gap: 6 }}>{draft.definition.triggers.map((t, i) => <Chip key={i}>{describeTrigger(t)}</Chip>)}</div>
                    {draft.definition.expected_outputs.length > 0 && (
                      <>
                        <div style={{ fontSize: 12.5, color: "#6E6A63", margin: "12px 0 6px" }}>Produces</div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#2B2926" }}>{draft.definition.expected_outputs.map((o) => <li key={o}>{o}</li>)}</ul>
                      </>
                    )}
                  </div>
                </div>
                {draft.missing.length > 0 && (
                  <div className="pf-note is-warn">
                    Not available yet, so the agent cannot be turned on with these until they are: {draft.missing.map((m) => `${m.name} (${m.reason || m.status.replace(/_/g, " ")})`).join("; ")}. You can remove them in the studio.
                  </div>
                )}
                {draft.notes.length > 0 && <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#6E6A63" }}>{draft.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
              </div>
            </Section>

            <div className="pf-grid2">
              <Field label="Who can see and run it" htmlFor="visibility">
                <select id="visibility" className="pf-select" value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
                  <option value="private">Only me</option>
                  <option value="team">A team</option>
                  <option value="organization">Everyone in the organization</option>
                </select>
              </Field>
              {visibility === "team" && (
                <Field label="Team" htmlFor="team" hint={teams.data && teams.data.teams.length === 0 ? "No teams yet. An admin can create one in Organization settings." : undefined}>
                  <select id="team" className="pf-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                    <option value="">Choose a team</option>
                    {(teams.data?.teams || []).filter((t) => t.isMember || can(ws.data, "teams.manage")).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <div className="flex items-center" style={{ gap: 10 }}>
              <Button primary disabled={creating.busy || (visibility === "team" && !teamId)} onClick={create}>{creating.busy ? "Creating…" : "Create draft and open the studio"}</Button>
              <span style={{ fontSize: 12.5, color: "#8F8A81" }}>Saved as a draft. It cannot run live until it passes a test and you turn it on.</span>
            </div>
            <InlineError error={creating.error} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
