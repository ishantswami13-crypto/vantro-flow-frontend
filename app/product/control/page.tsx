import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Control & trust" };

export default function ControlPage() {
  return (
    <GuidePage
      eyebrow="Company"
      title="Control & trust"
      status="live"
      lede="What Starlane can see, what it is allowed to do, and a record of everything it did — in one place."
    >
      <Section title="Permission levels">
        <Facts items={[
          ["L1 Observe", "Read business data and surface findings. Granted."],
          ["L2 Prepare", "Draft actions and recommendations for review. Granted."],
          ["L3 Propose", "Put a specific action in front of you to decide on. Granted."],
          ["L4 Execute", "Carry out an action that changes business data. Always requires your approval."],
        ]} />
      </Section>
      <Section title="Safety built in">
        <ul>
          <li><strong>Policy guard</strong> checks every proposed action and holds anything it cannot clear.</li>
          <li><strong>Prompt guard</strong> screens what goes into and comes out of the AI. It is on by default and Starlane runs with it on.</li>
          <li><strong>Audit trail</strong> of every financial change and every decision, with before and after.</li>
          <li><strong>Company isolation.</strong> Every query is scoped to your company; tests check that one company cannot read or decide another's actions.</li>
          <li><strong>Sessions you can see.</strong> Settings lists every signed-in computer and phone; sign any of them out from anywhere.</li>
          <li><strong>Feature switches.</strong> Risky capabilities — outgoing messages, automatic follow-ups — are off until deliberately turned on.</li>
        </ul>
      </Section>
      <Note>Today each company has one owner account. Team members and roles are not built yet, so Control does not pretend to have them.</Note>
    </GuidePage>
  );
}
