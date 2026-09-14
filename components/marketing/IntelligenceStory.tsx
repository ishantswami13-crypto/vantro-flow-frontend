// Section 04 — ONE intelligence story, told as an editorial vertical
// narrative (not a node graph). Grounded in the real, verified 2xA demo
// causal chain — every step here actually exists in the shipped product.
const STEPS = [
  { kicker: "External event", title: "A disruption occurs", body: "A magnitude 7.0 earthquake strikes Sichuan, China — replayed from the historical 2017 record.", chip: "external" },
  { kicker: "Relevance", title: "Starlane identifies an exposed supplier", body: "One verified supplier — Sichuan Alloy Works — is located in the affected region. No other supplier is touched.", chip: "observed" },
  { kicker: "Dependency", title: "Supplier maps to component, to inventory", body: "The supplier provides one component. The seed data gives twenty days of coverage against current demand.", chip: "calculated" },
  { kicker: "Dependency", title: "Component maps to product, to open orders", body: "Two finished products depend on it. Three open orders are exposed as a direct result.", chip: "observed" },
  { kicker: "Quantification", title: "Orders resolve to revenue exposure", body: "₹35,50,000 across the affected orders — summed from the seeded order lines.", chip: "calculated" },
  { kicker: "Forecast", title: "Starlane projects the consequence", body: "At current demand, stock runs out in 12.5 days if nothing changes — a labeled projection, not a fact.", chip: "forecast" },
  { kicker: "Decision", title: "An intervention is ranked", body: "The demo ranks an expedited reorder by its projected benefit and cost.", chip: "calculated" },
  { kicker: "Action", title: "A human approves", hi: true, body: "Nothing executes without approval. Starlane proposes; a person decides.", chip: "assumption" },
  { kicker: "Outcome", title: "The result becomes evidence", body: "The demo creates a draft purchase order. Outcome verification awaits new observations.", chip: "internal" },
];

export function IntelligenceStory() {
  return (
    <section className="sl-section">
      <div className="sl-wrap">
        <span className="sl-eyebrow sl-rv">One event, followed all the way through</span>
        <h2 className="sl-h2 sl-rv" style={{ maxWidth: 640, marginBottom: 20 }}>One signal. A chain of consequences.</h2>
        <p className="sl-p sl-rv" style={{ maxWidth: 560, marginBottom: 64 }}>
          Follow the working 2xA demonstration: a historical earthquake, seeded supply-chain records,
          and a draft purchase order created through the demo adapter.
        </p>
        <div className="sl-story sl-rv2">
          {STEPS.map((s, i) => (
            <div key={s.title} className={`sl-story-step${s.hi ? " hi" : ""}`}>
              <span className="sl-story-dot">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <span className="sl-story-kicker">{s.kicker}</span>
                <p className="sl-story-title">{s.title}</p>
                <p className="sl-p" style={{ marginBottom: 0 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
