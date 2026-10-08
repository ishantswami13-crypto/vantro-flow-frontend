"use client";

// Building blocks shared by the More pages (Collections, Customers, Invoices,
// Cash forecast, Inventory, Reports). They sit on top of the v32 set and
// the shared ui/* components, and read every colour from app/tokens.css.

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Figure } from "@/components/v32/ui";
import { IconMore, IconChevronDown } from "@/components/v32/icons";
import s from "./more.module.css";

export { s as moreStyles };

/** Page column: left aligned with the title, at most ~1180px wide. */
export function MorePage({ children }: { children: React.ReactNode }) {
  return <div className={`${s.page} fade-once`}>{children}</div>;
}

export interface FigureItem {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: string;
}

/** Two to four headline numbers on one hairline-divided row. */
export function FigureRow({ items }: { items: FigureItem[] }) {
  return (
    <div className={s.figures} style={{ ["--n" as string]: items.length } as React.CSSProperties}>
      {items.map((f, i) => (
        <div key={i} className={s.figureCell}>
          <Figure value={f.value} label={f.label} tone={f.tone} />
          {f.note && <div className={s.figureNote}>{f.note}</div>}
        </div>
      ))}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** CSS grid track, e.g. "minmax(0,1fr)" or "120px". */
  width: string;
  align?: "right";
  /** Drop the column below 1100px ("md") or below 768px ("sm"). */
  hide?: "md" | "sm";
  /** Track used on phones, when it differs (e.g. an actions column that shrinks). */
  widthSm?: string;
  render: (row: T) => React.ReactNode;
}

/** One quiet table on the canvas: 11px header, 50px hairline rows, mono figures right-aligned. */
export function GridTable<T>({ columns, rows, rowKey, onRowClick, label }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  onRowClick?: (row: T) => void;
  label?: string;
}) {
  const track = (cols: Column<T>[]) => cols.map(c => c.width).join(" ");
  const vars = {
    ["--cols" as string]: track(columns),
    ["--cols-md" as string]: track(columns.filter(c => c.hide !== "md")),
    ["--cols-sm" as string]: columns.filter(c => !c.hide).map(c => c.widthSm || c.width).join(" "),
  } as React.CSSProperties;
  const cellCls = (c: Column<T>) => [s.cell, c.align === "right" ? `${s.right} ${s.num}` : "", c.hide === "md" ? s.hideMd : c.hide === "sm" ? s.hideSm : ""].join(" ");

  return (
    <div className={s.table} style={vars} role="table" aria-label={label}>
      <div className={`${s.row} ${s.head}`} role="row">
        {columns.map(c => <div key={c.key} role="columnheader" className={cellCls(c)}>{c.header}</div>)}
      </div>
      <div className={s.body} role="rowgroup">
        {rows.map((r, i) => (
          <div
            key={rowKey(r, i)}
            role="row"
            className={`${s.row} ${onRowClick ? s.clickable : ""}`}
            onClick={onRowClick ? (e) => {
              // Buttons and links inside the row keep their own behaviour.
              if ((e.target as HTMLElement).closest("button, a, input, label")) return;
              onRowClick(r);
            } : undefined}
          >
            {columns.map(c => <div key={c.key} role="cell" className={cellCls(c)}>{c.render(r)}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sortable column header. */
export function SortHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <button type="button" className={s.sortBtn} aria-pressed={active} onClick={onClick}>
      {label}
      {active && <IconChevronDown size={12} style={{ transform: dir === "asc" ? "rotate(180deg)" : undefined }} />}
    </button>
  );
}

/** Small segmented control for ranges and views. */
export function Segmented<K extends string | number>({ options, value, onChange, label }: {
  options: { key: K; label: React.ReactNode }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <div className={s.segmented} role="group" aria-label={label}>
      {options.map(o => (
        <button key={String(o.key)} type="button" aria-pressed={o.key === value} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  );
}

export interface MenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  external?: boolean;
  tone?: "critical";
  disabled?: boolean;
  /** Only shown on phones, where the inline button is hidden. */
  phoneOnly?: boolean;
  separatorBefore?: boolean;
}

/** "More actions" button for a row: a small portalled menu. */
export function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const width = 196;
    const height = menu.current?.offsetHeight || 220;
    const below = r.bottom + 4 + height < window.innerHeight;
    setPos({
      top: below ? r.bottom + 4 : Math.max(8, r.top - height - 4),
      left: Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width)),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || btn.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close(true); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const els = Array.from(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])") || []).filter(el => el.offsetParent !== null);
        const i = els.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? els[(i + 1) % els.length] : els[(i - 1 + els.length) % els.length];
        next?.focus();
      }
    };
    const onScroll = () => close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onScroll);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && pos) menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [open, pos]);

  return (
    <>
      <button ref={btn} type="button" className="icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <IconMore size={16} />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={menu} role="menu" aria-label={label} className={`${s.menu} pop-in`} style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
          {items.map((it, i) => (
            <React.Fragment key={i}>
              {it.separatorBefore && <div className={s.menuSep} role="separator" />}
              {it.href ? (
                <a
                  role="menuitem"
                  href={it.href}
                  target={it.external ? "_blank" : undefined}
                  rel={it.external ? "noopener noreferrer" : undefined}
                  className={`${s.menuItem} ${it.phoneOnly ? s.smOnly : ""}`}
                  data-tone={it.tone}
                  onClick={() => close()}
                >
                  {it.label}
                </a>
              ) : (
                <button
                  role="menuitem"
                  type="button"
                  disabled={it.disabled}
                  aria-disabled={it.disabled || undefined}
                  className={`${s.menuItem} ${it.phoneOnly ? s.smOnly : ""}`}
                  data-tone={it.tone}
                  style={it.disabled ? { opacity: 0.45, cursor: "default" } : undefined}
                  onClick={() => { close(); it.onSelect?.(); }}
                >
                  {it.label}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

/** Labelled form field. */
export function Field({ label, htmlFor, hint, children, required }: { label: string; htmlFor: string; hint?: React.ReactNode; children: React.ReactNode; required?: boolean }) {
  return (
    <div className={s.field}>
      <label htmlFor={htmlFor} className={s.fieldLabel}>{label}{required && <span className="sr-only"> (required)</span>}</label>
      {children}
      {hint && <div className={s.fieldHint}>{hint}</div>}
    </div>
  );
}

/** A section on the shared canvas: a small tracked label, an optional
 *  line under it and a right slot. No box. */
export function Panel({ title, sub, right, children, flush }: { title?: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; flush?: boolean }) {
  return (
    <section className={s.panel}>
      {(title || right) && (
        <div className={s.panelHead}>
          <div className="min-w-0">
            {title && <h2 className={s.panelTitle}>{title}</h2>}
            {sub && <div className={s.panelSub}>{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {flush ? children : <div className={s.panelBody}>{children}</div>}
    </section>
  );
}

/** The humane line for any failed request. Never the raw exception. */
export const OFFLINE_TEXT = "Couldn't reach Starlane. Check your connection and try again.";

/** Strip emoji and warning glyphs a backend might put in a label. */
export function plain(text: string | null | undefined): string {
  return String(text || "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\s{2,}/g, " ").trim();
}
