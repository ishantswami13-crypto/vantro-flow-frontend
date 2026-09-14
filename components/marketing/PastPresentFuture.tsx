// Section 05 — Past / Present / Future, as one connected timeline rather
// than three equally-weighted SaaS cards.
const COLS = [
  { tag: "Past", cls: "", title: "What happened", body: "Every meaningful state change is persisted, not overwritten. Starlane can answer what your business looked like, and why it changed." },
  { tag: "Present", cls: "", title: "What matters now", body: "One current, continuously reconciled state — exposures, anomalies, and priorities — with no fabricated summary standing in for missing data." },
  { tag: "Future", cls: "future", title: "What happens next", body: "Deterministic forecasts at stated horizons, built on stated assumptions — never a single unexplained number pretending to be certain." },
];

export function PastPresentFuture() {
  return (
    <section className="sl-section">
      <div className="sl-wrap">
        <span className="sl-eyebrow sl-rv">Time, held together</span>
        <h2 className="sl-h2 sl-rv" style={{ maxWidth: 700, marginBottom: 48 }}>Your organization's past, present, and future — in one system.</h2>
        <div className="sl-tri sl-rv2">
          {COLS.map((c) => (
            <div key={c.tag} className={`sl-tri-col ${c.cls}`}>
              <span className="sl-tri-tag">{c.tag}</span>
              <p className="sl-tri-title">{c.title}</p>
              <p className="sl-p">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
