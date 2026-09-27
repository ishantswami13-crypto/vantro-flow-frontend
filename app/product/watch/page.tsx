import type { Metadata } from "next";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Watch" };

export default function WatchPage() {
  return (
    <GuidePage
      eyebrow="Feature 3 of 7"
      title="Watch"
      status="live"
      lede="Tell Starlane what should never slip past you — overdue receivables above a limit, too many invoices past 30 days — and it checks the condition every 15 minutes against your real numbers."
    >
      <Section title="A watch is">
        <Facts items={[
          ["A metric", "One of Starlane's supported business measures, computed from your records."],
          ["A condition", "Greater than, at least, less than, at most, or equal to a value you choose."],
          ["A severity", "Low, medium, high or critical — it decides how loudly a trigger is shown."],
          ["A history", "When it was last checked and when it last fired. Pause, resume or delete it at any time."],
        ]} />
      </Section>
      <Section title="When a watch fires">
        <p>It appears on the Bridge and in Prepared, with the value that crossed the line.</p>
      </Section>
      
    </GuidePage>
  );
}
