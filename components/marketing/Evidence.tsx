// Section 07 — trust, built around the real evidence-classification system
// already shipped in the product (see EVIDENCE_KIND in
// lib/domain/intelligence/supplyChainOrchestrator.js).
const ROWS = [
  { l: "Observed", d: "Read directly from a system-of-record row — a supplier's country, a stock count, an order line." },
  { l: "Calculated", d: "A deterministic function of observed facts — inventory coverage, revenue exposure, a stockout date." },
  { l: "External", d: "Sourced from a world event — a real, provenance-tracked record, never an invented headline." },
  { l: "Internal", d: "Sourced from your own recorded business data — an exposure, a relationship, a history." },
  { l: "Assumption", d: "An owner-entered planning parameter, like lead time — labeled as an assumption, permanently." },
  { l: "Forecast", d: "A projection assuming no intervention — clearly distinguished from anything already observed." },
];

export function Evidence() {
  return (
    <section id="trust" className="sl-section">
      <div className="sl-wrap">
        <div className="sl-evidence-heading">
          <div className="sl-rv">
            <span className="sl-eyebrow">Evidence</span>
            <h2 className="sl-h2" style={{ marginBottom: 0 }}>Every conclusion should have a reason.</h2>
          </div>
          <p className="sl-p sl-rv" style={{ alignSelf: "end" }}>
            Sources, calculations, assumptions, and forecasts are labeled so you can see what Starlane has observed,
            what it calculated, and what it's projecting.
          </p>
        </div>
        <div className="sl-rv2">
          {ROWS.map((r) => (
            <div key={r.l} className="sl-ev-row">
              <p className="sl-h3">{r.l}</p>
              <p className="sl-p">{r.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
