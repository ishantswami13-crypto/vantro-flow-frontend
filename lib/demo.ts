// ─── Vantro Demo Mode ────────────────────────────────────────────────────────
// Lets visitors try the app without signing up.
// Sets a demo flag + fake token → app shows demo data everywhere.

export const DEMO_TOKEN = "demo_mode_no_auth";

export function enableDemoMode() {
  if (typeof window === "undefined") return;
  localStorage.setItem("vantro_demo", "true");
  localStorage.setItem("vantro_token", DEMO_TOKEN);
  localStorage.setItem("vantro_user", JSON.stringify({
    id: "demo",
    email: "demo@vantro.in",
    business_name: "Demo Business (Sharma Traders)",
    phone: "9876543210",
    gstin: "07AABCU9603R1ZX",
  }));
  localStorage.setItem("vantro_industry", "trading");
  // Set cookie so middleware lets demo users through to protected routes
  document.cookie = `vantro_token=${DEMO_TOKEN}; path=/; max-age=3600; SameSite=Lax`;
}

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("vantro_demo") === "true";
}

export function exitDemoMode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("vantro_demo");
  localStorage.removeItem("vantro_token");
  localStorage.removeItem("vantro_user");
  // Clear the demo cookie
  document.cookie = "vantro_token=; path=/; max-age=0; SameSite=Lax";
}
