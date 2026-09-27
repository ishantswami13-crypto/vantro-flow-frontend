import type { Metadata } from "next";
import { Facts, GuidePage, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Prepared" };

export default function PreparedPage() {
  return (
    <GuidePage
      eyebrow="Feature 7 of 7"
      title="Prepared"
      status="live"
      lede="Work Starlane has lined up for you, in one place, so you can go through it when you have ten minutes."
    >
      <Section title="Three lists">
        <Facts items={[
          ["Needs you", "Actions waiting for your decision."],
          ["For you", "Watches that fired, opportunities found in your records, and forecast risks worth a look."],
          ["Completed", "Actions you approved."],
        ]} />
      </Section>
    </GuidePage>
  );
}
