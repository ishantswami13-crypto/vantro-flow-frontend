"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BrandMark } from "./BrandMarks";
import { CATEGORIES, G, type State } from "./integrationsData";

const TOTAL = CATEGORIES.reduce((n, c) => n + c.items.length, 0);
const LABEL: Record<State, string> = { live: "Live", planned: "Planned", custom: "Custom" };
const TABS: Array<["all" | State, string]> = [["all", "All"], ["live", "Live"], ["planned", "Planned"], ["custom", "Custom"]];

function Glyph({ g }: { g: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" className="sli-glyph" aria-hidden>{g}</svg>;
}

export function IntegrationHub({ limit = 4 }: { limit?: number }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const [tab, setTab] = useState<"all" | State>("all");

  const cats = useMemo(() => {
    const term = q.trim().toLowerCase();
    return CATEGORIES.map((c) => {
      const catHit = term && c.k.toLowerCase().includes(term);
      const items = c.items.filter((i) => (tab === "all" || i.s === tab) && (!term || catHit || i.n.toLowerCase().includes(term)));
      return { ...c, items };
    }).filter((c) => c.items.length > 0);
  }, [q, tab]);

  const filtered = q.trim() !== "" || tab !== "all";

  return (
    <div className="sli">
      <div className="sli-bar">
        <label className="sli-search">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
          <span className="sl-sr">Search integrations</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${TOTAL} integrations…`} />
        </label>
        <div className="sli-tabs" role="tablist" aria-label="Filter by status">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {cats.length === 0 && <p className="sli-empty">Not on the list yet. If it has an API, a database or an export, it can be built for your pilot. <Link href="/access">Tell us what you run</Link>.</p>}

      <ul className="sli-grid">
        {cats.map((c) => {
          const full = CATEGORIES.find((x) => x.id === c.id)!.items.length;
          const expanded = filtered || open[c.id];
          const shown = expanded ? c.items : c.items.slice(0, limit);
          const more = !filtered && full > limit;
          return (
            <li key={c.id} id={`int-${c.id}`} className={`sli-cat${expanded ? " open" : ""}`}>
              <div className="sli-head">
                <span className="sli-icon"><Glyph g={c.icon} /></span>
                <h2 className="sli-title"><b>{c.k}</b><em>{full} integration{full === 1 ? "" : "s"}</em></h2>
              </div>
              <ul className="sli-items" id={`int-${c.id}-items`}>
                {shown.map((i) => (
                  <li key={i.n} className={`sli-item ${i.s}`}>
                    <span className="sli-logo">{i.mark ? <BrandMark id={i.mark} /> : <Glyph g={G[i.glyph as keyof typeof G]} />}</span>
                    <span className="sli-n">{i.n}</span>
                    <span className={`sli-s ${i.s}`}><i />{LABEL[i.s]}</span>
                  </li>
                ))}
              </ul>
              {!filtered && more && (
                <button type="button" className="sli-all" onClick={() => toggle(c.id)} aria-expanded={!!expanded} aria-controls={`int-${c.id}-items`}>
                  {expanded ? "Show fewer" : `Show all ${full}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <ul className="sli-legend" aria-label="What each status means">
        <li><span className="sli-s live"><i />Live</span>works in the product today</li>
        <li><span className="sli-s planned"><i />Planned</span>on the roadmap, not available yet</li>
        <li><span className="sli-s custom"><i />Custom</span>built for your pilot on Starlane’s connector framework</li>
      </ul>
    </div>
  );
}
