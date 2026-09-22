"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useParams } from "next/navigation";
import { FiUsers } from "react-icons/fi";

// Agent run detail — STARLANE_FRONTEND_HANDOFF.md §1/§13.
//
// New route this turn. There is no real run-tracking system anywhere in
// the backend (no agent_run table, no execution trace, no proposed-action
// records — agent_registry is metadata-only, see app/agents/page.tsx), so
// no run id can ever resolve to a real run today. This route honestly
// reports "no run data" for any id/runId combination rather than
// fabricating a progress-step trace or a proposed-action card.
export default function AgentRunDetail() {
  const params = useParams<{ id: string; runId: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const runId = params?.runId ? decodeURIComponent(params.runId) : "";

  return (
    <DashboardLayout pageTitle="Agent run">
      <div className="max-w-xl mx-auto mt-16 text-center px-4 fade-once">
        <FiUsers size={28} className="mx-auto mb-4" style={{ color: "#8A8A86" }} />
        <h1 className="v32-page-title mb-3">No run data</h1>
        <p className="v32-body">
          {id && runId ? `No run "${runId}" exists for agent "${id}". ` : ""}
          Starlane doesn&apos;t track agent runs yet. Once agents can actually run, this page will show its
          progress step by step, the proposed action with its evidence, and where it stands.
        </p>
        <Link href="/agents" style={{ color: "#191917", fontSize: 13, fontWeight: 500, display: "inline-block", marginTop: 16 }}>
          ← Back to Agents
        </Link>
      </div>
    </DashboardLayout>
  );
}
