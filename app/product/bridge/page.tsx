import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "The Bridge" };

export default function BridgePage() {
  return (
    <GuidePage
      eyebrow="Feature 1 of 7"
      title="The Bridge"
      status="live"
      lede="The first screen. From your company's own books: what you are owed, how much is overdue, what needs your decision, what Watch noticed, how your missions are going and what is coming — and how current all of it is."
    >
      <Section title="What you see">
        <Facts items={[
          ["The position", "Owed to you and overdue, by overdue band (not yet due, 1–7, 8–30, 31–90, over 90 days), and who owes the most."],
          ["Needs you", "Actions waiting for your decision, with where each one stands."],
          ["Watch", "The newest things Watch raised, most urgent first."],
          ["Missions", "Each running mission and how much of its target has come in."],
          ["Coming up", "The first thing due in the next 24 hours, 7 days and 30 days."],
          ["Freshness", "When your books last synced — up to date, hours behind, or more than a day behind."],
        ]} />
      </Section>
      <Note>If part of the picture cannot be computed, the Bridge says so. A company with no books connected sees how to connect them — never an example company.</Note>
    </GuidePage>
  );
}
