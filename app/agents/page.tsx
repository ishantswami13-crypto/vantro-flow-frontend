"use client";

// Agents: the organization's agent library. Custom agents are definitions
// stored by the platform (GET /api/platform/agents); what each person sees
// follows the agent's visibility and their role, decided on the server.
// Templates start a new draft. Built-in agents are the fixed workers that
// ship with Starlane and keep their own view.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Subnav, Button, SearchField, ago } from "@/components/v32/ui";
import { IconAgents, IconArrowRight } from "@/components/v32/icons";
import BuiltInAgents from "@/components/agents/BuiltInAgents";
import { platformApi, describeTrigger, type AgentSummary } from "@/lib/platform";
import { useActiveOrg, useWorkspace, can, PlatformErrorBanner, isPlatformNotReady, Loading, AgentStatusChip, ExecStatusChip, Chip, useAction, InlineError, Monogram, EmptyState } from "@/components/platform/ui";

type View = "all" | "mine" | "team" | "organization" | "drafts" | "active" | "inactive" | "templates" | "builtin";
const VIEWS: { key: View; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "My agents" },
  { key: "team", label: "Team" },
  { key: "organization", label: "Organization" },
  { key: "drafts", label: "Drafts" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Disabled and archived" },
  { key: "templates", label: "Templates" },
  { key: "builtin", label: "Built in" },
];

function AgentCard({ a, i }: { a: AgentSummary; i: number }) {
  const visibility = a.visibility === "private" ? "Only me" : a.visibility === "team" ? `Team${a.teamName ? `: ${a.teamName}` : ""}` : "Organization";
  return (
    <Link href={`/agents/studio/${a.id}`} className="lib-card agent-card rise-in" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
      <div className="flex items-center justify-between">
        <Monogram name={a.name} size={34} />
        <span className="flex items-center" style={{ gap: 8, color: "#6E6E69" }}>
          <AgentStatusChip status={a.status} />
          <IconArrowRight size={14} />
        </span>
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: "#0F0E0D", letterSpacing: "-0.01em" }}>{a.name}</div>
        <div className="agent-purpose">{a.description || "No description yet."}</div>
      </div>
      <div className="flex flex-wrap" style={{ gap: 6 }}>
        <span className="agent-perm">{visibility}</span>
        {a.triggers.filter((t) => t.type !== "manual").map((t, k) => <span key={k} className="agent-perm">{describeTrigger(t)}</span>)}
        {a.draftDiffersFromPublished && a.publishedVersion != null && <span className="agent-perm">Unpublished changes</span>}
      </div>
      <div className="agent-foot">
        <span>{a.publishedVersion != null ? `v${a.publishedVersion}` : "Not published"} · {a.isMine ? "yours" : a.ownerEmail || "shared"} · updated {ago(a.updatedAt)}</span>
        {a.lastExecution && <ExecStatusChip status={a.lastExecution.status} />}
      </div>
    </Link>
  );
}

function Templates({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const q = useQuery({ queryKey: ["platform", "templates"], queryFn: () => platformApi.templates() });
  const act = useAction();
  const [using, setUsing] = useState<string | null>(null);
  if (q.isLoading) return <Loading rows={3} height={150} />;
  if (q.error) return <PlatformErrorBanner error={q.error} what="Templates" />;
  return (
    <div className="pf-stack">
      <InlineError error={act.error} />
      <div className="lib-grid agent-grid">
        {(q.data?.templates || []).map((t, i) => (
          <div key={t.key} className="lib-card agent-card rise-in" style={{ animationDelay: `${i * 30}ms`, cursor: "default" }}>
            <div className="flex items-center justify-between">
              <Monogram name={t.name} size={34} />
              <Chip tone={t.ready ? "good" : "warn"}>{t.ready ? "Ready to use" : "Needs setup"}</Chip>
            </div>
            <div>
              <div style={{ fontSize: 11.5, color: "#8F8A81", marginBottom: 3 }}>{t.category}</div>
              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: "#0F0E0D", letterSpacing: "-0.01em" }}>{t.name}</div>
              <div className="agent-purpose">{t.description}</div>
            </div>
            {t.missing.length > 0 && (
              <div style={{ fontSize: 12, color: "#8C6826", lineHeight: 1.5 }}>
                {t.missing.map((m) => <div key={m.tool}>{m.name}: {m.reason || m.status.replace(/_/g, " ")}</div>)}
              </div>
            )}
            <div className="agent-foot">
              <span>{(t.definition.tools || []).length} tool{(t.definition.tools || []).length === 1 ? "" : "s"}</span>
              {canCreate && (
                <Button small disabled={act.busy} onClick={() => { setUsing(t.key); act.run(async () => { const r = await platformApi.createAgent({ templateKey: t.key }); router.push(`/agents/studio/${r.id}`); }); }}>
                  {act.busy && using === t.key ? "Creating…" : "Use template"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#6E6E69", margin: 0, maxWidth: 640 }}>A template creates a draft you can edit. Tools that are not connected stay listed with the reason, and an agent cannot be turned on until each tool it uses is available.</p>
    </div>
  );
}

export default function AgentsPage() {
  const org = useActiveOrg();
  const ws = useWorkspace();
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view") as View | null;
    if (v && VIEWS.some((x) => x.key === v)) setView(v);
  }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 250); return () => clearTimeout(t); }, [search]);

  const listView = view === "templates" || view === "builtin" ? "all" : view;
  const q = useQuery({
    queryKey: ["platform", "agents", org, listView, debounced],
    queryFn: () => platformApi.agents(listView, debounced),
    retry: false,
  });
  const notReady = isPlatformNotReady(q.error) || isPlatformNotReady(ws.error);
  const canCreate = can(ws.data, "agents.create");
  const counts = q.data?.counts || {};
  const agents = q.data?.agents || [];

  function choose(k: string) {
    setView(k as View);
    const url = new URL(window.location.href);
    url.searchParams.set("view", k);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <DashboardLayout pageTitle="Agents">
      <PageHeader eyebrow="Workspace" divider
        title="Agents"
        subtitle="Build agents for your organization's work, test them, and run them with approvals where it matters"
        right={canCreate ? <Button primary href="/agents/new">New agent</Button> : undefined}
      >
        <div style={{ marginTop: 18 }}>
          <Subnav
            label="Agent library"
            active={notReady ? "builtin" : view}
            onChange={choose}
            items={(notReady ? VIEWS.filter((v) => v.key === "builtin") : VIEWS).map((v) => ({ key: v.key, label: v.label, count: v.key in counts ? counts[v.key] : null }))}
          />
        </div>
      </PageHeader>

      <div className="fade-once pf-stack" style={{ marginTop: 14 }}>
        {(notReady || view === "builtin") ? (
          <BuiltInAgents />
        ) : view === "templates" ? (
          <Templates canCreate={canCreate} />
        ) : (
          <>
            <div style={{ maxWidth: 360 }}>
              <SearchField id="agent-search" value={search} onChange={setSearch} placeholder="Search agents" />
            </div>
            {q.isLoading && <Loading rows={3} height={150} />}
            <PlatformErrorBanner error={q.error} what="Agents" />
            {q.data && agents.length === 0 && (
              <EmptyState
                icon={<IconAgents size={17} />}
                title={debounced ? `No agent matches "${debounced}"` : view === "all" ? "No custom agents yet" : "Nothing here yet"}
                body={view === "all" && !debounced ? "Describe the work in a sentence or start from a template. Every agent is tested before it can be turned on." : undefined}
                action={canCreate && view === "all" && !debounced ? <div className="flex" style={{ gap: 8 }}><Button primary href="/agents/new">New agent</Button><Button onClick={() => choose("templates")}>Browse templates</Button></div> : undefined}
              />
            )}
            {agents.length > 0 && (
              <div className="lib-grid agent-grid">
                {agents.map((a, i) => <AgentCard key={a.id} a={a} i={i} />)}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
