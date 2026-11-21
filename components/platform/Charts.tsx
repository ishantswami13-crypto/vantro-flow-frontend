"use client";

// Command Center charts, drawn in the style of the product views on the
// landing page: hatched ink bars on white cards, a serif headline figure,
// small legends. They draw only the counts the server returns; a day with no
// runs is drawn as an empty slot, never filled in.

import Link from "next/link";

type Day = { day: string; completed: number; failed: number; other: number };

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });

export function ChartCard({ figure, figureNote, title, sub, children, legend }: { figure?: React.ReactNode; figureNote?: string; title?: string; sub?: string; children: React.ReactNode; legend?: React.ReactNode }) {
  return (
    <section className="ws-chart">
      {figure != null && <div className="ws-chart-big">{figure}</div>}
      {figureNote && <div className="ws-chart-note">{figureNote}</div>}
      {title && <h2 className="ws-chart-t">{title}</h2>}
      {sub && <div className="ws-chart-note">{sub}</div>}
      <div className="ws-chart-body">{children}</div>
      {legend && <div className="ws-chart-leg">{legend}</div>}
    </section>
  );
}

export function Legend({ items }: { items: { label: string; tone: "ink" | "bad" | "light" }[] }) {
  return <>{items.map((i) => <span key={i.label}><i className={`ws-key is-${i.tone}`} aria-hidden="true" />{i.label}</span>)}</>;
}

/** Stacked daily bars: completed (ink), failed (rust), anything else (light). */
export function DailyRuns({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.completed + d.failed + d.other));
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max];
  return (
    <div className="ws-daily" role="img" aria-label={`Runs per day for the last ${days.length} days: ${days.map((d) => `${dayLabel(d.day)} ${d.completed + d.failed + d.other}`).join(", ")}`}>
      <div className="ws-daily-y" aria-hidden="true">{[...ticks].reverse().map((t) => <span key={t}>{t}</span>)}</div>
      <div className="ws-daily-plot" aria-hidden="true">
        {ticks.map((t) => <i key={t} className="ws-grid" style={{ bottom: `${(t / max) * 100}%` }} />)}
        {days.map((d, i) => (
          <div key={d.day} className="ws-daily-col" title={`${dayLabel(d.day)}: ${d.completed} completed, ${d.failed} failed${d.other ? `, ${d.other} other` : ""}`}>
            <div className="ws-daily-stack">
              {d.other > 0 && <b className="is-light" style={{ height: `${(d.other / max) * 100}%` }} />}
              {d.failed > 0 && <b className="is-bad" style={{ height: `${(d.failed / max) * 100}%` }} />}
              {d.completed > 0 && <b className="is-ink" style={{ height: `${(d.completed / max) * 100}%` }} />}
            </div>
            <span className="ws-daily-x">{(i % 3 === 0 && i < days.length - 2) || i === days.length - 1 ? dayLabel(d.day) : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars, one per agent, labelled with the run count. */
export function AgentBars({ rows }: { rows: { agentId: string; agentName: string; runs: number; failed: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.runs));
  return (
    <div className="ws-hbars">
      {rows.map((r) => (
        <Link key={r.agentId} href={`/agents/studio/${r.agentId}`} className="ws-hbar">
          <span className="ws-hbar-n">{r.agentName}</span>
          <span className="ws-hbar-track">
            <b className="is-ink" style={{ width: `${((r.runs - r.failed) / max) * 100}%` }} />
            {r.failed > 0 && <b className="is-bad" style={{ width: `${(r.failed / max) * 100}%` }} />}
          </span>
          <span className="ws-hbar-v">{r.runs} run{r.runs === 1 ? "" : "s"}</span>
        </Link>
      ))}
    </div>
  );
}
