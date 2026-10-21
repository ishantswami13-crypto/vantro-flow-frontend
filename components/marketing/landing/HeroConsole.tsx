// Hero visual: the Today screen of Starlane drawn as product UI on a
// fictional company (Halden Supply Co.). A search bar to ask anything, what
// matters today across receivables, suppliers, customers and cash, then the
// one decision that needs a person and an earlier action verified against the
// books. Every figure is illustrative and the caption under the window says
// so; the real product appears further down the page.

const NAV: Array<[string, React.ReactNode, string?]> = [
  ["Today", <path key="i" d="M4 11l8-6 8 6v8H4zM10 19v-5h4v5" />],
  ["Scan", <path key="i" d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4M8 12h8" />],
  ["Watch", <><circle key="a" cx="12" cy="12" r="7.5" /><circle key="b" cx="12" cy="12" r="2.5" /></>, "4"],
  ["Missions", <path key="i" d="M6 20V4M6 5h11l-2.5 4L17 13H6" />],
  ["Simulate", <path key="i" d="M4 18c3-8 5-11 8-6s5 2 8-6M4 20h16" />],
  ["Integrations", <path key="i" d="M9 4v4M15 4v4M7 8h10v3a5 5 0 0 1-10 0zM12 16v4" />],
];

const BARS_A = [14, 18, 22, 30, 38, 52, 64];
const BARS_C = [20, 16, 28, 34, 30, 46, 58];

const CARDS = [
  { k: "Receivables", t: "Receivables over 30 days rose to $412,600", d: "+$96,300 since yesterday", chart: "bars-a" },
  { k: "Supply chain", t: "3 supplier invoices exposed to the EUR move", d: "EUR up 2.1% against USD · ECB", chart: "line-a" },
  { k: "Customers", t: "2 customers broke a payment promise", d: "$184,200 at risk", chart: "bars-c" },
  { k: "Cash", t: "$410k likely to come in over 30 days", d: "Simulated range $340k to $470k", chart: "line-b" },
];

function Chart({ kind }: { kind: string }) {
  if (kind.startsWith("bars")) {
    const b = kind === "bars-a" ? BARS_A : BARS_C;
    return (
      <svg viewBox="0 0 140 44" className="slc-chart" aria-hidden>
        {b.map((h, i) => <rect key={i} x={i * 20} y={44 - h * 0.62} width="13" height={h * 0.62} rx="1.5" className={i === b.length - 1 ? "hi" : ""} />)}
      </svg>
    );
  }
  const d = kind === "line-a"
    ? "M0 36 L14 33 L28 35 L42 30 L56 31 L70 26 L84 27 L98 22 L112 23 L126 16 L140 14"
    : "M0 38 L14 36 L28 37 L42 32 L56 30 L70 31 L84 24 L98 21 L112 18 L126 12 L140 8";
  return (
    <svg viewBox="0 0 140 44" className="slc-chart" aria-hidden>
      <path d={`${d} L140 44 L0 44 Z`} className="area" />
      <path d={d} className="line" />
    </svg>
  );
}

export function HeroConsole() {
  return (
    <div className="slc" aria-hidden>
      <aside className="slc-nav">
        <p className="slc-brand"><span>S</span>Starlane</p>
        {NAV.map(([n, ic, badge], i) => (
          <p key={n} className={`slc-nav-i${i === 0 ? " on" : ""}`}>
            <svg viewBox="0 0 24 24" width="15" height="15">{ic}</svg>{n}{badge && <b>{badge}</b>}
          </p>
        ))}
        <span className="slc-nav-rule" />
        <p className="slc-nav-i">
          <svg viewBox="0 0 24 24" width="15" height="15"><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>Settings
        </p>
      </aside>

      <div className="slc-body">
        <div className="slc-top">
          <p className="slc-ask">
            <svg viewBox="0 0 24 24" width="15" height="15"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
            Ask Starlane anything…
          </p>
          <p className="slc-range">Last 30 days <span>⌄</span></p>
          <p className="slc-av">H</p>
        </div>

        <div className="slc-panel">
          <div className="slc-hello">
            <div>
              <p className="slc-h">Good morning.</p>
              <p className="slc-h2">Here’s what matters today.</p>
            </div>
            <p className="slc-sync"><i />Systems up to date<span>Last synced 12 min ago</span></p>
          </div>
          <ul className="slc-cards">
            {CARDS.map((c) => (
              <li key={c.k} className="slc-card">
                <p className="slc-card-k">{c.k}</p>
                <p className="slc-card-t">{c.t}</p>
                <p className="slc-card-d">{c.d}</p>
                <div className="slc-card-f"><Chart kind={c.chart} /><span className="slc-go">→</span></div>
              </li>
            ))}
          </ul>

          <div className="slc-row">
            <div className="slc-decision">
              <p className="slc-dk"><i />Needs a decision · collections</p>
              <p className="slc-dh">Escalate Brightwater Retail</p>
              <p className="slc-amt">$184,200 <span>open · 47 days overdue · 2 promises missed</span></p>
              <div className="slc-ev">
                <span><em className="obs">Observed</em>3 open invoices</span>
                <span><em className="calc">Calculated</em>47 days overdue</span>
                <span><em className="asm">Assumed</em>Net 30 terms</span>
              </div>
              <div className="slc-btns"><span className="slc-btn">Approve</span><span className="slc-btn-g">Simulate options</span><span className="slc-btn-g">Evidence</span></div>
            </div>
            <div className="slc-ver">
              <p className="slc-dk ok"><i />Verified against the books</p>
              <p className="slc-vt">$60,000 received from Harbor &amp; Pine</p>
              <p className="slc-vd">8 days after the reminder you approved</p>
              <div className="slc-prog"><span style={{ width: "50%" }} /></div>
              <p className="slc-vd">Mission: $60,000 of $120,000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
