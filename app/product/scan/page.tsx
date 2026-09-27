import type { Metadata } from "next";
import { GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Scan" };

export default function ScanPage() {
  return (
    <GuidePage
      eyebrow="Feature 2 of 7"
      title="Scan"
      status="live"
      lede="Ask in plain words — “who owes me the most?”, “who is more than 30 days late?”, “what does cash look like next month?” — and get an answer worked out from your own invoices, customers, suppliers, stock and forecast."
    >
      <Section title="What it looks things up in">
        <p>Invoices and overdue customers, a business summary, your cash forecast, inventory levels, suppliers, prospects and call history. It answers in rupees with Indian number grouping.</p>
      </Section>
      <Section title="What it will not do">
        <ul>
          <li>It does not invent data. If your records cannot answer a question — a competitor's prices, say — it says so.</li>
          <li>It cannot change your records: no marking invoices paid, no edits, no orders.</li>
          <li>It can draft a WhatsApp reminder for you to send yourself; it never sends anything.</li>
        </ul>
      </Section>
      <Note>In the desktop and phone apps the same feature is read-only — it looks things up and does not draft messages.</Note>
    </GuidePage>
  );
}
