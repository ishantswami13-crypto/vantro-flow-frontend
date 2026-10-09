// Formatting for the supply-chain intelligence screens. Money and dates come
// from lib/format (the one formatter for the web app); this file only keeps
// the enum and confidence wording these screens share. No calculation
// happens here: every number was computed by the backend
// (lib/domain/intelligence/supplyChainImpact.js).
import { inrWhole, formatDate as fmtDate, formatDateTime as fmtDateTime } from "@/lib/format";

export function formatINR(value: number | null | undefined): string {
  return inrWhole(value);
}

export function formatDate(iso: string | null | undefined): string {
  return fmtDate(iso);
}

export function formatDateTime(iso: string | null | undefined): string {
  return fmtDateTime(iso);
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
  const c = confidenceFromScore(value);
  return c === "UNKNOWN" ? "Not known yet" : humanizeCode(c);
}
