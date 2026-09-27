// Starlane client contracts — the shapes the backend returns to desktop and
// mobile (lib/routes/clientApi.js, lib/routes/connectors.js, lib/connectors/state.js).
// Change these together with the backend; the API is versioned by
// Bootstrap.apiVersion.

export type ClientKind = 'desktop' | 'mobile' | 'web' | 'cli';

export interface Session {
  sessionId: string;
  accessToken: string;
  accessExpiresAt: string;
  refreshToken: string;
  refreshExpiresAt: string;
}

export interface LoginResponse extends Session {
  user: { id: string; email: string; businessName: string | null };
}

export interface Bootstrap {
  apiVersion: number;
  env: 'production' | 'staging' | 'development';
  serverTime: string;
  minClientVersion: { desktop: string; mobile: string };
  user: { id: string; email: string; name: string | null } | null;
  organization: { id: string | null; name: string | null; country?: string | null; currency?: string | null; industry?: string | null };
  organizationsAvailable: number;
  capabilities: { askStarlane: boolean; externalMessaging: boolean; pushNotifications: boolean };
}

// ai_actions.status
export type ActionStatus =
  | 'pending' | 'approved' | 'rejected' | 'executing' | 'done' | 'failed'
  | 'expired' | 'system_blocked' | 'execution_unknown' | 'cancelled';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ActionSummary {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: ActionStatus;
  priority: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export type FactKind = 'observed' | 'calculated' | 'assumption' | 'forecast' | 'external';
export interface EvidenceFact { label: string; value: unknown; kind: FactKind; source: string | null }
export interface Evidence {
  rule: string | null;
  source: { table: string; id: string } | null;
  computedAt: string | null;
  facts: EvidenceFact[];
  stage: { chosen: string; by_days: string; band_days: [number, number | null] } | null;
  adjustments: Record<string, unknown> | null;
  raw: Record<string, unknown> | null;
  hasStructuredEvidence: boolean;
}

export interface ActionDetail extends ActionSummary {
  proposal: { message: string | null; parameters: Record<string, unknown> | null; expectedEffect: Record<string, unknown> | null };
  system: { type: string; id: string } | null;
  risks: string[];
  evidence: Evidence;
  outcomes: Array<{ verification_type: string; expected_metric: string; expected_value: number | null; observed_metric: string | null; observed_value: number | null; status: string; verified_at: string | null }>;
  lastError: string | null;
}

export type DecisionResult = { status: 'rejected' } | { status: 'done' | 'failed'; message: string };

export type ChangeKind = 'recommendation' | 'watch' | 'signal' | 'outcome' | 'action_done' | 'action_failed';
export interface ChangeItem { kind: ChangeKind; title: string; at: string; route: string; severity?: string; status?: string }

export type ConnectorHealth =
  | 'not_connected' | 'pairing' | 'connected' | 'syncing' | 'healthy' | 'delayed' | 'error' | 'revoked'
  | 'stale' | 'disconnected' | 'unavailable';

export interface SyncAttempt {
  id: string; status: 'running' | 'succeeded' | 'failed'; startedAt: string; finishedAt: string | null;
  recordsReceived: number; recordsImported: number; recordsRejected: number; error: string | null; clientVersion: string | null;
}

export interface Now {
  generatedAt: string;
  since: string;
  dataAsOf: string | null;
  needsYou: ActionSummary[];
  changed: ChangeItem[];
  working: {
    connectors: Array<{ id: string; name: string; health: ConnectorHealth; lastSuccessAt: string | null; lastAttempt: SyncAttempt | null }>;
    syncsSince: { runs: number; imported: number; last_at: string | null } | null;
  };
  state: {
    currency: string; openReceivables: number; overdueReceivables: number;
    openInvoiceCount: number; over30Count: number; source: string;
  } | null;
  partial: boolean;
}

export interface ConnectorDevice {
  id: string; name: string; status: 'ACTIVE' | 'REVOKED'; version: string | null; platform: string | null;
  pairedAt: string; lastSeenAt: string | null; revokedAt: string | null;
}

export interface Connector {
  id: string;
  sourceType: string | null;
  name: string;
  provider: string | null;
  category: string;
  authType: 'local_bridge' | 'file_import' | 'oauth' | 'api_key' | 'public_feed';
  availability: 'available' | 'not_available';
  syncMode: string;
  summary: string;
  unavailableReason?: string;
  objects: string[];
  access: string[];
  setup: string[];
  state: {
    health: ConnectorHealth;
    status: string | null;
    lastSyncAt: string | null;
    lastSuccessAt: string | null;
    lastAttempt: SyncAttempt | null;
    lastError: string | null;
    devices: ConnectorDevice[];
  };
}

export type NotificationType =
  | 'approval_required' | 'action_completed' | 'action_failed'
  | 'connector_offline' | 'connector_error' | 'business_change' | 'discovery';
export interface StarlaneNotification {
  id: string;
  type: NotificationType;
  severity: 'low' | 'normal' | 'high' | 'critical';
  title: string;
  body: string | null;
  entity: { type: string; id: string } | null;
  actionId: string | null;
  /** Client-agnostic route: /actions/<id>, /sources/tally, /watch/<id>, /discover/<id> */
  route: string;
  createdAt: string;
  readAt: string | null;
}

export interface Watch {
  id: string; name: string; description: string | null; metric_key: string; status: string; severity: string;
  condition_config: Record<string, unknown>; last_evaluated_at: string | null; last_triggered_at: string | null; created_at: string;
}

export interface Opportunity { opportunity?: string; title?: string; [k: string]: unknown }

export interface DeviceClaim { deviceId: string; deviceSecret: string; apiBase: string; env: string }
export interface DeviceToken { accessToken: string; expiresAt: string; env: string }

export interface AskReply { message: string; actions: string[]; navigate: string | null }

// Allowlisted client telemetry (backend lib/routes/clientApi.js CLIENT_EVENTS).
export type TelemetryEventName =
  | 'client.app_started' | 'client.app_crashed' | 'client.startup_failed' | 'client.screen_opened'
  | 'client.connector_setup_started' | 'client.connector_setup_completed' | 'client.connector_setup_failed'
  | 'client.local_sync_succeeded' | 'client.local_sync_failed' | 'client.recommendation_opened' | 'client.evidence_opened'
  | 'client.approval_completed' | 'client.update_available' | 'client.update_installed' | 'client.update_failed'
  | 'client.notification_opened' | 'client.ask_submitted' | 'client.offline' | 'client.session_expired';
export interface TelemetryEvent {
  name: TelemetryEventName;
  props?: Partial<Record<'screen' | 'client' | 'platform' | 'app_version' | 'os_version' | 'error_code' | 'duration_ms' | 'connector' | 'channel' | 'reason' | 'online', string | number | boolean | null>>;
}
