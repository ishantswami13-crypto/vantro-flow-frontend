// Content for the public top bar. Every link points at a real page or a real
// section id on it. Featured cards pair sources and outcomes Starlane works
// with today; they are not customer logos.

export type MenuLink = { href: string; label: string };
export type Menu = {
  id: string;
  label: string;
  cols: Array<{ h: string; links: MenuLink[] }>;
  featured: { href: string; title: string; blurb: string; pairs: Array<[string, string]> };
};

export const BANNER = {
  id: "command-center-film",
  text: "New: one morning in the Starlane Command Center, from overnight review to an approved reminder, in 38 seconds",
  cta: "Watch the film",
  href: "/platform#film",
};

export const PLAIN: MenuLink[] = [
  { href: "/pilots", label: "Customers" },
  { href: "/security", label: "Security" },
];

export const LOGIN: Array<[string, string, string]> = [
  ["/login", "Starlane", "Sign in to your business"],
  ["/download", "Desktop bridge", "Connect TallyPrime on Windows"],
];

const l = (href: string, label: string): MenuLink => ({ href, label });

export const MENUS: Menu[] = [
  {
    id: "platform",
    label: "Platform",
    cols: [
      { h: "Overview", links: [l("/platform", "Platform overview"), l("/platform#film", "Command Center"), l("/product", "Product guide")] },
      { h: "How it works", links: [l("/platform#connect", "Connect"), l("/platform#model", "Model"), l("/platform#watch", "Watch"), l("/platform#decide", "Decide"), l("/platform#verify", "Verify")] },
      { h: "Connections", links: [l("/integrations", "Integrations"), l("/integrations#catalogue", "Integration catalogue"), l("/download", "Desktop bridge")] },
    ],
    featured: {
      href: "/platform#film",
      title: "One Morning in the Starlane Command Center",
      blurb: "Invoices reviewed overnight, the evidence behind every figure, and an agent preparing the reminder you approve once.",
      pairs: [["TallyPrime", "Receivables"], ["Bank statements", "Payments"], ["Stock exports", "Cash at risk"], ["Promises", "Who to call"]],
    },
  },
  {
    id: "solutions",
    label: "Solutions",
    cols: [
      { h: "Overview", links: [l("/solutions#owners", "For Owners"), l("/solutions#finance", "For Finance Teams"), l("/solutions#collections", "For Collections Teams")] },
      { h: "Industries", links: [l("/solutions#distribution", "Distribution & Trading"), l("/solutions#manufacturing", "Manufacturing"), l("/solutions#wholesale", "Wholesale & Stockists"), l("/solutions#global", "Exporters & Global Trade")] },
      { h: "Workflows", links: [l("/solutions#receivables", "Receivables & Collections"), l("/solutions#payables", "Payables & Suppliers"), l("/solutions#stock", "Stock & Cash"), l("/solutions#agents", "Agents & Approvals")] },
    ],
    featured: {
      href: "/solutions",
      title: "A New Operating Record for Finance and the Owner",
      blurb: "Owners, finance teams and collections staff work from one sourced record, and every action waits for a person.",
      pairs: [["TallyPrime", "Excel"], ["Bank statements", "Google Sheets"], ["Stock exports", "CSV"], ["Promises", "WhatsApp drafts"]],
    },
  },
  {
    id: "resources",
    label: "Resources",
    cols: [
      { h: "Learn", links: [l("/product", "Product guide"), l("/#faq", "Questions owners ask"), l("/pricing#faq", "Pilot questions")] },
      { h: "Trust", links: [l("/security#controls", "Controls"), l("/security#claims", "What we do not claim"), l("/security#disclosure", "Report a vulnerability")] },
    ],
    featured: {
      href: "/security",
      title: "Read-Only by Design",
      blurb: "Nothing in your books is created, changed or deleted. See each control, and what Starlane does not claim.",
      pairs: [["Read-only", "0 writes"], ["Sourced", "Every figure"], ["Approved", "Every message"], ["Scoped", "One business"]],
    },
  },
  {
    id: "company",
    label: "Company",
    cols: [
      { h: "Company", links: [l("/company", "About Starlane"), l("/pricing", "Pricing & Pilots"), l("/access", "Request a Demo")] },
      { h: "Legal", links: [l("/terms", "Terms"), l("/privacy", "Privacy"), l("/security", "Security")] },
    ],
    featured: {
      href: "/company",
      title: "Why We Built Starlane",
      blurb: "Owners should know who owes them, who broke a promise and what cash is at risk, before the working day starts.",
      pairs: [["Who owes you", "Today"], ["Broken promises", "This week"], ["Cash at risk", "This month"], ["What to do", "Now"]],
    },
  },
];
