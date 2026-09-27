import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Owner briefing" };

export default function BriefingPage() {
  return (
    <GuidePage
      eyebrow="Every day"
      title="Owner briefing"
      status="live_limited"
      lede="A short, structured briefing written for the owner: where cash is stuck, which promises were broken, and which records are too incomplete to act on — every line traceable to the invoice, promise or customer it came from."
    >
      <Section title="Sections">
        <Facts items={[
          ["Cash & receivables", "Overdue invoices worth chasing now, with the amount, the customer and how late it is."],
          ["Broken promises", "Customers who promised to pay by a date and did not — the pattern that matters most in collections."],
          ["Data quality", "Missing phone numbers or contact details that would stop a follow-up from happening."],
        ]} />
      </Section>
      <Section title="How every item is built">
        <ul>
          <li><strong>Evidence first.</strong> Each item carries the IDs of the exact records it is based on; an item without evidence is not shown.</li>
          <li><strong>A suggested next step</strong> — and whether it needs your approval. Nothing in the briefing runs by itself.</li>
          <li><strong>Policy check.</strong> Each suggestion is checked against Starlane's policy guard before it reaches you.</li>
          <li><strong>Your company only.</strong> The briefing is computed per company and never mixes data between companies.</li>
        </ul>
      </Section>
      <Note>The briefing is read-only and is being switched on one company at a time. It is the first Starlane agent to run on real data; see Agents for the others.</Note>
    </GuidePage>
  );
}
