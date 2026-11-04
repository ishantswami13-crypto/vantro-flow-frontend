import type { TextureTone } from "@/components/marketing/home2/Texture";
import type { Control, Feat, Stat } from "./Blocks";
import { AgentRunMock, CommandCenterMock, DecisionMock, LedgerMock, MemoryMock, PlanMock, QueueMock, ScopeMock, SourcesMock, VaultMock, PhoneMock } from "./Mocks";

// Shared copy for the public site. Claims stay inside what Starlane does today:
// read-only connections, sourced figures, approvals, actions that run once, and
// an audit trail. No customers, logos, certifications or results are named.

export const CONTROLS: Control[] = [
  ["eye", "Read-only connections", "/security#controls"],
  ["check", "Approval queue", "/security#controls"],
  ["once", "Runs at most once", "/security#controls"],
  ["stop", "Hard limits on actions", "/security#controls"],
  ["log", "Append-only audit trail", "/security#controls"],
  ["lock", "Hashed passwords, rate-limited sign-in", "/security#controls"],
  ["key", "Revocable device credentials", "/security#controls"],
];

export const CONTROLS_BODY = "Starlane is built so agents can prepare work without being able to change your books. Every request is scoped to your account, every decision is logged, and the security page says plainly what Starlane does not claim.";

export const PRINCIPLES = [
  { text: "If Starlane cannot show where a number came from, it does not show the number.", by: "Evidence before assertion", role: "Starlane operating principle 01", href: "/company", cta: "Our principles" },
  { text: "Agents prepare the work. A person approves it, and the approval is recorded.", by: "People decide", role: "Starlane operating principle 02", href: "/security", cta: "How approvals work" },
  { text: "Nothing in your books is created, changed or deleted. Connections are read-only.", by: "Read before write", role: "Starlane operating principle 03", href: "/security#controls", cta: "See every control" },
  { text: "Only material changes are raised. A good morning is measured by how little you had to read.", by: "Quiet by default", role: "Starlane operating principle 04", href: "/company", cta: "Why we built Starlane" },
];

export type Module = {
  slug: string; name: string; title: React.ReactNode; lead: string; tone: TextureTone; hero: React.ReactNode;
  strong: string; soft: string; feats: Feat[];
  spot?: { kicker: string; title: string; body: string; tone: TextureTone; view: React.ReactNode };
  stats: Array<[string, string]>; statsTitle: string;
  uses: Array<{ k: string; title: string; body: string }>; usesTitle: string;
  description: string;
};

export const MODULES: Module[] = [
  {
    slug: "agents", name: "Agents", tone: "umber",
    title: <>Delegate the Work.<br />Own the Decision.</>,
    lead: "Starlane agents read the records, do the first pass and return sourced, review-ready work. Nothing goes out until a person approves it.",
    description: "Starlane agents plan finance work, read your ledgers and bank statements read-only, and return sourced, review-ready results that wait for your approval.",
    hero: <AgentRunMock />,
    strong: "Take on more at once.", soft: "Run a team of agents that split large reviews, work in parallel and return results you can check line by line.",
    feats: [
      { title: "Get More Done with Agents", lead: "Your team’s hours go to customers, suppliers and decisions while agents run the matching, ranking and drafting in the background.", tone: "umber", view: <QueueMock />, points: [
        ["Parallel runs", "Hand off one review or ten. Starlane runs them side by side and returns each one ready to check."],
        ["Scheduled agents", "Overnight reviews of what changed, ready before the working day starts."],
        ["Any source, one result", "Ledgers, exports, statements and stock come back as one ranked list, a spreadsheet or a brief."],
      ] },
      { title: "Control the Quality of Work", lead: "See the plan before it runs and review the work before it goes anywhere. The decision is always yours.", tone: "clay", view: <PlanMock />, points: [
        ["Review and approve", "Preview the plan, adjust the scope and approve each outbound step before it happens."],
        ["Hard limits", "Agents cannot mark a payment received, change an amount or delete a record, whatever they are asked."],
        ["Auditability", "Every figure links to its record and every step is logged, so the work is easy to verify."],
      ] },
      { title: "Built to Your Standard", lead: "Agents follow your credit policy, your collections playbook and the way your team already works.", tone: "plum", view: <DecisionMock />, points: [
        ["Your playbooks", "Tone, timing and escalation follow the rules you set for each kind of customer."],
        ["Read-only connectors", "Agents read TallyPrime, accounting exports, bank statements and stock without being able to write back."],
      ] },
    ],
    spot: { kicker: "Introducing", title: "Memory", body: "Starlane remembers how each customer pays and applies it to every run, and you can see and change what it learned.", tone: "plum", view: <MemoryMock className="fit" /> },
    statsTitle: "Agents, by Design", stats: [["0", "writes to your books, ever"], ["1", "approval for every outbound message"], ["100%", "of figures linked to their record"]],
    usesTitle: "How Teams Use Agents", uses: [
      { k: "a", title: "Overdue review", body: "Every invoice past terms, matched against bank statements, ranked by cash at risk, with a reminder drafted for each." },
      { k: "b", title: "Promise follow-up", body: "Each payment promise tracked to its date, and a firm next step prepared the morning after one is missed." },
      { k: "c", title: "Supplier run", body: "What falls due this week, to whom, and what paying it leaves in the bank, laid out for approval." },
      { k: "d", title: "Month-end check", body: "Unmatched receipts, credit notes and stale balances gathered into one list to clear before close." },
    ],
  },
  {
    slug: "command-center", name: "Command Center", tone: "stone",
    title: <>See Every Entity<br />in One View</>,
    lead: "Cash at risk, collections against plan and what the agents did overnight, across every entity and currency, in one view.",
    description: "The Starlane Command Center shows cash at risk, collections against plan and agent activity across entities and currencies, with every figure sourced.",
    hero: <CommandCenterMock />,
    strong: "One view, every entity.", soft: "Receivables, payables and stock in their own currencies, joined into one record of what changed.",
    feats: [
      { title: "Know What Changed Overnight", lead: "The few changes that matter, raised once, with the records behind them.", tone: "stone", view: <LedgerMock />, points: [
        ["Material changes only", "Slipping invoices, missed promises and failed syncs, raised once and closed when resolved."],
        ["Cash at risk", "What each change could cost you this month, as a range with its assumptions shown."],
        ["By entity and currency", "Every figure in the currency it was booked in, with the rate behind any conversion."],
      ] },
      { title: "From the Desk or the Phone", lead: "The same record on the web and in your morning brief, so the decision can be made wherever you are.", tone: "night", view: <PhoneMock />, points: [
        ["Morning brief", "What needs you today, on your phone, before the first call."],
        ["One tap to review", "Open the evidence behind any line and approve, change or decline the next step."],
      ] },
    ],
    statsTitle: "The Command Center, by Design", stats: [["4", "kinds of figure, each labelled"], ["07:42", "morning brief, sample time"], ["Any", "currency, read as booked"]],
    usesTitle: "How Teams Use the Command Center", uses: [
      { k: "a", title: "Daily stand-up", body: "Start the day on what changed, who to call and what is waiting for approval." },
      { k: "b", title: "Cash planning", body: "Likely collections against what falls due, with every assumption yours to change." },
      { k: "c", title: "Owner review", body: "A short list of decisions with their evidence, readable in minutes." },
    ],
  },
  {
    slug: "decisions", name: "Decisions", tone: "clay",
    title: <>Every Answer<br />Shows Its Working</>,
    lead: "Each decision arrives with the records behind it, every figure marked fact, calculation, assumption or estimate, and options you can compare.",
    description: "Starlane decisions come with their evidence: every figure labelled fact, calculation, assumption or estimate, with options to compare and an approval that is recorded.",
    hero: <DecisionMock />,
    strong: "Evidence before assertion.", soft: "If Starlane cannot show where a number came from, it does not show the number.",
    feats: [
      { title: "Four Kinds of Figure", lead: "You can always tell what was read, what was worked out, what was assumed and what was estimated.", tone: "clay", view: <DecisionMock />, points: [
        ["Fact", "Read from a system, with the record it came from."],
        ["Calculation", "Derived from facts, with the working shown."],
        ["Assumption", "Stated plainly and yours to change."],
        ["Estimate", "A range, never a single confident number, with what it rests on."],
      ] },
      { title: "Options, Then Approval", lead: "Compare the next steps side by side, then approve one. The approval is recorded with who decided and when.", tone: "moss", view: <PlanMock steps={["Firm reminder in English", "Owner call on Thursday", "Hold new orders above limit", "Review again in 7 days", "Record the outcome"]} />, points: [
        ["Compare options", "Each with what it is likely to recover and what it risks."],
        ["Runs once", "The approved step is claimed atomically and runs at most once."],
        ["Checked afterwards", "What happened next is compared against what was expected."],
      ] },
    ],
    statsTitle: "Decisions, by Design", stats: [["4", "kinds of figure"], ["1", "approval per action"], ["0", "actions without a person"]],
    usesTitle: "Decisions Teams Make in Starlane", uses: [
      { k: "a", title: "Who to call first", body: "Ranked by what each customer puts at risk, with their payment history." },
      { k: "b", title: "Credit holds", body: "Whether to hold new orders for a customer over their limit, and what that costs." },
      { k: "c", title: "Supplier timing", body: "Which bills to pay this week and which can wait without penalty." },
    ],
  },
  {
    slug: "vault", name: "Vault", tone: "slate",
    title: <>Every Record,<br />in One Place</>,
    lead: "Ledgers, statements, stock and the documents behind them, held read-only for agents and people to work from.",
    description: "The Starlane Vault holds ledgers, bank statements, stock and supporting documents read-only, so every figure an agent shows can be traced to its record.",
    hero: <VaultMock />,
    strong: "Read before write.", soft: "Starlane reads what your systems already hold. Nothing in them is created, changed or deleted.",
    feats: [
      { title: "Sources, Kept Honest", lead: "Every source carries its real status: live today, planned, or built for your pilot.", tone: "slate", view: <SourcesMock />, points: [
        ["TallyPrime", "Through the desktop bridge, read-only, with a credential you can revoke."],
        ["Exports", "QuickBooks, Xero and Zoho Books exports, Excel, CSV and Google Sheets."],
        ["Bank statements and stock", "Imported as files and joined to the ledger."],
      ] },
      { title: "Traceable to the Line", lead: "Open any figure and see the record it came from, down to the invoice or statement line.", tone: "moss", view: <LedgerMock />, points: [
        ["Linked records", "Every number links back to its source."],
        ["Scoped access", "Every request is scoped to your account. One account is one business."],
      ] },
    ],
    statsTitle: "The Vault, by Design", stats: [["0", "writes to your systems"], ["1", "credential per bridge device"], ["100%", "of figures traceable"]],
    usesTitle: "What Teams Keep in the Vault", uses: [
      { k: "a", title: "Ledgers", body: "Customers, invoices, receipts and credit notes from TallyPrime or exports." },
      { k: "b", title: "Statements", body: "Bank statements, matched to the receipts they record." },
      { k: "c", title: "Stock", body: "What is moving, what is not, and the cash it holds." },
    ],
  },
  {
    slug: "memory", name: "Memory", tone: "plum",
    title: <>Learns How You<br />Get Paid</>,
    lead: "Starlane remembers how each customer pays and how your team works, and shows you what it learned so you can change it.",
    description: "Starlane Memory learns how each customer pays and how your team works, applies it to every run, and lets you see and edit what it learned.",
    hero: <MemoryMock className="fit" />,
    strong: "Patterns, not guesses.", soft: "Payment days, reply times and what works for each customer, learned from your own records.",
    feats: [
      { title: "What Starlane Learned", lead: "Every learned pattern is shown in plain words, with the records it came from.", tone: "plum", view: <MemoryMock className="fit" />, points: [
        ["Payment behaviour", "Average delay, best payment day and how reliable each customer’s promises are."],
        ["What works", "Which reminders and channels a customer responds to."],
        ["Yours to change", "Correct or remove anything Starlane learned."],
      ] },
    ],
    statsTitle: "Memory, by Design", stats: [["1", "place to see everything learned"], ["0", "patterns hidden from you"], ["Every", "run uses what was learned"]],
    usesTitle: "What Memory Remembers", uses: [
      { k: "a", title: "Payment days", body: "Who pays at month end, who pays after a call, who pays in part." },
      { k: "b", title: "Promises", body: "How often each customer keeps a promised date." },
      { k: "c", title: "Your preferences", body: "The tone and timing your team uses for each kind of customer." },
    ],
  },
  {
    slug: "connectors", name: "Connectors", tone: "moss",
    title: <>Works With What<br />You Already Run</>,
    lead: "Read-only connections to accounting, banking, spreadsheets and stock, each with its real status shown.",
    description: "Starlane connects read-only to TallyPrime, accounting exports, bank statements, spreadsheets and stock, with every connector's real status shown.",
    hero: <SourcesMock />,
    strong: "Live, planned or custom.", soft: "Every connector shows where it stands today. Nothing is implied.",
    feats: [
      { title: "Connect in Minutes", lead: "TallyPrime through the desktop bridge; everything else as files you already export.", tone: "moss", view: <SourcesMock />, points: [
        ["Desktop bridge", "Runs on one Windows machine, reads TallyPrime and sends nothing back to it."],
        ["Files and exports", "Excel, CSV, Google Sheets and accounting exports, recognised on import."],
        ["Custom connectors", "Built for a pilot on the connector framework: API, webhook, database or file."],
      ] },
      { title: "Scoped by Entity", lead: "Work across entities without mixing their records.", tone: "slate", view: <ScopeMock />, points: [
        ["Per-entity scope", "Ask about one entity, or all of them, and see which records were read."],
        ["Revocable access", "Each bridge device has its own credential, which you can revoke."],
      ] },
    ],
    statsTitle: "Connectors, by Design", stats: [["0", "writes back to any system"], ["3", "honest statuses"], ["1", "credential per device"]],
    usesTitle: "What Teams Connect", uses: [
      { k: "a", title: "Accounting", body: "TallyPrime live; QuickBooks, Xero and Zoho Books by export today, direct connections planned." },
      { k: "b", title: "Banking", body: "Bank statement import live; live bank feeds planned." },
      { k: "c", title: "Spreadsheets", body: "Excel, CSV and Google Sheets, live." },
    ],
  },
];

export type Solution = {
  slug: string; kicker: string; title: React.ReactNode; lead: string; description: string; tone: TextureTone; hero: React.ReactNode;
  why: Array<[string, string, string]>; usesTitle: string; uses: Array<{ k: string; title: string; body: string; view: React.ReactNode }>;
  strong: string; soft: string; modules: string[];
};

export const SOLUTIONS: Solution[] = [
  {
    slug: "finance-teams", kicker: "Starlane for Finance Teams", tone: "moss",
    title: <>Close Faster on<br />One Record</>,
    lead: "Finance teams use Starlane to put ledgers, statements and stock on one sourced record, with agents doing the matching, ranking and first drafts.",
    description: "Starlane for finance teams: one sourced record across ledgers, bank statements and stock, with agents doing the matching and every action approved by a person.",
    hero: <ScopeMock />,
    why: [["spark", "Reclaim time for judgement", "Hand the first pass to agents: matching receipts, ranking overdue and drafting reminders."], ["check", "Apply your policy every time", "Credit limits, tone and escalation follow the rules you set."], ["shield", "Deploy with confidence", "Read-only connections, an approval for every outbound step and a full audit trail."]],
    usesTitle: "How Finance Teams Use Starlane",
    uses: [
      { k: "a", title: "Receivables review", body: "Overdue invoices ranked by cash at risk, each with its evidence.", view: <LedgerMock /> },
      { k: "b", title: "Reconciliation", body: "Receipts in bank statements matched to the invoices they settle.", view: <AgentRunMock /> },
      { k: "c", title: "Cash forecast", body: "Likely collections against what falls due, with assumptions you can change.", view: <CommandCenterMock /> },
      { k: "d", title: "Approvals", body: "Every reminder and hold waits for a person and runs once.", view: <PlanMock /> },
    ],
    strong: "Built for finance work, not adapted to it.", soft: "One connected record for receivables, payables, cash and stock.",
    modules: ["agents", "command-center", "decisions", "vault"],
  },
  {
    slug: "owners", kicker: "Starlane for Owners", tone: "umber",
    title: <>Know Who Owes You,<br />Every Morning</>,
    lead: "Owners use Starlane to see who owes them, who broke a promise and what cash is at risk, and approve the next step from their phone.",
    description: "Starlane for owners: a morning brief of who owes you, who broke a promise and what cash is at risk, with every step waiting for your approval.",
    hero: <PhoneMock />,
    why: [["eye", "See what changed", "The few changes that matter overnight, and nothing else."], ["people", "Decide in minutes", "Each decision with its evidence and options, readable on a phone."], ["lock", "Stay in control", "Nothing reaches a customer until you approve the exact text."]],
    usesTitle: "How Owners Use Starlane",
    uses: [
      { k: "a", title: "Morning brief", body: "What needs you today, before the first call.", view: <PhoneMock /> },
      { k: "b", title: "Who to call", body: "Ranked by what each customer puts at risk.", view: <LedgerMock /> },
      { k: "c", title: "Approve reminders", body: "Read the exact message, approve it, and it is sent once.", view: <DecisionMock /> },
    ],
    strong: "Your business, in one record.", soft: "From the systems you already run, read-only.",
    modules: ["command-center", "decisions", "agents"],
  },
  {
    slug: "collections", kicker: "Starlane for Collections", tone: "clay",
    title: <>Call the Right<br />Customer First</>,
    lead: "Collections teams use Starlane to rank who to call, track every promise and prepare reminders for approval.",
    description: "Starlane for collections teams: a ranked call list, every payment promise tracked, and reminders prepared for approval and sent once.",
    hero: <LedgerMock />,
    why: [["bolt", "Start with who matters", "A ranked list by cash at risk and payment behaviour."], ["log", "Never lose a promise", "Every promised date tracked and followed up the day after it is missed."], ["check", "Reminders that wait", "Drafted in the right tone, sent only after approval, and only once."]],
    usesTitle: "How Collections Teams Use Starlane",
    uses: [
      { k: "a", title: "Call list", body: "Who to call today and why.", view: <LedgerMock /> },
      { k: "b", title: "Promise tracking", body: "Promised dates, kept and broken, per customer.", view: <MemoryMock className="fit" /> },
      { k: "c", title: "Reminder drafts", body: "Tone and timing chosen from what works for each customer.", view: <AgentRunMock /> },
    ],
    strong: "Behaviour-aware, not rule-based.", soft: "Starlane learns how each customer pays and plans around it.",
    modules: ["agents", "decisions", "memory"],
  },
  {
    slug: "global-trade", kicker: "Starlane for Exporters & Global Trade", tone: "slate",
    title: <>Every Currency,<br />One Record</>,
    lead: "Exporters and trading businesses use Starlane to follow invoices and bills in the currencies they were booked in, with every converted figure showing its rate.",
    description: "Starlane for exporters and global trade: invoices and bills read in their booked currencies, every conversion shown as an assumption, across entities.",
    hero: <ScopeMock />,
    why: [["globe", "Every currency as booked", "Foreign invoices keep their currency. Conversions show their rate as an assumption you can change."], ["people", "Across entities", "Work per entity or across all of them, without mixing records."], ["shield", "Read-only everywhere", "Nothing in any ledger is created, changed or deleted."]],
    usesTitle: "How Global Teams Use Starlane",
    uses: [
      { k: "a", title: "Multi-currency receivables", body: "What is owed in each currency and what it is worth today.", view: <LedgerMock /> },
      { k: "b", title: "Entity review", body: "One entity at a time, or all of them together.", view: <ScopeMock /> },
      { k: "c", title: "Cash by currency", body: "Likely collections per currency against what falls due.", view: <CommandCenterMock /> },
    ],
    strong: "Built for trade that crosses borders.", soft: "Live rate feeds are switched on per pilot; until then the rate is a stated assumption.",
    modules: ["command-center", "vault", "connectors"],
  },
  {
    slug: "distribution", kicker: "Starlane for Distribution & Wholesale", tone: "night",
    title: <>Many Customers,<br />One Clear List</>,
    lead: "Distributors and wholesalers use Starlane to follow each customer’s payment behaviour and catch the ones drifting late before the month closes.",
    description: "Starlane for distribution and wholesale: payment behaviour per customer, credit exposure against stock, and the next step prepared for approval.",
    hero: <LedgerMock />,
    why: [["bolt", "Catch drift early", "Customers who are slipping later each month, raised before it costs you."], ["eye", "Exposure against stock", "Credit per customer joined with what sits in the warehouse."], ["check", "Next step ready", "A call, a reminder or a hold, prepared for you to approve."]],
    usesTitle: "How Distributors Use Starlane",
    uses: [
      { k: "a", title: "Credit exposure", body: "Who is over their limit and what is still on order.", view: <DecisionMock /> },
      { k: "b", title: "Slow stock", body: "Stock that is not moving and the cash it holds.", view: <CommandCenterMock /> },
      { k: "c", title: "Collections", body: "A ranked list across hundreds of small invoices.", view: <LedgerMock /> },
    ],
    strong: "Built for businesses that sell on credit.", soft: "Where cash depends on customers paying on time and stock moving.",
    modules: ["decisions", "command-center", "memory"],
  },
  {
    slug: "manufacturing", kicker: "Starlane for Manufacturing", tone: "umber",
    title: <>Stock and Cash<br />in One View</>,
    lead: "Manufacturers use Starlane to see where an order depends on stock that is running low, and what that does to cash.",
    description: "Starlane for manufacturing: supplier bills, stock and receivables joined, so the cash effect of every order and shortage is clear.",
    hero: <CommandCenterMock />,
    why: [["eye", "See the dependency", "Orders that rely on stock that will run out."], ["once", "Plan supplier payments", "What falls due and what paying it leaves in the bank."], ["log", "Every figure sourced", "From the ledger, the stock export or the statement."]],
    usesTitle: "How Manufacturers Use Starlane",
    uses: [
      { k: "a", title: "Stock and cash", body: "Stock running out against the orders that need it.", view: <CommandCenterMock /> },
      { k: "b", title: "Supplier run", body: "Bills due this week, ranked by what waiting would cost.", view: <QueueMock /> },
      { k: "c", title: "Receivables", body: "What customers owe and when it is likely to arrive.", view: <LedgerMock /> },
    ],
    strong: "Built for businesses that make things.", soft: "Supplier bills, stock and receivables move together.",
    modules: ["command-center", "agents", "vault"],
  },
];

export const FACTS: Stat[] = [
  ["Writes to your books", "0", "Connections are read-only. Nothing in your ledgers is created, changed or deleted."],
  ["Kinds of figure, each labelled", "4", "Fact, calculation, assumption or estimate, with the record it came from."],
  ["Approval for every outbound message", "1", "Each reminder waits for a person and is sent once, exactly as approved."],
];
