"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Missions — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§6/§14/§16.
//
// Audit finding (checked lib/api.ts in full, and server.js + migrations on
// the backend): there is no persisted "mission" / goal-tracking entity
// anywhere in the stack. §16 defines Missions as "mission records (name,
// goal, narrative state, tag/risk-level, blocker count with real blocker
// entities, progress % computed from real underlying task/data completion,
// assigned people)" — a genuinely different, stateful capability from
// Discover's read-only signals feed. Every "mission" hit in the backend
// (server.js lines ~5815, 6942, 12428, 12486, 14345; migrations
// 015_world_intelligence_core.sql, 043_agent_runs.sql) is an internal
// engineering-milestone nickname ("Close the Loop" mission, "World
// Intelligence Backbone" mission) used in code comments — not a data model.
// The one real "mission" column in the schema is agent_registry.mission — a
// short purpose statement for an Atlas agent template (e.g. "Collect overdue
// receivables"), exposed read-only via GET /api/agents/registry. That is an
// agent's stated purpose, not a user-defined outcome with blockers and
// progress computed from underlying data — it belongs to the Agents page's
// domain, not Missions', and reusing it here would misrepresent what it is.
// businessState() and lib/domain/intelligence/opportunityPropagation.js were
// also checked (the latter is now wired for real via lib/routes/opportunities.js
// as Discover's Opportunity Engine — it was unwired at the time of this
// audit, since fixed) — neither stores or computes a user-defined goal, a
// blocker entity, or a progress percentage. So, exactly like Watch, there is
// no adjacent real capability to
// partially back any subnav tab with. Every tab here is a genuine, fully
// honest V32 empty state: exact visual shell (3-card flex row, mission_card
// styling incl. progress bar and avatar-stack treatment, subnav), zero
// fabricated missions, zero fake progress/blockers/people.
//
// "New mission" sidebar CTA (handoff §2/§4's create_label for this route):
// omitted, same reasoning as Watch's "New watch" CTA. A disabled button
// implies the feature exists but is temporarily locked; there is no
// persistence endpoint behind it at all, so showing any button here —
// enabled or disabled — would overstate what exists. The empty-state copy
// below explains what Missions will do once this is built instead.

type TabKey = "active" | "at_risk" | "completed" | "templates";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "at_risk", label: "At risk" },
  { key: "completed", label: "Completed" },
  { key: "templates", label: "Templates" },
];

const TAB_COPY: Record<TabKey, { title: string; body: string }> = {
  active: {
    title: "No missions defined yet",
    body: "A mission is an outcome-based workspace you set up around a goal — \"Recover Acme\" or \"Reduce inventory 15%\" — that Starlane tracks with a progress percentage computed from real underlying task and data completion, plus real blockers and the people assigned. That capability isn't built yet: there's nowhere in Starlane today to create or store a mission, so this row has nothing real to show. It will populate once mission creation and progress computation exist.",
  },
  at_risk: {
    title: "No at-risk missions to show",
    body: "This tab would list missions whose progress has stalled or whose blockers are piling up. Since no missions can be created yet, none exist to be at risk.",
  },
  completed: {
    title: "No completed missions yet",
    body: "This tab would list missions that reached 100% progress. Since missions can't be created yet, none exist to complete.",
  },
  templates: {
    title: "No mission templates yet",
    body: "This tab would offer starting points for common missions — recovering an at-risk account, cutting inventory, opening a new region. Since the underlying mission capability doesn't exist yet, there are no templates to offer.",
  },
};

export default function MissionsPage() {
  const [tab, setTab] = useState<TabKey>("active");
  const copy = TAB_COPY[tab];

  return (
    <DashboardLayout pageTitle="Missions">
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 400,
              fontSize: 26,
              color: "#191917",
            }}
          >
            Missions
          </h1>
        </div>

        <div style={{ fontSize: 13.5, color: "#63635F" }}>
          No missions configured yet.
        </div>

        <nav
          aria-label="Secondary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            borderBottom: "1px solid #EBEAE6",
            marginBottom: 4,
          }}
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

        {/* Frozen V32 layout: 3 mission_card slots in a flex row, gap:20px,
            wrapping to a vertical stack below ~960px — shown here as empty
            shells since no real mission records exist to fill them. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: "1 1 280px",
                boxSizing: "border-box",
                background: "#FFFFFF",
                border: "1px solid rgba(25,25,23,0.10)",
                borderRadius: 8,
                padding: "18px 18px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                minHeight: 150,
              }}
            >
              <div
                style={{
                  width: "60%",
                  height: 14,
                  borderRadius: 4,
                  background: "rgba(25,25,23,0.06)",
                }}
              />
              <div
                style={{
                  width: "40%",
                  height: 10,
                  borderRadius: 4,
                  background: "rgba(25,25,23,0.04)",
                }}
              />
              <div style={{ flex: 1 }} />
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: "rgba(25,25,23,0.08)",
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "100%", width: 0, background: "#191917" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: -6 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#E7E5DF",
                    border: "2px solid #FFFFFF",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            boxSizing: "border-box",
            background: "#FFFFFF",
            border: "1px solid rgba(25,25,23,0.10)",
            borderRadius: 8,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="fade-once py-10 text-center" style={{ padding: "40px 24px" }}>
            <p
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 16,
                color: "#191917",
                marginBottom: 6,
              }}
            >
              {copy.title}
            </p>
            <p className="v32-body max-w-md mx-auto" style={{ color: "#63635F" }}>
              {copy.body}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
