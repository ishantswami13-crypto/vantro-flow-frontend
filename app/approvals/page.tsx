"use client";

// Approvals: one inbox for everything waiting on a person. Agent actions
// are decided here: the server checks the approver's role, records who
// decided and why, and only then resumes the run with exactly the arguments
// shown. Other queues (finance actions, workflow email drafts) keep their
// own screens and are linked with their live counts. When the platform is
// not installed yet this page falls back to the finance approvals screen.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Subnav, Button } from "@/components/v32/ui";
import { IconPrepared, IconArrowRight } from "@/components/v32/icons";
import { platformApi, RISK_LABEL, STATUS_LABEL, type Approval } from "@/lib/platform";
import { useActiveOrg, PlatformErrorBanner, isPlatformNotReady, Loading, Chip, when, useAction, InlineError, Section, EmptyState } from "@/components/platform/ui";

type Tab = "pending" | "approved" | "rejected" | "all";

function show(v: unknown): string {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function Detail({ id, onDone }: { id: string; onDone: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["platform", "approval", id], queryFn: () => platformApi.approval(id).then((r) => r.approval) });
  const [note, setNote] = useState("");
  const act = useAction();
  const a = q.data;
  async function decide(decision: "approve" | "reject") {
    if (decision === "reject" && !note.trim() && !window.confirm("Reject without a note? The note helps whoever built the agent.")) return;
    const r = await act.run(() => platformApi.decide(id, decision, note.trim() || undefined));
    if (r) { await qc.invalidateQueries({ queryKey: ["platform"] }); setNote(""); onDone(); }
  }
  if (q.isLoading) return <Loading rows={4} height={50} />;
  if (q.error) return <PlatformErrorBanner error={q.error} what="This approval" />;
  if (!a) return null;
  return (
    <div className="pf-stack">
      <div>
        <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 6 }}>
          <Chip tone={a.risk === "financial" || a.risk === "external" ? "bad" : "warn"}>{RISK_LABEL[a.risk]}</Chip>
          <Chip tone={a.status === "approved" ? "good" : a.status === "rejected" ? "bad" : a.status === "pending" ? "warn" : undefined}>{a.status}</Chip>
          {a.executionMode === "test" && <Chip>Test run</Chip>}
        </div>
        <h2 className="hv-block-title" style={{ fontSize: 22 }}>{a.summary}</h2>
        <p style={{ margin: 0, fontSize: 13, color: "#6E6A63" }}>
          <Link href={`/agents/studio/${a.agentId}`} style={{ textDecoration: "underline" }}>{a.agentName}</Link> wants to use <strong style={{ fontWeight: 500 }}>{a.tool}</strong>. Requested {when(a.createdAt)}{a.requestedByEmail ? ` in a run started by ${a.requestedByEmail}` : ""}. Approver: {a.approverRole} or above.
        </p>
      </div>
      <Section title="Exactly what will run">
        <pre className="pf-pre">{show(a.arguments)}</pre>
        <p style={{ fontSize: 12, color: "#8F8A81", margin: "6px 0 0" }}>If approved, the run continues with these arguments and nothing else.</p>
      </Section>
      {(a.evidence || []).length > 0 && (
        <Section title="What the agent had seen">
          <pre className="pf-pre">{show(a.evidence)}</pre>
        </Section>
      )}
      {Object.keys(a.executionInput || {}).length > 0 && (
        <Section title="The run's input"><pre className="pf-pre">{show(a.executionInput)}</pre></Section>
      )}
      <p style={{ margin: 0, fontSize: 12.5, color: "#6E6A63" }}>Run status: {STATUS_LABEL[a.executionStatus] || a.executionStatus} · <Link href={`/command/runs/${a.executionId}`} style={{ textDecoration: "underline" }}>open the run</Link></p>

      {a.status === "pending" ? (
        a.canDecide ? (
          <div className="pf-stack" style={{ gap: 10 }}>
            <textarea aria-label="Decision note" className="pf-textarea" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional, saved with the decision)" />
            <div className="flex" style={{ gap: 8 }}>
              <Button primary disabled={act.busy} onClick={() => decide("approve")}>Approve and continue</Button>
              <Button disabled={act.busy} onClick={() => decide("reject")}>Reject</Button>
            </div>
            <InlineError error={act.error} />
          </div>
        ) : <div className="pf-note">Your role cannot decide this one. It needs a {a.approverRole} or above.</div>
      ) : (
        <div className="pf-note">{a.status === "approved" ? "Approved" : a.status === "rejected" ? "Rejected" : "Cancelled"}{a.decidedByEmail ? ` by ${a.decidedByEmail}` : ""} {when(a.decidedAt)}{a.decisionNote ? `: "${a.decisionNote}"` : "."}</div>
      )}

      {!!a.history?.length && (
        <Section title="History">
          <div className="pf-list">
            {a.history.map((h) => (
              <div key={h.id} className="pf-row"><div className="pf-row-main"><div className="pf-row-title">{h.action.replace(/[._]/g, " ")}</div><div className="pf-row-sub">{h.actor_email || "Starlane"} · {when(h.created_at)}</div></div></div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const router = useRouter();
  const org = useActiveOrg();
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { setSelected(new URLSearchParams(window.location.search).get("id")); }, []);
  const summary = useQuery({ queryKey: ["platform", "approvals-summary", org], queryFn: () => platformApi.approvalSummary(), retry: false });
  const list = useQuery({ queryKey: ["platform", "approvals", org, tab], queryFn: () => platformApi.approvals(tab), refetchInterval: 20_000, retry: false });
  const notReady = isPlatformNotReady(summary.error);
  useEffect(() => { if (notReady) router.replace("/control/approvals"); }, [notReady, router]);

  function open(id: string | null) {
    setSelected(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("id", id); else url.searchParams.delete("id");
    window.history.replaceState(null, "", url.toString());
  }
  const items: Approval[] = list.data?.approvals || [];
  const others = (summary.data?.queues || []).filter((q) => q.key !== "agents");

  return (
    <DashboardLayout pageTitle="Approvals">
      <PageHeader eyebrow="Workspace" divider title="Approvals" subtitle="Everything waiting on a person, with what it will do and why" />
      <div className="pf-stack fade-once" style={{ marginTop: 18 }}>
        {others.length > 0 && (
          <div className="pf-kpis">
            {others.map((q) => (
              <Link key={q.key} href={q.href} className="pf-kpi hover-lift" style={{ display: "block" }}>
                <div className="pf-kpi-v">{q.pending}</div>
                <div className="pf-kpi-l flex items-center justify-between">{q.label} <IconArrowRight size={12} /></div>
              </Link>
            ))}
          </div>
        )}
        <Subnav label="Agent approvals" active={tab} onChange={(k) => { setTab(k as Tab); open(null); }} items={[
          { key: "pending", label: "Waiting", count: tab === "pending" && list.data ? items.length : null },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
          { key: "all", label: "All" },
        ]} />
        {!notReady && <PlatformErrorBanner error={list.error} what="Approvals" />}
        {list.isLoading && <Loading rows={3} />}
        <div className="hv-detail" style={{ gridTemplateColumns: selected ? "minmax(0, 380px) minmax(0, 1fr)" : undefined }}>
          <div>
            {list.data && items.length === 0 ? (
              <EmptyState icon={<IconPrepared size={18} />} title={tab === "pending" ? "Nothing is waiting for you" : "Nothing here"} body={tab === "pending" ? "When an agent wants to do something that needs a person, it pauses and asks here." : undefined} />
            ) : items.length > 0 && (
              <div className="pf-list">
                {items.map((a) => (
                  <button key={a.id} type="button" className="pf-row w-full text-left" aria-current={selected === a.id ? "true" : undefined} style={selected === a.id ? { background: "#F6F5F1" } : undefined} onClick={() => open(a.id)}>
                    <div className="pf-row-main">
                      <div className="pf-row-title">{a.summary}</div>
                      <div className="pf-row-sub">{a.agentName} · {RISK_LABEL[a.risk]} · {when(a.createdAt)}</div>
                    </div>
                    <Chip tone={a.status === "approved" ? "good" : a.status === "rejected" ? "bad" : a.status === "pending" ? "warn" : undefined}>{a.status}</Chip>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="hv-side" style={{ padding: 20, position: "static" }}>
              <div className="flex justify-end" style={{ marginBottom: 4 }}><button type="button" onClick={() => open(null)} style={{ fontSize: 12.5, color: "#6E6A63" }}>Close</button></div>
              <Detail id={selected} onDone={() => list.refetch()} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
