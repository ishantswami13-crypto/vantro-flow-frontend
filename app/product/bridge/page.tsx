import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "The Bridge" };

export default function BridgePage() {
  return (
    <GuidePage
      eyebrow="Feature 1 of 7"
      title="The Bridge"
      status="live"
      lede="The first screen after you sign in. It answers one question — what should I pay attention to right now? — from your company's real records, and nothing else."
    >
      <Section title="What you see">
        <Facts items={[
          ["Needs you", "Actions waiting for your decision, highest risk first."],
          ["What changed", "What moved since you last looked: watches that fired, new signals, results of earlier decisions."],
          ["Where your data stands", "Each connected source and when it last synced successfully, so you know how current the picture is."],
        ]} />
      </Section>
      <Section title="Deciding from the Bridge">
        <Facts items={[
          ["If you approve", "The exact message or change, frozen when it was proposed — what you approve is what runs."],
          ["Why", "The facts behind it, each labelled: observed from your records, calculated from them, or an assumption."],
          ["Risk", "High-risk approvals need a second, explicit confirmation."],
          ["Once", "An action can be decided once; approving on two devices at the same time cannot run it twice."],
        ]} />
      </Section>
      <Note>If part of the picture cannot be computed, the Bridge says so instead of filling the gap. An empty company shows an empty Bridge, never an example.</Note>
    </GuidePage>
  );
}
