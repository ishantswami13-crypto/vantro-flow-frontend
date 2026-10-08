"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AutomationProposals, ReminderApprovals, DecisionsNeedingYou } from "@/components/os/PreparedPanels";
import { OutreachSummary } from "@/components/outreach/OutreachPanels";
import { api, getUser, type PreparedCard, type PreparedResponse } from "@/lib/api";
import { PageHeader, Subnav, EmptyLine, SkeletonRows } from "@/components/v32/ui";
import { IconPrepared, IconChevronDown } from "@/components/v32/icons";
import { Pill } from "@/components/decisions/ui";
import { formatDate, formatRelative } from "@/lib/format";
import { FactList, ItemCard, PageBody, RetryLine, SectionHead, amount, cleanTitle, humaneError, prettyDates, sentence } from "@/components/os/prepared/kit";

// Prepared — STARLANE_FRONTEND_HANDOFF.md §1/§4/§5/§14/§16, Priority 6.
//
// Real, read-only curation over primitives that exist: pending ai_actions
// (Control), triggered watches (Watch), real BOUNDED_OPPORTUNITY chains
// (Opportunity Engine), and forecast risk from the persisted predictions
// table (Forecast V2). It is deliberately NOT a "trigger generates a draft
// work product" pipeline. See lib/routes/prepared.js on the backend for
// which real source backs each tab.
//
// needs_you = real pending ai_actions awaiting a decision (plus the decision,
//   reminder and workflow queues that live with Prepared).
// for_you = real triggered watches + real opportunities + real forecast risk.
// completed = real decided ai_actions (status='approved').
// dismissed = real decided ai_actions (status='rejected').
// upcoming = honest empty: nothing in the backend schedules work ahead of a
//   known future event yet.
//
// No fabricated preparedness score, no fabricated reasoning: every
// summary/evidence field on a card traces to a real DB row.

type TabKey = "needs_you" | "for_you" | "upcoming" | "completed" | "dismissed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "needs_you", label: "Needs you" },
  { key: "for_you", label: "For you" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "dismissed", label: "Dismissed" },
];

const EMPTY_COPY: Record<TabKey, { title: string; body: string }> = {
  needs_you: {
    title: "Nothing is waiting on you",
    body: "Decisions, prepared actions and reminders that need your approval appear here. Starlane only raises one when something material changed and there is still time to act.",
  },
  for_you: {
    title: "Nothing flagged for you right now",
    body: "Triggered watches, detected opportunities and forecast risk for your business appear here.",
  },
  upcoming: {
    title: "Nothing scheduled to be prepared",
    body: "Work Starlane prepares ahead of a known date will appear here.",
  },
  completed: {
    title: "No completed items yet",
    body: "Actions you approve appear here.",
  },
  dismissed: {
    title: "Nothing dismissed",
    body: "Actions you reject appear here.",
  },
};

// Only ai_actions-backed cards have a real decide pathway (PATCH
// /api/ai-actions/:id, the same one Bridge's Lens drawer and
// Control/Approvals already use). Cards from watches, predictions, or the
// opportunity engine have no approve/reject/dismiss endpoint behind them, so
// their one action opens the page that explains them, and they get no
// dismiss button rather than one that pretends to dismiss something.
const SOURCE_LABEL: Record<string, string> = {
  ai_actions: "Prepared action",
  watches: "From a watch",
  predictions: "From the cash forecast",
  opportunityPropagation: "From an opportunity",
};

const TRIGGER_LABEL: Record<string, string> = {
  FLAG_BAD_DEBT: "Likely bad debt",
  CONTACT_CUSTOMER: "Reminder",
  watch_triggered: "Watch triggered",
  forecast_risk: "Cash forecast risk",
  opportunity_detected: "Opportunity",
};

function targetPathForCard(card: PreparedCard): string {
  // Opens Approvals with this action already selected.
  if (card.source === "ai_actions") return `/control/approvals?id=${encodeURIComponent(card.id)}`;
  if (card.source === "watches") return "/watch";
  if (card.source === "predictions") return "/forecast";
  if (card.source === "opportunityPropagation") return "/discover";
  return "/control/approvals";
}

type Facts = Record<string, unknown>;
function factsOf(card: PreparedCard): Facts | null {
  const ev = card.evidence as { facts?: Facts } | null;
  return ev && typeof ev === "object" && !Array.isArray(ev) && ev.facts && typeof ev.facts === "object" ? ev.facts : null;
}
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/** Backend detail lines, with ISO dates and raw forecast numbers shown the way people read them. */
function readableDetail(detail: string | null): string | null {
  if (!detail) return null;
  const m = detail.match(/^Point estimate (-?[\d.]+), range \[(-?[\d.]+), (-?[\d.]+)\]\.?$/);
  if (m) return `Expected ${amount(Number(m[1]))}, with a range from ${amount(Number(m[2]))} to ${amount(Number(m[3]))}.`;
  return prettyDates(detail);
}

const FACT_LABEL: Record<string, string> = {
  invoice_amount_open: "Open on the invoice",
  days_overdue: "Days overdue today",
  days_overdue_when_prepared: "Days overdue when prepared",
  due_date: "Due",
  last_reminder_sent: "Last reminder",
  payment_status: "Status in your books",
};

function factRows(f: Facts): { label: string; value: string }[] {
  return Object.keys(FACT_LABEL).filter((k) => f[k] != null && f[k] !== "").map((k) => {
    const v = f[k];
    const value = k === "invoice_amount_open" ? amount(num(v)) : k === "due_date" || k === "last_reminder_sent" ? formatDate(String(v)) : k === "payment_status" ? sentence(String(v)) : String(v);
    return { label: FACT_LABEL[k], value };
  });
}

function PreparedCardView({ card, busy, onApprove, onReject, onOpen }: {
  card: PreparedCard; busy: boolean; onApprove: () => void; onReject: () => void; onOpen: () => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const isAiAction = card.source === "ai_actions";
  const isPending = card.status === "pending" || !card.status;
  const canDecide = isAiAction && isPending;
  const facts = factsOf(card);
  const owed = facts ? num(facts.invoice_amount_open) : null;
  const overdue = facts ? num(facts.days_overdue) : null;
  const rows = facts ? factRows(facts) : [];
  const when = formatRelative(card.timestamp);
  const label = TRIGGER_LABEL[card.trigger] || sentence(card.trigger);

  return (
    <ItemCard
      quiet={!isPending}
      chip={<Pill tone={card.priority === "high" && isPending ? "warn" : "neutral"}>{label}</Pill>}
      meta={[SOURCE_LABEL[card.source] || "Starlane", when].filter(Boolean).join(" · ")}
      title={cleanTitle(card.summary)}
      why={readableDetail(card.detail)}
      stake={owed != null ? amount(owed) : undefined}
      stakeNote={owed != null ? (overdue != null && overdue > 0 ? `${overdue} days overdue` : "open on the invoice") : undefined}
      actions={
        <>
          {canDecide ? (
            <button type="button" className="ui-btn ui-btn-primary" onClick={onApprove} disabled={busy} title={card.approve_does}>{busy ? "Approving…" : "Approve"}</button>
          ) : (
            <button type="button" className={`ui-btn ${isPending ? "ui-btn-secondary" : "ui-btn-ghost"}`} onClick={onOpen}>Review</button>
          )}
          {canDecide && <button type="button" className="ui-btn ui-btn-ghost" onClick={onOpen}>Review</button>}
          {rows.length > 0 && (
            <button type="button" className="ui-btn ui-btn-ghost" aria-expanded={showEvidence} onClick={() => setShowEvidence((v) => !v)}>
              <span style={{ display: "inline-flex", transform: showEvidence ? "rotate(180deg)" : undefined, transition: "transform 160ms" }}><IconChevronDown size={13} /></span>
              Evidence
            </button>
          )}
          {canDecide && (
            <button type="button" className="ui-btn ui-btn-ghost" onClick={onReject} disabled={busy} style={{ marginLeft: "auto" }}>{card.secondary || "Reject"}</button>
          )}
        </>
      }
    >
      {(canDecide && card.approve_does) || showEvidence ? (
        <>
          {canDecide && card.approve_does && (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, maxWidth: 760 }}>
              {/^approv/i.test(card.approve_does) ? null : <span style={{ color: "var(--ink-3)" }}>If you approve: </span>}{card.approve_does}
            </p>
          )}
          {showEvidence && (
            <div style={{ marginTop: canDecide && card.approve_does ? 12 : 0, maxWidth: 520 }}>
              <FactList rows={rows} />
            </div>
          )}
        </>
      ) : null}
    </ItemCard>
  );
}

const emptyResponse = (): PreparedResponse => ({
  for_you: [], needs_you: [], upcoming: [], completed: [], dismissed: [],
  counts: { for_you: 0, needs_you: 0, upcoming: 0, completed: 0, dismissed: 0 },
  generatedAt: "", sourcesChecked: {},
});

export default function PreparedPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("needs_you");
  const [data, setData] = useState<PreparedResponse | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Counts reported by the queues that load on their own (null until loaded).
  const [decisionsN, setDecisionsN] = useState<number | null>(null);
  const [remindersN, setRemindersN] = useState<number | null>(null);
  const [proposalsN, setProposalsN] = useState<number | null>(null);

  const load = useCallback(async () => {
    const user = getUser();
    if (!user?.id) { setData(emptyResponse()); return; }
    try {
      const res = await api.intelligence.prepared(user.id);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e);
      setData((d) => d ?? emptyResponse());
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(card: PreparedCard, status: "approved" | "rejected") {
    setActionError(null);
    setBusyId(card.id);
    try {
      await api.aiActions.updateStatus(card.id, status);
      await load();
    } catch (e) {
      setActionError(humaneError(e, `Couldn't ${status === "approved" ? "approve" : "reject"} this just now. Try again in a moment.`));
    } finally {
      setBusyId(null);
    }
  }

  const counts = data?.counts ?? { for_you: 0, needs_you: 0, upcoming: 0, completed: 0, dismissed: 0 };
  const loaded = data !== null && !error;
  const cards: PreparedCard[] = data ? data[tab] : [];
  const tabCount = (k: TabKey): number | null => {
    if (!loaded) return null;
    if (k === "needs_you") return counts.needs_you + (decisionsN ?? 0) + (remindersN ?? 0);
    if (k === "for_you") return counts.for_you + (proposalsN ?? 0);
    return counts[k];
  };

  const sideQueuesEmpty = tab === "needs_you" ? decisionsN === 0 && remindersN === 0 : tab === "for_you" ? proposalsN === 0 : true;
  const showEmpty = loaded && cards.length === 0 && sideQueuesEmpty;

  return (
    <DashboardLayout pageTitle="Prepared">
      <PageBody>
        <PageHeader
          title="Prepared"
          subtitle="Decisions and prepared work waiting on you, with what is at stake."
          right={
            /* Control › Approvals lists every decision waiting on the owner;
               this page shows the prepared subset. */
            <Link href="/control/approvals" className="ui-btn ui-btn-ghost ui-btn-sm">All approvals</Link>
          }
        />

        <Subnav
          label="Prepared"
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
          items={TABS.map((t) => ({ key: t.key, label: t.label, count: tabCount(t.key) }))}
        />

        {actionError && <RetryLine error={actionError} />}
        {error ? <RetryLine error={error} onRetry={() => { setError(null); void load(); }} /> : null}

        {/* The queues that live with Prepared load once and stay mounted, so
            the tab counts are right before a tab is opened. */}
        <div hidden={tab !== "needs_you"}><DecisionsNeedingYou onCount={setDecisionsN} /></div>

        {data === null ? (
          <SkeletonRows rows={3} />
        ) : cards.length > 0 ? (
          <section aria-label={tab === "needs_you" ? "Prepared actions" : TABS.find((t) => t.key === tab)?.label}>
            {tab === "needs_you" && <SectionHead title="Prepared actions" count={cards.length} hint="Each records your decision through the same approval queue as Control." />}
            <div className="flex flex-col" style={{ gap: 12 }}>
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
          </section>
        ) : null}

        <div hidden={tab !== "needs_you"}><ReminderApprovals onCount={setRemindersN} /></div>
        <div hidden={tab !== "for_you"}>
          <AutomationProposals onCount={setProposalsN} />
          <div style={{ marginTop: 24 }}><OutreachSummary context="prepared" /></div>
        </div>

        {showEmpty && !error && <EmptyLine icon={<IconPrepared size={17} />} title={EMPTY_COPY[tab].title} body={EMPTY_COPY[tab].body} />}
      </PageBody>
    </DashboardLayout>
  );
}
