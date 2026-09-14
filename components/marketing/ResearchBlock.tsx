// Section L — intellectual weight, without a deceptive CTA to a research
// hub that doesn't exist yet. Plain editorial text only.
const TOPICS = ["Evidence classification", "Temporal business state", "Forecast calibration", "World events", "Verified outcomes", "Decision systems"];

export function ResearchBlock() {
  return (
    <section className="sl-section">
      <div className="sl-wrap" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56 }}>
        <div className="sl-rv">
          <span className="sl-eyebrow">How we think</span>
          <h2 className="sl-h2" style={{ marginBottom: 0 }}>Business intelligence, treated as an engineering discipline.</h2>
        </div>
        <div className="sl-rv2">
          <p className="sl-p" style={{ marginBottom: 24 }}>
            Starlane's approach is built around a small number of hard questions: how to classify evidence honestly,
            how to represent a business's state as it actually changes over time, how to calibrate a forecast instead
            of just stating one, and how to verify whether a decision was right after the fact.
          </p>
          <div className="sl-topic-list">
            {TOPICS.map((t) => <span key={t} className="sl-chip-light">{t}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}
