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
  | "trading"
  | "education"
  | "healthcare"
  | "steel_metals"
  | "auto_parts"
  | "it_services"
  | "logistics"
  | "jewellery"
  | "agriculture";

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
    hiddenRoutes: ["/orders", "/network", "/attendance", "/scanner", "/ledger"],
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

  // ── EDUCATION ──────────────────────────────────────────────────────────────
  education: {
    key: "education",
    label: "Education",
    emoji: "🎓",
    color: "#0EA5E9",
    description: "Schools, coaching centers, tuition institutes, ed-tech",
    hiddenRoutes: ["/inventory", "/scanner", "/network", "/orders"],
    terms: {
      customer:    "Student / Parent",
      invoice:     "Fee Receipt",
      outstanding: "Fee Dues",
      collection:  "Fee Collection",
    },
    coreFeatures: [
      { icon: "📚", title: "Student Fee Tracker",       desc: "Track fee dues student-wise. See who's paid, who's pending, and whose cheque bounced — batch-wise." },
      { icon: "📅", title: "Installment Fee Plans",     desc: "Set quarterly / monthly fee plans per student. Auto-remind parents 5 days before due date." },
      { icon: "📱", title: "Parent WhatsApp Reminder",  desc: "Soft, professional WhatsApp reminders to parents in Hindi/English. Doesn't damage relationship." },
      { icon: "📊", title: "Batch-wise Analytics",      desc: "See which batch or standard has most defaults. Identify patterns early." },
      { icon: "💰", title: "Cash Flow Forecast",        desc: "Predict monthly fee inflows. Plan teacher salaries and operating expenses confidently." },
      { icon: "🏦", title: "Bank Reconciliation",       desc: "Match fee payments (online + cash + cheque) with your bank automatically." },
    ],
    notNeeded: ["Inventory management", "B2B collections", "Job work tracking", "Vantro Network"],
    waTemplates: [
      { label: "Fee Due Reminder", message: "Namaskar {name} ji, {student_name} ki {month} ki fees Rs.{amount} abhi bhi pending hai. Kripya {due_date} tak jama karein. Online transfer ya cash dono chalega. Dhanyavaad." },
      { label: "Fee Overdue", message: "Namaskar {name} ji, {student_name} ki fees Rs.{amount} {days} din se overdue hai. Kripya aaj hi school mein contact karein ya neeche diye account mein transfer karein." },
      { label: "Exam Fee Notice", message: "{name} ji, {student_name} ki exam fees Rs.{amount} ki last date {date} hai. Time par jama na hone par admit card hold ho sakta hai. Please urgently arrange karein." },
    ],
    tips: [
      "Create a batch per class/standard — group students for bulk fee reminders",
      "Set installment plans per student in Payment Plans module — reduces defaults by 40%",
      "Send reminders 5 days before due date, not on the day — parents need time to arrange",
      "Use Analytics to see which months have most defaults — plan accordingly",
    ],
  },

  // ── HEALTHCARE ─────────────────────────────────────────────────────────────
  healthcare: {
    key: "healthcare",
    label: "Healthcare",
    emoji: "🏥",
    color: "#06B6D4",
    description: "Clinics, hospitals, diagnostic centers, medical suppliers",
    hiddenRoutes: ["/orders", "/network", "/scanner"],
    terms: {
      customer:    "Patient / TPA",
      invoice:     "Bill / Invoice",
      outstanding: "TPA Dues / Patient Dues",
      collection:  "Reimbursement",
    },
    coreFeatures: [
      { icon: "🏥", title: "TPA Reimbursement Tracker",  desc: "Track insurance company (TPA) claim status — submitted, under review, approved, paid. Know your stuck money." },
      { icon: "👤", title: "Patient Dues",               desc: "Track patient outstanding separately from TPA — co-payments, room upgrades, non-covered items." },
      { icon: "📋", title: "Claim Aging Report",          desc: "See how long each TPA claim has been pending. Claims >45 days get flagged for escalation." },
      { icon: "💰", title: "Cash Flow Forecast",          desc: "Predict when insurance reimbursements will arrive — avoid cash crunch for salaries and supplies." },
      { icon: "📱", title: "Patient Follow-Up",           desc: "Gentle WhatsApp follow-up for patient balances — maintains dignity while collecting." },
      { icon: "📊", title: "Revenue by TPA",              desc: "Which insurance company gives you most business — and which delays payments most." },
    ],
    notNeeded: ["Inventory (use dedicated medical software)", "Job work", "Vantro Network"],
    waTemplates: [
      { label: "Patient Balance", message: "Namaskar {name} ji, aapka {date} ka balance Rs.{amount} abhi bhi pending hai (insurance ke baad). Kripya reception se contact karein ya UPI se settle karein. Hospital number: {phone}" },
      { label: "TPA Claim Follow-Up", message: "Dear {tpa_name} team, Claim ID {claim_id} for patient {patient_name} (admission: {date}, amount: Rs.{amount}) is pending for {days} days. Request urgent processing. Contact: {contact}" },
    ],
    tips: [
      "Create one 'customer' per TPA company — track all claims under that party",
      "Use Dunning Rules with 15-day intervals for TPA follow-ups — they respond to persistence",
      "Patient balance collection works best with payment links — they pay on phone in 2 minutes",
      "Cash Forecast helps plan staff salaries even when TPA payments are delayed",
    ],
  },

  // ── STEEL / METALS ─────────────────────────────────────────────────────────
  steel_metals: {
    key: "steel_metals",
    label: "Steel & Metals",
    emoji: "⚙️",
    color: "#64748B",
    description: "Steel traders, TMT dealers, metal distributors, scrap dealers",
    hiddenRoutes: ["/network", "/attendance"],
    terms: {
      customer:    "Buyer / Contractor",
      invoice:     "Invoice / Challan",
      outstanding: "Party Dues",
      collection:  "Recovery",
    },
    coreFeatures: [
      { icon: "📋", title: "Party-wise Ledger",          desc: "Track what each contractor/builder owes across multiple deliveries. Running balance view." },
      { icon: "📄", title: "PDC Tracker",                desc: "Post-dated cheque management — know which cheques are due for deposit when." },
      { icon: "📦", title: "Stock + Dues Combined",      desc: "See current TMT / MS / structural stock and who owes money for last dispatches — together." },
      { icon: "🔄", title: "Price Variation Tracking",   desc: "Tag invoices with the steel price on that date. Track disputes due to price changes." },
      { icon: "📊", title: "Risk by Party",              desc: "Which contractor has taken maximum credit? Flag parties crossing your credit limit." },
      { icon: "📱", title: "WhatsApp Follow-Up",         desc: "Firm, professional reminders in contractor language. Works for both small and large buyers." },
    ],
    notNeeded: ["Restaurant features", "Education fee tracking", "Retail POS"],
    waTemplates: [
      { label: "Invoice Due", message: "{name} bhai, Invoice #{inv_no} (Rs.{amount}) ka {days} din ho gaye hain. PDC hoga toh date batao, RTGS chahiye toh account details deta hoon." },
      { label: "PDC Due for Deposit", message: "{name} bhai, aapka cheque no. {cheque_no} (Rs.{amount}, date: {date}) kal deposit karna hai. Ensure karein account mein funds hain." },
      { label: "Credit Limit Warning", message: "{name} bhai, aapka total outstanding Rs.{outstanding} ho gaya hai — credit limit Rs.{limit} hai. Next delivery ke pehle kuch settle karo please." },
    ],
    tips: [
      "Create PDC entry in Khata for every post-dated cheque — get alerts 3 days before deposit date",
      "Tag large orders with price-of-the-day — protects you in price-change disputes",
      "Auto Follow-Up with 7-day intervals works well for steel — contractors need reminders",
      "Use Risk Analytics to see which contractors have been stretching credit",
    ],
  },

  // ── AUTO PARTS ─────────────────────────────────────────────────────────────
  auto_parts: {
    key: "auto_parts",
    label: "Auto Parts",
    emoji: "🔧",
    color: "#DC2626",
    description: "Auto parts distributors, spare parts dealers, garage suppliers",
    hiddenRoutes: ["/network", "/forecast"],
    terms: {
      customer:    "Garage / Retailer",
      invoice:     "Bill",
      outstanding: "Party Balance",
      collection:  "Collection",
    },
    coreFeatures: [
      { icon: "🔧", title: "Garage-wise Ledger",         desc: "Track what each garage owes across all parts supplied. Running balance view per party." },
      { icon: "📦", title: "Part-wise Inventory",        desc: "Track stock of each SKU — filter by brand, part number, vehicle type. Low stock alerts." },
      { icon: "🚗", title: "Route-wise Collection",      desc: "Group garages by route/area. See total outstanding per route before sending salesman." },
      { icon: "🔄", title: "Return & Replacement",       desc: "Track parts returned or replaced — adjust outstanding accordingly." },
      { icon: "📱", title: "WhatsApp Reminder",          desc: "Quick reminders to garage owners — they respond fast to WhatsApp." },
      { icon: "📊", title: "Salesman Performance",       desc: "Which salesman collected how much this week? Target vs actual tracking." },
    ],
    notNeeded: ["Cash Flow Forecast (daily settlement works better)", "CRM (not B2B complex sales)"],
    waTemplates: [
      { label: "Payment Due", message: "{name} bhai, aapka Rs.{amount} ka maal pending hai {days} din se. Kal salesman aa raha hai, ready rakhna. Ya UPI pe bhej dena: {upi_id}" },
      { label: "Collection Day", message: "{name} bhai, kal {salesman_name} collection ke liye aayenge. Rs.{amount} ready rakhein. UPI bhi accept karte hain." },
    ],
    tips: [
      "Group customers by route/area — salesman can do 1 route per day efficiently",
      "Scanner can photograph part invoices from companies — auto-import into Purchases",
      "Set credit limits per garage in CRM — stop supply when limit breached",
      "Auto Follow-Up every 3 days works well for garage owners",
    ],
  },

  // ── IT SERVICES ────────────────────────────────────────────────────────────
  it_services: {
    key: "it_services",
    label: "IT / Software",
    emoji: "💻",
    color: "#7C3AED",
    description: "IT agencies, software companies, web developers, SaaS businesses",
    hiddenRoutes: ["/inventory", "/scanner", "/orders", "/attendance", "/network"],
    terms: {
      customer:    "Client",
      invoice:     "Invoice",
      outstanding: "Client Dues",
      collection:  "Payment",
    },
    coreFeatures: [
      { icon: "📋", title: "Project Milestone Billing",  desc: "Create invoices tied to project milestones — design done, dev done, delivery. Track which milestone triggers payment." },
      { icon: "🔄", title: "Retainer Tracking",         desc: "Monthly retainer clients — see who's paid this month, who's late, send auto-reminder." },
      { icon: "⚠️", title: "Dispute Management",        desc: "Client says deliverable isn't done? Raise dispute, pause invoice, track resolution without damaging relationship." },
      { icon: "💰", title: "Revenue Forecast",           desc: "Upcoming milestone invoices + retainer renewals — predict next 3 months revenue." },
      { icon: "📱", title: "Professional Follow-Up",     desc: "Formal, English WhatsApp follow-ups that suit IT client relationships." },
      { icon: "📊", title: "Client Risk Score",          desc: "Which clients delay most? Use data to tighten terms for slow payers on next project." },
    ],
    notNeeded: ["Inventory management", "Cash register / POS", "Daily orders", "Route management"],
    waTemplates: [
      { label: "Milestone Invoice", message: "Hi {name}, sharing invoice #{inv_no} for the {milestone} milestone completion (Rs.{amount}). Payment due by {date}. Let me know if you have any questions." },
      { label: "Retainer Reminder", message: "Hi {name}, your monthly retainer for {month} (Rs.{amount}) is due. Please transfer to the usual account or use the payment link: {link}. Thanks!" },
      { label: "Overdue Follow-Up", message: "Hi {name}, following up on invoice #{inv_no} (Rs.{amount}) which was due {days} days ago. Could you share an ETA? Happy to discuss if there are any concerns." },
    ],
    tips: [
      "Tag every invoice with the project name and milestone — makes client disputes instant to resolve",
      "Raise invoices immediately on milestone completion — don't wait for client approval to invoice",
      "Use Dispute Management to formally track any client objection — protects you legally",
      "Retainer clients should be on Auto Follow-Up starting Day 1 of each month",
    ],
  },

  // ── LOGISTICS / TRANSPORT ──────────────────────────────────────────────────
  logistics: {
    key: "logistics",
    label: "Logistics",
    emoji: "🚛",
    color: "#EA580C",
    description: "Transport companies, logistics providers, courier aggregators",
    hiddenRoutes: ["/scanner", "/network"],
    terms: {
      customer:    "Shipper / Client",
      invoice:     "LR / Invoice",
      outstanding: "Freight Dues",
      collection:  "Freight Collection",
    },
    coreFeatures: [
      { icon: "🚛", title: "LR-wise Collections",        desc: "Track payment per Lorry Receipt number. Know which consignment's freight is pending." },
      { icon: "📋", title: "Client-wise Ledger",         desc: "All LRs under one client in one view. Total outstanding per shipper." },
      { icon: "📄", title: "POD-linked Payment",         desc: "Mark invoice as billable only after Proof of Delivery — no disputes on incomplete deliveries." },
      { icon: "📦", title: "Vehicle & Route Tracking",   desc: "Which route/vehicle is generating most outstanding? Identify problem areas." },
      { icon: "📱", title: "WhatsApp Follow-Up",         desc: "Follow up with logistics managers and accounts teams professionally." },
      { icon: "💰", title: "Cash Flow Forecast",         desc: "Predict freight income based on credit terms per client. Plan diesel and driver expenses." },
    ],
    notNeeded: ["Retail inventory", "Restaurant features", "Student fee tracking"],
    waTemplates: [
      { label: "Freight Due", message: "{name} bhai, LR #{lr_no} ({route}, Rs.{amount}) ka {days} din ho gaye hain. POD deliver ho gaya hai. Kab tak payment process hoga?" },
      { label: "Monthly Statement", message: "Namaskar {name} ji, {month} ka freight statement: Total dues Rs.{amount} ({count} LRs). Detailed statement WhatsApp pe bhej raha hoon. Kripya is hafte settle karein." },
    ],
    tips: [
      "Tag every invoice with LR number and route — makes follow-up super specific",
      "Mark POD received date in Notes — protects you if client disputes delivery",
      "Send monthly statements to regular clients — they pay when they see the full picture",
      "Use Credit Limit per shipper — flag when they exceed before taking more loads",
    ],
  },

  // ── JEWELLERY ──────────────────────────────────────────────────────────────
  jewellery: {
    key: "jewellery",
    label: "Jewellery",
    emoji: "💍",
    color: "#D97706",
    description: "Jewellers, gold traders, diamond dealers, jewellery manufacturers",
    hiddenRoutes: ["/orders", "/network", "/attendance"],
    terms: {
      customer:    "Party / Retailer",
      invoice:     "Bill",
      outstanding: "Party Balance",
      collection:  "Recovery",
    },
    coreFeatures: [
      { icon: "💍", title: "Consignment Tracker",        desc: "Gold/jewellery given on consignment — track which party has what, at what rate, since when." },
      { icon: "📋", title: "Party-wise Ledger",          desc: "All transactions per jeweller/retailer — purchases, returns, payments — in one ledger." },
      { icon: "📄", title: "Gold Rate-linked Billing",   desc: "Tag invoices with gold rate on billing date — prevents disputes on rate fluctuation." },
      { icon: "📦", title: "Stock on Consignment",       desc: "Track pieces sent on approval — pieces returned, pieces sold, outstanding on sold pieces." },
      { icon: "📱", title: "Discreet Follow-Up",         desc: "Subtle WhatsApp messages appropriate for the jewellery trade relationship." },
      { icon: "📊", title: "Party Risk Analytics",       desc: "Which party has held stock too long without settling? Time to recall or collect." },
    ],
    notNeeded: ["Restaurant features", "Education fee tracking", "Logistics tracking"],
    waTemplates: [
      { label: "Consignment Due", message: "Namaskar {name} ji, jo maal {date} ko consignment pe diya tha — abhi tak Rs.{amount} ka hisaab baaki hai. Please settle karein ya maal wapas karein." },
      { label: "Payment Reminder", message: "{name} bhai, aapka Rs.{amount} pending hai. {days} din ho gaye hain. Sona wapas le lenge ya aaj settlement karein? Batao." },
    ],
    tips: [
      "Create one ledger entry per consignment lot — track return vs sold separately",
      "Always note gold rate on invoice date — saves disputes when gold price moves",
      "Consignment recovery before 90 days — use Auto Follow-Up from day 45",
      "Risk Analytics shows you who's sitting on stock longest — prioritize those calls",
    ],
  },

  // ── AGRICULTURE ────────────────────────────────────────────────────────────
  agriculture: {
    key: "agriculture",
    label: "Agriculture",
    emoji: "🌾",
    color: "#16A34A",
    description: "Seed distributors, fertilizer dealers, agri input companies, mandis",
    hiddenRoutes: ["/network", "/attendance"],
    terms: {
      customer:    "Farmer / Dealer",
      invoice:     "Bill",
      outstanding: "Party Dues",
      collection:  "Recovery",
    },
    coreFeatures: [
      { icon: "🌾", title: "Seasonal Payment Tracking",  desc: "Farmers pay after harvest — track who owes from which season (Kharif/Rabi). Seasonal aging." },
      { icon: "📋", title: "Farmer-wise Ledger",         desc: "All purchases, payments, credit history per farmer/dealer. Know who is reliable." },
      { icon: "📦", title: "Input Stock Tracker",        desc: "Seeds, fertilizer, pesticide inventory — know what's in stock, what's sold on credit." },
      { icon: "📅", title: "Harvest Season Reminders",   desc: "Auto-reminders triggered by harvest calendar — right time to collect, not random." },
      { icon: "📱", title: "Hindi WhatsApp",             desc: "Simple Hindi messages that farmers and rural dealers understand and respond to." },
      { icon: "📊", title: "Dealer Risk Score",           desc: "Which dealer gives credit to farmers and passes that delay to you? Identify the chain." },
    ],
    notNeeded: ["IT milestone billing", "TPA reimbursement", "Restaurant POS"],
    waTemplates: [
      { label: "Post-Harvest Reminder", message: "{name} bhai, is saal ki Kharif/Rabi fasal ho gayi. Aapka Rs.{amount} ka hisaab baaki hai. Jab bhi suvidha ho, mil ke hisaab kar lete hain." },
      { label: "Dealer Due", message: "{name} ji, aapka Rs.{amount} pending hai {days} din se. Kripya is hafte aake settle karein ya phone pe batayein kab tak sambhav hai." },
      { label: "Season Credit Notice", message: "{name} bhai, agla season shuru hone wala hai. Pichhle season ka Rs.{amount} abhi bhi baaki hai. Pehle purana hisaab clear karein phir nayi supply milegi." },
    ],
    tips: [
      "Tag every invoice with season name (Kharif2025, Rabi2025) — seasonal analysis becomes easy",
      "Set dunning to start 30 days AFTER harvest month — not before, farmers can't pay before harvest",
      "Dealer who delays means their farmers delayed them — track the chain",
      "Use Cash Forecast to predict post-harvest collection and plan next season's stock purchase",
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
  education:     "education",
  healthcare:    "healthcare",
  steel_metals:  "steel_metals",
  auto_parts:    "auto_parts",
  it_services:   "it_services",
  logistics:     "logistics",
  jewellery:     "jewellery",
  agriculture:   "agriculture",
  // Aliases / legacy values
  general:       "trading",
  distribution:  "trading",
  services:      "it_services",
  service:       "it_services",
  retail:        "grocery",
  kirana:        "grocery",
  fmcg:          "grocery",
  medical:       "healthcare",
  clinic:        "healthcare",
  hospital:      "healthcare",
  diagnostic:    "healthcare",
  garments:      "textile",
  fashion:       "textile",
  builder:       "construction",
  contractor:    "construction",
  realestate:    "real_estate",
  hotel:         "restaurant",
  food:          "restaurant",
  other:         "trading",
  distributor:   "trading",
  trader:        "trading",
  retailer:      "grocery",
  startup:       "trading",
  manufacturer:  "manufacturing",
  school:        "education",
  college:       "education",
  coaching:      "education",
  tuition:       "education",
  steel:         "steel_metals",
  metals:        "steel_metals",
  iron:          "steel_metals",
  tmt:           "steel_metals",
  auto:          "auto_parts",
  spare_parts:   "auto_parts",
  transport:     "logistics",
  courier:       "logistics",
  freight:       "logistics",
  gold:          "jewellery",
  jewelry:       "jewellery",
  diamond:       "jewellery",
  seeds:         "agriculture",
  fertilizer:    "agriculture",
  agri:          "agriculture",
  mandi:         "agriculture",
  it:            "it_services",
  software:      "it_services",
  tech:          "it_services",
  digital:       "it_services",
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
  { value: "education",     label: "Education & Coaching" },
  { value: "healthcare",    label: "Healthcare / Clinic / Hospital" },
  { value: "steel_metals",  label: "Steel & Metals" },
  { value: "auto_parts",    label: "Auto Parts & Spare Parts" },
  { value: "it_services",   label: "IT / Software / Digital Agency" },
  { value: "logistics",     label: "Logistics & Transport" },
  { value: "jewellery",     label: "Jewellery & Gold" },
  { value: "agriculture",   label: "Agriculture / Seeds / Fertilizer" },
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
