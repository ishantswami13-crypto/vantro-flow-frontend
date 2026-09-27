import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Missions" };

export default function MissionsPage() {
  return (
    <GuidePage
      eyebrow="Feature 4 of 7"
      title="Missions"
      status="live"
      lede="A mission gives Starlane one objective with a deadline — “collect ₹1,20,000 from Mehta Hardware within 14 days” — and measures progress against your books, not against what was sent."
    >
      <Section title="How a mission works">
        <Facts items={[
          ["You set it", "Who, how much and by when. Starlane shows the likely outcome before you start."],
          ["It proposes", "One reminder per customer, drafted and checked by the policy guard. Nothing is sent without your approval."],
          ["It measures", "Progress is the money that actually came in on the mission’s invoices since it started, from your books."],
          ["It closes itself", "Completed when the target is reached; missed when the deadline passes first. The result is remembered."],
        ]} />
      </Section>
      <Section title="What keeps it safe">
        <Facts items={[
          ["Disputes", "Disputed invoices are always left out."],
          ["Escalation", "Reminders only, unless you allow calls and bad-debt review."],
          ["Pause", "Pausing a mission holds approval of its actions everywhere."],
          ["Blockers", "Shown plainly: waiting for you, no phone number, messaging switched off, books behind."],
        ]} />
      </Section>
      <Note>Collections is the first kind of mission. With message sending switched off, approving a reminder records it and you send the drafted message yourself.</Note>
    </GuidePage>
  );
}
