import type { Metadata } from "next";
import { Cards, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Sources" };

// Mirrors the backend connector registry (vantro-flow-backend lib/connectors/registry.js).
export default function SourcesPage() {
  return (
    <GuidePage
      eyebrow="Company"
      title="Sources"
      lede="Starlane is only as good as the records it reads. Sources lists every system it can connect to, whether it works today, and — for each connected one — its health and last successful sync."
    >
      <Section title="Available today">
        <Cards items={[
          { title: "TallyPrime", status: "live", body: "Read-only, from the computer that runs Tally: sales and purchase vouchers, receipts, payments and stock items. Connect it with Starlane for Windows, or with the small command-line bridge on any computer with Node.js." },
          { title: "Spreadsheet or CSV", status: "live", body: "Upload an export of invoices from any system. The same file is never imported twice." },
          { title: "Exchange rates (ECB)", status: "live", body: "Public reference rates, used by Discover to spot currency moves that affect you." },
          { title: "Earthquakes (USGS)", status: "live", body: "Public event feed, used by Discover to spot events that could disrupt your supply chain." },
        ]} />
      </Section>
      <Section title="Not available yet">
        <Cards items={[
          { title: "QuickBooks Online", status: "roadmap", body: "Accounting." },
          { title: "Zoho Books", status: "roadmap", body: "Accounting." },
          { title: "Xero", status: "roadmap", body: "Accounting." },
          { title: "Bank account feeds", status: "roadmap", body: "Banking." },
          { title: "CRM", status: "roadmap", body: "HubSpot, Zoho CRM, Salesforce." },
          { title: "E-commerce", status: "roadmap", body: "Shopify, WooCommerce." },
          { title: "ERP", status: "roadmap", body: "SAP Business One, Odoo." },
          { title: "Logistics and support desks", status: "roadmap", body: "Shipping and customer support." },
        ]} />
      </Section>
      <Section title="How a Tally connection stays honest">
        <ul>
          <li>Each computer is paired with its own revocable credential — your password never leaves Starlane.</li>
          <li>Every sync is recorded, succeeded or failed with the reason, so the health you see is measured, not assumed: healthy, delayed after two hours without a good sync, or error.</li>
          <li>Disconnect a computer from Starlane or from the computer itself; it stops immediately.</li>
        </ul>
      </Section>
      <Note>Starlane never writes to Tally.</Note>
    </GuidePage>
  );
}
