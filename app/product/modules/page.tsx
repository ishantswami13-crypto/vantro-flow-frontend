import type { Metadata } from "next";
import { Cards, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Business modules" };

// The "More" menu of the web app's sidebar (components/layout/Sidebar.tsx).
export default function ModulesPage() {
  return (
    <GuidePage
      eyebrow="Company"
      title="Business modules"
      lede="Beyond the daily surfaces, the web app's “More” menu holds the working tools of the business — the same ones Starlane's agents read from."
    >
      <Section title="Business">
        <Cards items={[
          { title: "Business state", body: "Where the company stands right now." },
          { title: "Overview", body: "The classic dashboard." },
          { title: "Customers", body: "Every customer with what they owe and how they pay." },
          { title: "Suppliers", body: "Suppliers, contacts and payment terms." },
        ]} />
      </Section>
      <Section title="Money">
        <Cards items={[
          { title: "Collections", body: "Overdue invoices, ranked, with reminders." },
          { title: "New invoice & GST invoices", body: "Create invoices and GST bills." },
          { title: "Bank monitor & bank ledger", body: "Bank balance and entries." },
          { title: "Cash forecast", body: "Projected cash over the coming weeks." },
          { title: "Bad-debt radar", body: "Invoices at risk of never being paid." },
          { title: "Customer khata", body: "The running account per customer." },
        ]} />
      </Section>
      <Section title="Operations">
        <Cards items={[
          { title: "Sales & purchases", body: "What was sold and bought." },
          { title: "Today's orders", body: "Orders for the day." },
          { title: "Inventory", body: "Stock levels and stock value." },
          { title: "Invoice scanner", body: "Photograph a paper invoice to capture it." },
          { title: "Staff attendance & team", body: "Who is in, and who works with you." },
        ]} />
      </Section>
      <Section title="Automation and insights">
        <Cards items={[
          { title: "WhatsApp & auto follow-up", body: "Reminder drafts and follow-up schedules. Sending stays off until outgoing messaging is switched on." },
          { title: "Action Center", body: "Every proposed action and its state — the web version of Decisions." },
          { title: "AI founder & AI training", body: "The assistant and how it learns your way of writing." },
          { title: "Today's P&L, analytics, reports", body: "How the business did, in numbers." },
        ]} />
      </Section>
      <Note>These modules live in the web app. The desktop and phone apps focus on the daily surfaces: the Bridge, decisions, intelligence and sources.</Note>
    </GuidePage>
  );
}
