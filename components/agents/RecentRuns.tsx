"use client";

// Recent agent runs across every agent that keeps a run log, newest first,
// like Harvey's history table: the task the person gave, the agent, status
// and when. Each row opens the run. Read from GET /api/os/agents/:key/runs.

import Link from "next/link";
import { osApi, type AgentInfo, type AgentRun } from "@/lib/os";
import { useLoad } from "@/components/os/shared";
import { Lettermark, ago } from "@/components/v32/ui";

const STATUS: Record<AgentRun["status"], { label: string; color: string }> = {
  completed: { label: "Completed", color: "#2F6B45" },
  failed: { label: "Failed", color: "#A64F4B" },
  running: { label: "Running", color: "#57534D" },
};

export default function RecentRuns({ agents }: { agents: AgentInfo[] }) {
  const tracked = agents.filter((a) => a.runHistory);
  const { data, loading } = useLoad(async () => {
    const lists = await Promise.all(tracked.map((a) => osApi.agentRuns(a.key).catch(() => null)));
    return lists.flatMap((l) => (l?.runs || []))
      .sort((x, y) => new Date(y.startedAt || 0).getTime() - new Date(x.startedAt || 0).getTime())
      .slice(0, 10);
  });
  const byKey = new Map(agents.map((a) => [a.key, a]));

  if (!tracked.length) return null;
  return (
    <section className="ag-runs" aria-label="Recent runs">
      <div className="ag-runs-head">
        <h2>Recent runs</h2>
        <span style={{ fontSize: 12, color: "#6E6E69" }}>Newest first</span>
      </div>
      <div className="ag-row is-head" role="row"><span>Task</span><span>Agent</span><span>Status</span><span style={{ textAlign: "right" }}>When</span></div>
      {loading && <div className="skeleton" style={{ height: 120, borderRadius: 8, marginTop: 8 }} />}
      {data && data.length === 0 && (
        <p style={{ fontSize: 13, color: "#6E6E69", padding: "14px", margin: 0 }}>No runs yet. Give an agent work above and it will show here.</p>
      )}
      {data?.map((r) => {
        const a = byKey.get(r.agentKey);
        const name = a?.name || r.agentKey;
        const st = STATUS[r.status] || STATUS.running;
        return (
          <Link key={r.id} href={`/agents/${encodeURIComponent(r.agentKey)}/run/${r.id}`} className="ag-row">
            <span className="ag-task" title={r.instruction || r.summary || undefined}>{r.instruction || (r.summary ? r.summary : `Run the ${name.toLowerCase()}`)}</span>
            <span className="ag-who"><Lettermark letter={name} size={20} />{name}</span>
            <span className="ag-st" style={{ color: st.color }}><i />{st.label}</span>
            <span className="ag-when">{r.startedAt ? ago(r.startedAt) : ""}</span>
          </Link>
        );
      })}
    </section>
  );
}
