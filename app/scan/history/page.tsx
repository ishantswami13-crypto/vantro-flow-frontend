"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button, EmptyLine, IconTile, PageHeader, SearchField } from "@/components/v32/ui";
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
      <div style={{ width: 760, maxWidth: "100%", margin: "0 auto" }}>
        <PageHeader
          title="History"
          subtitle="Your Scan conversations on this device"
          right={<Button href="/scan"><IconPlus size={14} /> New conversation</Button>}
        >
          {threads && threads.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <SearchField id="history-search" value={query} onChange={setQuery} placeholder="Search conversations" />
            </div>
          )}
        </PageHeader>

        {q && threads && threads.length > 0 && shown.length === 0 && (
          <EmptyLine icon={<IconHistory size={17} />} title="No conversation matches" body="Search looks through every question and answer kept on this device." />
        )}

        {threads && threads.length === 0 && (
          <EmptyLine
            icon={<IconHistory size={17} />}
            title="No conversations yet"
            body="Questions you ask in Scan appear here so you can pick them up again."
          />
        )}

        {groups.map(g => (
          <section key={g.label} style={{ marginTop: 22 }}>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>{g.label}</div>
            {g.items.map((t, i) => (
              <div key={t.id} className="scan-hist-row rise-in" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
                <Link href={`/scan/${t.id}`} className="flex items-center min-w-0" style={{ gap: 14, flex: 1, textDecoration: "none" }}>
                  <IconTile size={34}><IconScan size={15} /></IconTile>
                  <span className="flex flex-col min-w-0">
                    <span className="truncate" style={{ fontSize: 14, color: "var(--ink)" }}>{t.title}</span>
                    <span style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                      {t.turns.length} {t.turns.length === 1 ? "question" : "questions"} · {timeAgo(t.updatedAt)}
                    </span>
                  </span>
                </Link>
                <button type="button" onClick={() => remove(t.id)} className="scan-tool scan-hist-del" aria-label={`Delete conversation: ${t.title}`}>
                  <IconTrash size={14} />
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}
