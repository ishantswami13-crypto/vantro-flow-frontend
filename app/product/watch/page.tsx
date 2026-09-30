import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Watch" };

export default function WatchPage() {
  return (
    <GuidePage
      eyebrow="Feature 3 of 7"
      title="Watch"
      status="live"
      lede="Starlane watches your books for what should not slip past you and raises each thing once, with the evidence — then closes it itself when it stops being true."
    >
      <Section title="What Watch notices">
        <Facts items={[
          ["Invoices slipping", "An invoice becoming overdue, passing 7, 30 and 90 days — one event per step, not a daily repeat."],
          ["Missed promises", "A customer’s promised payment date passing with the promise still open."],
          ["Sync problems", "A failed sync, or books that have not synced for a day."],
          ["Your own conditions", "Limits you set, checked every 15 minutes."],
        ]} />
      </Section>
      <Section title="What happens next">
        <Facts items={[
          ["Evidence", "Why it was raised: the invoice, its due date, days overdue, where it came from."],
          ["States", "Open, seen, resolved by Starlane (paid, moved on, sync recovered) or dismissed by you."],
          ["Your phone", "Urgent events reach your phone once. A first sync of an older business sends one summary, not a burst."],
          ["From here", "Scan why it is happening, or start a mission to collect."],
        ]} />
      </Section>
      <Note>Push notifications carry no customer names or amounts — those stay in the app.</Note>
    </GuidePage>
  );
}
