// "From approval to paid": the loop drawn as three objects in a row — the
// owner's phone with the approval, the customer's WhatsApp with the reminder
// that went out, and the receipt arriving in the books, checked by Starlane.
// Same fictional demo company and figures as the rest of the page; the section
// caption says it is an illustration and that sending is off by default.

export function ApproveLoop() {
  return (
    <div className="sla" aria-hidden>
      {/* 1 — owner approves */}
      <div className="sla-col">
        <p className="sla-step"><b>1</b>You approve, word for word</p>
        <div className="sla-phone">
          <div className="sla-notch" />
          <div className="sla-screen sla-app">
            <p className="sla-app-top"><span>Starlane</span><span className="sla-app-k">Needs you · 2</span></p>
            <div className="sla-app-card">
              <p className="sla-app-kicker"><i className="warn" />Firm reminder · WhatsApp</p>
              <p className="sla-app-name">Mehta Hardware</p>
              <p className="sla-app-amt sl-num">₹1,28,500</p>
              <p className="sla-app-meta">S/101 · 45 days overdue</p>
              <div className="sla-app-msg">
                Hello Mr Mehta, invoice S/101 for ₹1,28,500 is now 45 days past due. Could you confirm a payment date this week?
                <span>Arora Hardware Traders</span>
              </div>
              <p className="sla-app-why">Why now: paid 9 days late on average; firm reminders worked twice before.</p>
              <div className="sla-app-btns"><span className="sla-btn">Approve and send</span><span className="sla-btn-ghost">Edit</span></div>
            </div>
            <div className="sla-app-card sla-app-dim">
              <p className="sla-app-kicker"><i className="warn" />Polite reminder · WhatsApp</p>
              <p className="sla-app-name">Sharma Builders</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sla-link"><span /><em>runs once</em></div>

      {/* 2 — the customer receives it */}
      <div className="sla-col">
        <p className="sla-step"><b>2</b>It reaches them on WhatsApp</p>
        <div className="sla-phone">
          <div className="sla-notch" />
          <div className="sla-screen sla-wa">
            <p className="sla-wa-top"><span className="sla-wa-av">AH</span><span><b>Arora Hardware Traders</b><em>business account</em></span></p>
            <div className="sla-wa-body">
              <p className="sla-wa-day">Today</p>
              <div className="sla-wa-bubble sla-wa-old">Invoice S/101 for ₹1,28,500 is due on 3 Sept. Thank you!<span>3 Sept</span></div>
              <div className="sla-wa-bubble sla-wa-new">
                Hello Mr Mehta, invoice S/101 for ₹1,28,500 is now 45 days past due. Could you confirm a payment date this week?
                <span>08:05 ✓✓</span>
              </div>
            </div>
            <p className="sla-wa-input">Message</p>
          </div>
        </div>
      </div>

      <div className="sla-link"><span /><em>next sync</em></div>

      {/* 3 — the books confirm it */}
      <div className="sla-col">
        <p className="sla-step"><b>3</b>Your books confirm what happened</p>
        <div className="sla-ledger">
          <p className="sla-ledger-top"><span>Your books</span><em>Receipt</em></p>
          <dl className="sla-ledger-rows">
            <div><dt>Date</dt><dd className="sl-num">11:40</dd></div>
            <div><dt>Party</dt><dd>Mehta Hardware</dd></div>
            <div><dt>Against</dt><dd className="sl-num">S/101</dd></div>
            <div className="sla-ledger-amt"><dt>Amount</dt><dd className="sl-num">₹40,000</dd></div>
          </dl>
          <div className="sla-check">
            <p className="sla-check-k"><i className="ok" />Checked against your books</p>
            <p className="sla-check-t">Partly paid after the firm reminder</p>
            <div className="sla-check-bar"><span /></div>
            <p className="sla-check-s sl-num">Mission: ₹40,000 of ₹1,20,000</p>
            <p className="sla-check-s">Memory updated: a firm reminder moved Mehta Hardware this time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
