"use client";

// Shared bits for the Agents gallery, agent detail and run pages.

import type { AgentInfo, Mission } from "@/lib/os";
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

// Autonomy ladder, lowest to highest. An agent's autonomy is the highest rung
// its granted permissions reach; nothing here is inferred beyond that.
const LADDER: { perm: string; label: string; hint: string }[] = [
  { perm: "READ", label: "Reads only", hint: "Reads your books; changes nothing." },
  { perm: "ANALYZE", label: "Analyses", hint: "Works things out; proposes nothing." },
  { perm: "RECORD_OUTCOME", label: "Records outcomes", hint: "Writes whether an outcome happened, from the ledger." },
  { perm: "PROPOSE", label: "Proposes", hint: "Suggests; you decide." },
  { perm: "PREPARE", label: "Prepares for approval", hint: "Drafts work that waits for you." },
  { perm: "EXECUTE_APPROVED_INTERNAL", label: "Runs approved steps", hint: "Carries out what you approved, inside Starlane only." },
];

/** The highest autonomy rung an agent's permissions reach, or null with none. */
export function autonomyOf(a: Pick<AgentInfo, "permissions">): { label: string; hint: string } | null {
  let top: (typeof LADDER)[number] | null = null;
  for (const rung of LADDER) if (a.permissions.includes(rung.perm)) top = rung;
  return top ? { label: top.label, hint: top.hint } : null;
}

const OPEN_ORDER = ["BLOCKED", "WAITING_FOR_APPROVAL", "WAITING_FOR_INFORMATION", "RUNNING", "VERIFYING", "PLANNING"];

/** Open missions assigned to an agent, the one that most needs a person first. */
export function openWorkOf(key: string, missions: Mission[]): Mission[] {
  return missions
    .filter((m) => m.assigned?.agent === key && OPEN_ORDER.includes(m.state))
    .sort((x, y) => OPEN_ORDER.indexOf(x.state) - OPEN_ORDER.indexOf(y.state));
}
