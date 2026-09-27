import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "The Bridge" };

export default function BridgePage() {
  return (
    <GuidePage
      eyebrow="Every day"
      title="The Bridge"
      status="live"
      lede="The first screen after you sign in. It answers one question — what should I pay attention to right now? — from your company's real records, and nothing else."
    >
      <Section title="What you see">
        <Facts items={[
          ["Needs you", "Actions waiting for your decision, highest risk first. Each opens with its evidence."],
          ["What changed", "New recommendations, watches that fired, outside signals, results that were checked, and actions that finished or failed — since you last looked."],
          ["Receivables", "Open and overdue amounts and how many invoices are more than 30 days overdue, computed from your invoices."],
          ["What's working", "Each connected source with its health — healthy, delayed, error — and when it last synced successfully."],
        ]} />
      </Section>
      <Section title="On desktop and phone">
        <p>The same summary opens the desktop app (as <em>Now</em>) and the phone app (as <em>Today</em>), led by one sentence built only from real counts — for example, “Two decisions need you. Tally synced 5 min ago.”</p>
      </Section>
      <Note>If a part of the summary cannot be computed, the Bridge says so instead of filling the gap. An empty company shows an empty Bridge, never an example.</Note>
    </GuidePage>
  );
}
