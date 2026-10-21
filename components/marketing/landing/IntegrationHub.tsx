"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, STATE_LABEL, TOTAL, type State } from "./integrationsData";

// The integrations catalogue, laid out like reference documentation: a
// category index on the left, one table per category on the right. Filtering
// by status or name narrows the tables; nothing is hidden behind toggles.

const FILTERS: Array<["all" | State, string]> = [["all", "All"], ["live", "Live"], ["planned", "Planned"], ["custom", "Custom"]];

export function IntegrationHub() {
  const [q, setQ] = useState("");
  const [f, setF] = useState<"all" | State>("all");

  const cats = useMemo(() => {
    const term = q.trim().toLowerCase();
    return CATEGORIES.map((c) => {
      const catHit = term !== "" && c.k.toLowerCase().includes(term);
      const items = c.items.filter((i) => (f === "all" || i.s === f) && (!term || catHit || i.n.toLowerCase().includes(term)));
      return { ...c, items };
    }).filter((c) => c.items.length > 0);
  }, [q, f]);

  const shown = cats.reduce((n, c) => n + c.items.length, 0);

  return (
    <div className="st-cat">
      <div className="st-cat-aside">
        <nav aria-label="Integration categories">
          <p className="st-meta">Categories</p>
          <ul>
            {CATEGORIES.map((c) => (
              <li key={c.id}><a href={`#int-${c.id}`}>{c.k}<span>{c.items.length}</span></a></li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="st-cat-main">
        <div className="st-cat-bar">
          <label className="st-search">
            <span className="sl-sr">Search integrations</span>
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${TOTAL} integrations`} />
          </label>
          <div className="st-seg" role="group" aria-label="Filter by status">
            {FILTERS.map(([k, l]) => (
              <button key={k} type="button" aria-pressed={f === k} onClick={() => setF(k)}>{l}</button>
            ))}
          </div>
        </div>
        <p className="st-cat-count" aria-live="polite">{shown} of {TOTAL} shown</p>

        {cats.length === 0 && (
          <p className="st-cat-empty">Not listed. If it has an API, a database or an export, it can be built for your pilot. <Link href="/access">Tell us what you run</Link>.</p>
        )}

        {cats.map((c) => (
          <section key={c.id} id={`int-${c.id}`} className="st-cat-sec" aria-labelledby={`int-${c.id}-h`}>
            <div className="st-cat-head">
              <h2 id={`int-${c.id}-h`}>{c.k}</h2>
              <p>{c.about}</p>
            </div>
            <table className="st-table">
              <thead><tr><th scope="col">System</th><th scope="col">How it connects</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {c.items.map((i) => (
                  <tr key={i.n}>
                    <th scope="row">{i.n}</th>
                    <td>{i.via}</td>
                    <td><span className={`st-state ${i.s}`}>{STATE_LABEL[i.s]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <dl className="st-legend">
          <div><dt><span className="st-state live">Live</span></dt><dd>Works in the product today.</dd></div>
          <div><dt><span className="st-state planned">Planned</span></dt><dd>On the roadmap. Not available yet.</dd></div>
          <div><dt><span className="st-state custom">Custom</span></dt><dd>Built for your pilot on Starlane’s connector framework.</dd></div>
        </dl>
      </div>
    </div>
  );
}
