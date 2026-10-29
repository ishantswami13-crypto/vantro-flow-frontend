// The approval step as an owner meets it: a drafted WhatsApp reminder that
// waits on the phone until a person approves, edits or skips it, with the log
// of what happened so far. Sample data on a fictional business.

const LOG = [
  ["07:42", "Change raised", "Second payment promise missed"],
  ["07:42", "Draft prepared", "Firm reminder, from your template"],
  ["—", "Waiting for you", "Nothing has been sent"],
];

export function ApprovalPhone() {
  return (
    <figure className="ap">
      <div className="ap-phone" aria-hidden>
        <div className="ap-head">
          <p className="ap-who"><b>Starlane</b><span>Approval needed · Gupta Traders</span></p>
        </div>
        <div className="ap-chat">
          <p className="ap-day">Today</p>
          <div className="ap-msg ap-in">
            <p className="ap-label">Draft reminder to Gupta Traders</p>
            <p>
              Namaste Guptaji, three invoices totalling ₹18,42,000 are now overdue, the oldest by 47 days. You had promised payment by
              Monday. Please confirm a date for the transfer today.
            </p>
            <p className="ap-src">Invoices 1042, 1051, 1066 · TallyPrime</p>
          </div>
          <div className="ap-choices">
            <span className="ap-btn ap-btn-go">Approve and send</span>
            <span className="ap-btn">Edit</span>
            <span className="ap-btn">Skip</span>
          </div>
        </div>
        <ol className="ap-log">
          {LOG.map(([t, k, v]) => (
            <li key={k}><span className="num">{t}</span><b>{k}</b><em>{v}</em></li>
          ))}
        </ol>
      </div>
      <figcaption className="ap-cap">
        Sample data · Fictional business. Outbound messaging is off until you enable it, and then each message waits for approval.
        <span className="sl-sr">
          A drafted WhatsApp reminder to Gupta Traders about ₹18,42,000 overdue, with Approve and send, Edit and Skip.
          The log shows the change raised and the draft prepared at 07:42, and that nothing has been sent while it waits for you.
        </span>
      </figcaption>
    </figure>
  );
}
