import type { Metadata } from "next";
import { Cards, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Product guide" };

export default function ProductOverview() {
  return (
    <GuidePage
      eyebrow="Product guide"
      title="Everything in Starlane, in the order you will meet it."
      lede="Starlane reads the systems your company already runs on, keeps one current picture of it, proposes what to do with the evidence for each proposal, and — once you approve — carries it out and checks what happened. This guide follows the same sidebar you will use inside the product."
    >
      <Section title="How the pieces fit">
        <ol>
          <li><strong>Sources</strong> bring in your real records — TallyPrime on the computer that runs it, or a spreadsheet export.</li>
          <li><strong>Agents</strong> read those records and propose specific actions, each with the facts behind it.</li>
          <li><strong>The Bridge</strong> and the <strong>owner briefing</strong> put what needs you first; <strong>Decisions</strong> is where you approve or decline.</li>
          <li><strong>Watch</strong>, <strong>Discover</strong> and <strong>Simulate</strong> keep an eye on conditions, outside events and what-ifs.</li>
          <li><strong>Control</strong> shows what Starlane can see, what it is allowed to do, and every change it made.</li>
        </ol>
      </Section>
      <Section title="Every day">
        <Cards items={[
          { title: "The Bridge", status: "live", href: "/product/bridge", body: "What needs you, what changed, and whether your sources are healthy — on one screen." },
          { title: "Owner briefing", status: "live_limited", href: "/product/briefing", body: "A short, evidence-linked briefing on cash, broken promises and data gaps." },
          { title: "Decisions & approvals", status: "live", href: "/product/decisions", body: "Every proposed action with its evidence. Nothing happens until you decide." },
          { title: "Ask Starlane", status: "live", href: "/product/ask", body: "Questions answered from your own records — and a plain “I don’t have that data” when it doesn’t." },
        ]} />
      </Section>
      <Section title="Intelligence">
        <Cards items={[
          { title: "Watch", status: "live", href: "/product/watch", body: "Conditions you define, checked every 15 minutes." },
          { title: "Discover", status: "live", href: "/product/discover", body: "Outside events that touch your business, and opportunities in your own data." },
          { title: "Simulate", status: "live", href: "/product/simulate", body: "What happens to overdue cash if an invoice is paid earlier — or not at all." },
          { title: "Memory & Prepared", status: "live", href: "/product/memory", body: "The audit trail as a timeline, and work Starlane has lined up for you." },
        ]} />
      </Section>
      <Section title="Agents, company and apps">
        <Cards items={[
          { title: "Agents", href: "/product/agents", body: "Every agent with its real status: one live, three in preview, the rest designed and labelled as such." },
          { title: "Collections", status: "live", href: "/product/collections", body: "Who to chase, how firmly, and why — staged by days overdue." },
          { title: "Sources", href: "/product/sources", body: "TallyPrime and spreadsheets today; everything else says what it waits on." },
          { title: "Control & trust", status: "live", href: "/product/control", body: "Permissions, audit trail and the safety checks every action passes." },
          { title: "Business modules", status: "live", href: "/product/modules", body: "Invoices, GST bills, bank, khata, inventory, forecasts and more." },
          { title: "Desktop & mobile", status: "in_testing", href: "/product/apps", body: "Starlane for Windows (with the Tally connection built in) and for iPhone and Android." },
        ]} />
      </Section>
      <Note>Every page says plainly whether a feature is live, limited, in preview or still on the roadmap. Starlane never shows sample data as if it were yours.</Note>
    </GuidePage>
  );
}
