// Section 08 — From intelligence to action, as one continuous sentence
// rather than six colorful cards. Human approval stays visible and explicit.
// Uses the same .sl-rv2 stagger-reveal mechanism as every other section
// (driven by the single IntersectionObserver in app/page.tsx) rather than
// a bespoke one, for consistency and reliability.
const STEPS = ["Detect", "Understand", "Forecast", "Decide", "Act", "Verify"];

export function SystemFlow() {
  return (
    <section className="sl-section">
      <div className="sl-wrap">
        <span className="sl-eyebrow sl-rv">From intelligence to action</span>
        <h2 className="sl-h2 sl-rv" style={{ maxWidth: 640, marginBottom: 20 }}>From a signal to a decision.</h2>
        <p className="sl-p sl-rv" style={{ maxWidth: 560, marginBottom: 56 }}>
          Each stage informs the next. A person reviews the decision before an action runs.
        </p>
        <div className="sl-flow sl-rv2">
          {STEPS.map((s, i) => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center" }}>
              <span className="sl-flow-step hi">{s}</span>
              {i < STEPS.length - 1 && <span className="sl-flow-sep">→</span>}
            </span>
          ))}
        </div>
        <p className="sl-p sl-rv" style={{ marginTop: 32, maxWidth: 480 }}>
          <strong style={{ color: "var(--sl-ink)" }}>Decide</strong> is where Starlane stops and waits. Every action
          carries an explicit state — proposed, approved, executed, verified — and nothing moves past "proposed"
          without a person choosing to move it.
        </p>
      </div>
    </section>
  );
}
