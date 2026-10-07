"use client";

// Shared bits for the Agents list and detail (V32 Agents / AgentDetail).

import type { AgentInfo } from "@/lib/os";

export const PERMISSION_LABEL: Record<string, string> = {
  READ: "Read",
  ANALYZE: "Analyse",
  PROPOSE: "Propose",
  PREPARE: "Prepare",
  EXECUTE_APPROVED_INTERNAL: "Run approved internal steps",
  RECORD_OUTCOME: "Record outcomes",
};

export function agentStatus(a: AgentInfo): { label: string; color: string } {
  if (a.status === "ACTIVE") return { label: "Active", color: "var(--status-success)" };
  if (a.status === "STOPPED") return { label: "Stopped", color: "var(--status-danger)" };
  return { label: "Idle · not run yet", color: "var(--text-tertiary)" };
}
