// The greeting the design opens The Bridge and Scan with: "Good evening, Ishant".
export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// The signed-in person's first name, from what the account actually holds
// (owner name, else the business name, else the email). Never invented.
export function firstName(): string {
  if (typeof window === "undefined") return "";
  try {
    const u = JSON.parse(localStorage.getItem("vantro_user") || "{}");
    const raw: string = u.owner_name || u.name || u.business_name || (u.email ? String(u.email).split("@")[0] : "");
    return raw.trim().split(/\s+/)[0] || "";
  } catch {
    return "";
  }
}
