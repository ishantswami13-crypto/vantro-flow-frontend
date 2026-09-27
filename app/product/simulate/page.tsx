import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Simulate" };

export default function SimulatePage() {
  return (
    <GuidePage
      eyebrow="Feature 5 of 7"
      title="Simulate"
      status="live"
      lede="What is likely to come in over the next weeks — and how that changes if customers pay better or worse than assumed."
    >
      <Section title="Every number says what it is">
        <Facts items={[
          ["Facts", "What your books say you are owed, by overdue band."],
          ["Assumptions", "The chance an invoice in each band gets paid in time. Change any of them."],
          ["Estimates", "Expected collection and a range, following from those assumptions."],
        ]} />
      </Section>
      <Section title="Where assumptions come from">
        <Facts items={[
          ["Your history", "Where your own paid invoices give enough history, their real payment rates."],
          ["Starting assumptions", "Otherwise Starlane’s starting values, marked as such — not learned from your business."],
          ["Missions", "Simulate a mission to see whether its target is likely, possible or unlikely."],
        ]} />
      </Section>
      <Note>A simulation never changes your books.</Note>
    </GuidePage>
  );
}
