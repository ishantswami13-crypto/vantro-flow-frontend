"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, type PreparedCard, type PreparedResponse } from "@/lib/api";

// Prepared — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§14/§16, Priority 6.
//
// This is real, read-only curation over primitives that now exist and are
// real: pending ai_actions (Control), triggered watches (Watch), real
// BOUNDED_OPPORTUNITY chains (Opportunity Engine), and forecast risk from
// the persisted predictions table (Forecast V2). It is deliberately NOT a
// "trigger generates a draft work product" pipeline — that capability was
// re-confirmed absent from this codebase during this priority and remains
// out of scope. See lib/routes/prepared.js on the backend for the full
// honesty rationale and exactly which real source backs each tab.
//
// needs_you = real pending ai_actions awaiting a decision.
// for_you = real triggered watches + real opportunities + real forecast risk.
// completed = real decided ai_actions (status='approved').
// dismissed = real decided ai_actions (status='rejected').
// upcoming = honest empty — no real backing exists for "work scheduled
//   ahead of a known future event" anywhere in this codebase.
//
// No fabricated preparedness score, no fabricated reasoning: every
// summary/evidence field on a card traces to a real DB row or a real
// deterministic computation already used by another connected page.

type TabKey = "for_you" | "needs_you" | "upcoming" | "completed" | "dismissed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "for_you", label: "For you" },
  { key: "needs_you", label: "Needs you" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "dismissed", label: "Dismissed" },
];

const EMPTY_COPY: Record<TabKey, { title: string; body: string }> = {
  for_you: {
    title: "Nothing Starlane has flagged for you right now",
    body: "This tab shows real triggered watches, real detected opportunities, and real forecast risk for your business. There isn't any right now — that's an accurate reflection of your current data, not a placeholder.",
  },
  needs_you: {
    title: "Nothing is waiting on a decision",
    body: "This is the default tab: it lists real pending actions awaiting your approval (the same queue Control tracks). There are none right now.",
  },
  upcoming: {
    title: "Nothing scheduled to be prepared",
    body: "This tab would show work Starlane expects to prepare ahead of a known future event. No capability that schedules ahead-of-time preparation exists yet, so this tab is always honestly empty today.",
  },
  completed: {
    title: "No completed items",
    body: "This tab lists real actions you've already approved. None have been approved yet.",
  },
  dismissed: {
    title: "Nothing dismissed",
    body: "This tab lists real actions you've already rejected. None have been rejected yet.",
  },
};

function formatTimestamp(ts: string | null): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return ts;
  }
}

function PreparedCardView({ card }: { card: PreparedCard }) {
  return (
    <div
      className="prepared_card"
      style={{
        border: "1px solid rgba(25,25,23,0.10)",
        borderRadius: 8,
        padding: "16px 18px",
        marginBottom: 10,
        background: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span
          style={{
            fontFamily: "'IBM Plex Mono', 'SFMono-Regular', monospace",
            fontSize: 10,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "#8A8A86",
          }}
        >
          {card.trigger.replace(/_/g, " ")}
        </span>
        <span style={{ fontSize: 11, color: "#8A8A86" }}>{formatTimestamp(card.timestamp)}</span>
      </div>
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, color: "#191917", margin: "0 0 4px" }}>
        {card.summary}
      </p>
      {card.detail ? (
        <p className="v32-body" style={{ color: "#63635F", margin: "0 0 10px" }}>
          {card.detail}
        </p>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          className="hover-dim"
          style={{
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #191917",
            background: "#191917",
            color: "#fff",
            cursor: "default",
          }}
          title={card.approve_does}
        >
          {card.status === "pending" || !card.status ? "Approve" : "Open"}
        </button>
        <button
          className="hover-dim"
          style={{
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid rgba(25,25,23,0.20)",
            background: "none",
            color: "#63635F",
            cursor: "default",
          }}
        >
          {card.secondary}
        </button>
        <span style={{ fontSize: 11, color: "#B4B3AE", marginLeft: "auto" }}>source: {card.source}</span>
      </div>
    </div>
  );
}

export default function PreparedPage() {
  const [tab, setTab] = useState<TabKey>("needs_you");
  const [data, setData] = useState<PreparedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const user = getUser();
    if (!user?.id) {
      setData({ for_you: [], needs_you: [], upcoming: [], completed: [], dismissed: [], counts: { for_you: 0, needs_you: 0, upcoming: 0, completed: 0, dismissed: 0 }, generatedAt: "", sourcesChecked: {} });
      return;
    }
    api.intelligence.prepared(user.id)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't reach Starlane's intelligence backend.");
        setData({ for_you: [], needs_you: [], upcoming: [], completed: [], dismissed: [], counts: { for_you: 0, needs_you: 0, upcoming: 0, completed: 0, dismissed: 0 }, generatedAt: "", sourcesChecked: {} });
      });
    return () => { cancelled = true; };
  }, []);

  const counts = data?.counts ?? { for_you: 0, needs_you: 0, upcoming: 0, completed: 0, dismissed: 0 };
  const cards: PreparedCard[] = data ? data[tab] : [];
  const copy = EMPTY_COPY[tab];

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
                {counts[t.key]}
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
            overflow: cards.length ? "auto" : "hidden",
            display: "flex",
            flexDirection: "column",
            padding: cards.length ? 16 : 0,
          }}
        >
          {error ? (
            <div className="fade-once py-10 text-center" style={{ padding: "40px 24px" }}>
              <p className="v32-body" style={{ color: "#63635F" }}>{error}</p>
            </div>
          ) : data === null ? (
            <div className="fade-once py-10 text-center" style={{ padding: "40px 24px" }}>
              <p className="v32-body" style={{ color: "#63635F" }}>Loading…</p>
            </div>
          ) : cards.length === 0 ? (
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
          ) : (
            cards.map((card) => <PreparedCardView key={card.id} card={card} />)
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
