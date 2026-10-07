"use client";

// Shared bits for the Agents gallery, agent detail and run pages.

import type { AgentInfo } from "@/lib/os";
import type { StatusTone } from "@/components/ui/Badge";

export const PERMISSION_LABEL: Record<string, string> = {
  READ: "Read",
  ANALYZE: "Analyse",
  PROPOSE: "Propose",
  PREPARE: "Prepare",
  EXECUTE_APPROVED_INTERNAL: "Run approved internal steps",
  RECORD_OUTCOME: "Record outcomes",
};

/** What each permission lets the agent do, in one plain sentence. */
export const PERMISSION_HINT: Record<string, string> = {
  READ: "Reads invoices, customers and payments from your books.",
  ANALYZE: "Works out patterns and timing from what it reads.",
  PROPOSE: "Suggests something for you to review.",
  PREPARE: "Drafts work that waits for your approval.",
  EXECUTE_APPROVED_INTERNAL: "Carries out steps you approved, inside Starlane only.",
  RECORD_OUTCOME: "Writes down whether an outcome happened, from the ledger.",
};

export function agentStatus(a: AgentInfo): { label: string; tone: StatusTone } {
  if (a.status === "ACTIVE") return { label: "Active", tone: "positive" };
  if (a.status === "STOPPED") return { label: "Stopped", tone: "critical" };
  return { label: "Not run yet", tone: "unknown" };
}

/** "deterministic (no LLM)" reads as "Fixed rules, no model". */
export function modelLabel(model: string | null | undefined): string {
  if (!model) return "Not known yet";
  if (/deterministic/i.test(model)) return "Fixed rules, no language model";
  return model;
}
