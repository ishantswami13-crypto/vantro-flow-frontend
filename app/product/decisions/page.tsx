import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Decisions & approvals" };

export default function DecisionsPage() {
  return (
    <GuidePage
      eyebrow="Every day"
      title="Decisions & approvals"
      status="live"
      lede="Starlane proposes; you decide. Every proposed action shows exactly what will happen if you approve it, the facts behind it, and how risky it is."
    >
      <Section title="What an action shows you">
        <Facts items={[
          ["If you approve", "The exact message or change, frozen when it was proposed — what you approve is what runs."],
          ["Why", "The facts behind it, each labelled: observed (from your records), calculated (worked out from them), or an assumption."],
          ["Rule", "Which rule produced it — for collections, the days-overdue band that chose the stage."],
          ["Risk", "Low, medium or high. High-risk approvals need a second, explicit confirmation — and on the phone, Face ID, fingerprint or your passcode."],
          ["Result check", "After it runs, Starlane records what it expected and checks what actually happened."],
        ]} />
      </Section>
      <Section title="Guarantees">
        <ul>
          <li>An action can be decided once. If you approve on your phone and your computer at the same time, exactly one wins and the other is told.</li>
          <li>The server refuses a high-risk approval that was not explicitly confirmed, whatever the app sends.</li>
          <li>Approving and declining are both written to the audit trail.</li>
          <li>Approval links sent by email or message only open a confirmation page; opening a link never approves anything.</li>
        </ul>
      </Section>
      <Note>Agents propose; they do not act on their own. Firm reminders, escalations and anything high-risk always wait for your approval. The one thing that can ever run by itself is a polite first payment reminder — and only when automatic follow-ups and outgoing WhatsApp messages are both switched on. Today both are off.</Note>
    </GuidePage>
  );
}
