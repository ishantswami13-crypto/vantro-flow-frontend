// Tiny pictures for the problem statement: a dashboard that only looks back,
// a report that arrives late, and an automation firing at the wrong invoice.
// Decorative; the sentence under each one carries the meaning.

export function DashboardThumb() {
  const bars = [38, 52, 44, 61, 57, 70, 48];
  return (
    <div className="slp slp-dash" aria-hidden>
      <p className="slp-k">Sales, last month</p>
      <div className="slp-bars">{bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</div>
      <p className="slp-foot"><span>1 Sept</span><span>30 Sept</span></p>
    </div>
  );
}

export function ReportThumb() {
  return (
    <div className="slp slp-report" aria-hidden>
      <div className="slp-doc">
        <p className="slp-doc-h">Receivables report</p>
        <i /><i /><i className="s" /><i /><i className="s" />
      </div>
      <span className="slp-stamp">Arrived 18 days later</span>
    </div>
  );
}

export function RuleThumb() {
  return (
    <div className="slp slp-rule" aria-hidden>
      <p className="slp-node">Every 7 days</p>
      <span className="slp-arrow" />
      <p className="slp-node">Send reminder</p>
      <span className="slp-arrow" />
      <p className="slp-node slp-bad">To a disputed invoice</p>
    </div>
  );
}
