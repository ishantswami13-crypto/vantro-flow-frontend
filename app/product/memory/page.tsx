import type { Metadata } from "next";
import { GuidePage, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Memory" };

export default function MemoryPage() {
  return (
    <GuidePage
      eyebrow="Feature 6 of 7"
      title="Memory"
      status="live"
      lede="Your company's history as Starlane recorded it: every change to your financial records and every decision on an action, with what it was before and after, and when."
    >
      <Section title="What it is for">
        <ul>
          <li>Answering “what happened with this customer?” without digging through registers.</li>
          <li>Seeing which decisions were made, by whom, and what followed.</li>
          <li>Trusting the numbers: nothing changes in Starlane without leaving a record here.</li>
        </ul>
      </Section>
    </GuidePage>
  );
}
