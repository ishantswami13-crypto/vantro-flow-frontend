// The Operating Record: Starlane's diagram grammar. One entity is one row;
// time runs left to right in weeks, ending at "now". Marks:
//   inv  open invoice or bill (hollow square)   pay  payment (filled square)
//   ord  order (small square)                   pro  promise kept (tick)
//   miss promise missed (tick with slash)       act  a person's action (diamond)
//   ext  external event (dotted drop)
// A series draws a level over time (stock cover, an exchange rate), with an
// optional dashed threshold. A bracket marks a detected change.

export type Tone = "risk" | "warn" | "info" | "ok";
export type Mark = { w: number; t: "inv" | "pay" | "ord" | "pro" | "miss" | "act" | "ext"; tone?: Tone; dx?: number };
export type Series = { v: number[]; min: number; max: number; threshold?: number; tone?: Tone };
export type Strip = { marks?: Mark[]; series?: Series; bracket?: { from: number; to: number; tone: Tone } };

const UNIT = 56;
const H = 40;
const MID = 20;

export function RecordStrip({ strip, weeks = 12, now = true, className = "" }: { strip: Strip; weeks?: number; now?: boolean; className?: string }) {
  const first = 13 - weeks;
  const W = weeks * UNIT;
  const x = (w: number, dx = 0) => (w - first + 0.5) * UNIT + dx;
  const visible = (w: number) => w >= first && w <= 12;
  const { marks = [], series, bracket } = strip;

  let line: string | null = null;
  let thr: number | null = null;
  if (series) {
    const y = (v: number) => H - 6 - ((v - series.min) / (series.max - series.min)) * (H - 12);
    const pts = series.v.map((v, i) => [i + 1, v] as const).filter(([w]) => visible(w));
    line = pts.map(([w, v]) => `${x(w).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    if (series.threshold != null) thr = y(series.threshold);
  }

  return (
    <svg className={`rs ${className}`} viewBox={`0 0 ${W} ${H}`} width={W} height={H} preserveAspectRatio="xMinYMid meet" aria-hidden focusable="false">
      {Array.from({ length: weeks }, (_, i) => (
        <line key={i} x1={(i + 1) * UNIT} x2={(i + 1) * UNIT} y1={MID - 2} y2={MID + 2} className="rs-tick" />
      ))}
      <line x1={0} x2={W} y1={MID} y2={MID} className="rs-base" />
      {bracket && visible(bracket.to) && (() => {
        const a = x(Math.max(bracket.from, first)) - 14;
        const b = x(bracket.to) + 14;
        return <path className={`rs-bracket t-${bracket.tone}`} d={`M${a + 5} 6H${a}V34H${a + 5}M${b - 5} 6H${b}V34H${b - 5}`} />;
      })()}
      {thr != null && <line x1={0} x2={W} y1={thr} y2={thr} className="rs-thr" />}
      {line && <polyline points={line} className={`rs-series ${series?.tone ? `t-${series.tone}` : ""}`} />}
      {marks.filter((m) => visible(m.w)).map((m, i) => {
        const cx = x(m.w, m.dx);
        const tone = m.tone ? ` t-${m.tone}` : "";
        switch (m.t) {
          case "inv": return <rect key={i} x={cx - 4} y={MID - 4} width={8} height={8} className={`rs-inv${tone}`} />;
          case "pay": return <rect key={i} x={cx - 4} y={MID - 4} width={8} height={8} className={`rs-pay${tone}`} />;
          case "ord": return <rect key={i} x={cx - 2} y={MID - 2} width={4} height={4} className={`rs-ord${tone}`} />;
          case "pro": return <line key={i} x1={cx} x2={cx} y1={MID - 7} y2={MID + 7} className={`rs-pro${tone}`} />;
          case "miss": return <g key={i} className="rs-miss"><line x1={cx} x2={cx} y1={MID - 7} y2={MID + 7} /><line x1={cx - 4} x2={cx + 4} y1={MID + 5} y2={MID - 5} className="t-risk" /></g>;
          case "act": return <path key={i} d={`M${cx} ${MID - 5}l5 5-5 5-5-5z`} className={`rs-act${tone}`} />;
          case "ext": return <g key={i} className={`rs-ext${tone}`}><line x1={cx} x2={cx} y1={0} y2={H} /><rect x={cx - 2.5} y={MID - 2.5} width={5} height={5} /></g>;
        }
      })}
      {now && <g className="rs-now"><line x1={W - 8} x2={W - 8} y1={0} y2={H} /></g>}
    </svg>
  );
}

export function RecordAxis({ weeks = 12, labels }: { weeks?: number; labels: string[] }) {
  const W = weeks * UNIT;
  const shown = labels.slice(12 - weeks);
  return (
    <svg className="rs rs-axis" viewBox={`0 0 ${W} 24`} width={W} height={24} preserveAspectRatio="xMinYMid meet" aria-hidden focusable="false">
      {shown.map((l, i) => (
        <text key={l} x={(i + 0.5) * UNIT} y={15} textAnchor="middle">{l}</text>
      ))}
      <rect x={W - 11} y={18} width={6} height={6} className="rs-nowcap" />
    </svg>
  );
}
