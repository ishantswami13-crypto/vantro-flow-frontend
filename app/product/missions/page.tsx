import type { Metadata } from "next";
import { GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Missions" };

export default function MissionsPage() {
  return (
    <GuidePage
      eyebrow="Feature 4 of 7"
      title="Missions"
      status="not_built"
      lede="A mission will turn a goal — “recover what Mehta Hardware owes”, “cut slow-moving stock by 15%” — into a piece of work Starlane tracks to done."
    >
      <Section title="What a mission is meant to be">
        <ul>
          <li>A goal you set, in your words.</li>
          <li>Progress worked out from your real records, not ticked by hand.</li>
          <li>The blockers standing in the way, and who is on it.</li>
        </ul>
      </Section>
      <Note>Missions is not built yet. It has a place in the sidebar, and the page there says honestly that there is nothing behind it today — no example missions, no invented progress.</Note>
    </GuidePage>
  );
}
