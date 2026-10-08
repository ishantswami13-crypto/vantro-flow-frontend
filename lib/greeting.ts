// The greeting the design opens The Bridge and Scan with: "Good evening, Ishant".
export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// The signed-in person's first name, only from a real person's name on the
// account. A business name, an email prefix or "User" is never used as a
// name: with none, callers show the greeting alone.
export function firstName(): string {
  if (typeof window === "undefined") return "";
  try {
    const u = JSON.parse(localStorage.getItem("vantro_user") || "{}") as Record<string, unknown>;
    const business = String(u.business_name || "").trim().toLowerCase();
    const emailPrefix = typeof u.email === "string" ? u.email.split("@")[0].toLowerCase() : "";
    for (const c of [u.owner_name, u.first_name, u.full_name, u.name]) {
      if (typeof c !== "string") continue;
      const s = c.trim();
      const low = s.toLowerCase();
      if (!s || s.includes("@") || low === business || low === emailPrefix || low === "user") continue;
      return s.split(/\s+/)[0];
    }
  } catch {
    /* unreadable profile: no name */
  }
  return "";
}
