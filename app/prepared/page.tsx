"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AutomationProposals, ReminderApprovals, DecisionsNeedingYou } from "@/components/os/PreparedPanels";
import { OutreachSummary } from "@/components/outreach/OutreachPanels";
import { api, getUser, type PreparedCard, type PreparedResponse } from "@/lib/api";
import { PageHeader, EmptyLine, ErrorBanner, SkeletonRows } from "@/components/v32/ui";

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
    body: "Triggered watches, detected opportunities and forecast risk for your business appear here. There isn't any right now.",
  },
  needs_you: {
    title: "Nothing is waiting on a decision",
    body: "Prepared actions waiting for your approval appear here, the same queue Control tracks. There are none right now.",
  },
  upcoming: {
    title: "Nothing scheduled to be prepared",
    body: "Work Starlane prepares ahead of a known date will appear here.",
  },
  completed: {
    title: "No completed items",
    body: "Actions you approve appear here. None have been approved yet.",
  },
  dismissed: {
    title: "Nothing dismissed",
    body: "Actions you dismiss appear here. None have been rejected yet.",
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
// that explains them," and they get no dismiss button at all rather than
// one that pretends to dismiss something the backend can't persist.
const SOURCE_LABEL: Record<string, string> = {
  ai_actions: "Prepared action",
  watches: "From a watch",
  predictions: "From the cash forecast",
  opportunityPropagation: "From an opportunity",
};

function targetPathForCard(card: PreparedCard): string {
  if (card.source === "ai_actions") return "/control/approvals";
  if (card.source === "watches") return "/watch";
  if (card.source === "predictions") return "/forecast";
  if (card.source === "opportunityPropagation") return "/discover";
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
  const when = formatTimestamp(card.timestamp);

  return (
    <div className="card-in hover-lift" style={{ boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(25,25,23,0.10)", borderRadius: 8, padding: 18 }}>
      <div style={{ fontSize: 11, letterSpacing: "1px", color: "var(--accent)", marginBottom: 8, textTransform: "uppercase" }}>
        {card.trigger.replace(/_/g, " ")}{when ? `, ${when}` : ""}
      </div>
      <div style={{ fontSize: 14.5, color: "#191917", marginBottom: 10, lineHeight: 1.5 }}>{card.summary}</div>
      {card.detail ? <div style={{ fontSize: 12.5, color: "#63635F", marginBottom: 6 }}>{card.detail}</div> : null}
      <div style={{ fontSize: 12.5, color: "#63635F", marginBottom: 14 }}>Source: {SOURCE_LABEL[card.source] || "Starlane"}</div>
      {primaryIsApprove && card.approve_does && <div style={{ fontSize: 12, color: "#63635F", marginBottom: 12 }}>{card.approve_does}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          className={primaryIsApprove ? "btn-primary-v32" : "btn-secondary-v32"}
          onClick={primaryIsApprove ? onApprove : onOpen}
          disabled={busy}
          style={{ padding: "8px 14px", borderRadius: 6, fontSize: 12.5, opacity: busy ? 0.4 : 1 }}
          title={card.approve_does}
        >
          {primaryIsApprove ? (busy ? "Approving…" : "Approve") : "Open"}
        </button>
        {primaryIsApprove && (
          <button type="button" className="btn-secondary-v32" onClick={onOpen} style={{ padding: "8px 14px", borderRadius: 6, fontSize: 12.5 }}>
            Review
          </button>
        )}
        {secondaryEnabled && (
          <button type="button" className="hover-dim" onClick={onReject} disabled={busy} style={{ padding: "8px 10px", border: "none", background: "none", color: "#63635F", fontSize: 12.5, marginLeft: "auto", cursor: "pointer" }}>
            {card.secondary}
          </button>
        )}
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
      <PageHeader
        title="Prepared"
        subtitle="Decisions waiting on you, with what is at stake"
        right={
          /* Control › Approvals lists every decision waiting on the owner;
             this page only shows the prepared subset. */
          <Link href="/control/approvals" className="hover-dim" style={{ fontSize: 12.5, color: "#63635F" }}>All approvals</Link>
        }
      />

      <div role="tablist" aria-label="Prepared" className="flex items-baseline overflow-x-auto" style={{ gap: 26, borderBottom: "1px solid rgba(25,25,23,0.08)" }}>
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              className={on ? "" : "hover-dim"}
              style={{ fontSize: 13.5, color: on ? "#191917" : "#63635F", paddingBottom: 8, marginBottom: -1, whiteSpace: "nowrap", background: "none", borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}` }}
            >
              {t.label} <span style={{ color: on ? "#63635F" : "#B9B8B2", fontSize: 12 }}>{data ? counts[t.key] : ""}</span>
            </button>
          );
        })}
      </div>

      {actionError && <ErrorBanner>{actionError}</ErrorBanner>}

      {error ? (
        <ErrorBanner>{error}</ErrorBanner>
      ) : data === null ? (
        <SkeletonRows rows={3} />
      ) : cards.length === 0 ? (
        <EmptyLine title={copy.title} body={copy.body} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
        </div>
      )}

      {/* The decision, reminder and workflow queues that live with Prepared,
          shown under the tab they belong to. */}
      {tab === "needs_you" && (
        <>
          <DecisionsNeedingYou />
          <ReminderApprovals />
        </>
      )}
      {tab === "for_you" && (
        <>
          <AutomationProposals />
          <OutreachSummary context="prepared" />
        </>
      )}
    </DashboardLayout>
  );
}
