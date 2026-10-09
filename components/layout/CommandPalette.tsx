"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type IntelligenceSignal } from "@/lib/api";
import { getRecents, timeAgo, type RecentEntry } from "@/lib/recents";
import { IconSearch, IconClock, IconPage, IconPlus, IconScan, IconMissions } from "@/components/v32/icons";
import { IconSun } from "@/components/v32/icons";
import { toggleTheme } from "@/lib/theme";

export interface SearchableRoute {
  href: string;
  label: string;
  type: "Page";
  context?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  routes: SearchableRoute[];
}

type Row = { key: string; href: string; title: string; context?: string; icon: React.ReactNode; kind: string; shortcut?: string };
type Group = { label: string; rows: Row[] };

const ICON = { size: 15, style: { color: "var(--ink-3)" } };

// The command palette (Ctrl/Cmd+K): 660px, grouped results, 40px rows.
// Real content only: pages that exist, this browser's recent pages, live
// intelligence signals and the create actions the product really has.
export function CommandPalette({ open, onClose, routes }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [signals, setSignals] = useState<IntelligenceSignal[] | null>(null);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setRecents(getRecents());
    inputRef.current?.focus();
    if (signals === null) {
      api.intelligence.signals()
        .then(d => setSignals((d.signals || []).filter(s => s.status === "CANDIDATE" || s.status === "ACTIVE" || s.status === "UPDATED")))
        .catch(() => setSignals([]));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo<Group[]>(() => {
    const q = query.trim().toLowerCase();
    const hit = (s: string) => !q || s.toLowerCase().includes(q);
    const out: Group[] = [];
    const recentRows = recents.filter(r => hit(r.label)).slice(0, 3)
      .map(r => ({ key: `r:${r.href}`, href: r.href, title: r.label, context: `Opened ${timeAgo(r.at)}`, icon: <IconClock {...ICON} />, kind: "Recent" }));
    if (recentRows.length) out.push({ label: "Recent", rows: recentRows });
    const signalRows = (signals || []).filter(s => hit(s.event_title || "")).slice(0, 4)
      .map(s => ({ key: `s:${s.id}`, href: `/intelligence/${s.id}`, title: s.event_title || "External event", context: s.related_entity_type || undefined, icon: <IconScan {...ICON} />, kind: "Signal" }));
    if (signalRows.length) out.push({ label: "Signals", rows: signalRows });
    const pageRows = routes.filter(r => hit(r.label)).slice(0, q ? 8 : 6)
      .map(r => ({ key: `p:${r.href}`, href: r.href, title: r.label, context: r.context, icon: <IconPage {...ICON} />, kind: "Page" }));
    if (pageRows.length) out.push({ label: "Pages", rows: pageRows });
    const actions: Row[] = [
      { key: "a:ask", href: "/scan", title: "Ask Starlane", context: "Open Scan", icon: <IconScan {...ICON} />, kind: "Action" },
      { key: "a:watch", href: "/watch?new=1", title: "New watch", icon: <IconPlus {...ICON} />, kind: "Action" },
      { key: "a:mission", href: "/missions/new", title: "New mission", icon: <IconMissions {...ICON} />, kind: "Action" },
      { key: "a:theme", href: "#theme", title: "Switch theme", context: "Light or dark workspace", icon: <IconSun {...ICON} />, kind: "Action" },
    ].filter(a => hit(a.title));
    if (actions.length) out.push({ label: "Actions", rows: actions });
    return out;
  }, [query, routes, signals, recents]);

  const flat = useMemo(() => groups.flatMap(g => g.rows), [groups]);

  useEffect(() => { setActiveIndex(0); }, [query, signals]);

  function go(href: string) {
    onClose();
    if (href === "#theme") { toggleTheme(); return; }
    router.push(href);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(i => Math.min(flat.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(i => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = flat[activeIndex];
        if (target) go(target.href);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, flat, activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  let index = -1;
  return (
    <div className="fixed inset-0" style={{ zIndex: 70 }} onClick={onClose}>
      <div className="fixed inset-0 lens-backdrop" style={{ background: "rgb(14 14 13 / 0.32)" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Starlane"
        className="fixed pop-in flex flex-col overflow-hidden"
        style={{
          top: "14vh", left: "50%", marginLeft: "calc(min(640px, 100vw - 32px) / -2)", width: "min(640px, calc(100vw - 32px))", maxHeight: "64vh",
          background: "var(--elevated)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-lg)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 shrink-0" style={{ height: 50, padding: "0 16px", borderBottom: "1px solid var(--line)" }}>
          <IconSearch size={15} style={{ color: "var(--ink-3)" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, signals and actions"
            className="flex-1 bg-transparent outline-none"
            style={{ color: "var(--ink)", fontSize: 14, boxShadow: "none", outline: "none" }}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={flat[activeIndex] ? `command-palette-row-${activeIndex}` : undefined}
          />
        </div>
        <div ref={listRef} id="command-palette-results" role="listbox" className="overflow-y-auto" style={{ padding: "4px 6px 6px" }}>
          {flat.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-3)", padding: "28px 0", textAlign: "center" }}>Nothing matches “{query.trim()}”.</p>
          ) : groups.map(g => (
            <div key={g.label}>
              <div className="section-label" style={{ padding: "10px 10px 2px", margin: 0, fontSize: 10.5 }}>{g.label}</div>
              {g.rows.map(r => {
                index += 1;
                const i = index;
                const selected = i === activeIndex;
                return (
                  <button
                    key={r.key}
                    id={`command-palette-row-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={selected}
                    onClick={() => go(r.href)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className="w-full flex items-center text-left"
                    style={{ height: 36, gap: 10, padding: "0 10px", borderRadius: 6, background: selected ? "var(--surface-2)" : "transparent", boxShadow: selected ? "inset 2px 0 0 var(--ink)" : "none" }}
                  >
                    {r.icon}
                    <span className="shrink-0" style={{ fontSize: 13, color: "var(--ink)" }}>{r.title}</span>
                    {r.context && <span className="truncate flex-1" style={{ fontSize: 12, color: "var(--ink-3)" }}>{r.context}</span>}
                    {!r.context && <span className="flex-1" />}
                    {r.shortcut
                      ? <kbd className="kbd">{r.shortcut}</kbd>
                      : <span className="shrink-0" style={{ fontSize: 11, color: "var(--ink-3)" }}>{selected ? "↵" : r.kind}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-4 shrink-0" style={{ height: 34, padding: "0 14px", borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--ink-3)" }}>
          <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> Move</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd> Open</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd">Esc</kbd> Close</span>
          <span className="flex-1" />
          <span className="flex items-center gap-1.5"><kbd className="kbd">Ctrl</kbd><kbd className="kbd">1–7</kbd> Surfaces</span>
        </div>
      </div>
    </div>
  );
}
