"use client";

// The pieces the Agents run view introduced, shared by every app page so the
// whole product reads like the landing page's agent view:
//   StepRail      steps joined by a rail: dashed ring while waiting, a
//                 spinning ring with shimmering text while working, a green
//                 tick when done, a red ring when it failed.
//   FileChip      a file with its type: a green sheet for CSV/Excel, a blue
//                 page for everything else, the extension in grey.
//   HistoryTable  a serif heading, "Newest first", and plain rows like
//                 Harvey's history table. Rows open their record.
//   StatusText    a coloured dot and label, as in the history table.
// All of them live inside .hv-app (DashboardLayout), where their CSS is.

import React from "react";
import Link from "next/link";

export type StepState = "done" | "active" | "waiting" | "failed";
export interface RailStep { key?: string; label: React.ReactNode; detail?: React.ReactNode; state: StepState }

const tick = <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 5.2l2 2 4-4.4" /></svg>;
const cross = <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2.8 2.8l4.4 4.4M7.2 2.8L2.8 7.2" /></svg>;

const STATE_WORD: Record<StepState, string> = { done: "done", active: "in progress", waiting: "not started", failed: "failed" };

/**
 * Steps on a rail. `strike` draws finished steps struck through, as a run's
 * checklist does; timelines and setup guides leave it off.
 */
export function StepRail({ steps, strike = false, label, className = "" }: { steps: RailStep[]; strike?: boolean; label?: string; className?: string }) {
  if (!steps.length) return null;
  return (
    <ol className={`ar-steps hv-rail ${strike ? "" : "no-strike"} ${className}`} aria-label={label}>
      {steps.map((s, i) => (
        <li key={s.key ?? i} className={`is-${s.state}`} style={{ animationDelay: `${i * 70}ms` }}>
          <span className="ar-step-dot">{s.state === "done" ? tick : s.state === "failed" ? cross : null}</span>
          <span className="hv-rail-body">
            <span className="hv-rail-label">{s.label}<span className="sr-only">, {STATE_WORD[s.state]}</span></span>
            {s.detail ? <span className="hv-rail-detail">{s.detail}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** "3 of 5 steps" for a rail's heading. */
export function railCount(steps: RailStep[]): string {
  return `${steps.filter((s) => s.state === "done").length} of ${steps.length} steps`;
}

/** A short row of pips, one per step, for a progress column in a table. */
export function StepPips({ done, total, failed = false }: { done: number; total: number; failed?: boolean }) {
  if (!total) return null;
  const shown = Math.min(total, 12);
  const filled = Math.round((done / total) * shown);
  return (
    <span className="hv-pips" role="img" aria-label={`${done} of ${total} steps done`}>
      {Array.from({ length: shown }, (_, i) => <i key={i} className={i < filled ? "is-done" : failed && i === filled ? "is-failed" : ""} />)}
    </span>
  );
}

const SHEET = /\.(csv|xlsx?|tsv)$/i;
const docIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M4 1.8h5.2L12.5 5v9.2H4z" /><path d="M9 1.8V5.2h3.5M6 8.5h4.5M6 11h3" /></svg>;
const folderIcon = <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M1.8 4.2a1 1 0 011-1h3.3l1.4 1.6h5.7a1 1 0 011 1v6.9a1 1 0 01-1 1H2.8a1 1 0 01-1-1z" /></svg>;

/** The file's icon tile: green for a sheet, blue for a document, grey for a folder. */
export function FileIcon({ name, folder = false }: { name?: string; folder?: boolean }) {
  if (folder) return <span className="ar-file-ic is-folder">{folderIcon}</span>;
  return <span className={`ar-file-ic ${name && SHEET.test(name) ? "is-sheet" : ""}`}>{docIcon}</span>;
}

/** File name with its type: "Week by week .csv". */
export function FileName({ name, ext }: { name: string; ext?: string | null }) {
  const m = name.match(/\.([a-z0-9]{2,5})$/i);
  const base = m ? name.slice(0, -m[0].length) : name;
  const e = ext ? (ext.startsWith(".") ? ext : `.${ext}`) : m ? m[0] : "";
  return (
    <span className="hv-fname">
      <span className="truncate">{base}</span>
      {e ? <span className="ar-ext">{e.toLowerCase()}</span> : null}
    </span>
  );
}

/** A file chip: icon tile, name, type. A button when it downloads, a link when it opens. */
export function FileChip({ name, ext, meta, href, onClick, folder = false, title }: { name: string; ext?: string | null; meta?: React.ReactNode; href?: string; onClick?: () => void; folder?: boolean; title?: string }) {
  const inner = (
    <>
      <FileIcon name={ext ? `x.${ext.replace(/^\./, "")}` : name} folder={folder} />
      {folder ? <span className="truncate">{name}</span> : <FileName name={name} ext={ext} />}
      {meta ? <span className="hv-chip-meta">{meta}</span> : null}
    </>
  );
  if (href) return <Link href={href} className="hv-chip" title={title}>{inner}</Link>;
  if (onClick) return <button type="button" className="hv-chip" onClick={onClick} title={title}>{inner}</button>;
  return <span className="hv-chip" title={title}>{inner}</span>;
}

export type Tone = "positive" | "critical" | "warning" | "info" | "neutral";
const TONE: Record<Tone, string> = { positive: "#2F6B45", critical: "#A64F4B", warning: "#8A5A12", info: "#3F5E9A", neutral: "#57534D" };

/** A coloured dot and a label, as in the history table's Status column. */
export function StatusText({ label, tone = "neutral" }: { label: React.ReactNode; tone?: Tone }) {
  return <span className="ag-st" style={{ color: TONE[tone] }}><i />{label}</span>;
}

export interface HistoryColumn { label: React.ReactNode; align?: "right" }
export interface HistoryRow { key: string; href?: string; onClick?: () => void; cells: React.ReactNode[]; title?: string }

/**
 * A history table under a serif heading, like "Recent runs" on Agents.
 * `template` is the CSS grid template for the columns; on a phone every row
 * folds to the first cell over the rest.
 */
export function HistoryTable({ title, aside = "Newest first", columns, template, rows, loading, empty, action }: {
  title?: React.ReactNode; aside?: React.ReactNode; columns: HistoryColumn[]; template: string; rows: HistoryRow[];
  loading?: boolean; empty?: React.ReactNode; action?: React.ReactNode;
}) {
  const style = { gridTemplateColumns: template } as React.CSSProperties;
  const cells = (r: HistoryRow) => r.cells.map((c, i) => (
    <span key={i} className={`hv-cell ${i === 0 ? "hv-cell-main" : ""}`} style={columns[i]?.align === "right" ? { textAlign: "right", justifyContent: "flex-end" } : undefined}>{c}</span>
  ));
  return (
    <section className="ag-runs hv-history" aria-label={typeof title === "string" ? title : undefined}>
      {title ? (
        <div className="ag-runs-head">
          <h2>{title}</h2>
          <span className="flex items-center" style={{ gap: 12, fontSize: 12, color: "#6E6E69" }}>{aside}{action}</span>
        </div>
      ) : null}
      <div className="ag-row is-head hv-row" style={style} role="row">
        {columns.map((c, i) => <span key={i} style={c.align === "right" ? { textAlign: "right" } : undefined}>{c.label}</span>)}
      </div>
      {loading && <div className="skeleton" style={{ height: 96, borderRadius: 8, marginTop: 8 }} />}
      {!loading && rows.length === 0 && empty ? <p className="hv-history-empty">{empty}</p> : null}
      {!loading && rows.map((r) => r.href ? (
        <Link key={r.key} href={r.href} className="ag-row hv-row" style={style} title={r.title}>{cells(r)}</Link>
      ) : r.onClick ? (
        <button key={r.key} type="button" className="ag-row hv-row is-btn" style={style} onClick={r.onClick} title={r.title}>{cells(r)}</button>
      ) : (
        <div key={r.key} className="ag-row hv-row" style={style} title={r.title}>{cells(r)}</div>
      ))}
    </section>
  );
}

/** A side-panel section with a title and an optional count, like the run view's Progress. */
export function PanelSection({ title, aside, children }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="hv-pane">
      <div className="hv-pane-head"><h3>{title}</h3>{aside ? <span>{aside}</span> : null}</div>
      {children}
    </section>
  );
}

/** Label / value rows, like the run view's Properties. */
export function Properties({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="hv-props">
      {rows.map(([k, v], i) => <React.Fragment key={i}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}
    </dl>
  );
}
