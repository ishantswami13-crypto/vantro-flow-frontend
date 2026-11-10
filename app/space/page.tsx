"use client";

// The business as a space, laid out like the "October Close" workspace on
// the public site: the period and the company as a serif title, tabs for
// Home, Tasks, Vault, Agents, Ledgers, Reports and History, a run box with
// the attached files and a task chip, and the Vault folders as tiles.
// Every row is real: files and ledgers from GET /api/vault, tasks from
// GET /api/os/missions, agents from GET /api/os/agents, figures from the
// tenant's own invoices and conversations from this browser's Scan store.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { Pill } from "@/components/decisions/ui";
import { MissionsList } from "@/components/os/MissionsList";
import { RankBars, PairedBars, Legend, ALERT } from "@/components/command/Charts";
import { api, getUser, request, authHeaders, API_BASE } from "@/lib/api";
import { osApi } from "@/lib/os";
import { decisionsApi, money, relTime, STATUS_LABEL } from "@/lib/decisions";
import { PROMPTS } from "@/lib/libraryPrompts";
import { useActiveEntity } from "@/lib/entities";
import { EntityPicker } from "@/components/entities/EntityPicker";
import DashboardSwitch from "@/components/dashboards/DashboardSwitch";
import { currencyOf, useCurrencyView } from "@/lib/currency";
import { CurrencyPicker, CurrencyLine } from "@/components/entities/CurrencyPicker";
import { listThreads, startThread, SCAN_THREADS_EVENT, type ScanThread } from "@/lib/scanStore";

type Item = {
  id: string; name: string; category: string; type: string; modified_at: string | null;
  size: { rows?: number; invoices?: number; bytes?: number }; outstanding?: number; overdue?: number; agent_key?: string;
};
type Folder = { id: string; name: string; modified_at: string | null; count: number; items: Item[] };

const TABS = [
  { key: "home", label: "Home" },
  { key: "tasks", label: "Tasks" },
  { key: "vault", label: "Vault" },
  { key: "agents", label: "Agents" },
  { key: "ledgers", label: "Ledgers" },
  { key: "reports", label: "Reports" },
  { key: "history", label: "History" },
] as const;
type Tab = (typeof TABS)[number]["key"];

// The tasks the run box offers, each a question Starlane answers from the attached files.
const RUNS = [
  { label: "Match bank lines against open invoices and flag the gaps", text: "Match the bank lines against my open invoices and list every gap: unpaid, part-paid, or money received without an invoice." },
  { label: "Rank who to chase first and draft the reminders", text: "Rank the customers I should chase first, with how much each owes and how late, and draft a polite reminder for the top three." },
  { label: "Build the ageing report by customer", text: "Build an ageing report by customer: not due, 1–30, 31–60, 61–90 and over 90 days, with totals." },
  { label: "Forecast the cash coming in over 30 days", text: "From the due dates and how each customer has paid, how much cash should come in over the next 30 days, week by week?" },
];

// The close playbooks, like the Library cards on the public site.
const PLAYBOOKS = [
  { title: "Reconcile bank lines", sub: "Match receipts to the invoices they settle", text: "Reconcile this month's bank lines: match each receipt to the invoice it settles, and list what is unmatched on either side." },
  { title: "Chase overdue invoices", sub: "Rank by cash at risk and draft reminders", text: "List every overdue invoice ranked by cash at risk, and draft a reminder for the top five for me to approve." },
  { title: "Review FX revaluation", sub: "Open items in other currencies, as booked", text: "List the open invoices and bills booked in other currencies, what each is owed in its own currency, and which need a revaluation at month end." },
];

const DAY = 86_400_000;
const sizeOf = (i: Item) =>
  i.size.rows != null ? `${i.size.rows} rows`
    : i.size.invoices != null ? `${i.size.invoices} ${i.size.invoices === 1 ? "invoice" : "invoices"}`
      : i.size.bytes != null ? (i.size.bytes >= 1024 ? `${(i.size.bytes / 1024).toFixed(1)} KB` : `${i.size.bytes} B`) : "";
const longDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function FolderIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true"><path d="M1.8 4.2c0-.6.5-1.1 1.1-1.1h3.2l1.5 1.6h5.5c.6 0 1.1.5 1.1 1.1v6.3c0 .6-.5 1.1-1.1 1.1H2.9c-.6 0-1.1-.5-1.1-1.1z" /></svg>;
}
function SheetIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.4" /><path d="M2.2 6h11.6M2.2 9.8h11.6M6.2 2.2v11.6" /></svg>;
}
function DocIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 1.8h5.2L12.5 5v9.2H4z" /><path d="M9 1.8V5.2h3.5M6 8.5h4.5M6 11h3" /></svg>;
}
function LockIcon() {
  return <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" /></svg>;
}

function SpaceInner() {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = (TABS.find((t) => t.key === params.get("tab"))?.key) || "home";
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => { setUser(getUser()); }, []);

  const vault = useQuery({ queryKey: ["vault"], queryFn: () => request<{ folders: Folder[]; last_synced_at: string | null }>("/api/vault"), staleTime: 60_000 });
  const folders = useMemo(() => vault.data?.folders || [], [vault.data]);
  const uploads = folders.find((f) => f.id === "uploads")?.items || [];
  const ledgers = folders.find((f) => f.id === "customers")?.items || [];

  const { entity } = useActiveEntity();
  const biz = entity?.name || (user?.business_name || "").trim().replace(/\s+(Pvt\.?\s*Ltd\.?|Private Limited|Ltd\.?|LLP)$/i, "") || "Your business";
  // The close is for the month just ended, like "October Close" in November.
  const now = new Date();
  const closing = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = closing.toLocaleDateString("en-IN", { month: "long" });
  const period = `${closing.getFullYear()}-${String(closing.getMonth() + 1).padStart(2, "0")}`;

  const ask = (q: string) => router.push(`/scan/${startThread(q)}`);

  return (
    <DashboardLayout pageTitle={biz}>
      <div className="sp">
        <header className="sp-band">
          <p className="sp-meta">Close period #: {period} <span aria-hidden="true">·</span> {biz}</p>
          <div className="sp-titlerow">
            <span className="sp-initial" aria-hidden="true">{month.charAt(0)}</span>
            <h1 className="sp-title">{month} Close <span className="sp-dash">—</span> {biz}</h1>
            <span className="sp-chip"><LockIcon /> Internal</span>
            <span className="sp-entity"><DashboardSwitch current="finance" /><EntityPicker /></span>
          </div>
          <nav className="sp-tabs" aria-label="Space">
            {TABS.map((t) => (
              <Link key={t.key} href={t.key === "home" ? "/space" : `/space?tab=${t.key}`} scroll={false}
                aria-current={tab === t.key ? "page" : undefined} className={`sp-tab ${tab === t.key ? "is-on" : ""}`}>{t.label}</Link>
            ))}
          </nav>
        </header>

        <div className="sp-body fade-once" key={tab}>
          {tab === "home" && <HomeTab uploads={uploads} folders={folders} loading={vault.isLoading} onRun={ask} />}
          {tab === "tasks" && <TasksTab />}
          {tab === "vault" && <VaultTab folders={folders} loading={vault.isLoading} onAsk={ask} />}
          {tab === "agents" && <AgentsTab />}
          {tab === "ledgers" && <LedgersTab ledgers={ledgers} loading={vault.isLoading} onAsk={ask} />}
          {tab === "reports" && <ReportsTab userId={user?.id} onAsk={ask} />}
          {tab === "history" && <HistoryTab />}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SpacePage() {
  return <Suspense fallback={null}><SpaceInner /></Suspense>;
}

/* ── Home ───────────────────────────────────────────────────────────────── */

function HomeTab({ uploads, folders, loading, onRun }: { uploads: Item[]; folders: Folder[]; loading: boolean; onRun: (q: string) => void }) {
  const [run, setRun] = useState(0);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const files = uploads.slice(0, 3);
  const go = () => {
    const names = files.map((f) => f.name).join(", ");
    onRun(`${RUNS[run].text}${names ? ` Use the files attached: ${names}.` : ""}`);
  };

  return (
    <>
      <section className="sp-run" aria-label="Run a task">
        <div className="sp-files">
          {files.length > 0 ? files.map((f) => (
            <span key={f.id} className="sp-file"><span className="sp-file-i is-sheet"><SheetIcon /></span><span className="truncate">{f.name}</span></span>
          )) : (
            <Link href="/decisions/import" className="sp-file sp-file-empty"><span className="sp-file-i"><FolderIcon size={13} /></span>{loading ? "Loading files…" : "Attach a ledger or bills file"}</Link>
          )}
          <Link href="/sources" className="sp-file sp-file-ghost"><span className="sp-file-i"><DocIcon /></span>Ledgers from your books</Link>
        </div>
        <div className="sp-sentence">
          <span>Please run</span>
          <div className="sp-task-wrap" ref={menuRef}>
            <button type="button" className="sp-task" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <span className="sp-task-dot" aria-hidden="true" />{RUNS[run].label}
            </button>
            {open && (
              <ul className="sp-menu" role="listbox" aria-label="Task">
                {RUNS.map((r, i) => (
                  <li key={r.label}><button type="button" role="option" aria-selected={i === run} className={`sp-menu-i ${i === run ? "is-on" : ""}`} onClick={() => { setRun(i); setOpen(false); }}>{r.label}</button></li>
                ))}
              </ul>
            )}
          </div>
          <span>for the files attached.</span>
        </div>
        <div className="sp-run-foot">
          <Link href="/decisions/import" className="sp-plus" aria-label="Attach a file" title="Attach a file">+</Link>
          <button type="button" className="sp-go" onClick={go}><StarlaneMark variant="glyph" size={10} /> Run</button>
        </div>
      </section>

      <section className="sp-sec">
        <h2 className="sp-h">Vaults</h2>
        <p className="sp-sub">Ledgers and statements for this close</p>
        <div className="sp-tiles">
          {(folders.length ? folders : [{ id: "a", name: "Uploaded files", count: 0 }, { id: "b", name: "Customer ledgers", count: 0 }, { id: "c", name: "Agent outputs", count: 0 }] as Folder[]).slice(0, 3).map((f) => (
            <Link key={f.id} href="/space?tab=vault" className="sp-tile">
              <span className="sp-tile-i"><FolderIcon /></span>
              <span className="sp-tile-t">{f.name}</span>
              <span className="sp-tile-s">{loading ? "…" : `${f.count} ${f.count === 1 ? "item" : "items"}`}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sp-sec">
        <h2 className="sp-h">Library</h2>
        <p className="sp-sub">Agent playbooks for close work</p>
        <div className="sp-tiles">
          {PLAYBOOKS.map((p) => (
            <button key={p.title} type="button" className="sp-tile" onClick={() => onRun(p.text)}>
              <span className="sp-tile-i"><FolderIcon /></span>
              <span className="sp-tile-t">{p.title}</span>
              <span className="sp-tile-s">{p.sub}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="sp-sec">
        <h2 className="sp-h">Ready questions</h2>
        <p className="sp-sub">Questions Starlane answers from this close</p>
        <div className="sp-table">
          <div className="sp-tr sp-th"><span>Question</span><span>Area</span><span /></div>
          {PROMPTS.slice(0, 6).map((p) => (
            <button key={p.text} type="button" className="sp-tr" onClick={() => onRun(p.text)}>
              <span className="sp-td-main"><span className="sp-doc"><DocIcon /></span>{p.text}</span>
              <span className="sp-td">{p.area}</span>
              <span className="sp-td sp-right">Ask</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

/* ── Tasks ──────────────────────────────────────────────────────────────── */

function TasksTab() {
  const missions = useQuery({ queryKey: ["os-missions"], queryFn: () => osApi.missions(), staleTime: 15_000 });
  const agents = useQuery({ queryKey: ["os-agents"], queryFn: () => osApi.agents(), staleTime: 60_000 });
  const names = Object.fromEntries((agents.data?.agents || []).map((a) => [a.key, a.name]));
  const all = missions.data?.missions || [];
  return (
    <section className="sp-sec sp-sec-first">
      <div className="sp-head">
        <div><h2 className="sp-h">Tasks</h2><p className="sp-sub">What Starlane is handling in this space, and whether it worked</p></div>
        <Link href="/missions/new" className="sp-btn">New task</Link>
      </div>
      <MissionsList all={all} filter="active" loading={missions.isLoading} error={missions.error} agentNames={names} />
      {all.some((m) => m.state === "COMPLETED") && (
        <>
          <h3 className="sp-h3">Completed</h3>
          <MissionsList all={all} filter="completed" loading={false} error={null} agentNames={names} />
        </>
      )}
    </section>
  );
}

/* ── Vault ──────────────────────────────────────────────────────────────── */

function VaultTab({ folders, loading, onAsk }: { folders: Folder[]; loading: boolean; onAsk: (q: string) => void }) {
  const [folder, setFolder] = useState<string>("uploads");
  const current = folders.find((f) => f.id === folder) || folders[0];
  return (
    <>
      <section className="sp-sec sp-sec-first">
        <div className="sp-head">
          <div><h2 className="sp-h">Vault</h2><p className="sp-sub">Every file, ledger and agent output in this space</p></div>
          <Link href="/library" className="sp-btn">Open Vault</Link>
        </div>
        <div className="sp-tiles">
          {folders.map((f) => (
            <button key={f.id} type="button" className={`sp-tile ${current?.id === f.id ? "is-on" : ""}`} onClick={() => setFolder(f.id)}>
              <span className="sp-tile-i"><FolderIcon /></span>
              <span className="sp-tile-t">{f.name}</span>
              <span className="sp-tile-s">{f.count} {f.count === 1 ? "item" : "items"} · {relTime(f.modified_at) || "—"}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="sp-sec">
        <div className="sp-table">
          <div className="sp-tr sp-th sp-tr-4"><span>Name</span><span>Kind</span><span>Size</span><span className="sp-right">Last modified</span></div>
          {loading && <div className="sp-empty">Loading…</div>}
          {!loading && (current?.items.length ?? 0) === 0 && <div className="sp-empty">Nothing in this folder yet.</div>}
          {current?.items.map((i) => (
            <button key={i.id} type="button" className="sp-tr sp-tr-4"
              onClick={() => i.type === "Ledger" ? onAsk(`Show me ${i.name}'s ledger: every invoice, what is paid and what is still owed.`) : onAsk(`Summarise ${i.name}: what is in it and what needs my attention.`)}>
              <span className="sp-td-main"><span className={`sp-doc ${i.type === "XLSX" || i.type === "CSV" ? "is-sheet" : ""}`}>{i.type === "XLSX" || i.type === "CSV" ? <SheetIcon /> : <DocIcon />}</span><span className="truncate">{i.name}</span></span>
              <span className="sp-td">{i.category || i.type}</span>
              <span className="sp-td tabular-nums">{sizeOf(i)}</span>
              <span className="sp-td sp-right">{longDate(i.modified_at)}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

/* ── Agents (read only: the Agents pages own running them) ──────────────── */

function AgentsTab() {
  const agents = useQuery({ queryKey: ["os-agents"], queryFn: () => osApi.agents(), staleTime: 60_000 });
  const list = agents.data?.agents || [];
  return (
    <section className="sp-sec sp-sec-first">
      <div className="sp-head">
        <div><h2 className="sp-h">Agents</h2><p className="sp-sub">Workers that run on this space&rsquo;s files and ledgers</p></div>
        <Link href="/agents" className="sp-btn">All agents</Link>
      </div>
      <div className="sp-table">
        <div className="sp-tr sp-th sp-tr-3"><span>Agent</span><span>Status</span><span className="sp-right">Last run</span></div>
        {agents.isLoading && <div className="sp-empty">Loading…</div>}
        {list.map((a) => (
          <Link key={a.key} href={`/agents/${encodeURIComponent(a.key)}`} className="sp-tr sp-tr-3">
            <span className="sp-td-main"><span className="sp-letter">{a.name.charAt(0)}</span><span className="min-w-0"><span className="block truncate">{a.name}</span>{a.purpose && <span className="sp-td-sub">{a.purpose}</span>}</span></span>
            <span className="sp-td">{a.lastRunAt ? <Pill tone="good">Ready</Pill> : <Pill>Not run yet</Pill>}</span>
            <span className="sp-td sp-right">{a.lastRunAt ? relTime(a.lastRunAt) : "—"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ── Ledgers ────────────────────────────────────────────────────────────── */

function LedgersTab({ ledgers, loading, onAsk }: { ledgers: Item[]; loading: boolean; onAsk: (q: string) => void }) {
  const [filter, setFilter] = useState<"all" | "overdue">("all");
  const sorted = [...ledgers].sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));
  const shown = filter === "overdue" ? sorted.filter((l) => (l.overdue || 0) > 0) : sorted;
  const total = ledgers.reduce((s, l) => s + (l.outstanding || 0), 0);
  const late = ledgers.filter((l) => (l.overdue || 0) > 0);
  return (
    <section className="sp-sec sp-sec-first">
      <div className="sp-summary"><span className="sp-summary-m"><StarlaneMark variant="glyph" size={9} /></span>Starlane built {ledgers.length} customer ledger{ledgers.length === 1 ? "" : "s"} from your invoices{late.length > 0 ? `; ${late.length} have overdue bills` : ""}.</div>
      <div className="sp-stats">
        <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : ledgers.length}</div><div className="sp-stat-l">Customer ledgers</div></div>
        <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : money(total)}</div><div className="sp-stat-l">Outstanding</div></div>
        <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : late.length}</div><div className="sp-stat-l">With overdue bills</div></div>
      </div>
      <div className="sp-pills">
        <button type="button" className={`sp-pill ${filter === "all" ? "is-on" : ""}`} onClick={() => setFilter("all")}>All ({ledgers.length})</button>
        <button type="button" className={`sp-pill ${filter === "overdue" ? "is-on" : ""}`} onClick={() => setFilter("overdue")}>Overdue ({late.length})</button>
      </div>
      <div className="sp-table">
        <div className="sp-tr sp-th sp-tr-4"><span>Customer</span><span>Status</span><span>Invoices</span><span className="sp-right">Outstanding</span></div>
        {loading && <div className="sp-empty">Loading…</div>}
        {!loading && shown.length === 0 && <div className="sp-empty">No ledgers yet. <Link href="/decisions/import" className="underline">Import your bills</Link> and Starlane builds one per customer.</div>}
        {shown.map((l) => (
          <button key={l.id} type="button" className="sp-tr sp-tr-4" onClick={() => onAsk(`Show me ${l.name}'s ledger: every invoice, what is paid and what is still owed.`)}>
            <span className="sp-td-main"><span className="sp-doc"><DocIcon /></span><span className="min-w-0"><span className="block truncate">{l.name}</span><span className="sp-td-sub">Customer ledger</span></span></span>
            <span className="sp-td">{(l.overdue || 0) > 0 ? <Pill tone="warn">{l.overdue} overdue</Pill> : <Pill tone="good">On time</Pill>}</span>
            <span className="sp-td tabular-nums">{l.size.invoices ?? "—"}</span>
            <span className="sp-td sp-right tabular-nums">{money(l.outstanding ?? null)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── Reports ────────────────────────────────────────────────────────────── */

function ReportsTab({ userId, onAsk }: { userId?: string; onAsk: (q: string) => void }) {
  const invoicesQ = useQuery({ queryKey: ["command-invoices", userId], queryFn: () => api.invoices.list(userId!), enabled: !!userId, staleTime: 60_000 });
  const { keepCustomer, customerEntity } = useActiveEntity();
  const openAll = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return (invoicesQ.data?.invoices || []).filter((i) => i.payment_status !== "Paid" && keepCustomer(i.customer_name)).map((i) => {
      const due = i.due_date ? Date.parse(i.due_date.slice(0, 10) + "T00:00:00") : NaN;
      const late = Number.isFinite(due) ? Math.floor((today.getTime() - due) / DAY) : Number(i.days_overdue || 0);
      return { name: i.customer_name || "Unnamed customer", amount: Math.max(0, Number(i.invoice_amount) - Number(i.payment_amount || 0)), late, cur: currencyOf(i, customerEntity(i.customer_name)) };
    });
  }, [invoicesQ.data, keepCustomer, customerEntity]);
  type Open = (typeof openAll)[number];
  // One currency at a time; amounts in different currencies are never added.
  const curView = useCurrencyView(openAll, useCallback((o: Open) => o.cur, []), useCallback((o: Open) => o.amount, []));
  const { inCur: open, fmt: money } = curView;
  const total = open.reduce((s, o) => s + o.amount, 0);
  const overdue = open.filter((o) => o.late > 0).reduce((s, o) => s + o.amount, 0);
  const next30 = open.filter((o) => o.late <= 0 && o.late > -30).reduce((s, o) => s + o.amount, 0);
  const buckets = [
    { label: "Not due", t: (d: number) => d <= 0 }, { label: "1–30", t: (d: number) => d >= 1 && d <= 30 },
    { label: "31–60", t: (d: number) => d >= 31 && d <= 60 }, { label: "61–90", t: (d: number) => d >= 61 && d <= 90 },
    { label: "90+", t: (d: number) => d > 90, alert: true },
  ].map((b) => {
    const rows = open.filter((o) => b.t(o.late));
    const amt = rows.reduce((s, o) => s + o.amount, 0);
    return { label: b.label, a: total ? (amt / total) * 100 : 0, b: open.length ? (rows.length / open.length) * 100 : 0, alert: !!b.alert && rows.length > 0, aTitle: money(amt), bTitle: `${rows.length} invoices` };
  });
  const by = new Map<string, { v: number; worst: number }>();
  for (const o of open) if (o.late > 0) { const r = by.get(o.name) || { v: 0, worst: 0 }; r.v += o.amount; r.worst = Math.max(r.worst, o.late); by.set(o.name, r); }
  const top = [...by.entries()].map(([label, r]) => ({ label, value: r.v, alert: r.worst > 90 })).sort((a, b) => b.value - a.value).slice(0, 6);
  const loading = invoicesQ.isLoading || !userId;

  return (
    <section className="sp-sec sp-sec-first">
      <div className="sp-head">
        <div><h2 className="sp-h">Reports</h2><p className="sp-sub">Worked out from this space&rsquo;s invoices, as of today</p></div>
        <div className="flex items-center gap-2">
          <CurrencyPicker totals={curView.totals} cur={curView.cur} setCur={curView.setCur} />
          <Link href="/command" className="sp-btn">Command Center</Link>
        </div>
      </div>
      <CurrencyLine totals={curView.totals} cur={curView.cur} setCur={curView.setCur} />
      <div className="sp-stats">
        <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : money(total)}</div><div className="sp-stat-l">Owed to you</div></div>
        <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : money(overdue)}</div><div className="sp-stat-l">Overdue</div></div>
        <div className="sp-stat"><div className="sp-stat-n">{loading ? "—" : money(next30)}</div><div className="sp-stat-l">Falls due in 30 days</div></div>
      </div>
      <div className="sp-reports">
        <article className="cc-card sp-report">
          <h3 className="cc-h2">Receivables ageing</h3>
          <div className="cc-sub">Share of what you&rsquo;re owed, and of open invoices, by days past due</div>
          <div className="cc-chart">{open.length ? <PairedBars groups={buckets} height={150} /> : <p className="cc-note">{loading ? "Loading…" : "Nothing open."}</p>}</div>
          <footer className="cc-foot">
            <Legend items={[{ label: "Share of amount", color: "#4A505B" }, { label: "Share of invoices", color: "#D3D5D9" }, { label: "Needs attention", color: ALERT }]} />
            <button type="button" className="sp-link" onClick={() => onAsk("Build an ageing report by customer: not due, 1–30, 31–60, 61–90 and over 90 days, with totals.")}>Ask for the full report</button>
          </footer>
        </article>
        <article className="cc-card sp-report">
          <h3 className="cc-h2">Largest overdue</h3>
          <div className="cc-sub">Overdue amount by customer, largest first</div>
          <div className="cc-chart" style={{ paddingTop: 8 }}>{top.length ? <RankBars rows={top} format={(v) => money(v)} /> : <p className="cc-note">{loading ? "Loading…" : "Nothing overdue."}</p>}</div>
          <footer className="cc-foot">
            <Legend items={[{ label: "Overdue", color: "#4A505B" }, { label: "Over 90 days late", color: ALERT }]} />
            <button type="button" className="sp-link" onClick={() => onAsk("Which customers have overdue invoices, how much does each owe, and how late is each one?")}>Ask for the list</button>
          </footer>
        </article>
      </div>
      <ReportDownloads />
    </section>
  );
}

/* ── Report downloads: GET /api/reports/export, as Excel, CSV or a printable page ── */

const EXPORTS = [
  { id: "outstanding", name: "Outstanding receivables", desc: "Every unpaid invoice with the customer, amount, due date and days overdue" },
  { id: "collection", name: "Collection performance", desc: "Invoices raised and collected in the period, and the calls logged" },
  { id: "cashflow", name: "Cash coming in", desc: "Open invoices by when they fall due" },
  { id: "customer", name: "Customer statements", desc: "Invoices, payments and balance for each customer" },
] as const;
const PERIODS = [{ v: 30, l: "Last 30 days" }, { v: 90, l: "Last 3 months" }, { v: 365, l: "Last 12 months" }];

function ReportDownloads() {
  const { entity } = useActiveEntity();
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

  const get = async (id: string, fmt: "xlsx" | "csv" | "html") => {
    setBusy(`${id}:${fmt}`); setErr(null);
    // A printable page opens in a tab of its own; the window is claimed before the
    // request so a pop-up blocker treats it as the click it came from.
    const win = fmt === "html" ? window.open("", "_blank") : null;
    try {
      const to = iso(Date.now()), from = iso(Date.now() - days * DAY);
      const res = await fetch(`${API_BASE}/api/reports/export?report=${id}&format=${fmt}&from=${from}&to=${to}`, { headers: { ...authHeaders() }, credentials: "include" });
      if (!res.ok) throw new Error(res.status === 401 ? "Sign in again to download." : "The report couldn’t be built. Try again in a moment.");
      if (fmt === "html") {
        const html = await res.text();
        if (win) { win.document.open(); win.document.write(html); win.document.close(); }
        else throw new Error("Allow pop-ups for this site to open the printable report.");
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `starlane-${id}-${from}-to-${to}.${fmt}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      win?.close();
      setErr((e as Error).message);
    } finally { setBusy(null); }
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div className="sp-head">
        <div><h2 className="sp-h">Download reports</h2><p className="sp-sub">{entity ? "Built from every company’s invoices for the period you choose" : "Built from this space’s invoices for the period you choose"}</p></div>
        <nav aria-label="Period" className="sp-pills" style={{ margin: 0 }}>
          {PERIODS.map((p) => <button key={p.v} type="button" aria-pressed={days === p.v} className={`sp-pill ${days === p.v ? "is-on" : ""}`} onClick={() => setDays(p.v)}>{p.l}</button>)}
        </nav>
      </div>
      {err && <p role="alert" className="cc-note" style={{ color: "#A3392E", marginTop: 0 }}>{err}</p>}
      <div className="sp-table">
        {EXPORTS.map((r) => (
          <div key={r.id} className="sp-tr sp-tr-dl">
            <span className="sp-td-main">
              <span className="sp-doc"><SheetIcon /></span>
              <span className="min-w-0"><span className="block truncate">{r.name}</span><span className="sp-td-sub">{r.desc}</span></span>
            </span>
            <span className="sp-dl">
              {([["xlsx", "Excel"], ["csv", "CSV"], ["html", "Print"]] as const).map(([f, l]) => (
                <button key={f} type="button" className="sp-btn" disabled={!!busy} onClick={() => get(r.id, f)}>{busy === `${r.id}:${f}` ? "…" : l}</button>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── History ────────────────────────────────────────────────────────────── */

function HistoryTab() {
  const [threads, setThreads] = useState<ScanThread[]>([]);
  useEffect(() => {
    const load = () => setThreads(listThreads());
    load();
    window.addEventListener(SCAN_THREADS_EVENT, load);
    return () => window.removeEventListener(SCAN_THREADS_EVENT, load);
  }, []);
  const closed = useQuery({ queryKey: ["decisions", "all"], queryFn: () => decisionsApi.list("all"), staleTime: 30_000 });
  type Ev = { id: string; at: string; what: string; kind: string; href: string };
  const events: Ev[] = [
    ...threads.map((t) => ({ id: `t-${t.id}`, at: t.updatedAt, what: t.title || t.turns[0]?.question || "Conversation", kind: "Conversation", href: `/scan/${t.id}` })),
    ...(closed.data?.decisions || []).map((d) => ({ id: `d-${d.id}`, at: d.updatedAt || d.discoveredAt || "", what: d.title, kind: `Decision · ${STATUS_LABEL[d.status] || d.status}`, href: `/decisions/${d.id}` })),
  ].filter((e) => e.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
  return (
    <section className="sp-sec sp-sec-first">
      <div className="sp-head">
        <div><h2 className="sp-h">History</h2><p className="sp-sub">Conversations and decisions in this space, newest first</p></div>
        <Link href="/scan/history" className="sp-btn">All conversations</Link>
      </div>
      <div className="sp-table">
        <div className="sp-tr sp-th sp-tr-3"><span>Activity</span><span>Kind</span><span className="sp-right">When</span></div>
        {closed.isLoading && <div className="sp-empty">Loading…</div>}
        {!closed.isLoading && events.length === 0 && <div className="sp-empty">Nothing yet. Ask a question or run a task and it shows here.</div>}
        {events.map((e) => (
          <Link key={e.id} href={e.href} className="sp-tr sp-tr-3">
            <span className="sp-td-main"><span className="sp-doc"><DocIcon /></span><span className="truncate">{e.what}</span></span>
            <span className="sp-td">{e.kind}</span>
            <span className="sp-td sp-right">{relTime(e.at)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
