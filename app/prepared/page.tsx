"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

// Only ai_actions-backed cards have a real decide pathway (PATCH
// /api/ai-actions/:id, the same one Bridge's Lens drawer and
// Control/Approvals already use). Cards from watches, predictions, or the
// opportunity engine have no real approve/reject/dismiss endpoint behind
// them — their primary action can only honestly be "open the real page
// that explains them," and their secondary action stays disabled rather
// than pretending to dismiss something the backend can't persist.
function targetPathForCard(card: PreparedCard): string {
  if (card.source === "ai_actions") return "/control/approvals";
  if (card.source === "watches") return "/watch";
  if (card.source === "predictions") return "/forecast";
  if (card.source === "opportunityPropagation") return "/discover?tab=opportunities";
  return "/control/approvals";
}

function PreparedCardView({
  card, busy, onApprove, onReject, onOpen,
}: {
  card: PreparedCard;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpen: () => void;
}) {
  const isAiAction = card.source === "ai_actions";
  const isPending = card.status === "pending" || !card.status;
  const primaryIsApprove = isAiAction && isPending;
  const secondaryEnabled = isAiAction && isPending;

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
          onClick={primaryIsApprove ? onApprove : onOpen}
          disabled={busy}
          style={{
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #191917",
            background: "#191917",
            color: "#fff",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
          title={card.approve_does}
        >
          {primaryIsApprove ? (busy ? "Approving…" : "Approve") : "Open"}
        </button>
        <button
          className={secondaryEnabled ? "hover-dim" : undefined}
          onClick={secondaryEnabled ? onReject : undefined}
          disabled={!secondaryEnabled || busy}
          title={secondaryEnabled ? undefined : "Not available yet — there's no real dismiss action for this source yet"}
          style={{
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid rgba(25,25,23,0.20)",
            background: "none",
            color: secondaryEnabled ? "#63635F" : "#B5B5B0",
            cursor: secondaryEnabled && !busy ? "pointer" : "not-allowed",
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
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("needs_you");
  const [data, setData] = useState<PreparedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const emptyResponse = (): PreparedResponse => ({
    for_you: [], needs_you: [], upcoming: [], completed: [], dismissed: [],
    counts: { for_you: 0, needs_you: 0, upcoming: 0, completed: 0, dismissed: 0 },
    generatedAt: "", sourcesChecked: {},
  });

  const load = () => {
    const user = getUser();
    if (!user?.id) {
      setData(emptyResponse());
      return;
    }
    return api.intelligence.prepared(user.id)
      .then((res) => { setData(res); setError(null); })
      .catch(() => {
        setError("Couldn't reach Starlane's intelligence backend.");
        setData(emptyResponse());
      });
  };

  useEffect(() => {
    let cancelled = false;
    const user = getUser();
    if (!user?.id) {
      setData(emptyResponse());
      return;
    }
    api.intelligence.prepared(user.id)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't reach Starlane's intelligence backend.");
        setData(emptyResponse());
      });
    return () => { cancelled = true; };
  }, []);

  async function decide(card: PreparedCard, status: "approved" | "rejected") {
    setActionError(null);
    setBusyId(card.id);
    try {
      await api.aiActions.updateStatus(card.id, status);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : `Couldn't ${status === "approved" ? "approve" : "reject"} this — try again.`);
    } finally {
      setBusyId(null);
    }
  }

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
            <>
              {actionError && (
                <p style={{ fontSize: 12.5, color: "#B3261E", marginBottom: 10 }}>{actionError}</p>
              )}
              {cards.map((card) => (
                <PreparedCardView
                  key={card.id}
                  card={card}
                  busy={busyId === card.id}
                  onApprove={() => decide(card, "approved")}
                  onReject={() => decide(card, "rejected")}
                  onOpen={() => router.push(targetPathForCard(card))}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
