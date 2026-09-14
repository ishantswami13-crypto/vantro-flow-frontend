// Section J — real outcomes, without inventing vanity statistics. Grounded
// in the actual, shipped mechanism: predictions carry a point estimate and
// horizon, resolvePrediction() compares that against a real observed value,
// and the difference is stored — see
// lib/domain/intelligence/outcomeVerification.js. No customer metrics exist
// yet to report, so the section shows the measurement discipline itself
// rather than fabricating a number to fill the space.
const STEPS = [
  { l: "Predicted", d: "A stockout date, a revenue exposure, a horizon — recorded before the outcome is known." },
  { l: "Observed", d: "Real, current data: inventory levels, order status — read again once the horizon passes." },
  { l: "Compared", d: "The difference between what was predicted and what actually happened, calculated, not estimated." },
  { l: "Verified", d: "The action is marked effective or ineffective only once — never claimed early." },
];

export function OutcomeMeasurement() {
  return (
    <section className="sl-section" style={{ background: "var(--sl-bg-raised)" }}>
      <div className="sl-wrap sl-rv" style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <span className="sl-eyebrow">On the record</span>
        <h2 className="sl-h2" style={{ marginBottom: 20 }}>Starlane measures whether its decisions were right.</h2>
        <p className="sl-sub" style={{ marginBottom: 56 }}>
          We don't publish invented benchmarks. Every prediction Starlane makes is checked against what actually
          happened — that discipline is the product, not a statistic about it.
        </p>
      </div>
      <div className="sl-wrap sl-rv2 sl-measure-row">
        {STEPS.map((s) => (
          <div key={s.l} className="sl-measure-step">
            <p className="sl-h3">{s.l}</p>
            <p className="sl-p">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
