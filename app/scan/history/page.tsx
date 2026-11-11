"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button, EmptyLine, PageHeader, SearchField } from "@/components/v32/ui";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { useQuery } from "@tanstack/react-query";
import { decisionsApi, STATUS_LABEL } from "@/lib/decisions";
import { IconHistory, IconPlus, IconScan, IconTrash } from "@/components/v32/icons";
import { deleteThread, listThreads, type ScanThread } from "@/lib/scanStore";
import { timeAgo } from "@/lib/recents";

// Past Scan conversations. They live in this browser (see lib/scanStore.ts),
// so the page says "on this device" rather than implying an account history.
function groupOf(iso: string): string {
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (days < 1 && new Date(iso).toDateString() === new Date().toDateString()) return "Today";
  if (days < 7) return "Previous 7 days";
  return "Older";
}

export default function ScanHistoryPage() {
  const [threads, setThreads] = useState<ScanThread[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => { setThreads(listThreads()); }, []);

  const remove = (id: string) => {
    deleteThread(id);
    setThreads(listThreads());
  };

  const decisions = useQuery({ queryKey: ["decisions", "all"], queryFn: () => decisionsApi.list("all"), staleTime: 30_000 });
  const [kind, setKind] = useState<"all" | "conversations" | "decisions">("all");

  // One list, newest first: conversations on this device and every decision
  // Starlane raised, like the activity table on the public site's views.
  const q = query.trim().toLowerCase();
  type Row = { id: string; at: string; title: string; sub: string; href: string; kind: "conversation" | "decision"; threadId?: string };
  const convs: Row[] = (threads || [])
    .filter(t => !q || t.turns.some(x => x.question.toLowerCase().includes(q) || x.response.message.toLowerCase().includes(q)))
    .map(t => ({ id: `t-${t.id}`, at: t.updatedAt, title: t.title, sub: `${t.turns.length} ${t.turns.length === 1 ? "question" : "questions"}`, href: `/scan/${t.id}`, kind: "conversation", threadId: t.id }));
  const decs: Row[] = (decisions.data?.decisions || [])
    .filter(d => !q || d.title.toLowerCase().includes(q))
    .map(d => ({ id: `d-${d.id}`, at: d.updatedAt || d.discoveredAt || "", title: d.title, sub: STATUS_LABEL[d.status] || d.status, href: `/decisions/${d.id}`, kind: "decision" }));
  const rows = [...(kind !== "decisions" ? convs : []), ...(kind !== "conversations" ? decs : [])]
    .filter(r => r.at).sort((x, y) => y.at.localeCompare(x.at));
  const groups: { label: string; items: Row[] }[] = [];
  for (const r of rows) {
    const label = groupOf(r.at);
    const g = groups.find(x => x.label === label);
    if (g) g.items.push(r); else groups.push({ label, items: [r] });
  }
  const loading = threads === null || decisions.isLoading;

  return (
    <DashboardLayout pageTitle="History">
      <div className="flex flex-col" style={{ gap: 20 }}>
        <PageHeader
          title="History"
          subtitle="Your conversations and the decisions Starlane raised, newest first"
          right={<Button href="/bridge"><IconPlus size={14} /> New conversation</Button>}
        />

        <div className="sp-summary" style={{ marginBottom: 0 }}>
          <span className="sp-summary-m"><StarlaneMark variant="glyph" size={9} /></span>
          {loading ? "Loading your history…" : `${convs.length} conversation${convs.length === 1 ? "" : "s"} on this device and ${decs.length} decision${decs.length === 1 ? "" : "s"} so far.`}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <nav aria-label="Filter" className="sp-pills" style={{ marginBottom: 0 }}>
            {([["all", "All", convs.length + decs.length], ["conversations", "Conversations", convs.length], ["decisions", "Decisions", decs.length]] as const).map(([k, label, n]) => (
              <button key={k} type="button" aria-pressed={kind === k} className={`sp-pill ${kind === k ? "is-on" : ""}`} onClick={() => setKind(k)}>{label} ({n})</button>
            ))}
          </nav>
          <div style={{ width: 280, maxWidth: "100%" }}>
            <SearchField id="history-search" value={query} onChange={setQuery} placeholder="Search history" />
          </div>
        </div>

        {!loading && rows.length === 0 && (
          <EmptyLine icon={<IconHistory size={17} />}
            title={q ? "Nothing matches" : "No history yet"}
            body={q ? "Search looks through every question, answer and decision title." : "Questions you ask and decisions Starlane raises appear here so you can pick them up again."} />
        )}

        {groups.map(g => (
          <section key={g.label}>
            <h2 className="sp-h3" style={{ marginTop: 6 }}>{g.label}</h2>
            <div className="sp-table">
              <div className="sp-tr sp-th sp-tr-hist"><span>Activity</span><span>Kind</span><span>Status</span><span className="sp-right">When</span></div>
              {g.items.map(r => (
                <div key={r.id} className="sp-tr sp-tr-hist scan-hist-row">
                  <Link href={r.href} className="sp-td-main" style={{ textDecoration: "none" }}>
                    <span className="sp-doc">{r.kind === "conversation" ? <IconScan size={12} /> : <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M8 1.8l6.2 6.2L8 14.2 1.8 8z" /></svg>}</span>
                    <span className="truncate">{r.title}</span>
                  </Link>
                  <span className="sp-td">{r.kind === "conversation" ? "Conversation" : "Decision"}</span>
                  <span className="sp-td">{r.sub}</span>
                  <span className="sp-td sp-right inline-flex items-center justify-end" style={{ gap: 8 }}>
                    {timeAgo(r.at)}
                    {r.threadId && (
                      <button type="button" onClick={() => remove(r.threadId!)} className="scan-tool scan-hist-del" aria-label={`Delete conversation: ${r.title}`}>
                        <IconTrash size={13} />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}
