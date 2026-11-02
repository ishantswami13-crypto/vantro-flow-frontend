"use client";

// Command Center charts, drawn as plain SVG in the Harvey manner: no grid
// lines, no axis rules, thin slate marks, small grey labels. Display only:
// every value passed in is a sum of the tenant's own invoices.

import React, { useId, useMemo, useState } from "react";

export const INK = "#3D434B";       // slate bars
export const SOFT = "#C9CCD1";      // the paired, lighter bar / the line
export const ALERT = "#7C3F37";     // needs attention
const LABEL = "#8F8A81";

export interface DayPoint { date: string; bar: number; line: number }

/** Smooth path through points (Catmull-Rom as cubic Béziers). */
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Thin daily bars with a smooth line over them, months along the bottom. */
export function BarcodeChart({ data, height = 180, format, barLabel, lineLabel }: {
  data: DayPoint[]; height?: number; format: (v: number) => string; barLabel: string; lineLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = height, top = 8, bottom = 0;
  const max = Math.max(1, ...data.map((d) => Math.max(d.bar, d.line)));
  const n = data.length;
  const step = n > 0 ? W / n : W;
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  // A slight smoothing window keeps the line calm, as in the reference.
  const linePts = useMemo<[number, number][]>(() => {
    const k = Math.max(1, Math.round(n / 40));
    return data.map((d, i) => {
      const win = data.slice(Math.max(0, i - k), Math.min(n, i + k + 1));
      const avg = win.reduce((s, p) => s + p.line, 0) / win.length;
      return [i * step + step / 2, y(avg)];
    });
  }, [data, n, step]); // eslint-disable-line react-hooks/exhaustive-deps
  // Month starts, as a share of the width; the last is dropped if it would clip.
  const months = useMemo(() => {
    const out: { pct: number; label: string }[] = [];
    let last = "";
    data.forEach((d, i) => {
      const m = d.date.slice(0, 7);
      if (m !== last) { last = m; out.push({ pct: (i / Math.max(1, n)) * 100, label: new Date(d.date + "T00:00:00").toLocaleDateString("en-GB", { month: "short" }) }); }
    });
    return out.filter((m) => m.pct < 93);
  }, [data, n]);
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} role="img"
        aria-label={`${barLabel} by day, with ${lineLabel.toLowerCase()} as a line`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const i = Math.floor(((e.clientX - r.left) / r.width) * n);
          setHover(i >= 0 && i < n ? i : null);
        }}>
        {data.map((d, i) => {
          const yy = y(d.bar);
          return <rect key={d.date} x={i * step + step * 0.22} y={yy} width={Math.max(0.6, step * 0.56)} height={Math.max(0, H - bottom - yy)} fill={INK} opacity={hover == null || hover === i ? 1 : 0.55} />;
        })}
        <path d={smooth(linePts)} fill="none" stroke={SOFT} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      </svg>
      <div aria-hidden="true" className="relative" style={{ height: 14, marginTop: 6 }}>
        {months.map((m) => (
          <span key={m.label + m.pct} className="absolute" style={{ left: `${m.pct}%`, fontSize: 10, color: LABEL }}>{m.label}</span>
        ))}
      </div>
      {h && (
        <div className="pointer-events-none absolute" style={{ left: `${Math.min(78, (hover! / n) * 100)}%`, top: 0, background: "#FFFFFF", border: "1px solid #E4E1DA", borderRadius: 8, padding: "6px 9px", fontSize: 11.5, color: "#3F3D39", boxShadow: "0 6px 18px -10px rgba(15,14,13,0.25)", whiteSpace: "nowrap" }}>
          <div style={{ color: "#8F8A81" }}>{new Date(h.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
          <div>{barLabel}: <b style={{ fontWeight: 500 }}>{format(h.bar)}</b></div>
          <div>{lineLabel}: <b style={{ fontWeight: 500 }}>{format(h.line)}</b></div>
        </div>
      )}
    </div>
  );
}

export interface PairedGroup { label: string; a: number; b: number; alert?: boolean; aTitle?: string; bTitle?: string }

/** Two bars per group on a 0–100% scale: dark, then light. No grid lines. */
export function PairedBars({ groups, height = 190 }: { groups: PairedGroup[]; height?: number }) {
  const ticks = [100, 75, 50, 25, 0];
  return (
    <div role="img" aria-label={groups.map((g) => `${g.label}: ${Math.round(g.a)}% of amount, ${Math.round(g.b)}% of invoices`).join("; ")}>
      <div className="flex" style={{ height, gap: 10 }}>
        <div className="flex flex-col justify-between shrink-0" style={{ fontSize: 9.5, color: LABEL, width: 30, marginTop: -5, marginBottom: -5 }}>
          {ticks.map((t) => <span key={t}>{t}%</span>)}
        </div>
        <div className="flex flex-1 min-w-0 items-end justify-around">
          {groups.map((g) => (
            <div key={g.label} className="flex items-end" style={{ gap: 4, height: "100%" }}>
              <div title={g.aTitle} style={{ width: 10, height: `${Math.max(0.5, g.a)}%`, background: g.alert ? ALERT : INK, borderRadius: 1 }} />
              <div title={g.bTitle} style={{ width: 10, height: `${Math.max(0.5, g.b)}%`, background: SOFT, borderRadius: 1 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex" style={{ gap: 10, marginTop: 8 }}>
        <div className="shrink-0" style={{ width: 30 }} />
        <div className="flex flex-1 min-w-0 justify-around">
          {groups.map((g) => <span key={g.label} className="text-center" style={{ fontSize: 10, color: LABEL, width: 0, whiteSpace: "nowrap", display: "flex", justifyContent: "center" }}>{g.label}</span>)}
        </div>
      </div>
    </div>
  );
}

/** Ranked horizontal bars: name on the left, value at the bar's end. */
export function RankBars({ rows, format }: { rows: { label: string; value: number; alert?: boolean }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {rows.map((r) => (
        <div key={r.label} className="grid items-center" style={{ gridTemplateColumns: "minmax(90px, 28%) 1fr", gap: 14 }}>
          <span className="truncate" title={r.label} style={{ fontSize: 11.5, color: "#3F3D39" }}>{r.label}</span>
          <div className="flex items-center min-w-0" style={{ gap: 8 }}>
            <div style={{ height: 11, width: `${Math.max(2, (r.value / max) * 86)}%`, background: r.alert ? ALERT : "#4A5160", borderRadius: 1.5 }} />
            <span className="shrink-0 tabular-nums" style={{ fontSize: 10.5, color: LABEL }}>{format(r.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center" style={{ gap: 14 }}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center" style={{ gap: 6, fontSize: 11.5, color: "#6E6A63" }}>
          <span aria-hidden="true" className="rounded-full" style={{ width: 7, height: 7, background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** Harvey's small rounded dropdown pill, as a real <select>. */
export function PillSelect<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="cc-pill">
      <span className="sr-only">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
    </label>
  );
}

/** Download the numbers behind a chart as CSV. */
export function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
