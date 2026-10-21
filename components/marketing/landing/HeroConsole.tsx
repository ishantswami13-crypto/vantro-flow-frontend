// Hero visual: the shape of a Starlane morning, drawn as product UI on a
// fictional company (Halden Supply Co.). Left, what changed overnight across
// connected systems and outside signals; centre, the one decision that needs a
// person, with its evidence and simulated range; right, an earlier action
// verified against the books. Every figure is illustrative and the caption
// below the window says so. The real product appears further down the page.

const CHANGES = [
  { src: "Accounting", t: "Receivables over 30 days rose to $412,600", d: "+$96,300 since yesterday", tone: "warn" },
  { src: "World data", t: "EUR moved 2.1% against USD", d: "3 supplier invoices exposed · ECB", tone: "warn" },
  { src: "Inventory", t: "Stock cover for A-114 fell to 9 days", d: "2 open orders depend on it", tone: "bad" },
  { src: "Memory", t: "Brightwater Retail missed a second promised date", d: "Usually pays 11 days late", tone: "bad" },
];

export function HeroConsole() {
  return (
    <div className="slc" aria-hidden>
      <aside className="slc-nav">
        <p className="slc-brand">✦ Starlane</p>
        {["Today", "Scan", "Watch", "Missions", "Simulate", "Memory", "Prepared"].map((n, i) => (
          <p key={n} className={`slc-nav-i${i === 0 ? " on" : ""}`}>{n}{n === "Watch" && <b>4</b>}</p>
        ))}
        <p className="slc-nav-k">Sources</p>
        <p className="slc-src"><i />Accounting · synced 06:58</p>
        <p className="slc-src"><i />Bank statements · today</p>
        <p className="slc-src"><i />World data · live</p>
      </aside>

      <section className="slc-col">
        <p className="slc-k">What changed overnight</p>
        <ul className="slc-changes">
          {CHANGES.map((c) => (
            <li key={c.t} className={c.tone}>
              <span className="slc-chip">{c.src}</span>
              <p className="slc-t">{c.t}</p>
              <p className="slc-d">{c.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="slc-col slc-main">
        <p className="slc-k">Needs a decision <span>1 of 2</span></p>
        <div className="slc-decision">
          <p className="slc-dk"><i />Collections · high exposure</p>
          <p className="slc-dh">Escalate Brightwater Retail</p>
          <p className="slc-amt">$184,200 <span>open · 47 days overdue</span></p>
          <ol className="slc-opts">
            <li className="on"><b>1</b>Firm reminder from the account owner<em>best response on record</em></li>
            <li><b>2</b>Hold new orders over $20,000<em>credit rule</em></li>
            <li><b>3</b>Wait for promised date<em>2 missed already</em></li>
          </ol>
          <div className="slc-ev">
            <span><em className="obs">Observed</em>3 open invoices</span>
            <span><em className="calc">Calculated</em>47 days overdue</span>
            <span><em className="asm">Assumed</em>Net 30 terms</span>
          </div>
          <div className="slc-sim">
            <p>Simulated, next 30 days</p>
            <div className="slc-sim-bar"><span style={{ left: "38%", width: "40%" }} /><i style={{ left: "58%" }} /></div>
            <p className="slc-sim-r"><span>$96k</span><b>$121k likely</b><span>$141k</span></p>
          </div>
          <div className="slc-btns"><span className="slc-btn">Approve</span><span className="slc-btn-g">Simulate options</span><span className="slc-btn-g">Evidence</span></div>
        </div>
      </section>

      <section className="slc-col slc-side">
        <p className="slc-k">Verified</p>
        <div className="slc-ver">
          <p className="slc-dk ok"><i />Checked against the books</p>
          <p className="slc-t">$60,000 received from Harbor &amp; Pine</p>
          <p className="slc-d">8 days after the reminder you approved</p>
          <div className="slc-prog"><span style={{ width: "50%" }} /></div>
          <p className="slc-d">Mission: $60,000 of $120,000</p>
        </div>
        <div className="slc-ver">
          <p className="slc-dk"><i />Memory updated</p>
          <p className="slc-t">Harbor &amp; Pine responds to account-owner emails</p>
          <p className="slc-d">From 4 outcomes · confirm or correct</p>
        </div>
      </section>
    </div>
  );
}
