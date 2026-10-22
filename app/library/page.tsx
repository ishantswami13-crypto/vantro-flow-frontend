"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Chevron, PageHeader, SearchField, SectionTitle } from "@/components/v32/ui";
import { IconBookmarkFilled, IconPlus, IconScan } from "@/components/v32/icons";
import { listSavedPrompts, removeSavedPrompt, SAVED_PROMPTS_EVENT, type SavedPrompt } from "@/lib/promptStore";
import { listThreads, SCAN_THREADS_EVENT, type ScanThread } from "@/lib/scanStore";
import { formatRelative, formatDateTime } from "@/lib/format";

// Library: ready questions to start a Scan from, and the ones the person saved.
// Every entry opens Scan with the question asked. Screens are reached from the
// sidebar and Ctrl+K, so the Library doesn't repeat them.

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

export default function LibraryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<SavedPrompt[]>([]);
  const [recent, setRecent] = useState<ScanThread[]>([]);

  useEffect(() => {
    const load = () => setSaved(listSavedPrompts());
    const loadRecent = () => setRecent(listThreads());
    load();
    loadRecent();
    window.addEventListener(SAVED_PROMPTS_EVENT, load);
    window.addEventListener(SCAN_THREADS_EVENT, loadRecent);
    return () => { window.removeEventListener(SAVED_PROMPTS_EVENT, load); window.removeEventListener(SCAN_THREADS_EVENT, loadRecent); };
  }, []);

  const q = query.trim().toLowerCase();
  const prompts = useMemo(() => PROMPTS.filter(p => !q || p.text.toLowerCase().includes(q) || p.area.toLowerCase().includes(q)), [q]);
  const savedShown = useMemo(() => saved.filter(p => !q || p.text.toLowerCase().includes(q)), [saved, q]);
  const recentShown = useMemo(() => recent.filter(t => !q || t.title.toLowerCase().includes(q)).slice(0, 5), [recent, q]);
  const areas = useMemo(() => {
    const out: { area: string; items: Prompt[] }[] = [];
    for (const p of prompts) {
      const g = out.find(x => x.area === p.area);
      if (g) g.items.push(p); else out.push({ area: p.area, items: [p] });
    }
    return out;
  }, [prompts]);

  const ask = (text: string) => router.push(`/scan?q=${encodeURIComponent(text)}`);

  return (
    <DashboardLayout pageTitle="Library">
      <div className="page-stack w-full" style={{ maxWidth: "var(--content-max)" }}>
      <PageHeader
        title="Library"
        subtitle="Questions to start a Scan from, and the ones you saved."
        right={<>
          <div className="lib-search"><SearchField id="library-search" value={query} onChange={setQuery} placeholder="Search prompts" /></div>
          <Link href="/scan" className="ui-btn ui-btn-primary lib-new"><IconPlus size={14} /> New conversation</Link>
        </>}
      />

        <div className="lib-layout">
          <section aria-labelledby="lib-ready" className="min-w-0">
            <SectionTitle className="section-label-lead"><span id="lib-ready">Ready to ask</span><span className="wk-count">{prompts.length}</span></SectionTitle>
            {prompts.length > 0 ? (
              <div className="wk-list" role="list">
                {areas.map((g) => (
                  <div key={g.area} role="presentation">
                    <div className="lib-area" role="presentation">{g.area}<span className="wk-count">{g.items.length}</span></div>
                    {g.items.map((p) => <PromptRow key={p.text} text={p.text} onAsk={() => ask(p.text)} />)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="wk-empty" style={{ borderTop: "1px solid var(--line-strong)" }}>No prompt matches. <Link href={`/scan?q=${encodeURIComponent(query.trim())}`} style={{ color: "var(--ink)", textDecoration: "underline" }}>Ask &ldquo;{query.trim()}&rdquo; in Scan</Link></p>
            )}
          </section>

          <aside className="lib-rail" aria-label="Your prompts and conversations">
            <section>
              <SectionTitle>Saved by you{savedShown.length ? <span className="wk-count">{savedShown.length}</span> : null}</SectionTitle>
              {savedShown.length === 0 ? (
                <p className="lib-rail-empty">
                  {q ? "No saved prompt matches." : "Nothing saved yet. Save a question from any Scan answer with Save prompt; it stays in this browser."}
                </p>
              ) : (
                <ul className="lib-rail-list">
                  {savedShown.map((p) => (
                    <li key={p.id} className="lib-rail-row">
                      <button type="button" className="lib-rail-ask" onClick={() => ask(p.text)} aria-label={`Ask: ${p.text}`}>{p.text}</button>
                      <button type="button" className="scan-tool" aria-label={`Remove saved prompt: ${p.text}`} title="Remove from saved" onClick={() => removeSavedPrompt(p.text)}>
                        <IconBookmarkFilled size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <div className="flex items-baseline justify-between">
                <SectionTitle>Recent conversations{recentShown.length ? <span className="wk-count">{recent.length}</span> : null}</SectionTitle>
                {recent.length > 0 && <Link href="/scan/history" className="lib-rail-more">History</Link>}
              </div>
              {recentShown.length === 0 ? (
                <p className="lib-rail-empty">
                  {q && recent.length ? "No conversation matches." : <>No conversations on this device yet. <Link href="/scan" className="underline" style={{ color: "var(--ink)" }}>Ask Scan a question</Link></>}
                </p>
              ) : (
                <ul className="lib-rail-list">
                  {recentShown.map((t) => (
                    <li key={t.id}>
                      <Link href={`/scan/${t.id}`} className="lib-rail-row lib-rail-link">
                        <span className="line-clamp-2" style={{ flex: 1, minWidth: 0 }}>{t.title}</span>
                        <span className="lib-rail-when" title={formatDateTime(t.updatedAt)}>{formatRelative(t.updatedAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <p className="meta" style={{ margin: 0, lineHeight: 1.55 }}>Saved prompts and conversations are kept in this browser only.</p>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

/** One ready question: the whole row asks it in Scan. */
function PromptRow({ text, onAsk }: { text: string; onAsk: () => void }) {
  return (
    <div role="listitem" className="wk-row lib-row">
      <button type="button" className="lib-ask" onClick={onAsk} aria-label={`Ask: ${text}`}>
        <span style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.45 }}>{text}</span>
      </button>
      <span className="lib-go" aria-hidden="true">
        <span className="lib-go-text inline-flex items-center" style={{ gap: 6 }}><IconScan size={13} /> Ask Scan</span> <Chevron size={12} />
      </span>
    </div>
  );
}
