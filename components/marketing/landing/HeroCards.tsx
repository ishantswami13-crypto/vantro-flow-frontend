// Glass cards that float over the hero screenshot: the three moments the
// product is built around — a decision waiting for a person, a problem raised,
// and an outcome checked against the books. Same fictional demo company and
// figures as the screenshot underneath. Decorative: the screenshot's alt text
// and the page copy already say all of this.

export function HeroCards() {
  return (
    <div className="slh-cards" aria-hidden>
      <div className="slh-card slh-card-a">
        <p className="slh-card-k"><i className="warn" />Needs you</p>
        <p className="slh-card-t">Firm reminder to Mehta Hardware</p>
        <p className="slh-card-s"><span className="sl-num">₹1,28,500</span> · 45 days overdue · WhatsApp</p>
        <div className="slh-card-row"><span className="slh-card-btn">Approve</span><span className="slh-card-ghost">Read message</span></div>
      </div>
      <div className="slh-card slh-card-b">
        <p className="slh-card-k"><i className="bad" />Watch</p>
        <p className="slh-card-t">Joshi Tiles · S/152 is past 90 days</p>
        <p className="slh-card-s">Raised once. Closes when it’s paid.</p>
      </div>
      <div className="slh-card slh-card-c">
        <p className="slh-card-k"><i className="ok" />Checked against your books</p>
        <p className="slh-card-t"><span className="sl-num">₹40,000</span> received from Mehta Hardware</p>
        <p className="slh-card-s">Mission progress: ₹40,000 of ₹1,20,000</p>
      </div>
    </div>
  );
}
