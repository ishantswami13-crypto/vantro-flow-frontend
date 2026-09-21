"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Agents — STARLANE_FRONTEND_HANDOFF.md §1/§13/§14.
//
// Audit finding (this turn): the previous version of this route was already
// an honest single-panel empty state (no Atlas mock data), but it did not
// have the §14 5-tab subnav (My Agents/Enterprise/Running/History/Templates)
// or the §13 Templates section. This turn adds that structure honestly:
//
// Backend reality check (this turn): agent_registry (migration 007) is
// SYSTEM-GLOBAL METADATA ONLY — no user_id/owner FK, no scope column, no
// last-run or run-history tracking of any kind, and every row ships with
// is_active=false. There is no api.agents.* call in lib/api.ts and no
// per-user "configured agent" concept exists anywhere in the backend. So:
//   - My Agents / Enterprise / Running / History: all honest empty states —
//     there is no real per-user agent instance, running agent, or run
//     history to show, on this account or any account, today.
//   - Templates: STARLANE_FRONTEND_HANDOFF.md §15 explicitly carves out an
//     exception — template *descriptions* are legitimate static offering
//     content (they describe what could be created, not a claim that an
//     agent already exists), so the 4 named templates are shown. But their
//     "Create Agent →" CTA is NOT wired to anything real (no create-agent
//     endpoint exists), so per the Watch/Missions "don't overstate a
//     non-functional CTA" precedent, the CTA is rendered disabled with an
//     inline explanation rather than a dead link that implies it works.
export default function AgentsPage() {
  const [tab, setTab] = useState<TabKey>("my-agents");

  return (
    <DashboardLayout pageTitle="Agents">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Agents
          </h1>
          <p style={{ fontSize: 13.5, color: "#63635F", maxWidth: 640, marginTop: 6 }}>
            Agents observe, prepare, propose, or — only with explicit permission — execute work on your behalf.
            Starlane hasn&apos;t configured any agents for this workspace yet.
          </p>
        </div>

        <nav
          aria-label="Secondary"
          style={{ display: "flex", alignItems: "center", gap: 22, borderBottom: "1px solid #EBEAE6", marginBottom: 4, flexWrap: "wrap" }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="hover-dim"
              style={{
                padding: "8px 2px",
                fontSize: 13,
                fontWeight: t.key === tab ? 500 : 400,
                color: t.key === tab ? "#191917" : "#63635F",
                background: "none",
                border: "none",
                borderBottomColor: t.key === tab ? "#696D86" : "transparent",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1, minHeight: 0, boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {tab === "my-agents" && (
            <EmptyPanel
              title="No agents have been configured yet"
              body="Once agent configuration is available, agents you create will appear here in a table with their scope, owner, last run, and status — nothing is shown until it's real."
            />
          )}
          {tab === "enterprise" && (
            <EmptyPanel
              title="No enterprise agents are shared with this workspace yet"
              body="Agents your organization configures and shares across teams will appear here once that capability exists."
            />
          )}
          {tab === "running" && (
            <EmptyPanel
              title="Nothing is running right now"
              body="Agents currently in progress — observing, preparing, or waiting on a proposed action — will show up here with live status. There's no run in progress because no agent has been created yet."
            />
          )}
          {tab === "history" && (
            <EmptyPanel
              title="No run history yet"
              body="Every completed or rejected agent run will be logged here — what it proposed, what happened, and who approved it. History starts once an agent has actually run."
            />
          )}
          {tab === "templates" && <Templates />}
        </div>
      </div>
    </DashboardLayout>
  );
}

type TabKey = "my-agents" | "enterprise" | "running" | "history" | "templates";

const TABS: { key: TabKey; label: string }[] = [
  { key: "my-agents", label: "My Agents" },
  { key: "enterprise", label: "Enterprise" },
  { key: "running", label: "Running" },
  { key: "history", label: "History" },
  { key: "templates", label: "Templates" },
];

const TEMPLATES = [
  { id: "supplier-risk", name: "Supplier Risk Agent", desc: "Watches supplier delivery and quality signals and proposes action when risk crosses a threshold." },
  { id: "margin", name: "Margin Agent", desc: "Tracks margin erosion across products and customers and prepares a briefing when it drifts." },
  { id: "executive-brief", name: "Executive Brief Agent", desc: "Prepares a recurring summary of what changed across the business for leadership review." },
  { id: "reconciliation", name: "Reconciliation Agent", desc: "Compares receivables, payables, and sales totals against source systems and proposes fixes for mismatches." },
];

function Templates() {
  return (
    <div style={{ padding: "8px 20px 20px" }}>
      <p style={{ fontSize: 12, color: "#9A9A94", margin: "12px 0 16px" }}>
        Designed agent templates. Creating an agent from a template isn&apos;t wired up yet, so &quot;Create Agent&quot; is disabled below.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {TEMPLATES.map((t) => (
          <div key={t.id} style={{ border: "1px solid #EBEAE6", borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#191917", margin: 0 }}>{t.name}</p>
            <p style={{ fontSize: 12.5, color: "#63635F", marginTop: 6, lineHeight: 1.5 }}>{t.desc}</p>
            <button
              type="button"
              disabled
              title="Not available yet — agent creation isn't connected to a backend yet"
              style={{
                marginTop: 14,
                fontSize: 13,
                fontWeight: 500,
                color: "#B5B5B0",
                background: "none",
                border: "none",
                cursor: "not-allowed",
                padding: 0,
              }}
            >
              Create Agent →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center" }} className="fade-once">
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917", marginBottom: 6 }}>{title}</p>
      <p className="v32-body max-w-md mx-auto" style={{ color: "#63635F" }}>{body}</p>
    </div>
  );
}
