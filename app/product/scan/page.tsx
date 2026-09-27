import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Scan" };

export default function ScanPage() {
  return (
    <GuidePage
      eyebrow="Feature 2 of 7"
      title="Scan"
      status="live"
      lede="Look into any customer or invoice and see why it matters — or ask in plain words. Every answer comes from your own records."
    >
      <Section title="Look into something">
        <Facts items={[
          ["A customer", "What they owe, how much is overdue, how they usually pay, any disputes, whether a phone number is on file, and what is already being done."],
          ["An invoice", "Its amount, dates, days overdue, reminders sent and where it came from — each figure labelled as a fact from your books or a calculation from them."],
          ["Next step", "The collections stage that fits, and a one-tap start of a mission to collect."],
        ]} />
      </Section>
      <Section title="Ask">
        <Facts items={[
          ["In words", "“Who owes me the most?”, “who is more than 30 days late?” — answered from invoices, customers, suppliers, stock and your cash forecast."],
          ["Read-only", "Scan cannot change anything: no marking paid, no edits, no orders. It says so when your records cannot answer."],
        ]} />
      </Section>
      <Note>On the web, Scan can also draft a WhatsApp reminder for you to send yourself. It never sends anything.</Note>
    </GuidePage>
  );
}
