"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ModelPicker } from "@/components/scan/ModelPicker";
import { IconArrowRight, IconSearch, IconSync } from "@/components/v32/icons";
import { request } from "@/lib/api";
import { relTime } from "@/lib/decisions";
import { PROMPTS } from "@/lib/libraryPrompts";
import { listSavedPrompts, SAVED_PROMPTS_EVENT, type SavedPrompt } from "@/lib/promptStore";
import { startThread } from "@/lib/scanStore";

// Vault, laid out like Harvey's: a prompt box over this company's files.
// The files are real rows from GET /api/vault (backend lib/domain/vault):
// spreadsheets it uploaded, one ledger per customer built from its invoices,
// and the outputs its agents produced. Asking sends the question to
// Ask Starlane with the chosen folder as context.

type Item = {
  id: string; name: string; category: string; type: string; status?: string; modified_at: string | null;
  size: { rows?: number; invoices?: number; bytes?: number }; outstanding?: number; overdue?: number; agent_key?: string;
};
type Folder = { id: string; name: string; modified_at: string | null; count: number; items: Item[] };
type Vault = { folders: Folder[]; last_synced_at: string | null };

const MODES = {
  table: { label: "Review table", suffix: " Answer as a table." },
  draft: { label: "Draft document", suffix: " Write it as a ready-to-send document." },
} as const;
type Mode = keyof typeof MODES;

const SUGGESTIONS: { label: string; icon: "table" | "draft"; text: string; mode: Mode }[] = [
  { label: "Analyze overdue by customer", icon: "table", mode: "table", text: "Which customers have overdue invoices, how much does each owe, and how late is each one?" },
  { label: "Payment reminder letter", icon: "draft", mode: "draft", text: "Draft a polite payment reminder for my most overdue customer, with the invoice numbers and amounts." },
];

const TAG: Record<string, string> = {
  "Receivables ledger": "#4F7A5A", "Invoice export": "#4F7A5A", "Tally export": "#3F6C8F", Spreadsheet: "#8A877F",
  Overdue: "#B5543C", Open: "#C08A2E", Settled: "#4F7A5A", "Agent output": "#6B5B95",
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const sizeOf = (i: Item) =>
  i.size.rows != null ? `${i.size.rows} rows`
    : i.size.invoices != null ? `${i.size.invoices} ${i.size.invoices === 1 ? "invoice" : "invoices"}`
      : i.size.bytes != null ? (i.size.bytes >= 1024 ? `${(i.size.bytes / 1024).toFixed(1)} KB` : `${i.size.bytes} B`) : "";
const items = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;
const dateOf = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

export default function VaultPage() {
  const router = useRouter();
  const [vault, setVault] = useState<Vault | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [matter, setMatter] = useState<string | null>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [menu, setMenu] = useState<"matters" | "prompts" | "filters" | null>(null);
  const [saved, setSaved] = useState<SavedPrompt[]>([]);
  const [improved, setImproved] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    setRefreshing(true);
    try {
      const v = await request<Vault & { success: boolean }>("/api/vault");
      setVault({ folders: v.folders || [], last_synced_at: v.last_synced_at });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your files.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    const s = () => setSaved(listSavedPrompts());
    s();
    window.addEventListener(SAVED_PROMPTS_EVENT, s);
    return () => window.removeEventListener(SAVED_PROMPTS_EVENT, s);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-vmenu]")) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [menu]);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 50), 220)}px`;
  }, [text]);

  const folders = useMemo(() => vault?.folders || [], [vault]);
  const current = folders.find((f) => f.id === folder) || null;
  const matterName = folders.find((f) => f.id === matter)?.name || "All files";

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base: (Item & { folder?: Folder })[] = current
      ? current.items
      : q || category
        ? folders.flatMap((f) => f.items)
        : [
            // Like Harvey: folders first, then the files uploaded straight into the vault.
            ...folders.filter((f) => f.count > 0).map((f) => ({ id: f.id, name: f.name, category: "", type: "Folder", modified_at: f.modified_at, size: {}, folder: f })),
            ...(folders.find((f) => f.id === "uploads")?.items || []),
          ];
    return base.filter((i) => (!q || i.name.toLowerCase().includes(q)) && (!category || i.category === category));
  }, [folders, current, query, category]);
  const categories = useMemo(() => [...new Set(folders.flatMap((f) => f.items.map((i) => i.category)))].sort(), [folders]);

  function ask(q: string, m: Mode | null = mode) {
    const body = q.trim();
    if (!body) return;
    const ctx = matter ? `Using my ${matterName.toLowerCase()}: ` : "";
    router.push(`/scan/${startThread(`${ctx}${body}${m ? MODES[m].suffix : ""}`)}`);
  }

  function open(i: Item & { folder?: Folder }) {
    if (i.folder) { setFolder(i.folder.id); setQuery(""); return; }
    if (i.agent_key) { router.push(`/agents/${encodeURIComponent(i.agent_key)}/run/${i.id}`); return; }
    if (i.type === "Ledger") { ask(`Show me ${i.name}'s ledger: every invoice, what is paid and what is still owed.`, "table"); return; }
    router.push("/sources");
  }

  function improve() {
    if (!text.trim() || improved) return;
    setText((t) => `${t.trim().replace(/[.?!]*$/, "")}. Give amounts in ₹, name the customers and invoices behind each number, and say what I should do first.`);
    setImproved(true);
  }

  const allPrompts = [...saved.map((p) => ({ text: p.text, area: "Saved by you" })), ...PROMPTS];

  return (
    <DashboardLayout pageTitle="Vault">
      <div className="vt">
        <div className="vt-modes">
          {(Object.keys(MODES) as Mode[]).map((m) => (
            <button key={m} type="button" className="vt-pill" aria-pressed={mode === m} onClick={() => setMode(mode === m ? null : m)}>
              {m === "table" ? <TableGlyph /> : <DraftGlyph />} {MODES[m].label}
            </button>
          ))}
        </div>

        <div className="vt-ask">
          <div className="vt-ask-head">
            <div className="relative" data-vmenu>
              <button type="button" className="vt-drop" aria-expanded={menu === "matters"} onClick={() => setMenu(menu === "matters" ? null : "matters")}>Matters <Caret /></button>
              {menu === "matters" && (
                <div className="pop-in vt-menu" role="menu">
                  <MenuRow active={!matter} onClick={() => { setMatter(null); setMenu(null); }}>All files</MenuRow>
                  {folders.filter((f) => f.count > 0).map((f) => (
                    <MenuRow key={f.id} active={matter === f.id} onClick={() => { setMatter(f.id); setMenu(null); }}>{f.name} <span className="vt-menu-n">{f.count}</span></MenuRow>
                  ))}
                </div>
              )}
            </div>
            <div className="relative" data-vmenu>
              <button type="button" className="vt-drop" aria-expanded={menu === "prompts"} onClick={() => setMenu(menu === "prompts" ? null : "prompts")}>Prompts <Caret /></button>
              {menu === "prompts" && (
                <div className="pop-in vt-menu vt-menu-right vt-menu-wide" role="menu">
                  {allPrompts.map((p) => (
                    <MenuRow key={`${p.area}-${p.text}`} onClick={() => { setText(p.text); setImproved(false); setMenu(null); taRef.current?.focus(); }}>
                      <span className="flex flex-col text-left"><span>{p.text}</span><span className="vt-menu-sub">{p.area}</span></span>
                    </MenuRow>
                  ))}
                  <Link href="/library/all" className="vt-menu-all">Prompts and workflows <IconArrowRight size={12} /></Link>
                </div>
              )}
            </div>
          </div>

          <form className="vt-box" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
            <span className="vt-chip"><FolderGlyph size={13} /> {matterName}</span>
            <label htmlFor="vault-ask" className="sr-only">Ask about your files</label>
            <textarea
              id="vault-ask"
              ref={taRef}
              rows={2}
              value={text}
              onChange={(e) => { setText(e.target.value); setImproved(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(text); } }}
              placeholder="Ask anything about your invoices, customers and payments"
              className="vt-input"
            />
            <div className="vt-box-foot">
              <div className="flex items-center" style={{ gap: 2 }}>
                <Link href="/decisions/import" className="vt-act" aria-label="Add files"><ClipGlyph /> <span className="vt-act-l">Files</span></Link>
                <Link href="/sources" className="vt-act" aria-label="Sources"><BankGlyph /> <span className="vt-act-l">Sources</span></Link>
                <button type="button" className="vt-act" onClick={improve} disabled={!text.trim() || improved} title="Make the question more specific"><WandGlyph /> <span className="vt-act-l">Improve</span></button>
              </div>
              <div className="flex items-center" style={{ gap: 6 }}>
                <ModelPicker compact />
                <button type="submit" className="vt-send" aria-label="Ask" disabled={!text.trim()}><IconArrowRight size={16} /></button>
              </div>
            </div>
          </form>

          <div className="vt-suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s.label} type="button" className="vt-pill" onClick={() => ask(s.text, s.mode)}>
                {s.icon === "table" ? <TableGlyph /> : <DraftGlyph />} {s.label}
              </button>
            ))}
            <button type="button" className="vt-pill" data-vmenu onClick={(e) => { e.stopPropagation(); setMenu("prompts"); }}>··· View all</button>
          </div>
        </div>

        <section className="vt-files">
          <div className="vt-files-bar">
            <h2 className="vt-files-title">
              {current ? (
                <><button type="button" className="vt-crumb" onClick={() => setFolder(null)}>Files</button> <span className="vt-crumb-sep">/</span> {current.name}</>
              ) : "Files"}
            </h2>
            <div className="vt-tools">
              {vault?.last_synced_at && (
                <Link href="/sources" className="vt-synced"><span className="vt-s">S</span> Last synced {relTime(vault.last_synced_at)} <ExtGlyph /></Link>
              )}
              <button type="button" className="vt-tool" onClick={() => void load()} disabled={refreshing}><IconSync size={13} /> {refreshing ? "Refreshing" : "Refresh"}</button>
              <span className="vt-sep" aria-hidden="true" />
              <label className="vt-search">
                <IconSearch size={13} />
                <span className="sr-only">Search files</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
              </label>
              <div className="relative" data-vmenu>
                <button type="button" className="vt-tool" aria-expanded={menu === "filters"} aria-pressed={!!category} onClick={() => setMenu(menu === "filters" ? null : "filters")}><FilterGlyph /> {category || "Filters"}</button>
                {menu === "filters" && (
                  <div className="pop-in vt-menu vt-menu-right" role="menu">
                    <MenuRow active={!category} onClick={() => { setCategory(null); setMenu(null); }}>All categories</MenuRow>
                    {categories.map((c) => (
                      <MenuRow key={c} active={category === c} onClick={() => { setCategory(c); setMenu(null); }}><span className="vt-dot" style={{ background: TAG[c] || "#8A877F" }} /> {c}</MenuRow>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="vt-table-wrap">
            <table className="vt-table">
              <thead>
                <tr><th style={{ width: "36%" }}>Name</th><th style={{ width: "22%" }}>Category</th><th style={{ width: "17.5%" }}>Type</th><th style={{ width: "17.5%" }}>Last modified</th><th>Size</th></tr>
              </thead>
              <tbody>
                {rows.map((i, n) => (
                  <tr key={`${i.type}-${i.id}`} className="vt-row" style={{ animationDelay: `${Math.min(n, 12) * 25}ms` }} onClick={() => open(i)}
                    tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") open(i); }}>
                    <td>
                      <span className="vt-name">
                        {i.type === "Folder" ? <FolderGlyph /> : <DocGlyph kind={i.type} />}
                        <span className="vt-name-text">{i.name}</span>
                      </span>
                      <span className="vt-mobile">{[i.category, sizeOf(i) || (i.folder ? items(i.folder.count) : ""), dateOf(i.modified_at)].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td>{i.category && <span className="vt-tag"><span className="vt-dot" style={{ background: TAG[i.category] || "#8A877F" }} />{i.category}{i.outstanding ? ` · ${inr(i.outstanding)}` : ""}</span>}</td>
                    <td className="vt-muted">{i.type}</td>
                    <td className="vt-muted">{dateOf(i.modified_at)}</td>
                    <td className="vt-muted">{i.folder ? items(i.folder.count) : sizeOf(i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vault && rows.length === 0 && (
              <p className="vt-empty">
                {query || category ? "No file matches." : <>Nothing here yet. <Link href="/decisions/import">Upload a receivables export</Link> or <Link href="/sources">connect Tally</Link>.</>}
              </p>
            )}
            {!vault && !error && <p className="vt-empty">Loading your files…</p>}
            {error && <p className="vt-empty" role="alert">{error}</p>}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function MenuRow({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return <button type="button" role="menuitem" className="vt-menu-row" aria-current={active || undefined} onClick={onClick}>{children}</button>;
}

const G = ({ children, size = 15 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.25} aria-hidden="true" style={{ flexShrink: 0 }}>{children}</svg>
);
const Caret = () => <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden><path d="M2.5 4l2.5 2.5L7.5 4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const TableGlyph = () => <G><rect x="2.5" y="3" width="11" height="10" rx="1" /><path d="M2.5 6.5h11M6.5 6.5V13" /></G>;
const DraftGlyph = () => <G><path d="M4 2.5h5.5L12 5v8.5H4z" /><path d="M6 8h4M6 10.5h3" /><path d="M9.5 2.5V5H12" /></G>;
const ClipGlyph = () => <G><path d="M10.5 5.5l-4.2 4.2a1.3 1.3 0 0 0 1.8 1.8l4.6-4.6a2.6 2.6 0 0 0-3.7-3.7L4.4 7.8a3.9 3.9 0 0 0 5.5 5.5L13 10.2" /></G>;
const BankGlyph = () => <G><path d="M2.5 6L8 3l5.5 3M3.5 6.5v5M6.5 6.5v5M9.5 6.5v5M12.5 6.5v5M2.5 13h11" /></G>;
const WandGlyph = () => <G><path d="M3 13l7-7M9 4.5l1-1M11.5 7l1-1M12 3l1 1M7.5 2.5v1.2M13.5 8.5h-1.2" /></G>;
const FilterGlyph = () => <G size={13}><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3" /></G>;
const ExtGlyph = () => <G size={12}><path d="M9 3h4v4M13 3L7.5 8.5M11.5 9.5v3.5h-8.5v-8.5h3.5" /></G>;
function FolderGlyph({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M1.5 4.2c0-.6.5-1.2 1.2-1.2h3.4l1.4 1.5h5.8c.7 0 1.2.5 1.2 1.2v6.6c0 .6-.5 1.2-1.2 1.2H2.7c-.7 0-1.2-.6-1.2-1.2z" fill="#9C9A94" /></svg>;
}
function DocGlyph({ kind }: { kind: string }) {
  const c = kind === "XLSX" || kind === "CSV" ? "#3E7D52" : kind === "JSON" ? "#6B5B95" : kind === "Ledger" ? "#B5543C" : "#8A877F";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M3.5 1.5h6l3 3v10h-9z" fill="#FFFFFF" stroke="#CFCBC2" />
      <path d="M9.5 1.5v3h3" fill="none" stroke="#CFCBC2" />
      <rect x="5" y="8" width="6" height="1.6" rx=".4" fill={c} /><rect x="5" y="10.8" width="4" height="1.4" rx=".4" fill={c} opacity=".55" />
    </svg>
  );
}
