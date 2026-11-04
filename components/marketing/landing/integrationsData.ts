// What Starlane connects to, by category, with an honest status on every
// entry. "Live" works in the product today. "Planned" is on the roadmap (in
// the connector catalogue, or built but not switched on) and not usable yet.
// "Custom" is not in the catalogue and would be built for a pilot on the
// connector framework (API, webhook, database or file).
// Statuses mirror the backend registry (vantro-flow-backend
// lib/connectors/registry.js); update both together.

export type State = "live" | "planned" | "custom";
export type Item = { n: string; s: State; via?: string };
export type Category = { k: string; id: string; about: string; items: Item[] };

export const STATE_LABEL: Record<State, string> = { live: "Live", planned: "Planned", custom: "Custom" };

export const CATEGORIES: Category[] = [
  { k: "Accounting", id: "accounting", about: "Invoices, receipts, payments, credit terms and ledgers.", items: [
    { n: "TallyPrime", s: "live", via: "Local read-only bridge" },
    { n: "Accounting exports", s: "live", via: "CSV or XLSX file; QuickBooks, Xero and Zoho Books exports recognised" },
    { n: "QuickBooks Online", s: "planned", via: "Direct connection" },
    { n: "Xero", s: "planned", via: "Direct connection" },
    { n: "Zoho Books", s: "planned", via: "Direct connection" },
    { n: "Sage", s: "planned", via: "Direct connection" },
    { n: "FreshBooks", s: "planned", via: "Direct connection" },
    { n: "Wave", s: "planned", via: "Direct connection" },
  ] },
  { k: "ERP", id: "erp", about: "Orders, purchasing, inventory and finance in one system.", items: [
    { n: "SAP Business One", s: "planned", via: "Direct connection" },
    { n: "Odoo", s: "planned", via: "Direct connection" },
    { n: "NetSuite", s: "planned", via: "Direct connection" },
    { n: "Microsoft Dynamics 365 Business Central", s: "planned", via: "Direct connection" },
  ] },
  { k: "Banking", id: "banking", about: "Account movements and balances.", items: [
    { n: "Bank statement import", s: "live", via: "CSV or XLSX file" },
    { n: "Plaid (US and Canada bank feeds)", s: "planned", via: "Direct connection" },
    { n: "Open Banking (UK and EU)", s: "planned", via: "Direct connection" },
  ] },
  { k: "Spreadsheets and files", id: "spreadsheets", about: "Anything kept outside a system of record.", items: [
    { n: "CSV", s: "live", via: "File import" },
    { n: "Excel", s: "live", via: "File import" },
    { n: "Google Sheets", s: "live", via: "Export to CSV or XLSX" },
    { n: "Google Sheets, live sync", s: "planned", via: "Direct connection" },
    { n: "Excel on Microsoft 365", s: "planned", via: "Direct connection" },
    { n: "Airtable", s: "planned", via: "Direct connection" },
  ] },
  { k: "CRM", id: "crm", about: "Accounts, contacts and pipeline.", items: [
    { n: "Salesforce", s: "planned", via: "Direct connection" },
    { n: "HubSpot", s: "planned", via: "Direct connection" },
    { n: "Zoho CRM", s: "planned", via: "Direct connection" },
    { n: "Pipedrive", s: "planned", via: "Direct connection" },
  ] },
  { k: "Commerce", id: "commerce", about: "Online orders, customers and fulfilment.", items: [
    { n: "Shopify", s: "planned", via: "Direct connection" },
    { n: "WooCommerce", s: "planned", via: "Direct connection" },
    { n: "Amazon Seller Central", s: "planned", via: "Direct connection" },
  ] },
  { k: "Payments", id: "payments", about: "Card and online payment processors.", items: [
    { n: "Stripe", s: "planned", via: "Direct connection" },
    { n: "PayPal", s: "planned", via: "Direct connection" },
    { n: "Square", s: "planned", via: "Direct connection" },
    { n: "Razorpay", s: "planned", via: "Direct connection" },
    { n: "Other payment processors", s: "custom", via: "Connector framework" },
  ] },
  { k: "Inventory and logistics", id: "inventory", about: "Stock, cover and shipments.", items: [
    { n: "Stock from TallyPrime", s: "live", via: "Local read-only bridge" },
    { n: "Stock exports", s: "live", via: "CSV or XLSX file" },
    { n: "ShipStation", s: "planned", via: "Direct connection" },
  ] },
  { k: "Communication", id: "communication", about: "Where promises, disputes and approvals are written down.", items: [
    { n: "Gmail", s: "live", via: "Outbound email, once messaging is enabled" },
    { n: "WhatsApp Business", s: "planned", via: "Built; switched off until enabled" },
    { n: "Outlook", s: "planned", via: "Direct connection" },
    { n: "Slack", s: "planned", via: "Direct connection" },
    { n: "Microsoft Teams", s: "planned", via: "Direct connection" },
    { n: "Twilio SMS", s: "planned", via: "Direct connection" },
  ] },
  { k: "Support", id: "support", about: "Tickets and customer conversations.", items: [
    { n: "Zendesk", s: "planned", via: "Direct connection" },
    { n: "Intercom", s: "planned", via: "Direct connection" },
  ] },
  { k: "Payroll and HR", id: "payroll", about: "People costs that shape the cash calendar.", items: [
    { n: "Gusto", s: "planned", via: "Direct connection" },
    { n: "ADP", s: "planned", via: "Direct connection" },
  ] },
  { k: "Documents", id: "documents", about: "Contracts, notes and files the business keeps.", items: [
    { n: "Google Drive", s: "planned", via: "Direct connection" },
    { n: "Notion", s: "planned", via: "Direct connection" },
  ] },
  { k: "Databases and internal tools", id: "databases", about: "Your own systems and data stores.", items: [
    { n: "PostgreSQL", s: "custom", via: "Connector framework" },
    { n: "Internal APIs", s: "custom", via: "Connector framework" },
    { n: "Webhooks", s: "custom", via: "Connector framework" },
  ] },
  { k: "External signals", id: "world", about: "Public data matched to the parts of the business it touches.", items: [
    { n: "ECB exchange rates", s: "live", via: "Public feed" },
    { n: "USGS earthquakes", s: "live", via: "Public feed" },
    { n: "More public feeds", s: "planned", via: "Public feed" },
  ] },
];

export const TOTAL = CATEGORIES.reduce((n, c) => n + c.items.length, 0);

// The homepage groups the catalogue into seven rows a buyer recognises.
export const GROUPS: Array<{ k: string; ids: string[] }> = [
  { k: "Financial systems", ids: ["accounting", "banking"] },
  { k: "ERP", ids: ["erp"] },
  { k: "CRM", ids: ["crm"] },
  { k: "Commerce and payments", ids: ["commerce", "payments"] },
  { k: "Data and files", ids: ["spreadsheets", "inventory", "databases"] },
  { k: "Communication", ids: ["communication", "support"] },
  { k: "External signals", ids: ["world"] },
];

export function groupItems(ids: string[]) {
  return CATEGORIES.filter((c) => ids.includes(c.id)).flatMap((c) => c.items);
}
