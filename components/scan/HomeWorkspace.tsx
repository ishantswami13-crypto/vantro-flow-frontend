"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api";
import { osApi } from "@/lib/os";
import { HistoryTable, StatusText } from "@/components/hv/Pieces";
import { Lettermark } from "@/components/v32/ui";
import { decisionsApi, money, daysUntil, shortDate, relTime } from "@/lib/decisions";
import { startThread } from "@/lib/scanStore";

// Under the Home box, the workspace the public site shows on its product
// views: ready questions, what is waiting on the owner, the Vault folders
// and the agents that can work on them. Each block is real data read after
// the box is already usable, so the box never waits on it, and a block with
// nothing real in it is left out rather than filled with samples.

const SUGGESTIONS = [
  "Who owes us the most right now?",
  "Which invoices are more than 30 days overdue?",
  "How much cash should come in over the next 14 days?",
];

type Folder = { id: string; name: string; modified_at: string | null; count: number };

function FolderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <path d="M1.8 4.2c0-.6.5-1.1 1.1-1.1h3.2l1.5 1.6h5.5c.6 0 1.1.5 1.1 1.1v6.3c0 .6-.5 1.1-1.1 1.1H2.9c-.6 0-1.1-.5-1.1-1.1z" />
    </svg>
  );
}


export function HomeWorkspace() {
  const router = useRouter();
  const decisions = useQuery({ queryKey: ["decisions", "active"], queryFn: () => decisionsApi.list("active"), staleTime: 15_000 });
  const vault = useQuery({ queryKey: ["vault"], queryFn: () => request<{ folders: Folder[] }>("/api/vault"), staleTime: 60_000 });
  const agents = useQuery({ queryKey: ["os-agents"], queryFn: () => osApi.agents(), staleTime: 60_000 });

  const waiting = (decisions.data?.decisions || [])
    .filter((d) => ["OPEN", "NEEDS_INFORMATION", "SELECTED", "APPROVED"].includes(d.status))
    .slice(0, 4);
  const folders = (vault.data?.folders || []).filter((f) => f.count > 0).slice(0, 3);
  const runnable = (agents.data?.agents || []).slice(0, 3);
  const tracked = (agents.data?.agents || []).filter((a) => a.runHistory);
  const runs = useQuery({
    queryKey: ["os-agent-runs-recent", tracked.map((a) => a.key).join(",")],
    enabled: tracked.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const lists = await Promise.all(tracked.map((a) => osApi.agentRuns(a.key).catch(() => null)));
      return lists.flatMap((l) => l?.runs || [])
        .sort((x, y) => new Date(y.startedAt || 0).getTime() - new Date(x.startedAt || 0).getTime())
        .slice(0, 5);
    },
  });
  const agentName = new Map((agents.data?.agents || []).map((a) => [a.key, a.name]));

  const ask = (q: string) => router.push(`/scan/${startThread(q)}`);

  return (
    <div className="hw fade-once">
      <div className="hw-pills" aria-label="Ready questions">
        {SUGGESTIONS.map((q) => (
          <button key={q} type="button" className="hw-pill" onClick={() => ask(q)}>{q}</button>
        ))}
        <Link href="/library/all" className="hw-pill hw-pill-more">View all</Link>
      </div>

      {waiting.length > 0 && (
        <section className="hw-sec">
          <div className="hw-head">
            <div>
              <h2 className="hw-h">Waiting on you</h2>
              <p className="hw-sub">Decisions Starlane raised from your ledger</p>
            </div>
            <Link href="/prepared" className="hw-link">All approvals</Link>
          </div>
          <ul className="hw-list">
            {waiting.map((d) => {
              const stake = d.materiality?.expectedUncollected90 ?? d.materiality?.workingCapitalTiedUp ?? d.materiality?.revenueExposure ?? null;
              const left = daysUntil(d.deadline || d.window?.latestSafeAt || null);
              return (
                <li key={d.id}>
                  <Link href={`/decisions/${d.id}`} className="hw-row">
                    <span className="hw-dot" aria-hidden="true" />
                    <span className="hw-row-t">{d.title}</span>
                    <span className="hw-row-m tabular-nums">{stake != null ? money(stake, d.currency) : ""}</span>
                    <span className={`hw-row-d ${left != null && left <= 7 ? "is-soon" : ""}`}>
                      {left == null ? "" : left < 0 ? "Window closed" : left === 0 ? "Decide today" : `By ${shortDate(d.deadline || d.window?.latestSafeAt || null)}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {folders.length > 0 && (
        <section className="hw-sec">
          <div className="hw-head">
            <div>
              <h2 className="hw-h">Vaults</h2>
              <p className="hw-sub">Your files, customer ledgers and agent outputs</p>
            </div>
            <Link href="/library" className="hw-link">Open Vault</Link>
          </div>
          <div className="hw-cards">
            {folders.map((f) => (
              <Link key={f.id} href="/library" className="hw-card">
                <span className="hw-card-i"><FolderIcon /></span>
                <span className="hw-card-t">{f.name}</span>
                <span className="hw-card-s">{f.count} item{f.count === 1 ? "" : "s"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {runnable.length > 0 && (
        <section className="hw-sec">
          <div className="hw-head">
            <div>
              <h2 className="hw-h">Agents</h2>
              <p className="hw-sub">Workers that run on your own data</p>
            </div>
            <Link href="/agents" className="hw-link">All agents</Link>
          </div>
          <div className="hw-cards">
            {runnable.map((a) => (
              <Link key={a.key} href={`/agents/${encodeURIComponent(a.key)}`} className="hw-card">
                <span className="hw-card-i hw-card-mono" aria-hidden="true">{(a.name || "?").trim().charAt(0).toUpperCase()}</span>
                <span className="hw-card-t">{a.name}</span>
                <span className="hw-card-s">{a.lastRunAt ? `Last run ${relTime(a.lastRunAt)}` : "Not run yet"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(runs.data?.length || 0) > 0 && (
        <section className="hw-sec">
          <div className="hw-head">
            <div>
              <h2 className="hw-h">Recent runs</h2>
              <p className="hw-sub">What your agents did last, newest first</p>
            </div>
            <Link href="/agents" className="hw-link">All runs</Link>
          </div>
          <HistoryTable
            columns={[{ label: "Task" }, { label: "Agent" }, { label: "Status" }, { label: "When", align: "right" }]}
            template="minmax(0, 2.2fr) minmax(0, 1.2fr) 104px 96px"
            rows={(runs.data || []).map((r) => {
              const name = agentName.get(r.agentKey) || r.agentKey;
              return {
                key: r.id,
                href: `/agents/${encodeURIComponent(r.agentKey)}/run/${r.id}`,
                title: r.instruction || r.summary || undefined,
                cells: [
                  <span key="t" className="truncate">{r.instruction || r.summary || `Run the ${name.toLowerCase()}`}</span>,
                  <span key="a" className="ag-who"><Lettermark letter={name} size={20} />{name}</span>,
                  <StatusText key="s" label={r.status === "completed" ? "Completed" : r.status === "failed" ? "Failed" : "Running"} tone={r.status === "completed" ? "positive" : r.status === "failed" ? "critical" : "neutral"} />,
                  <span key="w" style={{ color: "#6E6E69" }}>{r.startedAt ? relTime(r.startedAt) : ""}</span>,
                ],
              };
            })}
          />
        </section>
      )}
    </div>
  );
}
