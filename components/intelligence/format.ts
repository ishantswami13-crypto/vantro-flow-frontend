// Shared formatting helpers for the supply-chain intelligence screens.
// No calculation happens here — this file only formats numbers the backend
// already computed (see lib/domain/intelligence/supplyChainImpact.js).
export function formatINR(value: number | null | undefined): string {
  if (value == null) return "—";
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function confidenceFromScore(value: number | null | undefined): "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" {
  if (value == null) return "UNKNOWN";
  if (value >= 0.75) return "HIGH";
  if (value >= 0.5) return "MEDIUM";
  return "LOW";
}

// Turns backend enum codes (PORT_CLOSURE, PORT_DISRUPTION) into plain words
// for display. Returns "" for empty input so callers can fall back.
export function humanizeCode(code: string | null | undefined): string {
  if (!code) return "";
  const words = code.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function confidenceLabel(value: number | null | undefined): string {
  return humanizeCode(confidenceFromScore(value));
}
