import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Memory" };

export default function MemoryPage() {
  return (
    <GuidePage
      eyebrow="Feature 6 of 7"
      title="Memory"
      status="live"
      lede="What Starlane has learned about how your business runs — each thing with where it came from, and your say on whether it is right."
    >
      <Section title="What it remembers">
        <Facts items={[
          ["Payment timing", "How late each customer usually pays, from at least three of their paid invoices."],
          ["Mission results", "Whether each mission reached its target, and by how much."],
          ["What you tell it", "Notes you write, like “call the accountant, not the owner”."],
        ]} />
      </Section>
      <Section title="Your say">
        <Facts items={[
          ["Confirm", "Mark something as right."],
          ["Correct", "Replace it with your own words; Starlane keeps what it had said."],
          ["Forget", "Remove it; it is never inferred again."],
          ["Freshness", "Flags what has not been rechecked in 30 days, or where your books changed after you confirmed it."],
        ]} />
      </Section>
      <Note>Every change and every decision is also kept in the audit log, with before, after and when.</Note>
    </GuidePage>
  );
}
