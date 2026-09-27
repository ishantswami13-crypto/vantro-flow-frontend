import type { Metadata } from "next";
import { Facts, GuidePage, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Memory & Prepared" };

export default function MemoryPage() {
  return (
    <GuidePage
      eyebrow="Intelligence"
      title="Memory & Prepared"
      status="live"
      lede="Memory is your company's history as Starlane recorded it; Prepared is what Starlane has lined up for you to look at next."
    >
      <Section title="Memory">
        <p>A timeline built from the audit trail: every change to your financial records and every decision on an action, with what it was before and after, and when. It is the same trail Control shows, arranged as a story per customer, invoice or action.</p>
      </Section>
      <Section title="Prepared">
        <Facts items={[
          ["Needs you", "Actions waiting for your decision."],
          ["For you", "Watches that fired, opportunities Starlane found, and forecast risks worth a look."],
          ["Completed", "Actions you approved."],
        ]} />
      </Section>
    </GuidePage>
  );
}
