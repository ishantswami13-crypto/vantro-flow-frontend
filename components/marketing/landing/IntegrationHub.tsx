// What Starlane connects to, by category, with an honest status on every
// entry. "Live" means it works in the product today; "Planned" means it is on the
// roadmap (the connector catalog, or built but not switched on) and not usable; "Custom" means it is not in the
// catalog and would be built for a pilot on the connector framework (API,
// webhook, database or file). Statuses mirror the backend registry
// (vantro-flow-backend lib/connectors/registry.js); update both together.

type State = "live" | "planned" | "custom";
type Item = { n: string; s: State; note?: string };

const CATEGORIES: Array<{ k: string; items: Item[] }> = [
  { k: "Accounting", items: [
    { n: "TallyPrime", s: "live", note: "local bridge, read-only" },
    { n: "QuickBooks, Xero, Zoho Books exports", s: "live", note: "CSV / Excel" },
    { n: "QuickBooks Online", s: "planned" }, { n: "Xero", s: "planned" }, { n: "Zoho Books", s: "planned" },
  ] },
  { k: "ERP", items: [
    { n: "SAP Business One", s: "planned" }, { n: "Odoo", s: "planned" },
    { n: "NetSuite", s: "custom" }, { n: "Microsoft Dynamics", s: "custom" }, { n: "SAP", s: "custom" },
  ] },
  { k: "Banking", items: [
    { n: "Bank statement import", s: "live", note: "CSV" },
    { n: "Live bank feeds", s: "planned" },
  ] },
  { k: "Spreadsheets", items: [
    { n: "CSV", s: "live" }, { n: "Excel", s: "live" }, { n: "Google Sheets", s: "live", note: "as an export" },
  ] },
  { k: "CRM", items: [{ n: "Salesforce", s: "planned" }, { n: "HubSpot", s: "planned" }, { n: "Zoho CRM", s: "planned" }] },
  { k: "Commerce", items: [{ n: "Shopify", s: "planned" }, { n: "WooCommerce", s: "planned" }] },
  { k: "Payments", items: [{ n: "Stripe", s: "custom" }, { n: "Payment processors", s: "custom" }] },
  { k: "Inventory", items: [
    { n: "Stock from TallyPrime", s: "live" }, { n: "Stock exports", s: "live", note: "CSV / Excel" },
    { n: "Logistics and shipping", s: "planned" },
  ] },
  { k: "Communication", items: [
    { n: "Gmail", s: "live", note: "approved messages only, off by default" },
    { n: "WhatsApp Business", s: "planned", note: "built, not switched on yet" },
    { n: "Outlook", s: "planned" }, { n: "Slack", s: "custom" }, { n: "Microsoft Teams", s: "custom" },
  ] },
  { k: "Support", items: [{ n: "Support desks", s: "planned" }] },
  { k: "Databases and internal tools", items: [
    { n: "PostgreSQL", s: "custom" }, { n: "Internal APIs", s: "custom" }, { n: "Webhooks", s: "custom" },
  ] },
  { k: "World data", items: [
    { n: "ECB exchange rates", s: "live" }, { n: "USGS earthquakes", s: "live" }, { n: "More public feeds", s: "planned" },
  ] },
];

const LABEL: Record<State, string> = { live: "Live", planned: "Planned", custom: "Custom" };

export function IntegrationHub() {
  return (
    <div className="sli">
      <ul className="sli-legend" aria-label="What each status means">
        <li><i className="live" /><b>Live</b>works in the product today</li>
        <li><i className="planned" /><b>Planned</b>on the roadmap, not available yet</li>
        <li><i className="custom" /><b>Custom</b>built for your pilot on Starlane’s connector framework</li>
      </ul>
      <ul className="sli-grid">
        {CATEGORIES.map((c) => (
          <li key={c.k} className="sli-cat" data-reveal>
            <p className="sli-k">{c.k}<span>{c.items.filter((i) => i.s === "live").length > 0 ? "Live today" : ""}</span></p>
            <ul className="sli-items">
              {c.items.map((i) => (
                <li key={i.n} className={`sli-item ${i.s}`}>
                  <span className="sli-n">{i.n}{i.note && <em>{i.note}</em>}</span>
                  <span className={`sli-s ${i.s}`}>{LABEL[i.s]}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
