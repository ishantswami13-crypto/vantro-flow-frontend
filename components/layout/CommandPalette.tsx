"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type IntelligenceSignal } from "@/lib/api";
import { getRecents, timeAgo, type RecentEntry } from "@/lib/recents";
import { IconSearch, IconClock, IconPlus, IconScan, IconWatch, IconMissions, IconSimulate } from "@/components/v32/icons";
import { Chevron } from "@/components/v32/ui";

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

type Row = { key: string; href: string; title: string; context?: string; icon: React.ReactNode; shortcut?: string };
type Group = { label: string; rows: Row[] };

const ICON = { size: 16, style: { color: "#63635F" } };

// Version 32 command palette (handoff §11): 660px, groups with uppercase
// labels, 46px rows, the selected row tinted with the user's accent.
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
      .map(r => ({ key: `r:${r.href}`, href: r.href, title: r.label, context: `opened ${timeAgo(r.at)}`, icon: <IconClock {...ICON} /> }));
    if (recentRows.length) out.push({ label: "Recent", rows: recentRows });
    const signalRows = (signals || []).filter(s => hit(s.event_title || "")).slice(0, 4)
      .map(s => ({ key: `s:${s.id}`, href: `/intelligence/${s.id}`, title: s.event_title || "External event", context: s.related_entity_type || "Signal", icon: <IconScan {...ICON} /> }));
    if (signalRows.length) out.push({ label: "Signals", rows: signalRows });
    const pageRows = routes.filter(r => hit(r.label)).slice(0, q ? 8 : 6)
      .map(r => ({ key: `p:${r.href}`, href: r.href, title: r.label, context: r.context, icon: <span style={{ width: 16, display: "inline-block" }} /> }));
    if (pageRows.length) out.push({ label: "Work", rows: pageRows });
    const actions: Row[] = [
      { key: "a:ask", href: "/scan", title: "Ask Starlane", context: "Open Scan", icon: <IconScan {...ICON} />, shortcut: "↵" },
      { key: "a:watch", href: "/watch?new=1", title: "New Watch", icon: <IconPlus {...ICON} /> },
      { key: "a:mission", href: "/missions/new", title: "New Mission", icon: <IconMissions {...ICON} /> },
      { key: "a:sim", href: "/simulate", title: "Simulate", context: "Run a new scenario", icon: <IconSimulate {...ICON} /> },
      { key: "a:watchlist", href: "/watch", title: "Watch", context: "What Starlane is watching", icon: <IconWatch {...ICON} /> },
    ].filter(a => hit(a.title));
    if (actions.length) out.push({ label: "Actions", rows: actions });
    return out;
  }, [query, routes, signals, recents]);

  const flat = useMemo(() => groups.flatMap(g => g.rows), [groups]);

  useEffect(() => { setActiveIndex(0); }, [query, signals]);

  function go(href: string) {
    onClose();
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
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="fixed inset-0 lens-backdrop" style={{ background: "rgba(20,20,18,0.16)" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Starlane"
        className="fixed fade-once flex flex-col overflow-hidden"
        style={{
          top: 90, left: "50%", transform: "translateX(-50%)", width: "min(660px, calc(100vw - 32px))", maxHeight: "70vh",
          background: "#FFFFFF", border: "1px solid #E5E4DF", borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.10)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 shrink-0" style={{ padding: "14px 16px", borderBottom: "1px solid #EBEAE6" }}>
          <IconSearch size={15} style={{ color: "#8A8A86" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Starlane or run a command…"
            className="flex-1 bg-transparent outline-none"
            style={{ color: "#191917", fontSize: 14.5, boxShadow: "none" }}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={flat[activeIndex] ? `command-palette-row-${activeIndex}` : undefined}
          />
          <kbd style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#63635F", border: "1px solid #E5E4DF", borderRadius: 4, padding: "1px 6px" }}>Esc</kbd>
        </div>
        <div ref={listRef} id="command-palette-results" role="listbox" className="overflow-y-auto" style={{ padding: "4px 8px 8px" }}>
          {flat.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8A8A86", padding: "28px 0", textAlign: "center" }}>No results</p>
          ) : groups.map(g => (
            <div key={g.label}>
              <div style={{ padding: "10px 14px 4px 14px", fontSize: 10.5, letterSpacing: "1px", textTransform: "uppercase", color: "#8A8A86" }}>{g.label}</div>
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
                    className="row-hover w-full flex items-center text-left"
                    style={{ height: 46, gap: 12, padding: "0 14px", borderRadius: 7, background: selected ? "rgba(var(--accent-rgb), 0.08)" : "transparent" }}
                  >
                    {r.icon}
                    <span className="shrink-0" style={{ fontSize: 13.5, color: "#191917" }}>{r.title}</span>
                    {r.context && <span className="truncate flex-1" style={{ fontSize: 12, color: "#8A8A86" }}>{r.context}</span>}
                    {!r.context && <span className="flex-1" />}
                    {r.shortcut
                      ? <kbd style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#63635F", border: "1px solid #E5E4DF", borderRadius: 4, padding: "1px 6px" }}>{r.shortcut}</kbd>
                      : <Chevron size={13} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
