import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <GuidePage
      eyebrow="Intelligence"
      title="Discover"
      status="live"
      lede="Things happening outside your company that could reach it, and opportunities hiding in your own records — each with the chain of evidence that connects it to you."
    >
      <Section title="Two kinds of discovery">
        <Facts items={[
          ["Signals", "Outside events — exchange-rate moves (European Central Bank reference rates) and earthquakes (USGS) today — matched to what they could touch in your business, with an explanation of why it matters and how confident Starlane is."],
          ["Opportunities", "Found in your own data: for example, demand rising for goods from a supplier who has been reliable. Each shows the steps of reasoning and the evidence for each step."],
        ]} />
      </Section>
      <Note>Starlane only calls something an opportunity when every step of its reasoning is backed by your records. With too little history, it says “insufficient data” instead of guessing.</Note>
    </GuidePage>
  );
}
