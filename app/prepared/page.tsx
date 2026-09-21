"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Prepared — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§14/§16.
//
// Audit finding (checked lib/api.ts in full — no "prepared"/"draft" match
// anywhere — and lib/domain/intelligence/* on the backend): §16 defines
// Prepared as "a trigger-generated draft-work queue: trigger source +
// timestamp, summary, related entity, evidence used, what approving does,
// approve/secondary/dismiss actions, counted per tab." That requires a real
// pipeline that (a) detects a triggering event and (b) auto-generates a
// draft work product (a note, a brief, revised terms) sitting in a queue
// awaiting human approval — genuinely different from a forecast or a
// monitored condition.
//
// No such pipeline exists or is reachable today. The two candidate modules
// from the Missions/Simulate audits were re-checked here:
//   - lib/domain/intelligence/opportunityPropagation.js computes a bounded
//     upside chain (demand rising + supplier stable -> opportunity) and
//     RETURNS a plain analysis object. It never writes a draft row, never
//     produces an approvable artifact, and isn't wired to any server.js
//     route.
//   - lib/domain/intelligence/scenarioEngine.js builds named hypotheticals
//     on top of a real cash-consequence baseline (buildScenario /
//     compareScenarios). Also analysis-only — no persistence, no draft
//     output, no route.
// Neither module (nor anything else found) is the seed of a "trigger ->
// draft work item awaiting approval" system. This is unbuilt, matching the
// Watch/Missions/Simulate findings exactly: a real capability gap, not a
// wiring gap.
//
// Important distinction (§4 vs Control's real Approvals queue): Control's
// /control/approvals (app/approvals/page.tsx) is a queue of AGENT ACTIONS
// awaiting permission to execute (e.g. "send this email now") — that one
// already renders honest empty states from a real backend endpoint. This
// page, Prepared, is conceptually different: it would hold AI-DRAFTED WORK
// PRODUCTS (a written note, a brief, a revised-terms document) that already
// exist and are awaiting a human's review/approval before use — not a
// permission gate on an action about to run. No backend capability produces
// that kind of draft artifact today, so this page cannot be confused with,
// or accidentally reuse, Control's approvals data — there is none to reuse.
//
// Result: every tab here is a genuine, fully honest V32 empty state: the
// exact custom tab bar (NOT subnav() — Prepared uses its own component per
// §14) with real per-tab counts (all zero, since nothing has ever been
// generated), and the prepared_card shape described in prose rather than
// rendered with fabricated content. Zero invented triggers, summaries,
// evidence, or approve/dismiss actions.
//
// No sidebar CTA: Bridge/Discover/Memory/Prepared/Sources/Agents/Control do
// not pass create_label per handoff §2 — omitted here for the same reason.

type TabKey = "for_you" | "needs_you" | "upcoming" | "completed" | "dismissed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "for_you", label: "For you" },
  { key: "needs_you", label: "Needs you" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "dismissed", label: "Dismissed" },
];

const TAB_COPY: Record<TabKey, { title: string; body: string }> = {
  for_you: {
    title: "No prepared work generated yet",
    body: "This tab would list draft work Starlane prepared for you to read at your own pace — a briefing, a summary — without needing a decision. That requires a trigger-detection pipeline that watches for meaningful events and drafts work product from them; no such pipeline is connected to this app today, so nothing has ever been generated here.",
  },
  needs_you: {
    title: "No prepared work is waiting on a decision",
    body: "This is the default tab: it would hold drafts that need your approval before they're used — for example, revised terms for a renewal triggered by a competitor's pricing move, or a customer note triggered by a fulfillment delay. Each card would show the trigger source and timestamp, a summary, the related entity, the evidence used to draft it, exactly what approving does, and Approve / secondary / Dismiss actions. No trigger-generated draft exists yet because the backend has no capability that detects an event and auto-drafts a work product from it — the closest real modules (opportunityPropagation.js, scenarioEngine.js) compute analysis, not approvable drafts, and neither is wired to a live route.",
  },
  upcoming: {
    title: "Nothing scheduled to be prepared",
    body: "This tab would show work Starlane expects to prepare ahead of a known future event — like a briefing readied before a scheduled meeting. Since nothing can be triggered or drafted yet, nothing is scheduled here either.",
  },
  completed: {
    title: "No completed items",
    body: "This tab would keep a history of prepared work you've already approved and acted on. Since no draft has ever been generated, none has been completed.",
  },
  dismissed: {
    title: "Nothing dismissed",
    body: "This tab would keep prepared work you chose not to act on. Since no draft has ever been generated, none has been dismissed.",
  },
};

// Real per-tab counts: zero across the board — honest, not a placeholder
// "0" chosen for visual balance. No prepared-work generation capability
// exists, so no tab can ever have a non-zero count today.
const TAB_COUNTS: Record<TabKey, number> = {
  for_you: 0,
  needs_you: 0,
  upcoming: 0,
  completed: 0,
  dismissed: 0,
};

export default function PreparedPage() {
  // Custom tab bar per §14 — Prepared does NOT use the shared subnav()
  // component other pages use; its tab set (For you/Needs you/Upcoming/
  // Completed/Dismissed) and per-tab counts are unique to this page.
  const [tab, setTab] = useState<TabKey>("needs_you");
  const copy = TAB_COPY[tab];

  return (
    <DashboardLayout pageTitle="Prepared">
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
            Prepared
          </h1>
        </div>

        <nav
          aria-label="Prepared tabs"
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
                display: "flex",
                alignItems: "center",
                gap: 6,
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
              <span>{t.label}</span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', 'SFMono-Regular', monospace",
                  fontSize: 11,
                  color: "#8A8A86",
                }}
              >
                {TAB_COUNTS[t.key]}
              </span>
            </button>
          ))}
        </nav>

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
