// Hands the work a person typed from the Agents page to the run page that
// starts it. Kept in sessionStorage under a one-time token, so the text is
// not in the URL and a reload of the run page does not start a second run.

const PREFIX = "starlane.agentWork.";

export interface QueuedWork { agentKey: string; instruction: string; at: number }

export function queueAgentWork(agentKey: string, instruction: string): string {
  const token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  try {
    sessionStorage.setItem(PREFIX + token, JSON.stringify({ agentKey, instruction, at: Date.now() } satisfies QueuedWork));
  } catch { /* storage blocked: the run page says the work was not found */ }
  return token;
}

/** Reads and removes the queued work. Null when it was already taken or is stale. */
export function takeAgentWork(token: string | null): QueuedWork | null {
  if (!token) return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + token);
    if (!raw) return null;
    sessionStorage.removeItem(PREFIX + token);
    const w = JSON.parse(raw) as QueuedWork;
    if (!w || typeof w.agentKey !== "string" || Date.now() - Number(w.at) > 10 * 60_000) return null;
    return w;
  } catch {
    return null;
  }
}

/** Starter tasks per agent, written in the words of the work it can do. */
export const SUGGESTED_WORK: Record<string, string[]> = {
  "starlane.working_capital": [
    "Lay out the next 30 days and tell me which week runs short",
    "Look 8 weeks ahead: what comes in and what goes out",
    "Just the next 2 weeks",
  ],
  "starlane.scan": [
    "Scan my ledger and find the bottleneck from invoice to payment",
    "Find the steps I could automate",
  ],
  "starlane.decision_engine": [
    "Find the receivable decisions that need me this week",
    "Check for new overdue risk since the last run",
  ],
};
