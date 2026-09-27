import type { Metadata } from "next";
import { Cards, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Agents" };

// Mirrors the backend's agent registry (vantro-flow-backend
// lib/config/atlasAgentRegistry.js), which is the source of truth for each
// agent's status. Change the two together.
export default function AgentsPage() {
  return (
    <GuidePage
      eyebrow="Agents"
      title="Agents"
      lede="An agent is a specialist that reads one part of your business and proposes what to do about it. Every agent below is listed with its real status — one runs on real company data today, three are built and in preview, and the rest are designed and labelled as such."
    >
      <Section title="Running on real data">
        <Cards items={[
          { title: "Owner Briefing", status: "live_limited", href: "/product/briefing", body: "Reads invoices, customers and payments; writes the owner's briefing on cash, broken promises and data gaps, every line tied to its evidence." },
        ]} />
      </Section>
      <Section title="Built, in preview">
        <Cards items={[
          { title: "Data Quality", status: "preview", body: "Scans your connected data for gaps — missing contacts, incomplete records — that would stop Starlane acting on it." },
          { title: "Policy Guard", status: "preview", body: "Checks every proposed action against Starlane's rules and fails closed: when in doubt, an action is held for you." },
          { title: "Cost Router", status: "preview", body: "Chooses the cheapest safe way to answer a request, and falls back conservatively." },
        ]} />
      </Section>
      <Section title="Designed — waiting for a data source">
        <Cards items={[
          { title: "Inventory Pressure", status: "connector_required", body: "How stock levels tie up cash, from inventory and sales records." },
          { title: "Sales Pipeline", status: "connector_required", body: "A review of open sales orders and the customers behind them." },
          { title: "Purchase & Supplier", status: "connector_required", body: "Payables and supplier reliability from purchase orders and payments." },
          { title: "Data Source Readiness", status: "connector_required", body: "Whether a newly connected system has enough data for the other agents to work." },
        ]} />
      </Section>
      <Section title="On the roadmap">
        <Cards items={[
          { title: "Cashflow Risk", status: "roadmap", body: "Early warning on cash shortfalls from invoices, payments and cash events." },
          { title: "Collections Priority", status: "roadmap", body: "A ranked list of who to call first, from payment behaviour and overdue status." },
          { title: "Customer Risk", status: "roadmap", body: "A risk score per customer from how they pay." },
          { title: "Approval Review", status: "roadmap", body: "Keeps the queue of actions waiting for you short and in order." },
          { title: "Evidence Review", status: "roadmap", body: "Checks that the evidence behind each proposal still holds." },
          { title: "Workflow Planner", status: "roadmap", body: "Plans multi-step work across agents." },
          { title: "Pack Recommendation", status: "roadmap", body: "Suggests which industry or regional pack fits your company." },
        ]} />
      </Section>
      <Section title="Built with you (custom or partner projects)">
        <Cards items={[
          { title: "Enterprise Governance", status: "roadmap", body: "Governance reviews for larger organisations with their own policies." },
          { title: "Operating Model Designer", status: "roadmap", body: "Designs a custom operating model around how your company works." },
          { title: "Partner Deployment Planner", status: "roadmap", body: "Plans a deployment delivered with an implementation partner." },
        ]} />
      </Section>
      <Section title="Rules every agent follows">
        <ul>
          <li>Agents read and propose. None of them can send a message to a customer or change your records on its own.</li>
          <li>An agent moves to live only after it is built, tested against recorded scenarios, and proven on real data in a staging environment.</li>
          <li>Each agent sees only your company's data.</li>
        </ul>
      </Section>
      <Note>The collections recommendations you see in Decisions today come from Starlane's collections rules (see Collections), not from the Collections Priority agent above, which is still to be built.</Note>
    </GuidePage>
  );
}
