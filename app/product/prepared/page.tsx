import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Prepared" };

export default function PreparedPage() {
  return (
    <GuidePage
      eyebrow="Feature 7 of 7"
      title="Prepared"
      status="live"
      lede="What is coming in the next 24 hours, 7 days and 30 days, worked out ahead from the dates in your books."
    >
      <Section title="What it prepares">
        <Facts items={[
          ["Falling due", "Invoices whose due dates fall in the window, and how much."],
          ["About to slip", "Invoices that will pass 30 or 90 days overdue within a week."],
          ["Promises", "Payment promises coming due."],
          ["Missions ending", "And decisions waiting for you."],
        ]} />
      </Section>
      <Note>Each item says why it is there and which records it came from. If your invoices have no due dates, Prepared says it cannot see ahead rather than showing an empty “all clear”.</Note>
    </GuidePage>
  );
}
