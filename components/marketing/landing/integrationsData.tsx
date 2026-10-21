// Integration catalogue data, shared by the homepage summary (a server
// component) and the interactive catalogue on /integrations.

// What Starlane connects to, by category, with an honest status on every
// entry. "Live" means it works in the product today; "Planned" means it is on
// the roadmap (the connector catalog, or built but not switched on) and not
// usable yet; "Custom" means it is not in the catalog and would be built for a
// pilot on the connector framework (API, webhook, database or file).
// Statuses mirror the backend registry (vantro-flow-backend
// lib/connectors/registry.js); update both together.

export type State = "live" | "planned" | "custom";
export type Item = { n: string; s: State; mark?: string; glyph?: string };
export type Category = { k: string; id: string; icon: React.ReactNode; items: Item[] };

export const G = {
  doc: <path d="M6 3h9l4 4v14H6zM15 3v4h4M9 11h7M9 15h7M9 18h4" />,
  db: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></>,
  bank: <path d="M3 9l9-5 9 5M5 9v9M10 9v9M14 9v9M19 9v9M3 20h18" />,
  grid: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16M4 15h16M10 4v16" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.2a3 3 0 0 1 0 5.6M18 14.5c1.8.8 3 2.7 3 5" /></>,
  cart: <><path d="M3 4h2.5l2 11h10l2-8H7" /><circle cx="9.5" cy="19" r="1.4" /><circle cx="16.5" cy="19" r="1.4" /></>,
  card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  box: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5L12 12l8-4.5M12 12v9" /></>,
  chat: <path d="M5 5h14v10H10l-4 4v-4H5z" />,
  headset: <><path d="M5 14v-2a7 7 0 0 1 14 0v2" /><rect x="3.5" y="13" width="4" height="6" rx="1.5" /><rect x="16.5" y="13" width="4" height="6" rx="1.5" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.8 2.5 2.8 14.5 0 17M12 3.5c-2.8 2.5-2.8 14.5 0 17" /></>,
  file: <path d="M7 3h7l4 4v14H7zM14 3v4h4" />,
  link: <path d="M10 14l4-4M8.5 11.5l-2 2a3 3 0 0 0 4.2 4.2l2-2M15.5 12.5l2-2a3 3 0 0 0-4.2-4.2l-2 2" />,
  plug: <path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5" />,
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />,
  quake: <path d="M3 12h4l2-5 3 10 2-7 2 4h5" />,
  truck: <><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.5" /><circle cx="17" cy="18" r="1.5" /></>,
  stock: <><path d="M4 4h16v16H4z" /><path d="M4 9h16M9 9v11" /></>,
  fx: <path d="M4 8h12l-3-3M20 16H8l3 3" />,
};

export const CATEGORIES: Category[] = [
  { k: "Accounting", id: "accounting", icon: G.doc, items: [
    { n: "TallyPrime", s: "live", mark: "tally" },
    { n: "Accounting exports", s: "live", glyph: "file" },
    { n: "QuickBooks Online", s: "planned", mark: "quickbooks" },
    { n: "Xero", s: "planned", mark: "xero" },
    { n: "Zoho Books", s: "planned", mark: "zoho" },
  ] },
  { k: "ERP", id: "erp", icon: G.db, items: [
    { n: "SAP Business One", s: "planned", mark: "sap" },
    { n: "Odoo", s: "planned", mark: "odoo" },
    { n: "NetSuite", s: "custom", mark: "netsuite" },
    { n: "Microsoft Dynamics", s: "custom", mark: "dynamics" },
  ] },
  { k: "Banking", id: "banking", icon: G.bank, items: [
    { n: "Bank statement import", s: "live", glyph: "bank" },
    { n: "Live bank feeds", s: "planned", glyph: "link" },
    { n: "Open Banking (PSD2)", s: "custom", glyph: "shield" },
  ] },
  { k: "Spreadsheets", id: "spreadsheets", icon: G.grid, items: [
    { n: "CSV", s: "live", glyph: "grid" },
    { n: "Excel", s: "live", mark: "excel" },
    { n: "Google Sheets", s: "live", mark: "googlesheets" },
  ] },
  { k: "CRM", id: "crm", icon: G.people, items: [
    { n: "Salesforce", s: "planned", mark: "salesforce" },
    { n: "HubSpot", s: "planned", mark: "hubspot" },
    { n: "Zoho CRM", s: "planned", mark: "zoho" },
  ] },
  { k: "Commerce", id: "commerce", icon: G.cart, items: [
    { n: "Shopify", s: "planned", mark: "shopify" },
    { n: "WooCommerce", s: "planned", mark: "woocommerce" },
  ] },
  { k: "Payments", id: "payments", icon: G.card, items: [
    { n: "Stripe", s: "custom", mark: "stripe" },
    { n: "Payment processors", s: "custom", glyph: "card" },
  ] },
  { k: "Inventory", id: "inventory", icon: G.box, items: [
    { n: "Stock from TallyPrime", s: "live", glyph: "stock" },
    { n: "Stock exports", s: "live", glyph: "file" },
    { n: "Logistics and shipping", s: "planned", glyph: "truck" },
  ] },
  { k: "Communication", id: "communication", icon: G.chat, items: [
    { n: "Gmail", s: "live", mark: "gmail" },
    { n: "WhatsApp Business", s: "planned", mark: "whatsapp" },
    { n: "Outlook", s: "planned", mark: "outlook" },
    { n: "Slack", s: "custom", mark: "slack" },
    { n: "Microsoft Teams", s: "custom", mark: "teams" },
  ] },
  { k: "Support", id: "support", icon: G.headset, items: [
    { n: "Support desks", s: "planned", glyph: "headset" },
  ] },
  { k: "Databases & Internal Tools", id: "databases", icon: G.db, items: [
    { n: "PostgreSQL", s: "custom", mark: "postgresql" },
    { n: "Internal APIs", s: "custom", glyph: "plug" },
    { n: "Webhooks", s: "custom", glyph: "link" },
  ] },
  { k: "World Data", id: "world", icon: G.globe, items: [
    { n: "ECB exchange rates", s: "live", glyph: "fx" },
    { n: "USGS earthquakes", s: "live", glyph: "quake" },
    { n: "More public feeds", s: "planned", glyph: "globe" },
  ] },
];
