"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyLine, IconTile, PageHeader, SearchField, SectionTitle, Subnav } from "@/components/v32/ui";
import {
  IconAgents, IconArrowRight, IconBookmark, IconBookmarkFilled, IconDiscover, IconLibrary, IconLink, IconMemory,
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
  { area: "Collections", title: "Chase overdue invoices", does: "Picks who to follow up and prepares reminders.", get: "Reminders waiting for your approval", href: "/missions/new", icon: <IconMissions size={15} /> },
  { area: "Collections", title: "Decide what's waiting", does: "Decisions Starlane has prepared, with what is at stake.", get: "Options you approve or turn down", href: "/prepared", icon: <IconPrepared size={15} /> },
  { area: "Cash", title: "Forecast cash", does: "Tries a what-if against your open invoices.", get: "Expected cash in by week", href: "/simulate", icon: <IconSimulate size={15} /> },
  { area: "Cash", title: "Watch a number", does: "Re-checks a condition, like overdue share, against live data.", get: "An alert when it changes", href: "/watch", icon: <IconWatch size={15} /> },
  { area: "Data", title: "Import invoices", does: "Bring in a receivables or sales export.", get: "Your invoices ready to scan", href: "/decisions/import", icon: <IconUpload size={15} /> },
  { area: "Data", title: "Connect Tally", does: "Sync customers and invoices from Tally.", get: "Data that stays up to date", href: "/sources", icon: <IconLink size={15} /> },
  { area: "Insight", title: "Scan my books", does: "Rebuilds how invoices turn into cash.", get: "Bottlenecks and opportunities", href: "/scan?books=1", icon: <IconSparkle size={15} /> },
  { area: "Insight", title: "Find opportunities", does: "Findings Starlane spotted in your data.", get: "A ranked list to act on", href: "/discover", icon: <IconDiscover size={15} /> },
  { area: "Insight", title: "See what changed", does: "How each item reached its current state.", get: "A timeline you can trace", href: "/memory", icon: <IconMemory size={15} /> },
  { area: "Insight", title: "See what runs for you", does: "The agents working in this workspace.", get: "Last run and status of each", href: "/agents", icon: <IconAgents size={15} /> },
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
      <div style={{ width: "100%", maxWidth: "var(--content-max)" }}>
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
        <div className="fade-once" style={{ display: "flex", flexDirection: "column", gap: 30, marginTop: 26 }}>
          <section>
            <SectionTitle>Saved by you</SectionTitle>
            <p style={{ margin: "0 0 4px", fontSize: 12.5, color: "var(--ink-3)" }}>Kept in this browser on this device.</p>
            {savedShown.length === 0 ? (
              <EmptyLine
                icon={<IconBookmark size={17} />}
                title={q ? "No saved prompt matches" : "Nothing saved yet"}
                body={q ? undefined : "Save a question from any Scan conversation with the bookmark under it. Saved prompts stay on this device."}
              />
            ) : (
              <div className="lib-grid" style={{ marginTop: 10 }}>
                {savedShown.map((p, i) => (
                  <PromptCard key={p.id} text={p.text} tag="Saved" delay={i} onAsk={() => ask(p.text)} onRemove={() => removeSavedPrompt(p.text)} />
                ))}
              </div>
            )}
          </section>

          {prompts.length > 0 && (
            <section>
              <SectionTitle>Ready to ask</SectionTitle>
              <div className="lib-grid" style={{ marginTop: 10 }}>
                {prompts.map((p, i) => (
                  <PromptCard key={p.text} text={p.text} tag={p.area} delay={i} onAsk={() => ask(p.text)} />
                ))}
              </div>
            </section>
          )}

          {q && prompts.length === 0 && savedShown.length === 0 && (
            <EmptyLine icon={<IconLibrary size={17} />} title="No prompt matches" body={<>Ask it in Scan instead. <Link href={`/scan?q=${encodeURIComponent(query.trim())}`} style={{ color: "var(--ink)", textDecoration: "underline" }}>Ask &ldquo;{query.trim()}&rdquo;</Link></>} />
          )}
        </div>
      )}

      {tab === "workflows" && (
        <div className="fade-once" style={{ display: "flex", flexDirection: "column", gap: 30, marginTop: 26 }}>
          {workflows.length > 0 && (
            <section>
              <div className="lib-grid">
                {workflows.map((w, i) => (
                  <Link key={w.title} href={w.href} className="lib-card rise-in" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                    <div className="flex items-center justify-between">
                      <IconTile size={30}>{w.icon}</IconTile>
                      <span className="lib-tag">{w.area}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: "var(--ink)" }}>{w.title}</div>
                      <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5 }}>{w.does}</div>
                    </div>
                    <div className="flex items-center justify-between" style={{ gap: 8, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                      <span className="lib-tag" style={{ minWidth: 0 }}>You get: {w.get}</span>
                      <span className="lib-go" aria-hidden="true"><IconArrowRight size={13} /></span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {workflows.length === 0 && <EmptyLine icon={<IconLibrary size={17} />} title="No workflow matches" body="Try a shorter word, or ask Scan what you want done." />}
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}

function PromptCard({ text, tag, delay, onAsk, onRemove }: { text: string; tag: string; delay: number; onAsk: () => void; onRemove?: () => void }) {
  return (
    <div className="lib-card rise-in" style={{ animationDelay: `${Math.min(delay, 10) * 30}ms` }} role="button" tabIndex={0} onClick={onAsk}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAsk(); } }} aria-label={`Ask: ${text}`}>
      <div className="lib-tag" style={{ paddingRight: onRemove ? 28 : 0 }}>{tag}</div>
      <div style={{ fontSize: 14.5, color: "var(--ink)", lineHeight: 1.45, flex: 1 }}>{text}</div>
      <span className="lib-go"><IconScan size={13} /> Ask Scan <IconArrowRight size={12} /></span>
      {onRemove && (
        <button type="button" className="scan-tool lib-star" aria-label={`Remove saved prompt: ${text}`} title="Remove from saved"
          onClick={e => { e.stopPropagation(); onRemove(); }}>
          <IconBookmarkFilled size={14} />
        </button>
      )}
    </div>
  );
}
