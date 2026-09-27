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
          { title: "The Bridge", status: "live", href: "/product/bridge", body: "What needs you, what changed, and whether your data is current — on one screen." },
          { title: "Scan", status: "live", href: "/product/scan", body: "Ask about your business in plain words; answers come from your own records." },
          { title: "Watch", status: "live", href: "/product/watch", body: "Conditions you define, checked every 15 minutes against your real numbers." },
          { title: "Missions", status: "not_built", href: "/product/missions", body: "Goals you set, tracked to done. Not built yet." },
          { title: "Simulate", status: "live", href: "/product/simulate", body: "What happens to overdue cash if an invoice is paid earlier — or not at all." },
          { title: "Memory", status: "live", href: "/product/memory", body: "Your company's history as Starlane recorded it: every change and every decision." },
          { title: "Prepared", status: "live", href: "/product/prepared", body: "Work Starlane has lined up for you: decisions waiting, watches that fired, opportunities." },
        ]} />
      </Section>
      <Note>Each page says plainly whether a feature is live or not built yet. Starlane never shows sample data as if it were yours.</Note>
    </GuidePage>
  );
}
