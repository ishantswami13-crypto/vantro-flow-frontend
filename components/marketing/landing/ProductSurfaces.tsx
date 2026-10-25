// Product surfaces for the public site, drawn as Starlane's own UI on a
// fictional company (Halden Supply Co.). Every figure is illustrative and each
// surface is captioned as such where it is used. They are laid out as real
// interface (tables, labels, states), not scaled screenshots, so they reflow
// and stay legible at phone width.
//
// TodaySurface: the morning view. What changed across connected systems,
// with exposure and source, and the one decision waiting for a person.
// DecisionSurface: that decision opened. Evidence with provenance, options
// compared as simulated ranges, the frozen action, approval and verification.

type Tone = "risk" | "warn" | "info" | "ok" | "none";

const CHANGES: Array<{ tone: Tone; what: string; who: string; amt: string; src: string }> = [
  { tone: "risk", what: "Second payment promise missed", who: "Brightwater Retail", amt: "$184,200", src: "Ledger · Email" },
  { tone: "warn", what: "EUR up 2.1% against USD on 3 open invoices", who: "Meridian Components", amt: "$37,000", src: "ECB · Payables" },
  { tone: "warn", what: "Stock cover below 12 days on 2 items", who: "Open orders", amt: "$58,300", src: "Stock · Orders" },
  { tone: "info", what: "Orders 31% below 90-day pace", who: "Lumen Health Group", amt: "−$22,400", src: "Sales ledger" },
  { tone: "none", what: "Reordered 3 times in 6 weeks", who: "Northfield Labs", amt: "+$48,000", src: "Sales ledger" },
];

const TONE_LABEL: Record<Tone, string> = { risk: "Risk", warn: "Warning", info: "Change", ok: "Verified", none: "Change" };

export function TodaySurface() {
  return (
    <figure className="sp sp-light" aria-labelledby="sp-today-cap">
      <div className="sp-bar">
        <p className="sp-title">Today <span>Tue 14 Oct</span></p>
        <p className="sp-status"><i className="st-dot ok" aria-hidden />4 systems current · synced 07:42</p>
      </div>

      <dl className="sp-kpis">
        <div><dt>Open receivables</dt><dd>$1,426,900</dd></div>
        <div><dt>Over 30 days</dt><dd>$412,600 <em className="up">up $96,300</em></dd></div>
        <div><dt>Cash in, 30 days</dt><dd>$340k–$470k</dd><i className="sp-tag estimate">Estimate</i></div>
      </dl>

      <div className="sp-sec">
        <p className="sp-h">Material changes since yesterday <span>5</span></p>
        <table className="sp-table">
          <thead><tr><th scope="col">Change</th><th scope="col">Exposure</th><th scope="col" className="sp-hide-s">Source</th></tr></thead>
          <tbody>
            {CHANGES.map((c) => (
              <tr key={c.what}>
                <td>
                  <span className={`st-dot ${c.tone}`} aria-hidden /><span className="sl-sr">{TONE_LABEL[c.tone]}: </span>
                  <span className="sp-what">{c.what}</span>
                  <span className="sp-who">{c.who}</span>
                </td>
                <td className="sp-num">{c.amt}</td>
                <td className="sp-src sp-hide-s">{c.src}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sp-next">
        <div>
          <p className="sp-h">Needs a decision</p>
          <p className="sp-next-t">Escalate Brightwater Retail</p>
          <p className="sp-next-d">Recommended: account-owner call, then a firm email · awaiting approval</p>
        </div>
        <span className="sp-btn">Review</span>
      </div>
      <figcaption id="sp-today-cap" className="sl-sr">Illustration of the Starlane Today view on a fictional company.</figcaption>
    </figure>
  );
}

const EVIDENCE: Array<{ f: string; v: string; b: "Fact" | "Calculated" | "Assumption"; s: string }> = [
  { f: "Open invoices INV-1043, 1051, 1066", v: "$184,200", b: "Fact", s: "Ledger, synced 07:42" },
  { f: "Oldest invoice overdue", v: "47 days", b: "Calculated", s: "Due date and today" },
  { f: "Payment promises recorded", v: "2 missed", b: "Fact", s: "Email, 28 Sep and 10 Oct" },
  { f: "Payment terms", v: "Net 30", b: "Assumption", s: "No terms on record" },
  { f: "Paid within 10 days of a firm reminder", v: "3 of 4", b: "Calculated", s: "12 months of history" },
];

const OPTIONS = [
  { o: "Account-owner call, then a firm email", r: "55–70%", rec: true },
  { o: "Firm email only", r: "35–50%", rec: false },
  { o: "Wait for a third promise", r: "10–20%", rec: false },
];

export function DecisionSurface() {
  return (
    <figure className="sp sp-dark" aria-labelledby="sp-dec-cap">
      <div className="sp-bar">
        <p className="sp-crumb">Decisions <span aria-hidden>/</span> Brightwater Retail</p>
        <p className="sp-state"><i className="st-dot warn" aria-hidden />Awaiting approval</p>
      </div>

      <div className="sp-dec">
        <div className="sp-dec-main">
          <h3 className="sp-dec-h">Escalate Brightwater Retail</h3>
          <p className="sp-dec-meta"><b>$184,200</b> open · 3 invoices · 47 days overdue · 2 promises missed</p>

          <div className="sp-sec">
            <p className="sp-h">Evidence</p>
            <table className="sp-table sp-ev">
              <thead><tr><th scope="col">Fact</th><th scope="col">Value</th><th scope="col">Basis</th><th scope="col" className="sp-hide-s">Source</th></tr></thead>
              <tbody>
                {EVIDENCE.map((e) => (
                  <tr key={e.f}>
                    <td>{e.f}</td>
                    <td className="sp-num">{e.v}</td>
                    <td><i className={`sp-tag ${e.b.toLowerCase()}`}>{e.b}</i></td>
                    <td className="sp-src sp-hide-s">{e.s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sp-sec">
            <p className="sp-h">Options <i className="sp-tag estimate">Estimate</i></p>
            <table className="sp-table sp-opt">
              <thead><tr><th scope="col">Option</th><th scope="col">Collected within 14 days</th></tr></thead>
              <tbody>
                {OPTIONS.map((o, i) => (
                  <tr key={o.o} className={o.rec ? "rec" : ""}>
                    <td><span className="sp-rank">{i + 1}</span>{o.o}{o.rec && <span className="sp-rec">Recommended</span>}</td>
                    <td className="sp-num">{o.r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sp-note">Ranked by your collection rules and this customer’s recorded response to past reminders.</p>
          </div>
        </div>

        <div className="sp-dec-side">
          <div className="sp-block">
            <p className="sp-h">Proposed action</p>
            <dl className="sp-kv">
              <div><dt>Channel</dt><dd>Email, from the account owner</dd></div>
              <div><dt>To</dt><dd>accounts@brightwater.example</dd></div>
            </dl>
            <p className="sp-msg">“Following our call today, three invoices totalling $184,200 remain unpaid, the oldest 47 days past due. Please confirm a payment date by Friday.”</p>
            <p className="sp-note">Proposed 07:44. The text you approve is the text sent.</p>
          </div>

          <div className="sp-block">
            <p className="sp-h">Approval</p>
            <p className="sp-who-line">Waiting for the account owner</p>
            <div className="sp-btns"><span className="sp-btn">Approve</span><span className="sp-btn-g">Reject</span></div>
            <p className="sp-note">Runs once after approval.</p>
          </div>

          <div className="sp-block">
            <p className="sp-h">Verification</p>
            <ol className="sp-steps">
              <li className="done"><span>Proposed</span><em>07:44</em></li>
              <li className="now"><span>Approval</span><em>waiting</em></li>
              <li><span>Sent</span><em>—</em></li>
              <li><span>Payment checked against the books</span><em>after sending</em></li>
            </ol>
          </div>
        </div>
      </div>
      <figcaption id="sp-dec-cap" className="sl-sr">Illustration of a Starlane decision on a fictional company: evidence, simulated options, the proposed action, approval and verification.</figcaption>
    </figure>
  );
}
