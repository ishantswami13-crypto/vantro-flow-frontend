"use client";

// Shared bits for the Agents list and detail (V32 Agents / AgentDetail).

import { IDENTITIES } from "@/lib/identity";
import type { AgentInfo } from "@/lib/os";

export const PERMISSION_LABEL: Record<string, string> = {
  READ: "Read",
  ANALYZE: "Analyse",
  PROPOSE: "Propose",
  PREPARE: "Prepare",
  EXECUTE_APPROVED_INTERNAL: "Run approved internal steps",
  RECORD_OUTCOME: "Record outcomes",
};

/** A stable lettermark colour per agent, from the ten V32 accents. */
export function agentColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return IDENTITIES[h % IDENTITIES.length].color;
}

export function agentStatus(a: AgentInfo): { label: string; color: string } {
  if (a.status === "ACTIVE") return { label: "Active", color: "#477054" };
  if (a.status === "STOPPED") return { label: "Stopped", color: "#A64F4B" };
  return { label: "Idle · not run yet", color: "#8A8A86" };
}
