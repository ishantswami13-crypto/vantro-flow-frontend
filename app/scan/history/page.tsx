"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyLine, PageHeader, SearchField, SkeletonRows } from "@/components/v32/ui";
import { IconHistory, IconPlus, IconTrash } from "@/components/v32/icons";
import { deleteThread, listThreads, type ScanThread } from "@/lib/scanStore";
import { formatClock, formatDateTime, formatRelative } from "@/lib/format";

// Past Scan conversations. They live in this browser (see lib/scanStore.ts),
// so the page says "on this device" rather than implying an account history.
// Laid out at the page width like every other list, grouped by recency.
function groupOf(iso: string): string {
  const d = new Date(iso);
  const days = (Date.now() - d.getTime()) / 86400000;
  if (d.toDateString() === new Date().toDateString()) return "Today";
  if (days < 7) return "Previous 7 days";
  if (days < 30) return "Previous 30 days";
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

  const groups: { label: string; items: ScanThread[] }[] = [];
  // Search matches any question or answer in the conversation, not just its title.
  const q = query.trim().toLowerCase();
  const shown = (threads || []).filter(t => !q || t.turns.some(x => x.question.toLowerCase().includes(q) || x.response.message.toLowerCase().includes(q)));
  for (const t of shown) {
    const label = groupOf(t.updatedAt);
    const g = groups.find(x => x.label === label);
    if (g) g.items.push(t); else groups.push({ label, items: [t] });
  }

  return (
    <DashboardLayout pageTitle="History">
      <div style={{ width: "100%", maxWidth: "var(--content-max)" }}>
        <PageHeader
          title="History"
          subtitle="Your Scan conversations, kept in this browser on this device."
          right={<Link href="/scan" className="ui-btn ui-btn-primary"><IconPlus size={14} /> New conversation</Link>}
        >
          {threads && threads.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <SearchField id="history-search" value={query} onChange={setQuery} placeholder="Search questions and answers" />
            </div>
          )}
        </PageHeader>

        {threads === null && <div style={{ marginTop: 24 }}><SkeletonRows rows={4} height={56} /></div>}

        {q && threads && threads.length > 0 && shown.length === 0 && (
          <div style={{ marginTop: 16 }}>
            <EmptyLine icon={<IconHistory size={17} />} title="No conversation matches" body="Search looks through every question and answer kept on this device." />
          </div>
        )}

        {threads && threads.length === 0 && (
          <div style={{ marginTop: 16 }}>
            <EmptyLine
              icon={<IconHistory size={17} />}
              title="No conversations yet"
              body="Questions you ask in Scan appear here, so you can pick them up again. They stay in this browser and don't follow you to other devices."
              action={<Link href="/scan" className="ui-btn ui-btn-secondary ui-btn-sm">Ask a question</Link>}
            />
          </div>
        )}

        {groups.map(g => (
          <section key={g.label} style={{ marginTop: 28 }} aria-label={g.label}>
            <div className="flex items-baseline justify-between" style={{ fontSize: 12, color: "var(--ink-3)", paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
              <span>{g.label}</span>
              <span className="tabular-nums">{g.items.length}</span>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {g.items.map((t, i) => {
                const last = t.turns[t.turns.length - 1];
                return (
                  <li key={t.id} className="scan-hist-row rise-in" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                    <Link href={`/scan/${t.id}`} className="flex items-center min-w-0" style={{ gap: 16, flex: 1, textDecoration: "none", padding: "6px 0" }}>
                      <span className="flex flex-col min-w-0" style={{ flex: 1 }}>
                        <span className="truncate" style={{ fontSize: 14, color: "var(--ink)" }}>{t.title}</span>
                        {t.turns.length > 1 && last && (
                          <span className="truncate" style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 3 }}>Last asked: {last.question}</span>
                        )}
                      </span>
                      <span className="hidden sm:inline tabular-nums shrink-0" style={{ fontSize: 12.5, color: "var(--ink-3)", width: 92, textAlign: "right" }}>
                        {t.turns.length} {t.turns.length === 1 ? "question" : "questions"}
                      </span>
                      <span className="tabular-nums shrink-0" style={{ fontSize: 12.5, color: "var(--ink-2)", width: 84, textAlign: "right" }} title={formatDateTime(t.updatedAt)}>
                        {g.label === "Today" ? formatClock(t.updatedAt) : formatRelative(t.updatedAt)}
                      </span>
                    </Link>
                    <button type="button" onClick={() => remove(t.id)} className="scan-tool scan-hist-del" aria-label={`Delete conversation: ${t.title}`} title="Delete from this device">
                      <IconTrash size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}
