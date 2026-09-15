"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import { api, type IntelligenceSignal } from "@/lib/api";

export interface SearchableRoute {
  href: string;
  label: string;
  type: "Page";
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  routes: SearchableRoute[];
}

// Real search only. Two source types today: the static real route list
// (every href that actually exists in the shell) and real active
// intelligence signals fetched live - never a fabricated third category
// (no "Workspaces"/"Agents"/"Forecasts" results, since those aren't real
// objects yet). Architecture stays extensible: add another real fetch here
// when another object type becomes real, not before.
export function CommandPalette({ open, onClose, routes }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [signals, setSignals] = useState<IntelligenceSignal[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
    if (signals === null) {
      api.intelligence.signals()
        .then(d => setSignals((d.signals || []).filter(s => s.status === "CANDIDATE" || s.status === "ACTIVE" || s.status === "UPDATED")))
        .catch(() => setSignals([]));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedRoutes = routes.filter(r => !q || r.label.toLowerCase().includes(q)).slice(0, 6);
    const matchedSignals = (signals || [])
      .filter(s => !q || (s.event_title || "").toLowerCase().includes(q))
      .slice(0, 6)
      .map(s => ({ href: `/intelligence/${s.id}`, label: s.event_title || "External event", type: "Investigation" as const }));
    return [...matchedSignals, ...matchedRoutes];
  }, [query, routes, signals]);

  // Reset the highlighted row whenever the result set itself changes
  // (typing a new query, signals finishing their fetch) rather than
  // leaving a stale index pointed at a row that may no longer exist.
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
        setActiveIndex(i => (results.length === 0 ? 0 : (i + 1) % results.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(i => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = results[activeIndex];
        if (target) go(target.href);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, results, activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the highlighted row scrolled into view as arrow keys move past
  // the visible window of a long result list.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="fixed inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Starlane"
        className="relative w-full sm:w-[600px] rounded-xl overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid #E5E5E1", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4" style={{ height: "48px", borderBottom: "1px solid #EDEDE9" }}>
          <FiSearch size={16} style={{ color: "#8A8A86" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Starlane"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "#171717" }}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            aria-activedescendant={results[activeIndex] ? `command-palette-row-${activeIndex}` : undefined}
          />
          <kbd className="text-[11px] px-1.5 py-0.5 rounded" style={{ color: "#8A8A86", background: "#F2F2EE" }}>Esc</kbd>
        </div>
        <div ref={listRef} id="command-palette-results" role="listbox" className="max-h-[360px] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "#8A8A86" }}>No results</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.href}
                id={`command-palette-row-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => go(r.href)}
                onMouseEnter={() => setActiveIndex(i)}
                className="w-full flex items-center justify-between gap-3 px-4 text-left transition-colors"
                style={{ height: "40px", background: i === activeIndex ? "#F7F7F4" : "transparent" }}
              >
                <span className="text-sm truncate" style={{ color: "#171717" }}>{r.label}</span>
                <span className="text-xs shrink-0" style={{ color: "#8A8A86" }}>{r.type}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
