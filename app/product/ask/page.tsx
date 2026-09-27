import type { Metadata } from "next";
import { GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Ask Starlane" };

export default function AskPage() {
  return (
    <GuidePage
      eyebrow="Every day"
      title="Ask Starlane"
      status="live"
      lede="Ask in plain language — “who owes me the most?”, “who is more than 30 days late?”, “what does cash look like next month?” — and get an answer worked out from your own invoices, customers, suppliers, stock and forecast."
    >
      <Section title="What it looks things up in">
        <p>Invoices and overdue customers, a business summary, your cash forecast, inventory levels, suppliers, prospects and call history. It answers in rupees with Indian number grouping, and in the tone your company set.</p>
      </Section>
      <Section title="What it will not do">
        <ul>
          <li>It does not invent data. If none of your connected records can answer a question — a competitor's prices, say — it says so.</li>
          <li>In the desktop and phone apps it is read-only: it cannot mark anything paid, change a record, place an order or send a message. Changes go through Decisions.</li>
        </ul>
      </Section>
      <Note>In the web app it is called Scan; in the apps, Ask Starlane. Same engine, same records.</Note>
    </GuidePage>
  );
}
