"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Simulate — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§6/§14/§16.
//
// Audit finding (checked lib/api.ts in full, and server.js + lib/domain/*
// on the backend): §16 defines Simulate as "a deterministic scenario-
// simulation engine accepting assumption deltas (e.g. fuel cost %, lead
// time weeks, demand %) and returning computed downstream effects (revenue,
// cash, customers, inventory, suppliers, commitments) with confidence/
// methodology metadata — never LLM-estimated." That is a genuinely
// different capability from a standard forecast: it requires adjustable
// assumption inputs that drive a recomputation, not just a projection of
// the future from current trends.
//
// The one real forecast surface, api.forecast() -> GET /api/cash-forecast/
// :userId (server.js ~6047, calculateCashFlowForecast), accepts
// current_cash / daily_expenses / days and returns a fixed 3-scenario
// (pessimistic/expected/optimistic) cash curve. Those "scenarios" are
// canned multipliers baked into calculateCashFlowForecast, not something a
// user can parameterize with an arbitrary assumption delta (there is no
// fuel-cost/lead-time/demand knob, or any equivalent real knob, exposed by
// that endpoint or any other). It is a fixed-parameter forecast, not an
// assumption-driven what-if engine — it cannot honestly back this page.
//
// The backend also contains lib/domain/intelligence/scenarioEngine.js
// (buildScenario/compareScenarios — "invoice paid earlier" / "invoice
// remains unpaid" hypotheticals) and fxScenarioEngine.js (FX-move cost
// scenarios). Both are real, deterministic, evidence-based scenario
// calculators — but neither is wired to any server.js route. No API
// endpoint calls them, so nothing in the running system can reach them from
// the frontend. They are dead code from the UI's perspective, exactly like
// Watch's missing persistence layer: a genuine capability that exists in
// isolation but was never connected, so it cannot honestly back live UI.
//
// Result: no real, reachable assumption-driven simulation capability exists
// today. Every subnav tab here is a genuine, fully honest V32 empty state:
// exact visual shell (assumption pills, 3-column/2-row sim_card grid,
// subnav), zero fabricated deltas, zero invented sim_card results.
//
// "New simulation" sidebar CTA: omitted, same reasoning as Watch/Missions.
// There is no reachable endpoint behind it — showing any button here would
// overstate what exists. The empty-state copy explains what would need to
// exist (a live route onto scenarioEngine.js / a parameterized forecast)
// for this page to compute anything real.

type TabKey = "new" | "saved" | "comparisons" | "forecasts";

const TABS: { key: TabKey; label: string }[] = [
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "comparisons", label: "Comparisons" },
  { key: "forecasts", label: "Forecasts" },
];

const TAB_COPY: Record<TabKey, { title: string; body: string }> = {
  new: {
    title: "No simulation engine connected yet",
    body: "Simulate is for assumption-driven what-ifs — \"what happens to cash, revenue, and suppliers if fuel cost rises 15%?\" — computed deterministically from real data, never an AI guess. That engine isn't reachable from the app today: the closest real capability, the cash forecast, takes a fixed set of inputs and returns a canned 3-scenario curve — it has no assumption deltas to turn. A separate scenario calculator exists in the backend code but isn't wired to any API route, so nothing here can call it yet. The assumption pills and result cards below are shown as the exact V32 shell, with no computed values, until a live route exists.",
  },
  saved: {
    title: "No saved simulations",
    body: "This tab would list simulations you've saved for later. Since no simulation can be run yet, none exist to save.",
  },
  comparisons: {
    title: "No comparisons yet",
    body: "This tab would let you compare two or more simulation runs side by side. Since no simulation can be run yet, there's nothing to compare.",
  },
  forecasts: {
    title: "No linked forecasts",
    body: "This tab would show simulations linked back to the cash forecast they were run against. Since no simulation can be run yet, there are no links to show.",
  },
};

const ASSUMPTION_PILLS = [
  { label: "Fuel cost", suffix: "%" },
  { label: "Lead time", suffix: " wk" },
  { label: "Demand", suffix: "%" },
];

const SIM_CARDS: { label: string; note: string }[] = [
  { label: "Revenue", note: "Would show projected revenue change" },
  { label: "Cash", note: "Would show projected cash-position change" },
  { label: "Customers", note: "Would show projected customer impact" },
  { label: "Inventory", note: "Would show projected inventory impact" },
  { label: "Suppliers", note: "Would show projected supplier impact" },
  { label: "Commitments", note: "Would show projected commitment impact" },
];

export default function SimulatePage() {
  const [tab, setTab] = useState<TabKey>("new");
  const copy = TAB_COPY[tab];

  return (
    <DashboardLayout pageTitle="Simulate">
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
            Simulate
          </h1>
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

        {tab === "new" ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {ASSUMPTION_PILLS.map((p) => (
              <div
                key={p.label}
                title="No simulation engine is connected — this control is inert."
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(25,25,23,0.10)",
                  background: "#F3F2EE",
                  fontSize: 12.5,
                  color: "#9A9A94",
                  cursor: "not-allowed",
                }}
              >
                <span>{p.label}</span>
                <span style={{ color: "#B9B9B3" }}>+0{p.suffix}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: 16,
          }}
        >
          {SIM_CARDS.map((c) => (
            <div
              key={c.label}
              style={{
                boxSizing: "border-box",
                background: "#FFFFFF",
                border: "1px solid rgba(25,25,23,0.10)",
                borderRadius: 8,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 11, letterSpacing: 0.5, color: "#63635F" }}>
                {c.label.toUpperCase()}
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', 'SFMono-Regular', monospace",
                  fontSize: 22,
                  color: "#9A9A94",
                }}
              >
                &mdash;
              </span>
              <span style={{ fontSize: 12, color: "#9A9A94" }}>{c.note}</span>
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
