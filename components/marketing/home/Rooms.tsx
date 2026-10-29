import { InView } from "./InView";
import { Glyph } from "./Glyph";
import { RecordStrip } from "./Record";
import { BANDS } from "./Plates";

const strip = (name: string) => BANDS.flatMap((b) => b.rows).find((r) => r.name === name)!.strip;

/* ── Frame 04 · Know what changed ──────────────────────────────── */

const WATCH = [
  { tone: "risk", cat: "Receivables", what: "Second payment promise missed", who: "Gupta Traders", fig: "₹18,42,000", figK: "open, 47 days", s: "Gupta Traders", tags: ["Promise log · 06 Oct", "Ledger · 07:41"] },
  { tone: "warn", cat: "Payables · FX", what: "EUR up 2.1% on three open bills", who: "Brenner Armaturen GmbH", fig: "€41,200", figK: "₹47k–1.41 lakh dearer · estimate", s: "Brenner Armaturen GmbH", tags: ["RBI rate · 13 Oct", "Payables"] },
  { tone: "warn", cat: "Stock", what: "CPVC 25 mm below its reorder level", who: "2 open orders depend on it", fig: "9 days", figK: "cover · ₹5,83,000 in orders", s: "CPVC pipe 25 mm", tags: ["Stock · 07:40", "Orders"] },
  { tone: "info", cat: "Exposure", what: "Above its ₹25,00,000 limit", who: "Mehta & Sons", fig: "₹26,84,000", figK: "exposure", s: "Mehta & Sons", tags: ["Ledger", "Watch rule"] },
] as const;

export function WatchRoom() {
  return (
    <InView className="w4">
      <div className="w4-bar">
        <p><b>Watch</b><span>Tue 14 Oct · 07:42</span><span className="w4-ill">Illustrative · Narmada Pipes & Fittings</span></p>
        <p className="w4-bar-r"><span>4 material changes</span><span>4 systems current</span></p>
      </div>
      <ol className="w4-grid">
        {WATCH.map((c, i) => (
          <li key={c.cat} className={`w4-card t-${c.tone}`} style={{ "--i": i } as React.CSSProperties}>
            <p className={`w4-cat t-${c.tone}`}>{c.cat}</p>
            <p className="w4-what">{c.what}</p>
            <p className="w4-who">{c.who}</p>
            <p className="w4-fig num">{c.fig}<span>{c.figK}</span></p>
            <div className="w4-strip"><RecordStrip strip={strip(c.s)} weeks={8} /></div>
            <p className="w4-tags">{c.tags.map((t) => <span key={t}>{t}</span>)}</p>
          </li>
        ))}
      </ol>
    </InView>
  );
}

/* ── Frame 06 · Simulation ─────────────────────────────────────── */

const TOTAL = 184.2;
const OPTIONS = [
  { o: "Firm reminder and an owner call", lo: 96, mid: 124, hi: 151, best: 58, rec: true },
  { o: "Payment plan, three instalments", lo: 61, mid: 77, hi: 92, best: 21 },
  { o: "Hold credit until dues clear", lo: 70, mid: 101, hi: 133, best: 17 },
  { o: "Do nothing new", lo: 18, mid: 34, hi: 55, best: 4 },
];
const pct = (v: number) => `${((v / TOTAL) * 100).toFixed(2)}%`;

export function SimulationRoom() {
  return (
    <InView className="s6">
      <div className="s6-axis" aria-hidden>
        {[0, 50, 100, 150].map((t) => <span key={t} className={t === 150 ? "s6-axis-150" : undefined} style={{ left: pct(t) }}>₹{t / 10}L</span>)}
        <span className="s6-axis-end" style={{ left: "100%" }}>₹18.42 lakh owed</span>
      </div>
      <ol className="s6-opts">
        {OPTIONS.map((o, i) => (
          <li key={o.o} className={o.rec ? "rec" : ""} style={{ "--i": i } as React.CSSProperties}>
            <div className="s6-head">
              <p className="s6-o"><span className="s6-n">{String.fromCharCode(65 + i)}</span>{o.o}{o.rec && <span className="s6-rec">Recommended</span>}</p>
              <p className="s6-best">Best in {o.best}% of simulated futures</p>
            </div>
            <p className="s6-fig num"><span className="s6-cur">₹</span>{(o.lo / 10).toFixed(1)}–{(o.hi / 10).toFixed(1)}<span className="s6-k"> lakh</span></p>
            <div className="s6-track" aria-hidden>
              <span className="s6-range" style={{ left: pct(o.lo), width: pct(o.hi - o.lo) }} />
              <span className="s6-mid" style={{ left: pct(o.mid) }} />
            </div>
            <span className="sl-sr">Collected within 30 days, 10th to 90th percentile: ₹{(o.lo / 10).toFixed(1)} lakh to ₹{(o.hi / 10).toFixed(1)} lakh; median ₹{(o.mid / 10).toFixed(1)} lakh.</span>
          </li>
        ))}
      </ol>
      <p className="s6-foot">Cash collected within 30 days, 10th–90th percentile, with the median marked. Every effect is labelled as an assumption or an observed range. No language model produces these numbers.</p>
    </InView>
  );
}

/* ── Frame 07 · Action, then verification ──────────────────────── */

const STATIONS = [
  { g: "gate", k: "Approved", t: "14 Oct · 09:10", b: "By the account owner, on the approval page." },
  { g: "once", k: "Reminder, once", t: "14 Oct · 09:12", b: "Exactly the text approved, and only once." },
  { g: "system", k: "Books changed", t: "22 Oct", b: "Receipt entered in TallyPrime." },
  { g: "signal", k: "Observed", t: "22 Oct · 07:40", b: "Picked up on the next sync." },
  { g: "verified", k: "On track", t: "22 Oct · 07:41", b: "Matched to INV-1042. The 30-day check stays open." },
];

export function VerificationRecord() {
  return (
    <InView className="v7">
      <ol className="v7-line">
        {STATIONS.map((s, i) => (
          <li key={s.k} className={i === 4 ? "v7-done" : ""} style={{ "--i": i } as React.CSSProperties}>
            <span className="v7-node"><Glyph name={s.g} /></span>
            <p className="v7-t">{s.t}</p>
            <p className="v7-k">{s.k}</p>
            <p className="v7-b">{s.b}</p>
          </li>
        ))}
      </ol>
      <div className="v7-dim" aria-hidden><span>8 days</span></div>
      <figure className="v7-macro">
        <div className="v7-macro-in">
          <p className="ui-kicker t-ok">Observed · on track · 22 Oct 07:41</p>
          <p className="v7-macro-fig num">₹6,00,000 <span>received</span></p>
          <dl>
            <div><dt>Against</dt><dd>INV-1042 · ₹24,000 left on it</dd></div>
            <div><dt>After</dt><dd>8 days from the approved reminder</dd></div>
            <div><dt>Still open</dt><dd className="num">₹12,42,000</dd></div>
          </dl>
        </div>
        <figcaption>Starlane records what followed. It does not claim the reminder caused it.</figcaption>
      </figure>
    </InView>
  );
}
