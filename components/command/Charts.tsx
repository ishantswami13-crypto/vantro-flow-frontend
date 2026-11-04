"use client";

// Command Center charts, drawn in the Harvey manner: hairline bars with a
// soft line, paired slate/grey columns on faint guides, ranked bars, small
// grey labels and no axis rules. Display only:
// every value passed in is a sum of the tenant's own invoices.

import React, { useId, useMemo, useState } from "react";

// Harvey's chart palette: slate for "yours", pale grey for the comparison,
// a muted brick for what needs attention, hairline bars and a soft line.
export const INK = "#454B55";       // slate bars
export const SOFT = "#D3D5D9";      // the paired, lighter bar
export const ALERT = "#7A443C";     // needs attention
export const BAR = "#3A3F47";       // hairline bars
export const LINE = "#CFD1D5";      // the smooth comparison line
const LABEL = "#8F8A81";
const GRID = "#EFEDE9";

// Harvey's bars carry a fine film grain: light speckle on the dark bars,
// darker speckle on the pale ones. A tiled SVG noise, no image files.
const noise = (rgb: string, a: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><filter id='n' x='0' y='0'><feTurbulence type='fractalNoise' baseFrequency='1.35' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${rgb} 0 0 0 0 ${rgb} 0 0 0 0 ${rgb} 0 0 0 ${a} -0.3'/></filter><rect width='48' height='48' filter='url(#n)'/></svg>`)}")`;
const GRAIN_ON_DARK = noise("1", 0.75);
const GRAIN_ON_LIGHT = noise("0.45", 0.75);
export const grain = (color: string, light = false): React.CSSProperties =>
  ({ backgroundColor: color, backgroundImage: light ? GRAIN_ON_LIGHT : GRAIN_ON_DARK, backgroundSize: "48px 48px" });

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

/** Gaussian smoothing with edge renormalisation, so curves flow instead of kinking. */
function gauss(vals: number[], sigma: number): number[] {
  if (sigma <= 0 || vals.length < 3) return vals.slice();
  const r = Math.ceil(sigma * 3);
  const w = Array.from({ length: 2 * r + 1 }, (_, j) => Math.exp(-((j - r) ** 2) / (2 * sigma * sigma)));
  return vals.map((_, i) => {
    let s = 0, ws = 0;
    for (let j = -r; j <= r; j++) { const v = vals[i + j]; if (v !== undefined) { s += v * w[j + r]; ws += w[j + r]; } }
    return s / ws;
  });
}

/** Hairline bars (one per day, or per few days on long ranges) with a soft
 *  smooth line behind them, as in Harvey's usage charts. Every bar is a 1px
 *  line whatever the width; empty days still show as a dot on the baseline. */
export function BarcodeChart({ data, height = 170, format, barLabel, lineLabel, showLine = true, weekly = false }: {
  data: DayPoint[]; height?: number; format: (v: number) => string; barLabel: string; lineLabel: string; showLine?: boolean; weekly?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // About 140 hairlines across the card (Harvey's spacing), or one per week.
  const bins = useMemo(() => {
    if (!weekly && data.length > 140) {
      return Array.from({ length: 140 }, (_, i) => data[Math.round((i * (data.length - 1)) / 139)]);
    }
    const per = weekly ? 7 : 1;
    const out: DayPoint[] = [];
    for (let i = 0; i < data.length; i += per) {
      const chunk = data.slice(i, i + per);
      const lastPt = chunk[chunk.length - 1];
      out.push({ date: lastPt.date, bar: lastPt.bar, line: lastPt.line });
    }
    return out;
  }, [data, weekly]);
  // Bar heights follow a short centred average so the field rises as a smooth
  // hill rather than in stair steps; the tooltip still shows the exact value.
  const heights = useMemo(() => gauss(bins.map((d) => d.bar), weekly ? 0.8 : bins.length / 26), [bins, weekly]);
  const W = 600, H = height, top = 6;
  const n = bins.length;
  const max = Math.max(1, ...bins.map((d) => Math.max(d.bar, d.line))) * 1.04;
  const step = n > 0 ? W / n : W;
  const x = (i: number) => i * step + step / 2;
  const y = (v: number) => top + (H - top) * (1 - v / max);
  // The comparison line is a broad, flowing trend: heavily smoothed, then
  // drawn through about ten evenly spaced knots so it never kinks.
  const linePts = useMemo<[number, number][]>(() => {
    if (n < 2) return [];
    const sm = gauss(gauss(bins.map((d) => d.line), n / 9), n / 14);
    const knots = Math.min(n, 10);
    return Array.from({ length: knots }, (_, k) => {
      const i = Math.round((k * (n - 1)) / (knots - 1));
      return [x(i), y(sm[i])] as [number, number];
    });
  }, [bins, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const months = useMemo(() => {
    const out: { pct: number; label: string }[] = [];
    let last = "";
    data.forEach((d, i) => {
      const m = d.date.slice(0, 7);
      if (m !== last) { last = m; out.push({ pct: (i / Math.max(1, data.length)) * 100, label: new Date(d.date + "T00:00:00").toLocaleDateString("en-GB", { month: "short" }) }); }
    });
    return out.filter((m) => m.pct < 94);
  }, [data]);
  const h = hover != null ? bins[hover] : null;

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
        <g className="hv-bars">{bins.map((d, i) => {
          const yy = Math.min(y(heights[i]), H - 1.5);
          return <line key={d.date} style={{ animationDelay: `${Math.round((i / Math.max(1, n)) * 600)}ms` }} x1={x(i)} x2={x(i)} y1={H} y2={yy} stroke={hover === i ? "#0F0E0D" : BAR} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
        })}</g>
        {showLine && <path key={bins.length + (weekly ? "w" : "d")} className="hv-draw" pathLength={1} d={smooth(linePts)} fill="none" stroke={LINE} strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinecap="round" />}
      </svg>
      <div aria-hidden="true" className="relative" style={{ height: 14, marginTop: 8 }}>
        {months.map((m) => (
          <span key={m.label + m.pct} className="absolute" style={{ left: `${m.pct}%`, fontSize: 9.5, color: LABEL }}>{m.label}</span>
        ))}
      </div>
      {h && (
        <div className="pointer-events-none absolute" style={{ left: `${Math.min(70, (hover! / n) * 100)}%`, top: 0, background: "#FFFFFF", border: "1px solid #E4E1DA", borderRadius: 8, padding: "6px 9px", fontSize: 11.5, color: "#3F3D39", boxShadow: "0 6px 18px -10px rgba(15,14,13,0.25)", whiteSpace: "nowrap" }}>
          <div style={{ color: "#8F8A81" }}>{new Date(h.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
          <div>{barLabel}: <b style={{ fontWeight: 500 }}>{format(h.bar)}</b></div>
          {showLine && <div>{lineLabel}: <b style={{ fontWeight: 500 }}>{format(h.line)}</b></div>}
        </div>
      )}
    </div>
  );
}

export interface PairedGroup { label: string; a: number; b: number; alert?: boolean; aTitle?: string; bTitle?: string }

/** Two bars per group on a 0–100% scale: slate, then pale grey, on faint guides. */
export function PairedBars({ groups, height = 170 }: { groups: PairedGroup[]; height?: number }) {
  const ticks = [100, 75, 50, 25, 0];
  return (
    <div role="img" aria-label={groups.map((g) => `${g.label}: ${Math.round(g.a)}% of amount, ${Math.round(g.b)}% of invoices`).join("; ")}>
      <div className="flex" style={{ height, gap: 12 }}>
        <div className="relative shrink-0" style={{ width: 28 }}>
          {ticks.map((t) => <span key={t} className="absolute right-0" style={{ top: `${100 - t}%`, transform: "translateY(-50%)", fontSize: 9, color: LABEL }}>{t}%</span>)}
        </div>
        <div className="relative flex-1 min-w-0">
          {ticks.map((t) => <div key={t} aria-hidden="true" className="absolute left-0 right-0" style={{ top: `${100 - t}%`, borderTop: `1px solid ${GRID}` }} />)}
          <div className="absolute inset-0 flex items-end justify-around">
            {groups.map((g, gi) => (
              <div key={g.label} className="flex items-end" style={{ gap: 6, height: "100%" }}>
                <div title={g.aTitle} className="hv-grow-y" style={{ animationDelay: `${gi * 70}ms`, width: 10, height: `${Math.max(0.6, g.a)}%`, borderRadius: 2, ...grain(g.alert ? ALERT : INK) }} />
                <div title={g.bTitle} className="hv-grow-y" style={{ animationDelay: `${gi * 70 + 40}ms`, width: 10, height: `${Math.max(0.6, g.b)}%`, borderRadius: 2, ...grain(SOFT, true) }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex" style={{ gap: 12, marginTop: 10 }}>
        <div className="shrink-0" style={{ width: 28 }} />
        <div className="flex flex-1 min-w-0 justify-around">
          {groups.map((g) => <span key={g.label} style={{ fontSize: 9.5, color: LABEL, width: 0, whiteSpace: "nowrap", display: "flex", justifyContent: "center" }}>{g.label}</span>)}
        </div>
      </div>
    </div>
  );
}

/** Ranked horizontal bars: name on the left, value at the bar's end. */
export function RankBars({ rows, format }: { rows: { label: string; value: number; alert?: boolean }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      {rows.map((r, ri) => (
        <div key={r.label} className="grid items-center" style={{ gridTemplateColumns: "minmax(90px, 28%) 1fr", gap: 14 }}>
          <span className="truncate" title={r.label} style={{ fontSize: 10.5, color: "#3F3D39" }}>{r.label}</span>
          <div className="flex items-center min-w-0" style={{ gap: 8 }}>
            <div className="hv-grow-x" style={{ animationDelay: `${ri * 70}ms`, height: 11, width: `${Math.max(2, (r.value / max) * 86)}%`, borderRadius: 2, ...grain(r.alert ? ALERT : "#4A505B") }} />
            <span className="shrink-0 tabular-nums" style={{ fontSize: 10.5, color: LABEL }}>{format(r.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; glyph?: "bars"; underline?: boolean; light?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center" style={{ gap: 14 }}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center" style={{ gap: 6, fontSize: 11.5, color: "#6E6A63" }}>
          {it.glyph === "bars"
            ? <svg aria-hidden="true" width="11" height="9" viewBox="0 0 11 9">{[1, 3, 5, 7, 9].map((x, i) => <line key={x} x1={x} x2={x} y1={9} y2={[5, 3, 1, 2, 4][i]} stroke={it.color} strokeWidth="1" />)}</svg>
            : <span aria-hidden="true" className="rounded-full" style={{ width: 8, height: 8, ...grain(it.color, it.light) }} />}
          <span style={it.underline ? { textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "#BDB8AF" } : undefined}>{it.label}</span>
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
