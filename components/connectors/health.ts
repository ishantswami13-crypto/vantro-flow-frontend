import type { Connector, ConnectorHealth } from "@/lib/api";
import type { StatusTone } from "@/components/ui/Badge";

// One mapping from a connector's health (backend lib/connectors/state.js) to
// the shared status language. Four families: healthy, delayed, error and not
// connected. Unknown or missing is never shown as healthy.
export const HEALTH: Record<ConnectorHealth, { label: string; tone: StatusTone }> = {
  healthy: { label: "Healthy", tone: "positive" },
  syncing: { label: "Syncing", tone: "info" },
  connected: { label: "Paired, no sync yet", tone: "attention" },
  delayed: { label: "Delayed", tone: "attention" },
  stale: { label: "Sync overdue", tone: "attention" },
  error: { label: "Error", tone: "critical" },
  disconnected: { label: "Disconnected", tone: "unknown" },
  pairing: { label: "Waiting to pair", tone: "unknown" },
  revoked: { label: "Device revoked", tone: "unknown" },
  not_connected: { label: "Not connected", tone: "unknown" },
  unavailable: { label: "Not available yet", tone: "unknown" },
};

export function healthOf(c: Connector | null | undefined): { label: string; tone: StatusTone } {
  if (!c) return { label: "Not known yet", tone: "unknown" };
  return HEALTH[c.state.health] || { label: "Not known yet", tone: "unknown" };
}

export const isConnected = (c: Connector) =>
  ["healthy", "syncing", "connected", "delayed", "stale", "error"].includes(c.state.health);

/** "Accounting", "External signals" from the backend's snake_case category. */
export const categoryLabel = (c: Connector) =>
  c.category.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase());

/** What the connection lets Starlane do, from the backend's capability label. */
export const CAPABILITY_TEXT: Record<string, string> = {
  READ_ONLY: "Read only",
  WRITE_CAPABLE: "Can write",
  EXECUTION_REQUIRES_APPROVAL: "Acts only after your approval",
};

/** Couldn't-reach copy: never the raw exception text. */
export const OFFLINE = "Couldn't reach Starlane. Check your connection and try again.";
