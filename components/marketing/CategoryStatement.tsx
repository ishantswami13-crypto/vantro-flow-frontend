// Section D — one dark, quiet, typographic moment. Deliberately the
// page's only near-black section besides the final CTA: contrast (white →
// dark → white) is what makes the surrounding white space read as
// intentional rather than default, per the site's rhythm goal.
const LINES = [
  "Suppliers move.",
  "Markets change.",
  "Weather disrupts logistics.",
  "Customers delay payments.",
  "Inventory falls.",
  "Currencies shift.",
  "Demand changes.",
];

export function CategoryStatement() {
  return (
    <section className="sl-section sl-dark sl-section-monumental">
      <div className="sl-wrap sl-rv" style={{ textAlign: "center" }}>
        <h2 className="sl-h2" style={{ color: "var(--sl-bg)", maxWidth: 780, margin: "0 auto 40px" }}>
          Your business does not exist in isolation.
        </h2>
        <div className="sl-dark-lines">
          {LINES.map((l) => <p key={l}>{l}</p>)}
        </div>
        <p className="sl-sub" style={{ color: "rgba(250,250,249,0.62)", maxWidth: 560, margin: "40px auto 0" }}>
          Starlane connects these changes to the actual state of the business.
        </p>
      </div>
    </section>
  );
}
