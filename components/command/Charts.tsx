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

/** Hairline bars (one per day, or per few days on long ranges) with a soft
 *  smooth line behind them, as in Harvey's usage charts. Every bar is a 1px
 *  line whatever the width; empty days still show as a dot on the baseline. */
export function BarcodeChart({ data, height = 170, format, barLabel, lineLabel }: {
  data: DayPoint[]; height?: number; format: (v: number) => string; barLabel: string; lineLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  // One bar per day up to ~200 bars, so they read as a dense field of hairlines.
  const bins = useMemo(() => {
    const per = Math.max(1, Math.ceil(data.length / 200));
    const out: DayPoint[] = [];
    for (let i = 0; i < data.length; i += per) {
      const chunk = data.slice(i, i + per);
      const lastPt = chunk[chunk.length - 1];
      out.push({ date: lastPt.date, bar: lastPt.bar, line: lastPt.line });
    }
    return out;
  }, [data]);
  const W = 600, H = height, top = 6;
  const n = bins.length;
  const max = Math.max(1, ...bins.map((d) => Math.max(d.bar, d.line))) * 1.04;
  const step = n > 0 ? W / n : W;
  const x = (i: number) => i * step + step / 2;
  const y = (v: number) => top + (H - top) * (1 - v / max);
  const linePts = useMemo<[number, number][]>(() => {
    const k = Math.max(1, Math.round(n / 30));
    return bins.map((d, i) => {
      const win = bins.slice(Math.max(0, i - k), Math.min(n, i + k + 1));
      return [x(i), y(win.reduce((s, p) => s + p.line, 0) / win.length)];
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
        <path d={smooth(linePts)} fill="none" stroke={LINE} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        {bins.map((d, i) => {
          const yy = Math.min(y(d.bar), H - 1.5);
          return <line key={d.date} x1={x(i)} x2={x(i)} y1={H} y2={yy} stroke={hover === i ? "#0F0E0D" : BAR} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
        })}
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
          <div>{lineLabel}: <b style={{ fontWeight: 500 }}>{format(h.line)}</b></div>
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
            {groups.map((g) => (
              <div key={g.label} className="flex items-end" style={{ gap: 6, height: "100%" }}>
                <div title={g.aTitle} style={{ width: 9, height: `${Math.max(0.6, g.a)}%`, background: g.alert ? ALERT : INK }} />
                <div title={g.bTitle} style={{ width: 9, height: `${Math.max(0.6, g.b)}%`, background: g.alert ? "#CDBAB6" : SOFT }} />
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
      {rows.map((r) => (
        <div key={r.label} className="grid items-center" style={{ gridTemplateColumns: "minmax(90px, 28%) 1fr", gap: 14 }}>
          <span className="truncate" title={r.label} style={{ fontSize: 10.5, color: "#3F3D39" }}>{r.label}</span>
          <div className="flex items-center min-w-0" style={{ gap: 8 }}>
            <div style={{ height: 10, width: `${Math.max(2, (r.value / max) * 86)}%`, background: r.alert ? ALERT : "#4E5562", borderRadius: 1 }} />
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
