"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useParams } from "next/navigation";
import { FiUsers } from "react-icons/fi";

// Agent detail — STARLANE_FRONTEND_HANDOFF.md §1/§13.
//
// Previously rendered lib/atlas's hardcoded mock agent registry (getAgent()
// from lib/atlas) as if `id` referred to a real, executable agent instance
// with live status/risk/gates. There is no real per-user agent instance
// backend (agent_registry, migration 007, is system-global metadata with
// no owner/user_id and no run tracking — see app/agents/page.tsx), so no
// `id` on this route can ever resolve to a real configured agent today.
// Per the hard constraint against fabricated business data, this route
// honestly reports "agent not found" for any id rather than rendering
// fake detail chrome (breadcrumb/header/Overview/Runs/etc.) around data
// that can't exist yet.
export default function AgentDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";

  return (
    <DashboardLayout pageTitle="Agent">
      <div className="max-w-xl mx-auto mt-16 text-center px-4 fade-once">
        <FiUsers size={28} className="mx-auto mb-4" style={{ color: "#8A8A86" }} />
        <h1 className="v32-page-title mb-3">Agent not found</h1>
        <p className="v32-body">
          {id ? `No agent "${id}" exists for this workspace. ` : ""}
          No agents have been configured yet, so there&apos;s no agent detail to show. Once you can create an
          agent, its objective, owner, permissions, and run history will appear here.
        </p>
        <Link href="/agents" style={{ color: "#191917", fontSize: 13, fontWeight: 500, display: "inline-block", marginTop: 16 }}>
          ← Back to Agents
        </Link>
      </div>
    </DashboardLayout>
  );
}
