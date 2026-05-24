// ─────────────────────────────────────────────────────────────────────────────
// Vantro Feature Gating System
// Decides which features to show based on:
//   1. Industry / Business Type
//   2. Plan (free / starter / growth / pro)
//   3. Team size
//   4. Business size
//   5. Onboarding answers
// ─────────────────────────────────────────────────────────────────────────────

export type Plan = "free" | "starter" | "growth" | "pro";
export type TeamSize = "solo" | "small" | "medium" | "large"; // 1 / 2-5 / 6-20 / 20+
export type BizSize = "micro" | "small" | "medium"; // <50L / 50L-5Cr / 5Cr+

export interface UserContext {
  industry: string;
  plan: Plan;
  teamSize?: TeamSize;
  bizSize?: BizSize;
  hasInventory?: boolean;
  hasSalesmen?: boolean;
  hasGST?: boolean;
  hasWorkers?: boolean;
}

// ── Master feature list ───────────────────────────────────────────────────────
export type FeatureKey =
  | "collections"       // Core: who owes me money
  | "khata"             // Customer ledger
  | "whatsapp"          // WhatsApp message center
  | "dunning"           // Auto follow-up rules
  | "forecast"          // Cash flow prediction
  | "analytics"         // Business analytics
  | "crm"               // Customer relationship
  | "inventory"         // Stock management
  | "orders"            // Order tracking
  | "purchases"         // Purchase/supplier bills
  | "ledger"            // Bank ledger
  | "bank"              // Bank accounts
  | "scanner"           // Document scanner
  | "team"              // Staff management
  | "attendance"        // Staff attendance
  | "reports"           // Business reports
  | "bills"             // GST invoice generator
  | "billing"           // Subscription billing
  | "brain"             // AI brain / chat
  | "neural_engine"     // ML scoring engine
  | "network"           // Vantro B2B network
  | "voice_calls"       // AI voice calls
  | "payment_plans"     // EMI splits
  | "disputes"          // Dispute management
  | "referrals"         // Refer & earn
  | "ca_portal"         // CA partner portal
  | "bad_debt"          // Bad debt flagging
  | "today"             // Today's priority view
  | "ai_train"          // AI training / persona
  | "my_id";            // Public business profile

// ── Plan-level gates (regardless of industry) ────────────────────────────────
const PLAN_GATES: Record<FeatureKey, Plan[]> = {
  collections:    ["free", "starter", "growth", "pro"],
  khata:          ["free", "starter", "growth", "pro"],
  whatsapp:       ["free", "starter", "growth", "pro"],
  today:          ["free", "starter", "growth", "pro"],
  my_id:          ["free", "starter", "growth", "pro"],
  referrals:      ["free", "starter", "growth", "pro"],
  billing:        ["free", "starter", "growth", "pro"],
  brain:          ["starter", "growth", "pro"],
  dunning:        ["starter", "growth", "pro"],
  forecast:       ["starter", "growth", "pro"],
  analytics:      ["starter", "growth", "pro"],
  crm:            ["starter", "growth", "pro"],
  reports:        ["starter", "growth", "pro"],
  bills:          ["starter", "growth", "pro"],
  payment_plans:  ["starter", "growth", "pro"],
  disputes:       ["starter", "growth", "pro"],
  bad_debt:       ["growth", "pro"],
  inventory:      ["growth", "pro"],
  orders:         ["growth", "pro"],
  purchases:      ["growth", "pro"],
  ledger:         ["growth", "pro"],
  bank:           ["growth", "pro"],
  scanner:        ["growth", "pro"],
  team:           ["growth", "pro"],
  attendance:     ["growth", "pro"],
  voice_calls:    ["pro"],
  neural_engine:  ["pro"],
  network:        ["pro"],
  ca_portal:      ["pro"],
  ai_train:       ["growth", "pro"],
};

// ── Industry feature matrix — which features make sense per industry ──────────
const INDUSTRY_FEATURES: Record<string, FeatureKey[]> = {
  // Trading/Distribution — everything
  trading:       ["collections","khata","whatsapp","dunning","forecast","analytics","crm","inventory","orders","purchases","ledger","bank","scanner","team","attendance","reports","bills","brain","neural_engine","network","voice_calls","payment_plans","disputes","referrals","ca_portal","bad_debt","today","ai_train","my_id","billing"],
  // Manufacturing
  manufacturing: ["collections","khata","whatsapp","dunning","forecast","analytics","crm","inventory","orders","purchases","ledger","bank","scanner","team","attendance","reports","bills","brain","neural_engine","network","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Construction — no inventory/orders/scanner
  construction:  ["collections","khata","whatsapp","dunning","forecast","analytics","crm","purchases","ledger","bank","reports","bills","brain","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Textile
  textile:       ["collections","khata","whatsapp","dunning","forecast","analytics","crm","inventory","purchases","ledger","bank","scanner","reports","bills","brain","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Pharma
  pharma:        ["collections","khata","whatsapp","dunning","forecast","analytics","crm","inventory","purchases","ledger","bank","reports","bills","brain","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Grocery/FMCG — full
  grocery:       ["collections","khata","whatsapp","dunning","analytics","crm","inventory","orders","purchases","ledger","bank","scanner","team","attendance","reports","bills","brain","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Restaurant — no collections, focus on ops
  restaurant:    ["purchases","ledger","bank","team","attendance","reports","bills","brain","analytics","today","my_id","billing"],
  // Real estate
  real_estate:   ["collections","khata","whatsapp","dunning","forecast","analytics","crm","purchases","ledger","bank","reports","bills","brain","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Education
  education:     ["collections","khata","whatsapp","dunning","forecast","analytics","crm","ledger","bank","reports","bills","brain","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Healthcare
  healthcare:    ["collections","khata","whatsapp","dunning","forecast","analytics","crm","purchases","ledger","bank","reports","bills","brain","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Steel/Metals
  steel_metals:  ["collections","khata","whatsapp","dunning","forecast","analytics","crm","inventory","purchases","ledger","bank","scanner","reports","bills","brain","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Auto Parts
  auto_parts:    ["collections","khata","whatsapp","dunning","analytics","crm","inventory","orders","purchases","ledger","bank","scanner","team","attendance","reports","bills","brain","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // IT Services
  it_services:   ["collections","khata","whatsapp","dunning","forecast","analytics","crm","ledger","bank","reports","bills","brain","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Logistics
  logistics:     ["collections","khata","whatsapp","dunning","forecast","analytics","crm","purchases","ledger","bank","reports","bills","brain","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Jewellery
  jewellery:     ["collections","khata","whatsapp","dunning","forecast","analytics","crm","inventory","purchases","ledger","bank","reports","bills","brain","voice_calls","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
  // Agriculture
  agriculture:   ["collections","khata","whatsapp","dunning","forecast","analytics","crm","inventory","purchases","ledger","bank","reports","bills","brain","payment_plans","disputes","referrals","bad_debt","today","ai_train","my_id","billing"],
};

// Default (fallback) — everything
const DEFAULT_FEATURES: FeatureKey[] = Object.keys(PLAN_GATES) as FeatureKey[];

// ── Team-based additional features ───────────────────────────────────────────
function teamFeatures(teamSize: TeamSize | undefined): FeatureKey[] {
  if (!teamSize || teamSize === "solo") return [];
  if (teamSize === "small") return ["team"];
  return ["team", "attendance"]; // medium / large
}

// ── Business size gates ───────────────────────────────────────────────────────
function bizSizeFeatures(bizSize: BizSize | undefined): FeatureKey[] {
  if (!bizSize || bizSize === "micro") return [];
  if (bizSize === "small") return ["network"];
  return ["network", "ca_portal"]; // medium — bigger, needs network
}

// ── Main gating function ──────────────────────────────────────────────────────
export function getGrantedFeatures(ctx: UserContext): Set<FeatureKey> {
  const planOrder: Plan[] = ["free", "starter", "growth", "pro"];
  const planIdx = planOrder.indexOf(ctx.plan);

  // Step 1: Start with industry feature list
  const industryKey = ctx.industry?.toLowerCase().replace(/[^a-z_]/g, "_") || "trading";
  const industryList = INDUSTRY_FEATURES[industryKey] || DEFAULT_FEATURES;

  // Step 2: Add team/biz-size features
  const extra = [
    ...teamFeatures(ctx.teamSize),
    ...bizSizeFeatures(ctx.bizSize),
  ];
  const allAllowed = new Set<FeatureKey>([...industryList, ...extra]);

  // Step 3: Filter by plan gate
  const granted = new Set<FeatureKey>();
  for (const feature of allAllowed) {
    const requiredPlans = PLAN_GATES[feature] || ["pro"];
    const minPlanIdx = Math.min(...requiredPlans.map(p => planOrder.indexOf(p)));
    if (planIdx >= minPlanIdx) {
      granted.add(feature);
    }
  }

  // Step 4: Conditional additions based on onboarding flags
  if (ctx.hasGST) granted.add("bills");
  if (ctx.hasSalesmen) granted.add("team");
  if (ctx.hasWorkers) granted.add("attendance");

  // Always grant core features regardless of plan (retention)
  (["collections", "khata", "today", "billing", "my_id", "referrals"] as FeatureKey[]).forEach(f => {
    if (allAllowed.has(f)) granted.add(f);
  });

  return granted;
}

// ── Route → Feature mapping ───────────────────────────────────────────────────
export const ROUTE_TO_FEATURE: Record<string, FeatureKey> = {
  "/collections":    "collections",
  "/khata":          "khata",
  "/whatsapp":       "whatsapp",
  "/dunning":        "dunning",
  "/forecast":       "forecast",
  "/analytics":      "analytics",
  "/crm":            "crm",
  "/inventory":      "inventory",
  "/orders":         "orders",
  "/purchases":      "purchases",
  "/ledger":         "ledger",
  "/bank":           "bank",
  "/scanner":        "scanner",
  "/team":           "team",
  "/attendance":     "attendance",
  "/reports":        "reports",
  "/bills":          "bills",
  "/billing":        "billing",
  "/brain":          "brain",
  "/neural-engine":  "neural_engine",
  "/network":        "network",
  "/ai-chat":        "brain",
  "/ai-train":       "ai_train",
  "/payment-plans":  "payment_plans",
  "/disputes":       "disputes",
  "/referrals":      "referrals",
  "/ca-portal":      "ca_portal",
  "/today":          "today",
  "/my-id":          "my_id",
  "/bad-debt":       "bad_debt",
};

// ── Helper: is this route visible for user? ───────────────────────────────────
export function isRouteGranted(route: string, ctx: UserContext): boolean {
  const feature = ROUTE_TO_FEATURE[route];
  if (!feature) return true; // unknown routes always visible (dashboard, settings, etc.)
  const granted = getGrantedFeatures(ctx);
  return granted.has(feature);
}

// ── Helper: get upgrade message for locked feature ────────────────────────────
export function getUpgradeMessage(feature: FeatureKey, currentPlan: Plan): string {
  const planOrder: Plan[] = ["free", "starter", "growth", "pro"];
  const requiredPlans = PLAN_GATES[feature] || ["pro"];
  const minPlan = requiredPlans[0];
  const planNames: Record<Plan, string> = {
    free: "Free",
    starter: "Starter (₹999/mo)",
    growth: "Growth (₹2,499/mo)",
    pro: "Pro (₹4,999/mo)",
  };
  return `Upgrade to ${planNames[minPlan]} to unlock this feature`;
}

// ── Read user context from localStorage (with DB fallback) ────────────────────
export function getUserContext(): UserContext {
  if (typeof window === "undefined") return { industry: "trading", plan: "free" };

  // Parse the full user object saved by saveAuth / hydrated from /api/auth/me
  let plan: Plan = "free";
  let dbIndustry: string | null = null;
  let dbBizSize: BizSize | null = null;
  let dbHasGST: boolean | null = null;
  let dbHasWorkers: boolean | null = null;
  try {
    const userData = localStorage.getItem("vantro_user");
    if (userData) {
      const user = JSON.parse(userData);
      plan        = (user.plan as Plan) || "free";
      dbIndustry  = user.industry || null;
      dbBizSize   = (user.business_size as BizSize) || null;
      dbHasGST    = user.gst_registered ?? null;
      dbHasWorkers = user.has_workers ?? null;
    }
  } catch {}

  // Prefer explicit localStorage keys (set by onboarding); fall back to DB values
  const industry   = localStorage.getItem("vantro_industry")
                  || localStorage.getItem("vantro_business_type")
                  || dbIndustry
                  || "trading";

  const teamSizeRaw = localStorage.getItem("vantro_team_size");
  const teamSize: TeamSize | undefined = (teamSizeRaw as TeamSize) || (dbHasWorkers ? "small" : undefined);

  const bizSizeRaw = localStorage.getItem("vantro_biz_size");
  const bizSize: BizSize | undefined  = (bizSizeRaw as BizSize) || dbBizSize || undefined;

  const hasGSTRaw = localStorage.getItem("vantro_has_gst");
  const hasGST    = hasGSTRaw !== null ? hasGSTRaw === "true" : (dbHasGST ?? false);

  const hasSalesmenRaw = localStorage.getItem("vantro_has_salesmen");
  const hasSalesmen    = hasSalesmenRaw !== null ? hasSalesmenRaw === "true" : false;

  const hasWorkersRaw = localStorage.getItem("vantro_has_workers");
  const hasWorkers    = hasWorkersRaw !== null ? hasWorkersRaw === "true" : (dbHasWorkers ?? false);

  return { industry, plan, teamSize, bizSize, hasGST, hasSalesmen, hasWorkers };
}

// ── Hydrate localStorage from user object returned by /api/auth/me ───────────
// Call this after login or app boot so cross-device context is always fresh.
export function hydrateUserContext(user: {
  industry?: string | null;
  business_size?: string | null;
  gst_registered?: boolean | null;
  has_workers?: boolean | null;
}) {
  if (typeof window === "undefined") return;
  if (user.industry)        localStorage.setItem("vantro_industry",    user.industry);
  if (user.business_size)   localStorage.setItem("vantro_biz_size",    user.business_size);
  if (user.gst_registered != null) {
    localStorage.setItem("vantro_has_gst", String(user.gst_registered));
  }
  if (user.has_workers != null) {
    localStorage.setItem("vantro_has_workers", String(user.has_workers));
    localStorage.setItem("vantro_team_size", user.has_workers ? "small" : "solo");
  }
  // Dispatch so Sidebar re-reads context immediately
  window.dispatchEvent(new Event("vantro:refresh"));
}

// ── Feature labels & icons for UI ─────────────────────────────────────────────
export const FEATURE_META: Record<FeatureKey, { label: string; icon: string; description: string }> = {
  collections:   { label: "Collections",     icon: "💰", description: "Track who owes you money" },
  khata:         { label: "Khata",           icon: "📒", description: "Customer-wise ledger" },
  whatsapp:      { label: "WhatsApp",        icon: "💬", description: "Send payment reminders" },
  dunning:       { label: "Auto Follow-up",  icon: "🔔", description: "Automatic reminder rules" },
  forecast:      { label: "Cash Forecast",   icon: "📈", description: "Predict your cash flow" },
  analytics:     { label: "Analytics",       icon: "📊", description: "Business insights" },
  crm:           { label: "CRM",             icon: "👥", description: "Customer relationships" },
  inventory:     { label: "Inventory",       icon: "📦", description: "Stock management" },
  orders:        { label: "Orders",          icon: "🛒", description: "Order tracking" },
  purchases:     { label: "Purchases",       icon: "🏭", description: "Supplier bills" },
  ledger:        { label: "Bank Ledger",     icon: "🏦", description: "Bank transactions" },
  bank:          { label: "Bank",            icon: "🏧", description: "Bank accounts" },
  scanner:       { label: "Scanner",         icon: "📷", description: "Scan invoices" },
  team:          { label: "Team",            icon: "👤", description: "Staff management" },
  attendance:    { label: "Attendance",      icon: "✅", description: "Mark daily attendance" },
  reports:       { label: "Reports",         icon: "📋", description: "Business reports" },
  bills:         { label: "GST Bills",       icon: "🧾", description: "Generate GST invoices" },
  billing:       { label: "Billing",         icon: "💳", description: "Subscription & plan" },
  brain:         { label: "AI Brain",        icon: "🧠", description: "Ask anything about your business" },
  neural_engine: { label: "Neural Engine",   icon: "⚡", description: "AI scoring engine" },
  network:       { label: "Network",         icon: "🌐", description: "B2B trust network" },
  voice_calls:   { label: "Voice Calls",     icon: "📞", description: "AI voice collections" },
  payment_plans: { label: "Payment Plans",   icon: "📅", description: "EMI splits for customers" },
  disputes:      { label: "Disputes",        icon: "⚖️",  description: "Track invoice disputes" },
  referrals:     { label: "Refer & Earn",    icon: "🎁", description: "Earn free months" },
  ca_portal:     { label: "CA Portal",       icon: "🏦", description: "CA partner commission" },
  bad_debt:      { label: "Bad Debt",        icon: "⚠️",  description: "Flag risky accounts" },
  today:         { label: "Today",           icon: "☀️",  description: "Daily priority view" },
  ai_train:      { label: "AI Training",     icon: "🎯", description: "Train AI on your style" },
  my_id:         { label: "My Profile",      icon: "🪪", description: "Public business profile" },
};
