"use client";

// Version 32 building blocks (STARLANE_FRONTEND_HANDOFF.md §3–§6, the frozen
// Starlane.html design). Display only: every value passed in comes from the
// backend. One shared set, so the duplicated generator helpers in the
// handoff (entity_row, rail_section, status_dot, lettermark) become one.

import React from "react";
import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";
import { IconSearch, IconSparkle } from "./icons";

export const V = {
  ink: "#191917",
  secondary: "#63635F",
  tertiary: "#8A8A86",
  body: "#43433F",
  divider: "#EBEAE6",
  hairline: "#E5E4DF",
  strong: "#D7D6D0",
  card: "rgba(25,25,23,0.10)",
  input: "rgba(25,25,23,0.12)",
  button: "rgba(25,25,23,0.14)",
  emphasis: "rgba(25,25,23,0.16)",
  rowSubtle: "rgba(25,25,23,0.06)",
  surface2: "#F3F2EE",
  positive: "#477054",
  warning: "#9B742B",
  critical: "#A64F4B",
  neutralDot: "rgba(25,25,23,0.25)",
  accent: "var(--accent, #696D86)",
  serif: "'Fraunces', Georgia, serif",
  mono: "'Plus Jakarta Sans', system-ui, sans-serif",
};

/** Page title row: Fraunces 26px, an optional one-line subtitle and a right slot. */
export function PageHeader({ title, subtitle, right, children }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="fade-once">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 style={{ margin: 0, fontFamily: V.serif, fontWeight: 400, fontSize: 26, color: V.ink }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 13.5, color: V.secondary, marginTop: 4 }}>{subtitle}</div>}
        </div>
        {right && <div className="flex items-center gap-4 shrink-0">{right}</div>}
      </div>
      {children}
    </div>
  );
}

export interface SubnavItem { key: string; label: React.ReactNode; href?: string; count?: number | null }

/** Secondary tab row: 22px gap, divider underneath, the user's accent under the active tab. */
export function Subnav({ items, active, onChange, label = "Secondary" }: {
  items: SubnavItem[];
  active: string;
  onChange?: (key: string) => void;
  label?: string;
}) {
  return (
    <nav aria-label={label} className="flex items-center overflow-x-auto" style={{ gap: 22, borderBottom: `1px solid ${V.divider}`, marginBottom: 4 }}>
      {items.map((it) => {
        const on = it.key === active;
        const style: React.CSSProperties = {
          padding: "8px 2px", fontSize: 13, fontWeight: on ? 500 : 400, whiteSpace: "nowrap",
          color: on ? V.ink : V.secondary, borderBottom: `2px solid ${on ? V.accent : "transparent"}`,
          marginBottom: -1, background: "none",
        };
        const content = (
          <>
            {it.label}
            {it.count != null && <span style={{ fontSize: 11, color: V.tertiary, marginLeft: 3 }}>{it.count}</span>}
          </>
        );
        if (it.href) {
          return <Link key={it.key} href={it.href} aria-current={on ? "page" : undefined} className="hover-dim" style={style}>{content}</Link>;
        }
        return (
          <button key={it.key} type="button" role="tab" aria-selected={on} onClick={() => onChange?.(it.key)} className="hover-dim" style={style}>
            {content}
          </button>
        );
      })}
    </nav>
  );
}

/** Uppercase section label (10.5–11px, letter-spacing 1px). */
export function Label({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={{ fontSize: 12, color: V.tertiary, ...style }}>
      {children}
    </div>
  );
}

/** Quiet serif section heading ("What changed", "Needs you"). */
export function SectionTitle({ children, size = 16, className = "" }: { children: React.ReactNode; size?: number; className?: string }) {
  return <h2 className={className} style={{ fontFamily: V.serif, fontWeight: 400, fontSize: size, color: V.ink, margin: "0 0 6px", letterSpacing: "-0.1px" }}>{children}</h2>;
}

export function Dot({ color, size = 6, className = "" }: { color: string; size?: number; className?: string }) {
  return <span aria-hidden="true" className={`shrink-0 ${className}`} style={{ width: size, height: size, borderRadius: "50%", background: color, display: "inline-block" }} />;
}

/** Three small dots lifting in turn, beside "working" copy. */
export function ThinkingDots({ color = V.tertiary }: { color?: string }) {
  return <span aria-hidden="true" className="thinking-dots" style={{ color }}><span /><span /><span /></span>;
}

/** Hairline that draws in from the left. */
export function Rule({ style }: { style?: React.CSSProperties }) {
  return <div aria-hidden="true" className="rule-draw" style={style} />;
}

const TONED = new Set([V.positive, V.warning, V.critical]);

/** Status as quiet text: no leading dot. Positive, warning and critical
 *  states keep their tone in the text colour; anything else stays grey. */
export function StatusDot({ label, color }: { label: React.ReactNode; color: string }) {
  return (
    <span className="inline-flex items-center" style={{ fontSize: 12.5, color: TONED.has(color) ? color : V.secondary }}>
      {label}
    </span>
  );
}

/** The "·" separator used between meta items. */
export function Sep() {
  return <span aria-hidden="true" style={{ color: V.strong }}>·</span>;
}

export function Mono({ children, size = 12.5, color = V.ink, className = "" }: { children: React.ReactNode; size?: number; color?: string; className?: string }) {
  return <span className={`figure-in ${className}`} style={{ fontFamily: V.mono, fontSize: size, color, fontVariantNumeric: "tabular-nums" }}>{children}</span>;
}

export function Chevron({ size = 14 }: { size?: number }) {
  return <FiChevronRight aria-hidden="true" size={size} strokeWidth={1.6} className="row-chevron shrink-0" style={{ color: V.tertiary }} />;
}

/** White card: 1px rgba(25,25,23,0.10) border, 8px radius, no shadow. */
export function Card({ children, className = "", style, lift = false }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; lift?: boolean }) {
  return (
    <div className={`${lift ? "hover-lift" : ""} ${className}`} style={{ background: "#FFFFFF", border: `1px solid ${V.card}`, borderRadius: 8, ...style }}>
      {children}
    </div>
  );
}

/** The small bordered "ev" citation mark. */
export function EvMark({ onClick, title = "View evidence" }: { onClick?: (e: React.MouseEvent) => void; title?: string }) {
  const style: React.CSSProperties = { fontFamily: V.mono, fontSize: 9.5, color: V.tertiary, border: `1px solid ${V.hairline}`, borderRadius: 3, padding: "0 4px", marginLeft: 4, verticalAlign: "2px", lineHeight: "14px", display: "inline-block" };
  if (!onClick) return <span style={style} aria-hidden="true">ev</span>;
  return <button type="button" onClick={(e) => { e.stopPropagation(); onClick(e); }} title={title} aria-label={title} className="hover-dim" style={{ ...style, background: "none", cursor: "pointer" }}>ev</button>;
}

/** Primary / secondary buttons as drawn: dark fill, or a 1px outline. */
export function Button({ children, onClick, primary, disabled, type = "button", href, small, title, className = "" }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; type?: "button" | "submit";
  href?: string; small?: boolean; title?: string; className?: string;
}) {
  const cls = `${disabled ? "" : primary ? "btn-primary-v32" : "btn-secondary-v32"} inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${className}`;
  const style: React.CSSProperties = {
    padding: small ? "6px 12px" : "9px 14px", borderRadius: 6, fontSize: small ? 12 : 13, fontWeight: 400,
    background: primary ? "#191917" : "transparent", color: primary ? "#F7F7F4" : V.body,
    border: `1px solid ${primary ? "#191917" : V.button}`, opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer",
  };
  if (href && !disabled) return <Link href={href} className={cls} style={style} title={title}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls} style={style} title={title}>{children}</button>;
}

/** Table header row (§12): surface-2, 11px uppercase, letter-spacing 0.5px. */
export function TableHead({ columns, template, className = "" }: { columns: React.ReactNode[]; template: string; className?: string }) {
  return (
    <div className={`hidden md:grid ${className}`} style={{ gridTemplateColumns: template, padding: "10px 14px", background: V.surface2, fontSize: 11, letterSpacing: 0, color: V.secondary }}>
      {columns.map((c, i) => <span key={i} style={{ textAlign: i === columns.length - 1 ? "right" : undefined }}>{c}</span>)}
    </div>
  );
}

/** Compact right-rail section (rail_section / rail_row). */
export function RailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label style={{ fontSize: 10.5, marginBottom: 8 }}>{label}</Label>
      <div>{children}</div>
    </div>
  );
}

export function RailRow({ children, href }: { children: React.ReactNode; href?: string }) {
  const style: React.CSSProperties = { display: "block", padding: "7px 0", fontSize: 12.5, color: V.body, borderBottom: `1px solid ${V.divider}` };
  if (href) return <Link href={href} className="hover-dim" style={style}>{children}</Link>;
  return <div style={style}>{children}</div>;
}

/** entity_row: type label, name, relevance, optional mono metric and a chevron. */
export function EntityRow({ type, name, relevance, metric, href, onClick }: {
  type: string; name: React.ReactNode; relevance?: React.ReactNode; metric?: React.ReactNode; href?: string; onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 10.5, letterSpacing: "0.6px", color: V.tertiary }}>{type}</div>
        <div style={{ fontSize: 13.5, color: V.ink }}>{name}</div>
        {relevance && <div style={{ fontSize: 12, color: V.secondary }}>{relevance}</div>}
      </div>
      {metric != null && <Mono size={12}>{metric}</Mono>}
      <Chevron />
    </>
  );
  const cls = "row-hover flex items-center gap-3 w-full text-left";
  const style: React.CSSProperties = { padding: "10px 8px", borderRadius: 6 };
  if (href) return <Link href={href} className={cls} style={style}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls} style={style}>{inner}</button>;
  return <div className={cls} style={style}>{inner}</div>;
}

/** Lettermark: a monochrome serif initial on a white tile, the same in every place. */
export function Lettermark({ letter, size = 30 }: { letter: string; color?: string; size?: number }) {
  return (
    <span aria-hidden="true" className="inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), background: "#FFFFFF", color: V.ink, boxShadow: `inset 0 0 0 1px ${V.card}`, fontFamily: V.serif, fontSize: Math.round(size * 0.5) }}>
      {(letter || "?").charAt(0).toUpperCase()}
    </span>
  );
}

/** A quiet sentence for "nothing here yet": never an illustration, never a big icon. */
/** Empty state: a quiet icon tile beside the title and one line of help. */
export function EmptyLine({ title, body, action, icon }: { title?: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="fade-once flex items-start" style={{ padding: "18px 0", gap: 14 }}>
      <IconTile size={38}>{icon || <IconSparkle size={17} />}</IconTile>
      <div className="min-w-0" style={{ paddingTop: 1 }}>
        {title && <div style={{ fontSize: 14, color: V.ink, marginBottom: 3 }}>{title}</div>}
        {body && <div style={{ fontSize: 12.5, color: V.secondary, lineHeight: 1.6, maxWidth: 640 }}>{body}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

export function SkeletonRows({ rows = 3, height = 52 }: { rows?: number; height?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ height, borderBottom: `1px solid ${V.divider}` }}>
          <div className="skeleton h-3 w-40" />
          <div className="skeleton h-3 flex-1 max-w-[360px]" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" style={{ fontSize: 12.5, color: V.critical, background: "#A64F4B0d", border: "1px solid rgba(166,79,75,0.2)", borderRadius: 6, padding: "8px 12px" }}>
      {children}
    </div>
  );
}

/** Relative time in the design's voice: "3m ago", "2h ago". */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  if (ms < 60_000) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

export function clockTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Icon tile: a soft square that gives a row a visual anchor. `tone` tints it
 *  for rows that need attention. */
export function IconTile({ children, tone, size = 34 }: { children: React.ReactNode; tone?: "critical" | "warning" | "positive"; size?: number }) {
  const t = tone === "critical" ? { bg: "rgba(166,79,75,0.09)", fg: V.critical }
    : tone === "warning" ? { bg: "rgba(155,116,43,0.10)", fg: V.warning }
    : tone === "positive" ? { bg: "rgba(71,112,84,0.10)", fg: V.positive }
    : { bg: "#FFFFFF", fg: V.body };
  return (
    <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center" style={{ width: size, height: size, borderRadius: 9, background: t.bg, color: t.fg, boxShadow: tone ? undefined : `inset 0 0 0 1px ${V.card}` }}>
      {children}
    </span>
  );
}

/** A large serif figure over a short label, for a page's two or three headline counts. */
export function Figure({ value, label, tone }: { value: React.ReactNode; label: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="figure-in" style={{ fontFamily: V.serif, fontSize: 30, lineHeight: 1.05, color: tone || V.ink, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12.5, color: V.secondary, marginTop: 4 }}>{label}</div>
    </div>
  );
}

/** The search box that sits under a page's title and tabs, the same on every page. */
export function SearchField({ value, onChange, placeholder, id }: { value: string; onChange: (v: string) => void; placeholder: string; id: string }) {
  return (
    <label htmlFor={id} className="page-search">
      <IconSearch size={14} />
      <span className="sr-only">{placeholder}</span>
      <input id={id} type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" />
    </label>
  );
}
