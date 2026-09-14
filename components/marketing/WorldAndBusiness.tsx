// Section — World / Business context, as a two-column editorial spread
// with a single dividing rule. Previously a central circular "node" with
// two lines that animated in on scroll (a network-diagram cliché) — no
// informational content justified the animation, so it's gone. Uses the
// page's standard sl-rv2 stagger-reveal, same as every other section,
// rather than a bespoke IntersectionObserver.
const WORLD = ["Events & geography", "Trade & logistics", "Markets & FX", "Supplier conditions"];
const BUSINESS = ["Orders & inventory", "Customers & cash", "Suppliers", "Operations"];

export function WorldAndBusiness() {
  return (
    <section id="world-business" className="sl-section">
      <div className="sl-wrap">
        <span className="sl-eyebrow sl-rv">World ↔ Business</span>
        <h2 className="sl-h2 sl-rv" style={{ maxWidth: 640, marginBottom: 48 }}>Your business, in context.</h2>
        <div className="sl-context sl-rv2">
          <div className="sl-context-col">
            <h3 className="sl-story-kicker">World signals</h3>
            <ul>{WORLD.map(w => <li key={w} className="sl-context-item">{w}</li>)}</ul>
          </div>
          <div className="sl-context-col">
            <h3 className="sl-story-kicker">Business state</h3>
            <ul>{BUSINESS.map(b => <li key={b} className="sl-context-item">{b}</li>)}</ul>
          </div>
        </div>
        <p className="sl-p sl-rv" style={{ marginTop: 32, maxWidth: 480 }}>Connected context. Decisions with evidence.</p>
      </div>
    </section>
  );
}
