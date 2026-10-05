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
  if (a.status === "ACTIVE") return { label: "Active", color: "#477054" };
  if (a.status === "STOPPED") return { label: "Stopped", color: "#A64F4B" };
  return { label: "Idle · not run yet", color: "#8A8A86" };
}
