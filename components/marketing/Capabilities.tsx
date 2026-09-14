// Section 09 — a restrained capability overview. Only capabilities that
// exist and are honestly represented by the shipped product.
const CAPS = [
  { l: "Business state", d: "A single, continuously reconciled view of what you're owed, what you owe, and what's at risk — never a stale snapshot." },
  { l: "External intelligence", d: "Real-world events matched against your verified exposures — never a generic news feed treated as relevant." },
  { l: "Causal reasoning", d: "Deterministic dependency traversal from an event to the exact suppliers, products, and orders it actually touches." },
  { l: "Forecasting", d: "Stated-horizon projections built on stated assumptions — 7, 14, and 30 days, not a single confident guess." },
  { l: "Evidence chains", d: "Every claim classified and traceable to its source — a table row, a record, or a named calculation." },
  { l: "Ranked interventions", d: "Candidate actions compared on real cost and benefit, not a generic recommendation." },
  { l: "Execution", d: "Approved actions create real records in the system of record, honestly labeled by what actually ran." },
  { l: "Outcome verification", d: "What was expected gets compared against what happened, closing the loop back into memory." },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="sl-section">
      <div className="sl-wrap">
        <span className="sl-eyebrow sl-rv">Capabilities</span>
        <h2 className="sl-h2 sl-rv" style={{ maxWidth: 640, marginBottom: 40 }}>From context to action.</h2>
        <div className="sl-rv2">
          {CAPS.map((c) => (
            <div key={c.l} className="sl-cap-row">
              <p className="sl-cap-label">{c.l}</p>
              <p className="sl-p">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
