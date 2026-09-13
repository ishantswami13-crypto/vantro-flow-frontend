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
