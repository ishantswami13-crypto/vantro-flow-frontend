"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Watch — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§14/§16.
//
// Audit finding (checked lib/api.ts in full, and server.js + lib/domain/*
// on the backend): there is no persisted, user-defined "watch condition"
// capability anywhere in the stack. §16 defines Watch as "user-defined watch
// conditions (entity, condition/threshold, evaluation frequency), each with
// a live status (nominal/watching/triggered) computed by re-evaluating the
// condition against current data, plus last-checked timestamp" — that is a
// genuinely different, stateful capability from Discover's read-only signals
// feed (which Discover honestly reuses). Nothing in the schema stores a
// user-created condition, nothing evaluates one on a schedule, and nothing
// computes a nominal/watching/triggered status from it. This is unlike
// Discover, where api.intelligence.signals() could honestly back 3 of 7 tabs.
// For Watch, there is no adjacent real capability to partially back any tab
// with — businessState() and intelligence.signals() are both "what Starlane
// noticed on its own," not "what the user told Starlane to keep checking."
// So every subnav tab here is a genuine, fully honest V32 empty state: exact
// visual shell (table header, subnav, watch_row grid/typography/spacing),
// zero fabricated rows, zero fake statuses.
//
// "New watch" CTA (handoff §2's create_label for this route): omitted. A
// disabled button implies the feature exists but is temporarily locked;
// there is no persistence endpoint behind it at all, so showing any button
// here — enabled or disabled — would overstate what exists. The empty-state
// copy below explains what Watch will do once this is built instead.

type TabKey = "active" | "changed" | "paused" | "history";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "changed", label: "Changed" },
  { key: "paused", label: "Paused" },
  { key: "history", label: "History" },
];

const TAB_COPY: Record<TabKey, { title: string; body: string }> = {
  active: {
    title: "No watch conditions configured yet",
    body: "Watch is for conditions you define — \"alert me if this customer's payments slip past 45 days\" or \"tell me if this supplier's lead time changes\" — that Starlane re-evaluates against live data and shows here with a nominal, watching, or triggered status. That capability isn't built yet: there's nowhere in Starlane today to create or store a watch condition, so this table has nothing real to show. It will populate once condition creation and scheduled re-evaluation exist.",
  },
  changed: {
    title: "No status changes to show",
    body: "This tab would list watch conditions whose status just moved (e.g. nominal → watching). Since no watch conditions can be created yet, there's nothing that could have changed.",
  },
  paused: {
    title: "No paused watches",
    body: "This tab would list watch conditions you've paused. Since watch conditions can't be created yet, none exist to pause.",
  },
  history: {
    title: "No watch history yet",
    body: "This tab would show a log of past status changes and triggers for your watch conditions. Since watch conditions can't be created yet, there's no history to show.",
  },
};

export default function WatchPage() {
  const [tab, setTab] = useState<TabKey>("active");
  const copy = TAB_COPY[tab];

  return (
    <DashboardLayout pageTitle="Watch">
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
            Watch
          </h1>
        </div>

        <div style={{ fontSize: 13.5, color: "#63635F" }}>
          No watch conditions configured yet.
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
                borderBottom: t.key === tab ? "2px solid #696D86" : "2px solid transparent",
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 2fr 1fr 1fr",
              padding: "10px 14px",
              background: "#F3F2EE",
              fontSize: 11,
              letterSpacing: 0.5,
              color: "#63635F",
            }}
          >
            <span>WATCHING</span>
            <span>CONDITION</span>
            <span>STATUS</span>
            <span style={{ textAlign: "right" }}>LAST CHECKED</span>
          </div>

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
            <p
              className="v32-body max-w-md mx-auto"
              style={{ color: "#63635F" }}
            >
              {copy.body}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
