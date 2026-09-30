import type { Metadata } from "next";
import { Cards, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Features" };

export default function ProductOverview() {
  return (
    <GuidePage
      eyebrow="Features"
      title="Seven features, one picture of your company."
      lede="Starlane reads the systems your company already runs on and keeps one current picture of it. Everything you do in Starlane happens in seven places — the same seven in the sidebar when you sign in."
    >
      <Section title="The seven">
        <Cards items={[
          { title: "The Bridge", status: "live", href: "/product/bridge", body: "What you are owed, what is overdue, what needs you and what is coming — from your own books." },
          { title: "Scan", status: "live", href: "/product/scan", body: "Look into any customer or invoice and see why it matters, or ask in plain words." },
          { title: "Watch", status: "live", href: "/product/watch", body: "Invoices slipping, promises missed, syncs failing — raised once, with evidence, closed when resolved." },
          { title: "Missions", status: "live", href: "/product/missions", body: "One objective with a deadline, proposed step by step and measured against your books." },
          { title: "Simulate", status: "live", href: "/product/simulate", body: "Likely collections, with every assumption visible and yours to change." },
          { title: "Memory", status: "live", href: "/product/memory", body: "What Starlane learned about how you get paid, where from, and your say on it." },
          { title: "Prepared", status: "live", href: "/product/prepared", body: "The next 24 hours, 7 days and 30 days, worked out from the dates in your books." },
        ]} />
      </Section>
      <Note>The seven features are in Starlane for Windows and the phone app; the web app is catching up. Starlane never shows sample data as if it were yours.</Note>
    </GuidePage>
  );
}
