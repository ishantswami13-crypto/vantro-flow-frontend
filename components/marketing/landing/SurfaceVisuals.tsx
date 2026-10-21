// Small, still illustrations of each product surface for the landing bento.
// Every figure and name is from the same fictional demo company the product
// screenshot and the Scan demo use; the section caption says so.

export function BridgeViz() {
  const bands = [
    { l: "Not yet due", v: 182000 },
    { l: "1–7 days", v: 52000 },
    { l: "8–30 days", v: 129000 },
    { l: "31–90 days", v: 174500 },
    { l: "Over 90 days", v: 23500 },
  ];
  return (
    <div className="slv slv-bridge" aria-hidden>
      <p className="slv-kicker">Today</p>
      <p className="slv-big">You are owed <span className="sl-num">₹5,61,000</span>.<br /><span className="sl-num">₹3,79,000</span> of it is overdue.</p>
      <div className="slv-stack">
        {bands.map((b, i) => <span key={b.l} style={{ flexBasis: `${(b.v / 561000) * 100}%` }} className={`slv-seg slv-seg-${i}`} />)}
      </div>
      <ul className="slv-legend">
        {bands.map((b, i) => <li key={b.l}><i className={`slv-seg-${i}`} />{b.l}<span className="sl-num">₹{b.v.toLocaleString("en-IN")}</span></li>)}
      </ul>
      <div className="slv-approve">
        <span className="slv-pill">2 reminders waiting for approval</span>
        <span className="slv-btnlike">Review</span>
      </div>
    </div>
  );
}

export function WatchViz() {
  const items = [
    { t: "Joshi Tiles · S/152 is more than 90 days overdue", s: "Raised", c: "warn" },
    { t: "Mehta Hardware · S/101 is more than 30 days overdue", s: "Raised", c: "warn" },
    { t: "TallyPrime sync failed at 09:12", s: "Closed", c: "ok" },
  ];
  return (
    <ul className="slv slv-list" aria-hidden>
      {items.map((i) => (
        <li key={i.t}><span className={`slv-dot ${i.c}`} /><span className="slv-li-t">{i.t}</span><span className={`slv-state ${i.c}`}>{i.s}</span></li>
      ))}
    </ul>
  );
}

export function MissionsViz() {
  return (
    <div className="slv" aria-hidden>
      <p className="slv-mission">Collect ₹1.2 lakh from Mehta Hardware</p>
      <div className="slv-progress"><span style={{ width: "33%" }} /></div>
      <p className="slv-meta"><span className="sl-num">₹40,000</span> of <span className="sl-num">₹1,20,000</span> · 14 days left</p>
      <ol className="slv-steps">
        <li className="done">Polite reminder, approved and sent</li>
        <li className="done">Firm reminder, approved and sent</li>
        <li>Owner call, proposed for day 10</li>
      </ol>
    </div>
  );
}

export function SimulateViz() {
  // Likely collections over 8 weeks, with the range around it.
  const mid = [8, 18, 30, 41, 50, 57, 62, 66];
  const lo = [6, 13, 22, 31, 38, 44, 48, 51];
  const hi = [10, 23, 38, 51, 61, 69, 75, 80];
  const x = (i: number) => 8 + i * (284 / 7);
  const y = (v: number) => 120 - v * 1.35;
  const line = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const band = `${line(hi)} ${lo.map((v, i) => `L${x(7 - i).toFixed(1)} ${y(lo[7 - i]).toFixed(1)}`).join(" ")} Z`;
  return (
    <div className="slv" aria-hidden>
      <svg viewBox="0 0 300 128" className="slv-chart" preserveAspectRatio="none">
        {[0, 1, 2, 3].map((g) => <line key={g} x1="0" x2="300" y1={12 + g * 34} y2={12 + g * 34} className="slv-grid" />)}
        <path d={band} className="slv-band" />
        <path d={line(mid)} className="slv-line" />
        <circle cx={x(7)} cy={y(66)} r="3.5" className="slv-end" />
      </svg>
      <div className="slv-assume">
        <span>Assumes</span><span className="slv-chip">Mehta Hardware pays in 30 days</span><span className="slv-chip">No new sales</span>
      </div>
    </div>
  );
}

export function MemoryViz() {
  const rows = [
    { n: "Mehta Hardware", p: "LLOLLLOLLLLO", note: "pays about 9 days late" },
    { n: "Bansal Paints", p: "OOOOLOOOOOOO", note: "pays on time" },
    { n: "Sharma Builders", p: "LLLLPLLLPLLL", note: "pays in parts after a firm reminder" },
  ];
  return (
    <ul className="slv slv-memory" aria-hidden>
      {rows.map((r) => (
        <li key={r.n}>
          <span className="slv-mem-n">{r.n}</span>
          <span className="slv-mem-dots">{r.p.split("").map((c, i) => <i key={i} className={c === "O" ? "on" : c === "P" ? "part" : "late"} />)}</span>
          <span className="slv-mem-note">{r.note}</span>
        </li>
      ))}
    </ul>
  );
}

export function PreparedViz() {
  const cols = [
    { h: "Next 24 hours", n: 2, d: "reminders to approve" },
    { h: "Next 7 days", n: 5, d: "invoices falling due" },
    { h: "Next 30 days", n: "₹2.1L", d: "likely to come in" },
  ];
  return (
    <div className="slv slv-prepared" aria-hidden>
      {cols.map((c) => (
        <div key={c.h}><p className="slv-kicker">{c.h}</p><p className="slv-prep-n sl-num">{c.n}</p><p className="slv-meta">{c.d}</p></div>
      ))}
    </div>
  );
}
