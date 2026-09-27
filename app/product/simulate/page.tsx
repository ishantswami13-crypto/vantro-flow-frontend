import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Simulate" };

export default function SimulatePage() {
  return (
    <GuidePage
      eyebrow="Intelligence"
      title="Simulate"
      status="live"
      lede="Pick one of your open invoices and ask: what if this were paid 15 days earlier — or not at all? Starlane projects overdue cash both ways and shows the difference."
    >
      <Section title="How it works">
        <Facts items={[
          ["Baseline", "Your real overdue position, projected from how your customers actually pay."],
          ["Scenario", "The same projection with one change: the chosen invoice paid earlier, or never."],
          ["Comparison", "Overdue cash today versus the scenario, and whether it improves or worsens — with the uncertainty stated."],
        ]} />
      </Section>
      <Note>A simulation never changes your real numbers. If there is not enough payment history to project cash for your company yet, Simulate says so rather than showing a guess.</Note>
    </GuidePage>
  );
}
