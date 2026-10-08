"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Chevron, PageHeader, SearchField, SectionTitle, Subnav } from "@/components/v32/ui";
import {
  IconAgents, IconBookmarkFilled, IconDiscover, IconLink, IconMemory,
  IconMissions, IconPlus, IconPrepared, IconScan, IconSimulate, IconSparkle, IconUpload, IconWatch,
} from "@/components/v32/icons";
import { listSavedPrompts, removeSavedPrompt, SAVED_PROMPTS_EVENT, type SavedPrompt } from "@/lib/promptStore";

// Library: ready questions to ask Scan, the ones the person saved, and the
// workflows Starlane can run. Like Harvey's Library (Prompts, Workflows),
// but every entry here maps to something that already works: a prompt opens
// Scan with the question asked, and a workflow opens the screen that does it.

type Prompt = { text: string; area: string };
const PROMPTS: Prompt[] = [
  { area: "Collections", text: "Who owes us the most right now?" },
  { area: "Collections", text: "Which invoices are more than 30 days overdue?" },
  { area: "Collections", text: "Who broke a payment promise this month?" },
  { area: "Collections", text: "Which customers need a firm reminder this week?" },
  { area: "Cash", text: "How much cash should come in over the next 14 days?" },
  { area: "Cash", text: "What is our total outstanding, and how much of it is overdue?" },
  { area: "Customers", text: "Which customers usually pay late, and by how many days?" },
  { area: "Customers", text: "Who are our best-paying customers?" },
  { area: "Customers", text: "Which customers have gone quiet for more than 30 days?" },
  { area: "Sales", text: "Which customers bought the most this month?" },
];

type Workflow = { title: string; does: string; get: string; href: string; area: string; icon: React.ReactNode };
const WORKFLOWS: Workflow[] = [
  { area: "Collections", title: "Chase overdue invoices", does: "Picks who to follow up and prepares reminders.", get: "Reminders waiting for your approval", href: "/missions/new", icon: <IconMissions size={14} /> },
  { area: "Collections", title: "Decide what's waiting", does: "Decisions Starlane has prepared, with what is at stake.", get: "Options you approve or turn down", href: "/prepared", icon: <IconPrepared size={14} /> },
  { area: "Cash", title: "Forecast cash", does: "Tries a what-if against your open invoices.", get: "Expected cash in by week", href: "/simulate", icon: <IconSimulate size={14} /> },
  { area: "Cash", title: "Watch a number", does: "Re-checks a condition, like overdue share, against live data.", get: "An alert when it changes", href: "/watch", icon: <IconWatch size={14} /> },
  { area: "Data", title: "Import invoices", does: "Bring in a receivables or sales export.", get: "Your invoices ready to scan", href: "/decisions/import", icon: <IconUpload size={14} /> },
  { area: "Data", title: "Connect Tally", does: "Sync customers and invoices from Tally.", get: "Data that stays up to date", href: "/sources", icon: <IconLink size={14} /> },
  { area: "Insight", title: "Scan my books", does: "Rebuilds how invoices turn into cash.", get: "Bottlenecks and opportunities", href: "/scan?books=1", icon: <IconSparkle size={14} /> },
  { area: "Insight", title: "Find opportunities", does: "Findings Starlane spotted in your data.", get: "A ranked list to act on", href: "/discover", icon: <IconDiscover size={14} /> },
  { area: "Insight", title: "See what changed", does: "How each item reached its current state.", get: "A timeline you can trace", href: "/memory", icon: <IconMemory size={14} /> },
  { area: "Insight", title: "See what runs for you", does: "The agents working in this workspace.", get: "Last run and status of each", href: "/agents", icon: <IconAgents size={14} /> },
];

export default function LibraryPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"prompts" | "workflows">("prompts");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<SavedPrompt[]>([]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "workflows") setTab("workflows");
    const load = () => setSaved(listSavedPrompts());
    load();
    window.addEventListener(SAVED_PROMPTS_EVENT, load);
    return () => window.removeEventListener(SAVED_PROMPTS_EVENT, load);
  }, []);

  const q = query.trim().toLowerCase();
  const prompts = useMemo(() => PROMPTS.filter(p => !q || p.text.toLowerCase().includes(q) || p.area.toLowerCase().includes(q)), [q]);
  const savedShown = useMemo(() => saved.filter(p => !q || p.text.toLowerCase().includes(q)), [saved, q]);
  const workflows = useMemo(() => WORKFLOWS.filter(w => !q || `${w.title} ${w.does} ${w.area}`.toLowerCase().includes(q)), [q]);

  const ask = (text: string) => router.push(`/scan?q=${encodeURIComponent(text)}`);

  return (
    <DashboardLayout pageTitle="Library">
      <div className="page-stack w-full" style={{ maxWidth: "var(--content-max)" }}>
      <PageHeader
        title="Library"
        subtitle="Questions to ask Scan and workflows Starlane can run for you."
        right={<Link href="/scan" className="ui-btn ui-btn-primary"><IconPlus size={14} /> New conversation</Link>}
      >
        <div style={{ marginTop: 20 }}>
          <Subnav
            label="Library sections"
            active={tab}
            onChange={k => setTab(k as "prompts" | "workflows")}
            items={[
              { key: "prompts", label: "Prompts", count: PROMPTS.length + saved.length },
              { key: "workflows", label: "Workflows", count: WORKFLOWS.length },
            ]}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <SearchField id="library-search" value={query} onChange={setQuery} placeholder={tab === "prompts" ? "Search prompts" : "Search workflows"} />
        </div>
      </PageHeader>

      {tab === "prompts" && (
        <div className="flex flex-col" style={{ gap: 32 }}>
          <section>
            <SectionTitle>Saved by you{savedShown.length ? <span className="wk-count">{savedShown.length}</span> : null}</SectionTitle>
            {savedShown.length === 0 ? (
              <p className="wk-empty" style={{ borderTop: "1px solid var(--line)" }}>
                {q ? "No saved prompt matches." : "Nothing saved yet. Save a question from any Scan conversation with the bookmark under it; saved prompts stay in this browser."}
              </p>
            ) : (
              <div className="wk-list" role="list">
                <div className="wk-head lib-head" style={{ gridTemplateColumns: PROMPT_COLS }}><span>Question</span><span>Kept</span><span /></div>
                {savedShown.map((p) => (
                  <PromptRow key={p.id} text={p.text} tag="On this device" onAsk={() => ask(p.text)} onRemove={() => removeSavedPrompt(p.text)} />
                ))}
              </div>
            )}
          </section>

          {prompts.length > 0 && (
            <section>
              <SectionTitle>Ready to ask<span className="wk-count">{prompts.length}</span></SectionTitle>
              <div className="wk-list" role="list">
                <div className="wk-head lib-head" style={{ gridTemplateColumns: PROMPT_COLS }}><span>Question</span><span>Area</span><span /></div>
                {prompts.map((p) => (
                  <PromptRow key={p.text} text={p.text} tag={p.area} onAsk={() => ask(p.text)} />
                ))}
              </div>
            </section>
          )}

          {q && prompts.length === 0 && savedShown.length === 0 && (
            <p className="wk-empty">No prompt matches. <Link href={`/scan?q=${encodeURIComponent(query.trim())}`} style={{ color: "var(--ink)", textDecoration: "underline" }}>Ask &ldquo;{query.trim()}&rdquo; in Scan</Link></p>
          )}
        </div>
      )}

      {tab === "workflows" && (
        workflows.length > 0 ? (
          <div className="wk-list" role="table" aria-label="Workflows">
            <div className="wk-head" role="row" style={{ gridTemplateColumns: FLOW_COLS }}>
              <span role="columnheader">Workflow</span>
              <span role="columnheader">What it does</span>
              <span role="columnheader">You get</span>
              <span role="columnheader">Area</span>
              <span />
            </div>
            {workflows.map((w) => (
              <Link key={w.title} href={w.href} role="row" className="wk-row" style={{ gridTemplateColumns: FLOW_COLS }}>
                <span role="cell" className="flex items-center min-w-0" style={{ gap: 10 }}>
                  <span aria-hidden="true" className="inline-flex shrink-0" style={{ color: "var(--ink-3)" }}>{w.icon}</span>
                  <span className="wk-title">{w.title}</span>
                </span>
                <span role="cell" className="wk-sub block">{w.does}</span>
                <span role="cell" className="hidden md:block" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{w.get}</span>
                <span role="cell" className="hidden md:block wk-meta">{w.area}</span>
                <span role="cell" className="hidden md:flex justify-end"><Chevron size={13} /></span>
              </Link>
            ))}
          </div>
        ) : <p className="wk-empty">No workflow matches. Try a shorter word, or ask Scan what you want done.</p>
      )}
      </div>
    </DashboardLayout>
  );
}

const PROMPT_COLS = "minmax(0,1fr) 140px 150px";
const FLOW_COLS = "minmax(0,0.9fr) minmax(0,1.3fr) minmax(0,1fr) 88px 20px";

/** One question: ask it in Scan (the whole row), or take a saved one back. */
function PromptRow({ text, tag, onAsk, onRemove }: { text: string; tag: string; onAsk: () => void; onRemove?: () => void }) {
  return (
    <div role="listitem" className="wk-row lib-row" style={{ gridTemplateColumns: PROMPT_COLS }}>
      <button type="button" className="lib-ask" onClick={onAsk} aria-label={`Ask: ${text}`}>
        <span style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.45 }}>{text}</span>
      </button>
      <span className="wk-meta hidden md:block">{tag}</span>
      <span className="flex items-center justify-end" style={{ gap: 4 }}>
        {onRemove && (
          <button type="button" className="scan-tool" aria-label={`Remove saved prompt: ${text}`} title="Remove from saved" onClick={onRemove}>
            <IconBookmarkFilled size={14} />
          </button>
        )}
        <span className="lib-go" aria-hidden="true">
          <span className="lib-go-text inline-flex items-center" style={{ gap: 6 }}><IconScan size={13} /> Ask Scan</span> <Chevron size={12} />
        </span>
      </span>
    </div>
  );
}
