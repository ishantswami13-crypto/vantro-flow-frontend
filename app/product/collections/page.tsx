import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Collections" };

export default function CollectionsPage() {
  return (
    <GuidePage
      eyebrow="Agents"
      title="Collections"
      status="live"
      lede="Who owes you, how late they are, and what to do next — staged by how overdue each invoice is, with the reminder drafted for you to approve."
    >
      <Section title="Stages, by days overdue">
        <Facts items={[
          ["1–7 days", "A polite reminder. Low risk."],
          ["8–30 days", "A firm reminder. Medium risk — needs your approval."],
          ["31 days and more", "Escalation, then a collection call. High risk — needs explicit confirmation."],
          ["90 days and more", "Flagged as possible bad debt, for your review."],
        ]} />
        <p>A customer's payment behaviour can move an invoice to a different stage; when it does, the action shows both the days-based stage and why it was adjusted.</p>
      </Section>
      <Section title="What you get for each invoice">
        <ul>
          <li>The amount, the customer and the days overdue — the facts the stage was chosen from.</li>
          <li>A drafted reminder for that stage, ready to approve or decline.</li>
          <li>After it runs, a check on whether the customer paid.</li>
        </ul>
      </Section>
      <Note>Starlane sends no WhatsApp message to a customer while outgoing messaging is switched off, and today it is off. Once it is on, reminders go out when you approve them; only a polite first reminder can go automatically, and only if automatic follow-ups are switched on as well. Invoices paused for a dispute are left out of collections.</Note>
    </GuidePage>
  );
}
