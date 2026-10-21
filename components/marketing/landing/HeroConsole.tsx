// Hero visual: the Today screen of Starlane, drawn as product UI on a
// fictional company (Halden Supply Co.). One morning, one scenario: four
// signals from across the business, then the one decision that needs a
// person, traced from signal to verification. Every figure is illustrative and
// the caption under the window says so. Laid out as real UI, not a scaled
// screenshot, so it stays readable at phone width.

const NAV = ["Today", "Scan", "Watch", "Missions", "Simulate", "Memory"];

const SIGNALS = [
  { k: "Receivables risk", t: "Brightwater Retail missed a second payment promise", v: "$184,200", tone: "risk" },
  { k: "Supplier exposure", t: "3 open supplier invoices are priced in EUR, which rose 2.1% against USD", v: "$37,000", tone: "warn" },
  { k: "Customer movement", t: "Lumen Health is ordering 31% below its 90-day pace", v: "−31%", tone: "" },
  { k: "Opportunity", t: "Northfield Labs reordered three times in six weeks, against once a quarter", v: "3×", tone: "" },
];

const PATH = [
  { k: "Signal", v: "Second missed promise, recorded 12 Oct" },
  { k: "Evidence", v: null },
  { k: "Decision", v: "Account-owner call, then a firm email" },
  { k: "Action", v: "Waiting for your approval" },
  { k: "Verification", v: "Checked on every sync until paid" },
];

export function HeroConsole() {
  return (
    <figure
      className="slc"
      role="img"
      aria-label="Illustration of the Starlane Today screen on a fictional company. Four signals: Brightwater Retail missed a second payment promise on $184,200; three supplier invoices are exposed to the euro; Lumen Health is ordering less; Northfield Labs is reordering more. One decision is waiting: escalate Brightwater Retail, with its evidence, a simulated range of 55 to 70 percent collected in 14 days, and approval pending."
    >
      <div className="slc-chrome" aria-hidden>
        <aside className="slc-rail">
          <p className="slc-brand"><span>S</span>Starlane</p>
          {NAV.map((n, i) => <p key={n} className={`slc-nav${i === 0 ? " on" : ""}`}>{n}</p>)}
        </aside>

        <div className="slc-main">
          <div className="slc-top">
            <p className="slc-search">Ask about the business…</p>
            <p className="slc-sync"><i />Systems current · synced 12 min ago</p>
          </div>

          <div className="slc-hello">
            <p className="slc-h">Good morning.</p>
            <p className="slc-h2">Here’s what matters today.</p>
          </div>

          <div className="slc-grid">
            <section className="slc-signals">
              <p className="slc-label">Signals <span>4</span></p>
              <ul>
                {SIGNALS.map((s) => (
                  <li key={s.k} className={s.k === "Receivables risk" ? "on" : ""}>
                    <span className={`slc-dot ${s.tone}`} />
                    <span className="slc-sig">
                      <b>{s.k}</b>
                      <em>{s.t}</em>
                    </span>
                    <span className="slc-v">{s.v}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="slc-decision">
              <p className="slc-label">Needs a decision</p>
              <p className="slc-dh">Escalate Brightwater Retail</p>
              <p className="slc-amt"><b>$184,200</b> open · 47 days overdue</p>
              <ol className="slc-path">
                {PATH.map((p, i) => (
                  <li key={p.k} className={i === 3 ? "now" : i < 3 ? "done" : ""}>
                    <span className="slc-pk">{p.k}</span>
                    {p.v ? <span className="slc-pv">{p.v}</span> : (
                      <span className="slc-pv slc-ev">
                        <span><i className="obs">Observed</i>3 open invoices</span>
                        <span><i className="calc">Calculated</i>47 days overdue</span>
                        <span><i className="asm">Assumed</i>Net 30 terms</span>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <p className="slc-sim"><i className="sim">Simulated</i>55–70% collected within 14 days</p>
              <div className="slc-btns"><span className="slc-btn">Approve</span><span className="slc-btn-g">Compare options</span></div>
            </section>
          </div>

          <p className="slc-foot"><span className="slc-dot ok" />Verified · $60,000 received from Harbor &amp; Pine, 8 days after an approved reminder</p>
        </div>
      </div>
    </figure>
  );
}
