// ─────────────────────────────────────────────────────────────────────────────
// Vantro Business Type System
// Defines which features each business type needs — and which to hide.
// ─────────────────────────────────────────────────────────────────────────────

export type BusinessTypeKey =
  | "construction"
  | "textile"
  | "pharma"
  | "grocery"
  | "restaurant"
  | "manufacturing"
  | "real_estate"
  | "trading";

export interface BusinessTypeConfig {
  key: BusinessTypeKey;
  label: string;
  emoji: string;
  color: string;          // accent color for industry badge
  description: string;    // one-liner
  // Sidebar routes to HIDE for this business type (everything else shows)
  hiddenRoutes: string[];
  // Custom terminology (override default labels)
  terms: {
    customer: string;     // "Customer" → "Client", "Retailer", etc.
    invoice: string;      // "Invoice" → "RA Bill", "Bill", etc.
    outstanding: string;  // "Outstanding" → "Retention + Dues", etc.
    collection: string;   // "Collection" → "Recovery", etc.
  };
  // Key features this business type uses daily
  coreFeatures: { icon: string; title: string; desc: string }[];
  // What's not useful for them
  notNeeded: string[];
  // Industry-specific WhatsApp templates
  waTemplates: { label: string; message: string }[];
  // Pro tips specific to this business
  tips: string[];
}

export const BUSINESS_TYPES: Record<BusinessTypeKey, BusinessTypeConfig> = {

  // ── CONSTRUCTION ───────────────────────────────────────────────────────────
  construction: {
    key: "construction",
    label: "Construction",
    emoji: "🏗️",
    color: "#F59E0B",
    description: "Builders, contractors, infra & civil works companies",
    hiddenRoutes: ["/inventory", "/scanner", "/orders", "/network"],
    terms: {
      customer:    "Client",
      invoice:     "RA Bill",
      outstanding: "Retention + Dues",
      collection:  "Payment Release",
    },
    coreFeatures: [
      { icon: "📋", title: "RA Bill Collections",       desc: "Track Running Account bills client-wise. Know exactly what's approved, what's pending, and what's stuck in retention." },
      { icon: "🔒", title: "Retention Money Tracker",   desc: "5–10% retention held by clients tracked automatically. Get alerts when retention release date arrives." },
      { icon: "📅", title: "Milestone-Based Follow-Up", desc: "Set payment milestones per project. Auto WhatsApp reminders when milestone is due." },
      { icon: "💰", title: "Cash Flow Forecast",        desc: "Project-wise 30/60/90 day cash forecast — know before a crunch hits." },
      { icon: "🧾", title: "GST on Works Contract",     desc: "Generate GST invoices with correct works contract rates (18% or 12%)." },
      { icon: "📱", title: "Client WhatsApp Follow-Up", desc: "Hinglish messages that sound professional for HNI clients and government departments." },
    ],
    notNeeded: ["Inventory management", "Daily orders", "Invoice scanner", "Vantro Network"],
    waTemplates: [
      {
        label: "RA Bill Pending",
        message: "Namaskar {name} ji, aapka Running Account Bill #{bill_no} (₹{amount}) {days} din se pending hai. Kripya payment release ki request process karein. Documents sab submit ho gaye hain.",
      },
      {
        label: "Retention Release Due",
        message: "Namaskar {name} ji, {project_name} project ka defect liability period complete ho gaya hai. ₹{amount} ka retention amount release karna tha. Request hai ki is hafte process kar dein.",
      },
      {
        label: "Milestone Reached",
        message: "{name} bhai, {project_name} mein {milestone} milestone complete ho gaya hai. ₹{amount} ka payment due ho gaya hai. Invoice attached hai, kab tak process hoga?",
      },
    ],
    tips: [
      "Use Customer Khata to track each client project separately — not all clients in one ledger",
      "Set dunning rules with longer intervals for government clients (they move slowly)",
      "Always tag invoices with project name + RA bill number for easy tracking",
      "Cash Forecast shows you which month may go cash-negative so you can arrange overdraft in advance",
    ],
  },

  // ── TEXTILE ────────────────────────────────────────────────────────────────
  textile: {
    key: "textile",
    label: "Textile",
    emoji: "🧵",
    color: "#8B5CF6",
    description: "Fabric traders, yarn distributors, garment manufacturers",
    hiddenRoutes: ["/orders", "/network"],
    terms: {
      customer:    "Buyer",
      invoice:     "Bill",
      outstanding: "Party Dues",
      collection:  "Recovery",
    },
    coreFeatures: [
      { icon: "📦", title: "Buyer-wise Ledger",       desc: "Track what each buyer/retailer owes across all their orders. See total exposure per party." },
      { icon: "🌸", title: "Season Order Tracking",   desc: "Tag invoices by season (Summer 2025, Diwali, Winter). See which season's payments are still pending." },
      { icon: "🔄", title: "Job Work Dues Tracker",   desc: "Sent fabric for dyeing/printing? Track what job workers owe you and what you owe them." },
      { icon: "📱", title: "Hinglish Follow-Up",      desc: "WhatsApp messages in textile trade language — 'party', 'maal', 'cheque'." },
      { icon: "🧾", title: "GST Invoice with HSN",    desc: "Auto-fill HSN codes for fabric (52xx, 54xx, 55xx) on every invoice." },
      { icon: "📊", title: "Buyer Risk Analytics",    desc: "See which buyers are stretching payment terms — before they become bad debt." },
    ],
    notNeeded: ["Daily orders module", "Vantro Network (coming soon for textile hubs)"],
    waTemplates: [
      {
        label: "Payment Due Reminder",
        message: "{name} bhai, aapka {season} ka maal — ₹{amount} — {days} din se baaki hai. Cheque ho gaya ho toh courier kar dena, ya NEFT kar do. Party number neeche hai.",
      },
      {
        label: "Overdue — Firm",
        message: "Namaskar {name} ji, kaafi time ho gaya hai. ₹{amount} {days} din se outstanding hai. Agar koi issue hai toh baat karte hain, warna aaj baat karo please.",
      },
      {
        label: "Job Work Recovery",
        message: "{name} bhai, {fabric_type} jo dyeing ke liye diya tha — {quantity} meter — payment ₹{amount} abhi bhi pending hai. Kab tak milega?",
      },
    ],
    tips: [
      "Tag every invoice with the season name — 'Summer25', 'Diwali25' — for season-wise analysis",
      "Use Auto Follow-Up with 7-day intervals for small buyers and 15-day for big parties",
      "Scanner can digitize mill bills and job work invoices — saves manual entry",
      "Track top 10 buyers separately in CRM — they carry 80% of your risk",
    ],
  },

  // ── PHARMA ─────────────────────────────────────────────────────────────────
  pharma: {
    key: "pharma",
    label: "Pharma",
    emoji: "💊",
    color: "#10B981",
    description: "Pharma distributors, stockists, medical supply companies",
    hiddenRoutes: ["/orders", "/network"],
    terms: {
      customer:    "Retailer",
      invoice:     "Bill",
      outstanding: "Retailer Dues",
      collection:  "Collection",
    },
    coreFeatures: [
      { icon: "💊", title: "Retailer-wise Collection",   desc: "Track dues retailer-by-retailer. Know which chemist owes how much and for how long." },
      { icon: "📦", title: "Batch & Expiry Tracking",    desc: "Tag invoices with batch numbers. Get alerts 60 days before expiry so you can recall or push fast." },
      { icon: "↩️", title: "Near-Expiry Return Alerts",  desc: "Auto-identify which stock at retailers is near-expiry and needs to be returned or replaced." },
      { icon: "🏥", title: "Stockist Hierarchy",         desc: "Track dues at stockist level AND retailer level. Company → Stockist → Retailer visibility." },
      { icon: "📊", title: "Credit Limit Monitoring",    desc: "See which retailers have crossed their credit limit — stop supply before risk compounds." },
      { icon: "🧾", title: "GST Invoice (Pharma)",       desc: "GST invoices with correct pharma HSN codes and Scheme/PTR calculations." },
    ],
    notNeeded: ["Daily orders (use your ERP for this)", "Vantro Network", "Job work tracking"],
    waTemplates: [
      {
        label: "Retailer Dues",
        message: "{name} bhai, aapka ₹{amount} pending hai {days} din se. Agar cheque ready hai toh delivery boy ke saath bhej dena ya NEFT ho sakta hai. Account details chahiye toh batao.",
      },
      {
        label: "Near-Expiry Alert",
        message: "Namaskar {name} ji, aapke paas jo {medicine_name} hai uski expiry {expiry_date} hai. Please {quantity} pcs return karein ya hum exchange kar dete hain. Jalti schedule karein.",
      },
      {
        label: "Credit Limit Warning",
        message: "{name} bhai, aapka credit limit ₹{limit} hai aur currently ₹{outstanding} outstanding hai. Next order ke liye ₹{shortfall} clear karna hoga. Aaj possible hai?",
      },
    ],
    tips: [
      "Set credit limits per retailer in CRM — stop shipments automatically when limit crossed",
      "Use Scanner to digitize purchase invoices from companies — maintain your purchase records",
      "Auto Follow-Up with 3-day intervals for chemists works best — they pay when reminded",
      "Bank Ledger helps reconcile payments from multiple retailers in one view",
    ],
  },

  // ── GROCERY / FMCG ─────────────────────────────────────────────────────────
  grocery: {
    key: "grocery",
    label: "Grocery / FMCG",
    emoji: "🛒",
    color: "#F97316",
    description: "FMCG distributors, grocery wholesalers, kirana suppliers",
    hiddenRoutes: ["/network"],
    terms: {
      customer:    "Retailer",
      invoice:     "Bill",
      outstanding: "Party Balance",
      collection:  "Collection",
    },
    coreFeatures: [
      { icon: "🛒", title: "Route-wise Collection",    desc: "Group retailers by delivery route. See total outstanding per route — like Pitampura route: ₹2.4L." },
      { icon: "💸", title: "Daily Cash Settlement",    desc: "End-of-day cash collection from salesmen vs digital payments — reconcile in 2 minutes." },
      { icon: "📦", title: "Inventory + Dues",         desc: "See stock levels alongside payment dues. When you go to collect, also check what to re-supply." },
      { icon: "📋", title: "Company-wise Ledger",      desc: "Track Nestlé dues, HUL dues, ITC dues separately — company-category analysis." },
      { icon: "🏃", title: "Salesman Performance",     desc: "Which salesman collected how much this week? Compare targets vs actuals." },
      { icon: "📱", title: "WhatsApp Reminders",       desc: "Bulk WhatsApp to all retailers on a route before collection day — reduces missed visits." },
    ],
    notNeeded: ["Cash Forecast (use daily settlement)", "CRM (retailers don't need full CRM)"],
    waTemplates: [
      {
        label: "Collection Day Reminder",
        message: "{name} bhai, kal hamare salesman {salesman_name} aayenge collection ke liye. ₹{amount} ready rakhna. UPI bhi accept karte hain: {upi_id}",
      },
      {
        label: "Overdue Follow-Up",
        message: "{name} bhai, aapka {month} ka baki — ₹{amount} — abhi bhi pending hai. Kab milega? Phone pe bata do, salesman ko bhejte hain.",
      },
      {
        label: "Credit Limit",
        message: "Namaskar {name}, aapka credit limit ₹{limit} hai. Current outstanding ₹{outstanding} ho gaya hai. Next delivery ke pehle ₹{shortfall} settle karna padega.",
      },
    ],
    tips: [
      "Create customer groups by route — makes collection days efficient",
      "Use Today's Orders page to see what was dispatched vs what's been collected",
      "Set Auto Follow-Up to trigger 3 days after invoice date for fast-moving grocery credit",
      "Scanner can photograph delivery challans and create invoices automatically",
    ],
  },

  // ── RESTAURANT ─────────────────────────────────────────────────────────────
  restaurant: {
    key: "restaurant",
    label: "Restaurant / F&B",
    emoji: "🍽️",
    color: "#EF4444",
    description: "Restaurants, cloud kitchens, food & beverage businesses",
    hiddenRoutes: [
      "/collections", "/dunning", "/whatsapp", "/khata",
      "/crm", "/forecast", "/network", "/scanner",
    ],
    terms: {
      customer:    "Table / Order",
      invoice:     "Bill",
      outstanding: "Pending Orders",
      collection:  "Revenue",
    },
    coreFeatures: [
      { icon: "📊", title: "Daily P&L Dashboard",      desc: "Today's revenue vs food cost vs labour cost. Know your margins by end of service." },
      { icon: "💰", title: "Expense Tracking",         desc: "Log daily ingredient purchases, utility bills, staff salary — see where money goes." },
      { icon: "📦", title: "Purchase Management",      desc: "Track vendor invoices for vegetables, meat, dairy. Know what you're spending per supplier." },
      { icon: "👥", title: "Staff Attendance",         desc: "Mark daily attendance for kitchen and service staff. Calculate payroll accurately." },
      { icon: "🏦", title: "Bank Reconciliation",      desc: "Match POS settlements (Swiggy, Zomato, UPI, cash) with your bank — catch settlement gaps." },
      { icon: "📈", title: "Sales Analytics",          desc: "Which items sell most? Which days are peak? Spot trends before planning menu changes." },
    ],
    notNeeded: [
      "Collections module (restaurants collect at time of service)",
      "Customer Khata (no credit sales)",
      "Auto Follow-Up / Dunning (no receivables)",
      "WhatsApp collections (no B2B credit)",
      "Cash Flow Forecast (use daily P&L instead)",
      "CRM (no B2B customer relationships)",
    ],
    waTemplates: [
      {
        label: "Vendor Payment Due",
        message: "Namaskar {name} ji, is hafte ka supplier payment ₹{amount} pending hai. Please account details bhej dena, NEFT kar dete hain {date} tak.",
      },
    ],
    tips: [
      "Today's P&L is your most important page — check it every evening after service",
      "Log all purchases under the Purchases module — even small daily vegetable purchases",
      "Use Staff Attendance daily — it makes monthly payroll calculation instant",
      "Bank Monitor shows Swiggy/Zomato settlement delays — follow up if it's >7 days",
    ],
  },

  // ── MANUFACTURING ──────────────────────────────────────────────────────────
  manufacturing: {
    key: "manufacturing",
    label: "Manufacturing",
    emoji: "🏭",
    color: "#3B82F6",
    description: "Manufacturers, fabricators, processing units",
    hiddenRoutes: ["/network"],
    terms: {
      customer:    "Buyer / Dealer",
      invoice:     "Invoice",
      outstanding: "Receivables",
      collection:  "Recovery",
    },
    coreFeatures: [
      { icon: "📋", title: "PO to Payment Tracking",   desc: "Track each Purchase Order from buyer: PO received → goods dispatched → invoice raised → payment due." },
      { icon: "💰", title: "Dealer-wise Receivables",  desc: "See every dealer's outstanding across all invoices. Prioritized by overdue amount and risk." },
      { icon: "📦", title: "Inventory Tracking",       desc: "Raw material in + finished goods out. Know your current stock and value at all times." },
      { icon: "🧾", title: "GST Invoice (B2B)",        desc: "Professional GST invoices with correct HSN codes for your product category." },
      { icon: "📊", title: "Cash Flow Forecast",       desc: "Predict cash inflows based on dealer payment history + current outstanding. Plan production accordingly." },
      { icon: "📱", title: "Dealer Follow-Up",         desc: "AI-drafted WhatsApp messages to dealers — firm, professional, in their language." },
    ],
    notNeeded: ["Restaurant-specific features", "Retail POS"],
    waTemplates: [
      {
        label: "Invoice Due",
        message: "{name} ji, Invoice #{inv_no} (₹{amount}) ki due date {date} thi. Abhi {days} din ho gaye hain. Payment status kya hai? RTGS/NEFT ya cheque — jo convenient ho.",
      },
      {
        label: "Large Overdue",
        message: "Namaskar {name} ji, aapka total outstanding ₹{amount} ho gaya hai, {days} din se pending. Ek baar call karein ya neeche diye account mein transfer kar dein. Urgent hai.",
      },
      {
        label: "PO Dispatch Confirmation",
        message: "{name} ji, aapka PO #{po_no} dispatch ho gaya hai. Invoice ₹{amount} attached hai. Payment 30 din mein request hai. Koi issue ho toh seedha call karein.",
      },
    ],
    tips: [
      "Tag every invoice with the buyer's PO number — makes dispute resolution instant",
      "Use Cash Forecast before planning a production run — ensure you'll get paid before you spend",
      "Scanner digitizes your raw material purchase invoices — feeds directly into Purchases module",
      "Set different dunning intervals per dealer tier — top dealers get softer reminders",
    ],
  },

  // ── REAL ESTATE ────────────────────────────────────────────────────────────
  real_estate: {
    key: "real_estate",
    label: "Real Estate",
    emoji: "🏢",
    color: "#6366F1",
    description: "Developers, builders, property managers, real estate agents",
    hiddenRoutes: ["/inventory", "/scanner", "/orders", "/network", "/dunning"],
    terms: {
      customer:    "Buyer / Tenant",
      invoice:     "Demand Letter",
      outstanding: "Installment Dues",
      collection:  "Recovery",
    },
    coreFeatures: [
      { icon: "🏠", title: "Unit-wise Payment Schedule", desc: "Track each flat/plot/unit separately. See: buyer name, total cost, paid so far, upcoming installments." },
      { icon: "📅", title: "Installment Due Alerts",     desc: "Auto-alerts 7 days before each installment due date. WhatsApp reminder to buyer on due date." },
      { icon: "💰", title: "Project Cash Flow",          desc: "See expected cash inflows project-wise. Critical for construction planning and loan repayment." },
      { icon: "📋", title: "Buyer Ledger (Khata)",       desc: "Complete payment history per buyer: token → agreement → construction demands → registry." },
      { icon: "👥", title: "CRM for Leads",              desc: "Track hot leads, site visit follow-ups, and closing stage per prospect." },
      { icon: "🧾", title: "GST Demand Letters",         desc: "Generate GST-compliant demand letters for construction installments." },
    ],
    notNeeded: [
      "Inventory management (not applicable for real estate)",
      "Daily orders module",
      "Invoice scanner",
      "Auto-dunning (manual follow-up is better for high-value buyers)",
    ],
    waTemplates: [
      {
        label: "Installment Due",
        message: "Namaskar {name} ji, {project} mein aapki {unit} ka {installment_name} (₹{amount}) due date {date} hai. Kindly arrange payment. Account details same rahenge. Koi question ho toh call karein.",
      },
      {
        label: "Overdue Installment",
        message: "{name} ji, aapka {installment_name} payment ₹{amount} {days} din se pending hai. Aapke saath discuss karna tha — please call karein ya reply karein convenient time batayein.",
      },
      {
        label: "Registry Reminder",
        message: "Namaskar {name} ji, aapki {unit} ki registry ki date {date} hai. Full payment ₹{balance} clear karna zaroori hai registry se pehle. Please confirm karein.",
      },
    ],
    tips: [
      "Use Customer Khata with unit numbers as customer names (e.g., 'A-402 Sharma') for easy tracking",
      "Set installment schedules in Auto Follow-Up — never miss a demand reminder",
      "CRM is critical for tracking site visit leads — follow up fast, deals close in 48 hours",
      "Cash Forecast shows you which month has heavy collection targets — plan loan EMIs accordingly",
    ],
  },

  // ── TRADING / DISTRIBUTION ─────────────────────────────────────────────────
  trading: {
    key: "trading",
    label: "Trading / Distribution",
    emoji: "🏪",
    color: "#0EA5E9",
    description: "General traders, distributors, dealers — any product category",
    hiddenRoutes: ["/network"],
    terms: {
      customer:    "Party / Buyer",
      invoice:     "Bill",
      outstanding: "Party Dues",
      collection:  "Recovery",
    },
    coreFeatures: [
      { icon: "💰", title: "Party-wise Collections",    desc: "Every party's outstanding in one view. AI ranks who to call first based on amount and overdue days." },
      { icon: "📋", title: "Customer Khata",            desc: "Running account per party — every bill, payment, and balance in chronological order." },
      { icon: "📦", title: "Purchase + Inventory",      desc: "Track what you bought from suppliers and what you have in stock." },
      { icon: "📱", title: "Hinglish WhatsApp",         desc: "AI-drafted collection messages in the right tone for each party." },
      { icon: "🧾", title: "GST Invoices",              desc: "Professional GST bills with auto-calculation for all tax slabs." },
      { icon: "📊", title: "Cash Flow Forecast",        desc: "Know next 30/60 days cash position — plan purchases without running dry." },
    ],
    notNeeded: ["Restaurant P&L", "Real estate installments", "Job work tracking"],
    waTemplates: [
      {
        label: "Payment Due",
        message: "{name} bhai, aapka ₹{amount} {days} din se pending hai. Kab tak settle ho sakta hai? UPI bhi le lete hain — {upi_id}",
      },
      {
        label: "Strict Follow-Up",
        message: "Namaskar {name} ji, humne kaafi bar remind kiya hai. ₹{amount} ab {days} din se overdue hai. Aaj kuch settlement karte hain — kitna possible hai?",
      },
      {
        label: "New Bill Notification",
        message: "{name} bhai, aapka naya bill #{inv_no} — ₹{amount} — ban gaya hai. {due_days} din mein payment ho jaaye toh accha rahega. Invoice attached hai.",
      },
    ],
    tips: [
      "Check Collections page every morning — AI tells you exactly who to call first",
      "Use Auto Follow-Up from Day 1 — don't wait until payment is 60 days overdue",
      "Razorpay payment links in WhatsApp get paid 3x faster than account transfer requests",
      "Monthly Analytics shows which customers are slow payers — tighten their credit terms",
    ],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map all industry values (onboarding + settings) → BusinessTypeKey */
export const INDUSTRY_TO_TYPE: Record<string, BusinessTypeKey> = {
  // Direct matches
  construction:  "construction",
  textile:       "textile",
  pharma:        "pharma",
  grocery:       "grocery",
  restaurant:    "restaurant",
  manufacturing: "manufacturing",
  real_estate:   "real_estate",
  trading:       "trading",
  // Aliases / legacy values
  general:       "trading",
  distribution:  "trading",
  services:      "trading",
  service:       "trading",
  retail:        "grocery",
  kirana:        "grocery",
  fmcg:          "grocery",
  medical:       "pharma",
  healthcare:    "pharma",
  garments:      "textile",
  fashion:       "textile",
  builder:       "construction",
  contractor:    "construction",
  realestate:    "real_estate",
  hotel:         "restaurant",
  food:          "restaurant",
  construction:  "construction",
  textile:       "textile",
  pharma:        "pharma",
  grocery:       "grocery",
  restaurant:    "restaurant",
  real_estate:   "real_estate",
  other:         "trading",
  general:       "trading",   // onboarding "General Business" option
  distributor:   "trading",
  trader:        "trading",
  service:       "trading",
  retailer:      "grocery",
  startup:       "trading",
  manufacturer:  "manufacturing",
};

/** Expanded industry options for Settings → Business tab */
export const INDUSTRY_OPTIONS = [
  { value: "trading",       label: "Trading / Distribution" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "construction",  label: "Construction & Contractors" },
  { value: "textile",       label: "Textile & Garments" },
  { value: "pharma",        label: "Pharma / Medical" },
  { value: "grocery",       label: "Grocery / FMCG" },
  { value: "restaurant",    label: "Restaurant / F&B" },
  { value: "real_estate",   label: "Real Estate & Builders" },
  { value: "services",      label: "Services" },
  { value: "other",         label: "Other" },
];

/** Get business type config from localStorage */
export function getBusinessType(): BusinessTypeConfig | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("vantro_industry") || localStorage.getItem("vantro_business_type");
  if (!raw) return null;
  const key = INDUSTRY_TO_TYPE[raw] || (raw as BusinessTypeKey);
  return BUSINESS_TYPES[key as BusinessTypeKey] || null;
}

/** Set business type in localStorage */
export function setBusinessType(industryValue: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("vantro_industry", industryValue);
}

/** Check if a route should be hidden for the current business type */
export function isRouteHidden(route: string, businessType: BusinessTypeConfig | null): boolean {
  if (!businessType) return false; // no type set → show everything
  return businessType.hiddenRoutes.some(r => route === r || route.startsWith(r + "/"));
}

/**
 * Smart route filtering — combines industry type + onboarding YES/NO answers.
 * Returns a Set of routes to HIDE for the current user.
 *
 * Priority: industry hides (most specific) + flag-based hides (from onboarding answers)
 */
export function getSmartHiddenRoutes(): Set<string> {
  if (typeof window === "undefined") return new Set();

  const industry = localStorage.getItem("vantro_industry") || "";
  const flagsRaw = localStorage.getItem("vantro_biz_flags");
  const flags: {
    biz_type?: string;
    sells_credit?: boolean | null;
    has_workers?: boolean | null;
    gst_registered?: boolean | null;
    biz_size?: string;
  } = flagsRaw ? JSON.parse(flagsRaw) : {};

  // Start with industry-level hidden routes
  const typeKey = INDUSTRY_TO_TYPE[industry] || null;
  const typeConfig = typeKey ? BUSINESS_TYPES[typeKey] : null;
  const hidden = new Set<string>(typeConfig?.hiddenRoutes ?? []);

  // ── Flag-based rules ───────────────────────────────────────────────────────
  // No credit sales → hide all collections/receivables tooling
  if (flags.sells_credit === false) {
    ["/collections", "/whatsapp", "/dunning", "/khata", "/crm", "/forecast"].forEach(r => hidden.add(r));
  }

  // No workers/employees → hide attendance
  if (flags.has_workers === false) {
    hidden.add("/attendance");
  }

  // Not GST registered → hide GST invoice generator
  if (flags.gst_registered === false) {
    hidden.add("/bills");
  }

  // Micro-business (under ₹50L) → hide network (B2B marketplace, not relevant yet)
  if (flags.biz_size === "micro") {
    hidden.add("/network");
  }

  return hidden;
}

/** Convenience: return hidden routes as array, for use in Sidebar */
export function getHiddenRoutesArray(): string[] {
  return Array.from(getSmartHiddenRoutes());
}
