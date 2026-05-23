// Business Mode — central hook for type-specific UX
// Every page reads this to adapt what it shows

export type BusinessMode = "distributor" | "retailer" | "d2c" | "service" | "startup";

export interface BusinessConfig {
  mode: BusinessMode;
  label: string;
  tagline: string;
  primaryMetric: string;
  dashboardTitle: string;
  color: string;
  sidebarSections: string[]; // which groups to show
}

export const BUSINESS_CONFIGS: Record<BusinessMode, BusinessConfig> = {
  distributor: {
    mode: "distributor",
    label: "Distributor / Wholesaler",
    tagline: "Chase receivables. Get paid faster.",
    primaryMetric: "Outstanding Receivables",
    dashboardTitle: "Collections Dashboard",
    color: "#0066FF",
    sidebarSections: ["core", "intelligence", "network", "ops", "account"],
  },
  retailer: {
    mode: "retailer",
    label: "Retailer / Shop Owner",
    tagline: "Track inventory. Manage supplier payments.",
    primaryMetric: "Today's Sales",
    dashboardTitle: "Retail Dashboard",
    color: "#10D98A",
    sidebarSections: ["retail", "intelligence", "network", "ops", "account"],
  },
  d2c: {
    mode: "d2c",
    label: "D2C Brand",
    tagline: "Grow orders. Know your CAC and LTV.",
    primaryMetric: "GMV This Month",
    dashboardTitle: "Brand Dashboard",
    color: "#9B6DFF",
    sidebarSections: ["d2c", "intelligence", "network", "ops", "account"],
  },
  service: {
    mode: "service",
    label: "Service / Agency / Freelancer",
    tagline: "Bill projects. Collect retainers on time.",
    primaryMetric: "Pending Invoices",
    dashboardTitle: "Projects Dashboard",
    color: "#F5A524",
    sidebarSections: ["service", "intelligence", "network", "ops", "account"],
  },
  startup: {
    mode: "startup",
    label: "Startup",
    tagline: "Track burn. Extend runway.",
    primaryMetric: "Cash Runway",
    dashboardTitle: "Startup Dashboard",
    color: "#F5424D",
    sidebarSections: ["startup", "intelligence", "network", "ops", "account"],
  },
};

const KEY = "vantro_business_mode";

export function getBusinessMode(): BusinessMode {
  if (typeof window === "undefined") return "distributor";
  return (localStorage.getItem(KEY) as BusinessMode) || "distributor";
}

export function setBusinessMode(mode: BusinessMode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, mode);
}

export function getConfig(): BusinessConfig {
  return BUSINESS_CONFIGS[getBusinessMode()];
}
