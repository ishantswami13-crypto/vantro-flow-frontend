// Client for the universal platform API (backend: lib/routes/platform.js).
// The organization a request acts in is sent as X-Starlane-Org; the server
// checks membership and ignores it if the caller does not belong there. The
// frontend never decides permissions: it renders what the server returns.

import { API_BASE, authHeaders, fetchWithRetry } from '@/lib/api';

const ORG_KEY = 'starlane_active_org';
export const ORG_CHANGED_EVENT = 'starlane:org-changed';

export function activeOrgId(): string | null {
  try { return typeof window === 'undefined' ? null : window.localStorage.getItem(ORG_KEY); } catch { return null; }
}
export function setActiveOrgId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(ORG_KEY, id); else window.localStorage.removeItem(ORG_KEY);
    window.dispatchEvent(new Event(ORG_CHANGED_EVENT));
  } catch { /* storage unavailable */ }
}

export class PlatformError extends Error {
  status: number;
  code: string;
  detail?: unknown;
  constructor(status: number, body: { error?: string; code?: string; detail?: unknown }) {
    super(body.error || (status === 0 ? 'Could not reach Starlane.' : `Request failed (${status})`));
    this.status = status;
    this.code = body.code || 'ERROR';
    this.detail = body.detail;
  }
}

async function call<T>(method: string, path: string, body?: unknown, { headers = {}, timeoutMs = 30_000 }: { headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const org = activeOrgId();
  // A file upload goes as multipart: the browser sets its own Content-Type with the boundary.
  const form = typeof FormData !== 'undefined' && body instanceof FormData;
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/platform${path}`, {
      method,
      headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...authHeaders(), ...(org ? { 'X-Starlane-Org': org } : {}), ...headers },
      credentials: 'include',
      body: body === undefined ? undefined : form ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
    let data: Record<string, unknown> = {};
    try { data = await res.json(); } catch { data = {}; }
    if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/login';
    // A remembered organization the user no longer belongs to: drop it and retry once as their own.
    if (res.status === 403 && data.code === 'NOT_A_MEMBER' && org) {
      setActiveOrgId(null);
      return call<T>(method, path, body, { headers, timeoutMs });
    }
    if (!res.ok) throw new PlatformError(res.status, data as { error?: string; code?: string });
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new PlatformError(0, { error: 'The request timed out. Try again.' });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Types ───────────────────────────────────────────────────────────────
export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export interface NavItem { key: string; href: string; label: string; icon: string; app?: string; children?: { href: string; label: string }[] }
export interface NavGroup { key: string; label: string; items: NavItem[] }
export interface Organization { id: string; ownerUserId: string; name: string | null; industry: string | null; operatingContext: string | null; preferences: Record<string, unknown>; onboarded: boolean; role: Role; timezone: string | null }
export interface Workspace {
  organization: Organization; role: Role; permissions: string[]; apps: string[]; navigation: NavGroup[];
  organizations: { id: string; name: string | null; role: Role }[]; needsSetup: boolean; model: { configured: boolean };
}
export interface AppInfo { key: string; name: string; summary: string; status: 'available' | 'planned'; requires: string | null; items: { href: string; label: string }[]; enabled: boolean; suggested: boolean }
export interface Member { userId: string; role: Role; email: string; name: string | null; joinedAt: string }
export interface Team { id: string; name: string; description: string | null; memberCount: number; isMember: boolean; members: { userId: string; email: string }[] }
export interface Policy { disabledTools: string[]; defaultApproverRole: Role; maxConcurrentExecutions: number; dailyExecutionLimit: number; membersMayShareWithOrganization: boolean; ceilings: { maxConcurrentExecutions: number; dailyExecutionLimit: number } }

export type ToolStatus = 'available' | 'configuration_required' | 'unavailable' | 'disabled_by_policy' | 'planned';
export type Risk = 'read' | 'internal_write' | 'external' | 'financial';
export interface ToolInfo { key: string; name: string; description: string; risk: Risk; status: ToolStatus; reason: string | null; alwaysRequiresApproval: boolean }
export interface Field { name: string; type: 'text' | 'number' | 'boolean'; required: boolean; description: string }
export type Trigger = { type: 'manual' } | { type: 'webhook' } | { type: 'schedule'; every: 'hour' | 'day' | 'week'; at_hour?: number; weekday?: string };
export interface AgentDefinition {
  schema_version?: number; name: string; description: string; objective: string; instructions: string;
  expected_outputs: string[]; success_criteria: string[]; knowledge: { collection_ids: string[] };
  tools: { key: string; requires_approval: boolean }[]; triggers: Trigger[];
  limits: { max_steps: number; max_tool_calls: number; timeout_seconds: number; max_retries: number };
  approval: { approver_role: 'owner' | 'admin' | 'member'; always_for_writes: boolean };
  model: string; input_schema: { fields: Field[] }; output_schema: { fields: Field[] };
}
export type AgentStatus = 'draft' | 'ready' | 'active' | 'disabled' | 'archived';
export interface AgentSummary {
  id: string; name: string; description: string | null; status: AgentStatus; visibility: 'private' | 'team' | 'organization'; teamId: string | null; teamName: string | null;
  ownerUserId: string; ownerEmail: string | null; templateKey: string | null; publishedVersion: number | null; draftDiffersFromPublished: boolean;
  triggers: Trigger[]; tools: string[]; nextScheduledAt: string | null; updatedAt: string; canEdit: boolean; canRun: boolean; isMine: boolean;
  lastExecution: { id: string; status: ExecStatus; mode: string; createdAt: string } | null;
}
export interface AgentDetail extends AgentSummary {
  definition: AgentDefinition; versions: { version: number; checksum: string; notes: string | null; publishedAt: string; publishedBy: string | null }[];
  lastTest: { id: string; status: ExecStatus; matchesDraft: boolean; finishedAt: string | null } | null; hasWebhook: boolean;
}
export interface Check { key: string; ok: boolean; blocking: boolean; message: string }
export interface Template { key: string; category: string; name: string; description: string; definition: Partial<AgentDefinition>; missing: { tool: string; name: string; status: ToolStatus; reason: string | null }[]; ready: boolean }
export interface Draft { definition: AgentDefinition; draftedBy: string; notes: string[]; missing: { tool: string; name: string; status: string; reason: string | null }[]; permissions: { tool: string; name: string; risk: Risk; requiresApproval: boolean }[] }

export type ExecStatus = 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
export interface Execution {
  id: string; agentId: string; agentName: string; agentVersion: number | null; mode: 'test' | 'live'; trigger: string; status: ExecStatus;
  input: Record<string, unknown>; output: { text?: string; data?: Record<string, unknown> | null; citations?: { documentId: string; title: string; collectionName: string; chunk: number; citation: string }[]; note?: string } | null;
  errorClass: string | null; errorMessage: string | null; attempts: number; maxAttempts: number; cancelRequested: boolean;
  modelCalls: number; toolCalls: number; inputTokens: number; outputTokens: number; modelUsed: string | null;
  requestedByEmail: string | null; parentExecutionId: string | null; createdAt: string; startedAt: string | null; finishedAt: string | null; durationMs: number | null; pendingApprovals?: number;
}
export interface Step { key: string; kind: 'model' | 'tool' | 'approval' | 'system'; name: string | null; status: string; input: unknown; output: unknown; error: string | null; durationMs: number | null; at: string }
export interface ExecutionDetail extends Execution {
  steps: Step[];
  approvals: { id: string; stepKey: string; tool: string; summary: string; risk: Risk; status: string; approverRole: Role; decidedAt: string | null; decisionNote: string | null; decidedBy: string | null }[];
  children: { id: string; agentId: string; status: ExecStatus; createdAt: string }[];
}
export interface Approval {
  id: string; executionId: string; agentId: string; agentName: string; tool: string; summary: string; arguments: Record<string, unknown>; risk: Risk;
  evidence: { type: string; [k: string]: unknown }[]; approverRole: Role; status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedByEmail: string | null; decidedByEmail: string | null; decidedAt: string | null; decisionNote: string | null; createdAt: string;
  executionStatus: ExecStatus; executionMode: string; executionInput: Record<string, unknown>; canDecide: boolean;
  history?: { id: string; action: string; actor_email: string | null; created_at: string; detail: Record<string, unknown> }[];
}
export interface Collection { id: string; name: string; description: string | null; scope: 'personal' | 'team' | 'organization'; teamId: string | null; teamName: string | null; ownerEmail: string | null; documentCount: number; notReadyCount: number; lastAddedAt: string | null; canWrite: boolean }
export interface KDocument { id: string; title: string; sourceKind: string; sourceName: string | null; mimeType: string | null; byteSize: number; status: string; statusDetail: string | null; chunkCount: number; createdAt: string; uploadedBy: string | null }
export interface SearchResult { documentId: string; title: string; collectionId: string; collectionName: string; chunk: number; snippet: string; score: number; citation: string }
export interface Connection { id: string; name: string; provider: string | null; category: string; categoryLabel: string; summary: string; status: 'connected' | 'available' | 'configuration_required' | 'planned'; reason: string | null; health: string | null; lastSyncAt: string | null; lastError: string | null; setupHref: string | null; usedBy: string[] }
export type Measured<T> = { available: true; value: T; sample?: number } | { available: false; reason: string };
export interface CommandCenter {
  agents: Record<'active' | 'ready' | 'draft' | 'disabled' | 'archived', number>;
  executions: { running: number; queued: number; awaitingApproval: number; last7d: { completed: number; failed: number; cancelled: number }; last24h: number; successRate: Measured<number>; medianDurationMs: Measured<number> };
  approvals: { pending: number | null };
  triggers: { last7d: Record<string, number>; upcoming: { agentId: string; agentName: string; at: string }[] };
  usage: { modelCalls: number; toolCalls: number; inputTokens: number; outputTokens: number; cost: Measured<number> };
  quality: { outcomes: Measured<number> };
  alerts: { kind: string; severity: string; title: string; detail?: string | null; href: string | null }[];
  recent: { id: string; agentId: string; agentName: string; status: ExecStatus; mode: string; trigger: string; createdAt: string; durationMs: number | null; errorClass: string | null; modelCalls: number; toolCalls: number; tokens: number }[];
  model: { configured: string[]; preferred: string | null } | null;
}
export interface AuditEvent { id: string; actor_email: string | null; actor_kind: string; action: string; resource_type: string; resource_id: string | null; detail: Record<string, unknown>; created_at: string }

// ── Calls ───────────────────────────────────────────────────────────────
const q = (o: Record<string, string | number | null | undefined>) => {
  const s = Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
  return s ? `?${s}` : '';
};

export const platformApi = {
  workspace: () => call<Workspace>('GET', '/workspace'),
  appAccess: (key: string) => call<{ enabled: boolean; canEnable?: boolean; app?: { key: string; name: string } }>('GET', `/apps/${key}/access`),
  apps: (industry?: string) => call<{ apps: AppInfo[] }>('GET', `/apps${q({ industry })}`),
  setApp: (key: string, enabled: boolean) => call('PUT', `/apps/${key}`, { enabled }),
  updateOrg: (body: Partial<{ name: string; industry: string; operatingContext: string; preferences: Record<string, unknown> }>) => call('PATCH', '/organization', body),
  setup: (body: { name: string; industry: string; operatingContext?: string; apps: string[] }) => call('POST', '/organization/setup', body),
  members: () => call<{ members: Member[] }>('GET', '/members'),
  addMember: (email: string, memberRole: Role) => call('POST', '/members', { email, memberRole }),
  changeRole: (userId: string, memberRole: Role) => call('PATCH', `/members/${userId}`, { memberRole }),
  removeMember: (userId: string) => call('DELETE', `/members/${userId}`),
  teams: () => call<{ teams: Team[] }>('GET', '/teams'),
  createTeam: (name: string, description?: string) => call<{ id: string }>('POST', '/teams', { name, description }),
  deleteTeam: (id: string) => call('DELETE', `/teams/${id}`),
  addTeamMember: (id: string, memberUserId: string) => call('POST', `/teams/${id}/members`, { memberUserId }),
  removeTeamMember: (id: string, userId: string) => call('DELETE', `/teams/${id}/members/${userId}`),
  policy: () => call<{ policy: Policy }>('GET', '/policies'),
  updatePolicy: (body: Partial<Policy>) => call<{ policy: Policy }>('PUT', '/policies', body),
  usage: () => call<{ limits: { dailyExecutionLimit: number; maxConcurrentExecutions: number; aiDailyTokenBudget: number }; today: { executions: number }; daily: { day: string; executions: number; tokens: number; modelCalls: number; failed: number }[]; perAgent: { agentId: string; name: string; executions: number; tokens: number }[]; cost: Measured<number> }>('GET', '/usage'),
  audit: (cursor?: string | null) => call<{ events: AuditEvent[]; nextCursor: string | null }>('GET', `/audit${q({ cursor })}`),
  activity: (cursor?: string | null) => call<{ events: AuditEvent[]; nextCursor: string | null }>('GET', `/activity${q({ cursor })}`),

  tools: () => call<{ tools: ToolInfo[] }>('GET', '/tools'),
  templates: () => call<{ templates: Template[] }>('GET', '/templates'),
  draft: (objective: string) => call<Draft>('POST', '/agents/draft', { objective }, { timeoutMs: 60_000 }),
  agents: (view = 'all', search = '') => call<{ agents: AgentSummary[]; counts: Record<string, number> }>('GET', `/agents${q({ view, q: search })}`),
  createAgent: (body: { definition?: Partial<AgentDefinition>; templateKey?: string; visibility?: string; teamId?: string | null }) => call<{ id: string }>('POST', '/agents', body),
  agent: (id: string) => call<{ agent: AgentDetail }>('GET', `/agents/${id}`),
  updateAgent: (id: string, body: { definition?: AgentDefinition; visibility?: string; teamId?: string | null }) => call('PATCH', `/agents/${id}`, body),
  checks: (id: string) => call<{ checks: Check[] }>('GET', `/agents/${id}/checks`),
  version: (id: string, v: number) => call<{ version: { version: number; definition: AgentDefinition; checksum: string; notes: string | null; publishedAt: string } }>('GET', `/agents/${id}/versions/${v}`),
  duplicate: (id: string) => call<{ id: string }>('POST', `/agents/${id}/duplicate`, {}),
  publish: (id: string, notes?: string) => call<{ version: number }>('POST', `/agents/${id}/publish`, { notes }),
  activate: (id: string) => call<{ status: string; webhookToken: string | null }>('POST', `/agents/${id}/activate`, {}),
  deactivate: (id: string) => call('POST', `/agents/${id}/deactivate`, {}),
  archive: (id: string) => call('POST', `/agents/${id}/archive`, {}),
  restore: (id: string) => call('POST', `/agents/${id}/restore`, {}),
  rotateWebhook: (id: string) => call<{ webhookToken: string }>('POST', `/agents/${id}/webhook`, {}),
  test: (id: string, input: Record<string, unknown>) => call<{ executionId: string }>('POST', `/agents/${id}/test`, { input }),
  run: (id: string, input: Record<string, unknown>, idempotencyKey: string) => call<{ executionId: string; deduplicated: boolean }>('POST', `/agents/${id}/run`, { input }, { headers: { 'Idempotency-Key': idempotencyKey } }),

  executions: (o: { agentId?: string; status?: string; mode?: string; cursor?: string | null; limit?: number } = {}) => call<{ executions: Execution[]; nextCursor: string | null }>('GET', `/executions${q(o)}`),
  execution: (id: string) => call<{ execution: ExecutionDetail }>('GET', `/executions/${id}`),
  cancel: (id: string) => call<{ status: string }>('POST', `/executions/${id}/cancel`, {}),
  rerun: (id: string) => call<{ executionId: string }>('POST', `/executions/${id}/rerun`, {}),

  approvals: (status = 'pending', cursor?: string | null) => call<{ approvals: Approval[]; nextCursor: string | null }>('GET', `/approvals${q({ status, cursor })}`),
  approval: (id: string) => call<{ approval: Approval }>('GET', `/approvals/${id}`),
  approvalSummary: () => call<{ queues: { key: string; label: string; pending: number; href: string }[]; total: number }>('GET', '/approvals/summary'),
  decide: (id: string, decision: 'approve' | 'reject', note?: string) => call<{ status: string; executionResumed: boolean }>('POST', `/approvals/${id}/decision`, { decision, note }),

  collections: () => call<{ collections: Collection[] }>('GET', '/knowledge/collections'),
  createCollection: (body: { name: string; description?: string; scope: string; teamId?: string | null }) => call<{ id: string }>('POST', '/knowledge/collections', body),
  deleteCollection: (id: string) => call('DELETE', `/knowledge/collections/${id}`),
  documents: (id: string) => call<{ documents: KDocument[] }>('GET', `/knowledge/collections/${id}/documents`),
  /** PDF, Word (.docx) or text file: the server reads the text and keeps only the text. */
  uploadDocument: (id: string, file: File, title?: string) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    if (title) fd.append('title', title);
    return call<{ id: string; chunkCount: number; extracted: { kind: string; characters: number; pages?: number } }>('POST', `/knowledge/collections/${id}/documents/upload`, fd, { timeoutMs: 90_000 });
  },
  addDocument: (id: string, body: { title: string; content: string; sourceName?: string; mimeType?: string; sourceKind?: 'upload' | 'paste' }) => call<{ id: string; chunkCount: number }>('POST', `/knowledge/collections/${id}/documents`, body, { timeoutMs: 60_000 }),
  deleteDocument: (cid: string, did: string) => call('DELETE', `/knowledge/collections/${cid}/documents/${did}`),
  search: (text: string) => call<{ results: SearchResult[]; searchedCollections: number }>('GET', `/knowledge/search${q({ q: text })}`),
  document: (id: string) => call<{ document: { title: string; text: string; truncated: boolean; citation: string; collectionName: string } }>('GET', `/knowledge/documents/${id}`),

  connections: () => call<{ connections: Connection[]; counts: Record<string, number>; stateError: string | null }>('GET', '/connections'),
  commandCenter: () => call<CommandCenter>('GET', '/command-center'),
};

export const RISK_LABEL: Record<Risk, string> = { read: 'Reads', internal_write: 'Writes inside Starlane', external: 'Acts outside Starlane', financial: 'Financial' };
export const STATUS_LABEL: Record<ExecStatus, string> = { queued: 'Queued', running: 'Running', awaiting_approval: 'Waiting for approval', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled' };
export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = { draft: 'Draft', ready: 'Ready', active: 'Active', disabled: 'Disabled', archived: 'Archived' };
export const statusColor = (s: string) => ({ completed: '#477054', active: '#477054', running: '#696D86', queued: '#8C6826', awaiting_approval: '#8C6826', ready: '#696D86', failed: '#A64F4B', cancelled: 'rgba(25,25,23,0.35)', disabled: 'rgba(25,25,23,0.35)', archived: 'rgba(25,25,23,0.25)', draft: 'rgba(25,25,23,0.35)' } as Record<string, string>)[s] || 'rgba(25,25,23,0.3)';

export function describeTrigger(t: Trigger): string {
  if (t.type === 'manual') return 'On demand';
  if (t.type === 'webhook') return 'When an event is posted';
  if (t.every === 'hour') return 'Every hour';
  const h = `${String(t.at_hour ?? 8).padStart(2, '0')}:00`;
  return t.every === 'day' ? `Every day at ${h}` : `Every ${(t.weekday || 'mon').toUpperCase()} at ${h}`;
}

export function newIdempotencyKey(): string {
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `ui-${r}`;
}
