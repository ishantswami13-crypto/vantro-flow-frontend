// "From approval to paid": the loop drawn as three objects in a row — the
// approver's phone, the customer's inbox with the email that went out from the
// account owner's own mailbox, and the payment arriving in the accounting
// system, checked by Starlane. Fictional company (Halden Supply Co.); the
// section caption says it is an illustration and that sending is off by default.

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
              <p className="sla-app-kicker"><i className="warn" />Firm reminder · email</p>
              <p className="sla-app-name">Harbor &amp; Pine</p>
              <p className="sla-app-amt sl-num">$120,000</p>
              <p className="sla-app-meta">INV-1101 · 38 days overdue</p>
              <div className="sla-app-msg">
                Hi Dana, invoice INV-1101 for $120,000 is now 38 days past due. Could you confirm a payment date this week?
                <span>Sam Reyes, Halden Supply Co.</span>
              </div>
              <p className="sla-app-why">Why now: usually pays 9 days late; replies fastest to the account owner.</p>
              <div className="sla-app-btns"><span className="sla-btn">Approve and send</span><span className="sla-btn-ghost">Edit</span></div>
            </div>
            <div className="sla-app-card sla-app-dim">
              <p className="sla-app-kicker"><i className="warn" />Polite reminder · email</p>
              <p className="sla-app-name">Kessler Industrial</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sla-link"><span /><em>runs once</em></div>

      {/* 2 — the customer receives it */}
      <div className="sla-col">
        <p className="sla-step"><b>2</b>It goes out from your own mailbox</p>
        <div className="sla-phone">
          <div className="sla-notch" />
          <div className="sla-screen sla-wa sla-mail">
            <p className="sla-wa-top"><span className="sla-wa-av">SR</span><span><b>Sam Reyes</b><em>to Dana Ito · Harbor &amp; Pine</em></span></p>
            <div className="sla-wa-body">
              <p className="sla-mail-subj">INV-1101 · payment date</p>
              <div className="sla-wa-bubble sla-wa-old">Invoice INV-1101 for $120,000 is due on 12 Sept. Thank you!<span>12 Sept</span></div>
              <div className="sla-wa-bubble sla-wa-new">
                Hi Dana, invoice INV-1101 for $120,000 is now 38 days past due. Could you confirm a payment date this week?
                <span>08:05 · sent once</span>
              </div>
            </div>
            <p className="sla-wa-input">Reply</p>
          </div>
        </div>
      </div>

      <div className="sla-link"><span /><em>next sync</em></div>

      {/* 3 — the books confirm it */}
      <div className="sla-col">
        <p className="sla-step"><b>3</b>The books confirm what happened</p>
        <div className="sla-ledger">
          <p className="sla-ledger-top"><span>Accounting system</span><em>Payment received</em></p>
          <dl className="sla-ledger-rows">
            <div><dt>Date</dt><dd className="sl-num">11:40</dd></div>
            <div><dt>Party</dt><dd>Harbor &amp; Pine</dd></div>
            <div><dt>Against</dt><dd className="sl-num">INV-1101</dd></div>
            <div className="sla-ledger-amt"><dt>Amount</dt><dd className="sl-num">$60,000</dd></div>
          </dl>
          <div className="sla-check">
            <p className="sla-check-k"><i className="ok" />Checked against the books</p>
            <p className="sla-check-t">Partly paid after the firm reminder</p>
            <div className="sla-check-bar"><span /></div>
            <p className="sla-check-s sl-num">Mission: $60,000 of $120,000</p>
            <p className="sla-check-s">Memory updated: Harbor &amp; Pine responds to the account owner.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
