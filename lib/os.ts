// Client for the seven-surface operating system (backend: lib/routes/os.js).
// Every number on the Bridge, Scan, Watch, Simulate, Prepared, Missions and
// Memory panels comes from these responses; the frontend formats, it never
// calculates financial values or decides what is allowed.

import { API_BASE, authHeaders } from '@/lib/api';
import { DecisionApiError } from '@/lib/decisions';

async function call<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/os${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let data: Record<string, unknown> = {};
    try { data = await res.json(); } catch { data = {}; }
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    if (!res.ok) throw new DecisionApiError(res.status, data);
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new DecisionApiError(0, { error: 'The request timed out. Check your connection and try again.' });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Bridge ────────────────────────────────────────────────────────────

export interface ContractPart { supported: boolean; what: string[] | null }
export interface Connector {
  key: string;
  name: string;
  state: string;
  health: 'CONNECTED' | 'NOT_CONNECTED' | 'STALE' | 'FAILING' | 'DEGRADED' | string;
  confidenceEffect: string;
  lastSyncAt: string | null;
  lastError: string | null;
  contract: Record<'READ' | 'SEARCH' | 'SUBSCRIBE' | 'WRITE' | 'EXECUTE', ContractPart>;
  auth?: string;
  syncMode?: string;
  limitations: string[];
}
export interface BridgeOverview {
  connectors: Connector[];
  notAvailable: string[];
  freshness: { status: string; lastUpdateAt: string | null; ageHours: number | null; invoiceCount: number; detail: string };
  discovered: { entity: string; count: number; source: string }[];
  entityResolution: { candidates: { names: string[]; normalized: string; confidence: string; evidence: string }[]; rule: string };
  semantics: { definitions: Record<string, string>; authority: { fact: string; source: string }[] };
  missing: string[];
  answers: { connectedTo: string[]; canRead: string[]; canDo: string[] };
}

export type KnowledgeKind = 'OBSERVED_FACT' | 'SOURCE_CLAIM' | 'HUMAN_OBSERVATION' | 'INFERENCE' | 'HYPOTHESIS' | 'LEARNED_PATTERN' | 'POLICY' | 'SEMANTIC_DEFINITION';
export interface KnowledgeItem {
  id: string;
  kind: KnowledgeKind;
  statement: string;
  scope: { type: string; name: string | null };
  source: { type: string; ref?: string | null };
  confidence: string | number;
  authority: string;
  sample_count: number | null;
  last_verified_at: string | null;
  status: 'ACTIVE' | 'QUARANTINED' | 'RETIRED';
  safety?: { flags?: string[] };
  created_at: string;
}

// ── Scan ──────────────────────────────────────────────────────────────

export interface ScoreComponent { key: string; label: string; value: number; detail: string }
export interface AutomationCandidate {
  key: string;
  title: string;
  summary: string;
  frequencyPerMonth: number;
  steps: { total: number; deterministic: number; agent: number; human: number; humanDetail: string };
  score: number;
  weights: Record<string, number>;
  components: ScoreComponent[];
  level: { current: number; proposed: number };
  trigger: { days: number; why: string; fromData: boolean };
  minBalance: number;
  baseline: { label: string; rate: number | null; enough: boolean };
  inScopeNow: { customers: number; invoices: number; amount: number };
  risks: string[];
}
export interface ProcessStep { key: string; label: string; medianDays: number | null; p90Days: number | null; n: number; performer: string }
export interface ProcessMap {
  label: string;
  status: 'RECONSTRUCTED' | 'INSUFFICIENT_DATA';
  reason?: string;
  coverage?: { from: string; to: string; days: number; invoices: number; customers: number };
  steps?: ProcessStep[];
  cycle?: { medianDays: number | null; p90Days: number | null; n: number };
  variants?: { key: string; label: string; count: number; share: number }[];
  sla?: { label: string; met: number; violated: number; rate: number | null };
  bottleneck?: { step: string; label: string; medianDays: number; why: string } | null;
  documentedVsActual?: { documented: { days: number; label: string }; actual: { days: number; label: string }; gapDays: number } | null;
  manualWork?: { perMonth: number; humanEffort: { hoursPerMonth: number; assumption: string } };
  notObservable?: { what: string; why: string }[];
}
export interface Opportunity { key: string; kind: string; title: string; detail: string; value: number; valueLabel: string; items: { customer: string }[] }
export interface ScanResult {
  status: string;
  asOf: string;
  summary: string[];
  found: { bottlenecks: number; automationOpportunities: number; businessOpportunities: number; decisions: number };
  process: ProcessMap;
  automation: { candidates: AutomationCandidate[]; considered: { key: string; proposed: boolean; why: string }[] };
  opportunities: Opportunity[];
  constraint: { constraint: string | null; label?: string; confidence?: string; why: string; cannotSee?: string[] };
  proposals: { key: string; outcome: string; workflowId: string; status: string }[];
  agent: { key: string; model: string };
}

// ── Watch ─────────────────────────────────────────────────────────────

export type Health = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'UNKNOWN';
export type AutopilotMode = 'WATCH' | 'RECOMMEND' | 'PREPARE' | 'EXECUTE_WITH_APPROVAL' | 'EXECUTE_WITHIN_POLICY';
export interface Objective {
  id: string;
  name: string;
  metric: string;
  operator: '<=' | '>=';
  target: number;
  horizonDays: number;
  autopilotMode: AutopilotMode;
  templateKey: string | null;
  workflowId: string | null;
  status: string;
  health: Health;
  lastEvaluatedAt: string | null;
  latest: {
    health: Health;
    currentValue: number | null;
    forecast: { points?: { day: number; p10: number; p50: number; p90: number }[]; explanation?: string; breachProbability?: number | null; breachInDays?: number | null; assumptions?: string[] };
    confidence: { level: string; reasons: string[] };
    evidence: { label: string; value: number | string; source: string }[];
  } | null;
}
export interface AutopilotTemplate { key: string; name: string; availability: 'SUPPORTED' | 'BLOCKED'; detail: string; objective: { metric_key: string; operator: '<=' | '>='; suggestedTarget: number; horizon_days: number } }
export interface BriefLine { kind: string; tone: 'positive' | 'negative' | 'attention' | 'neutral'; text: string; objectiveId?: string }
export interface ObjectiveEvaluation {
  evaluation: { health: Health; explanation: string; currentValue: number | null };
  autopilot: { action: string; why: string; workflowId?: string } | null;
}

// ── Workflows (Simulate, Prepared, Missions) ──────────────────────────

export type WorkflowStatus = 'PROPOSED' | 'SHADOW' | 'WITH_APPROVAL' | 'PAUSED' | 'REJECTED' | 'RETIRED';
export interface WorkflowStep { key: string; label: string; performer: string; capability: 'EXECUTABLE' | 'PREPARE_ONLY' | 'BLOCKED' | 'SUPPORTED' | string; note?: string }
export interface Replay {
  lookbackDays: number;
  replays: number;
  leakage: string;
  episodes: number;
  perMonth: number;
  amountTriggered: number;
  paidWithinWindowWithoutAction: number;
  baselineRate: number | null;
  humanHoursPerMonth: number;
  cannotSay: string;
  sample: { asOf: string; customer: string; amount: number; paidWithinWindow: boolean }[];
  params: { overdueDays: number; minBalance: number };
}
export interface Workflow {
  id: string;
  templateKey: string;
  name: string;
  objective: string;
  objectiveId: string | null;
  trigger: { description: string; overdueDays?: number };
  conditions: { key: string; description: string }[];
  steps: WorkflowStep[];
  approvals: { rule: string; expiresAfterDays?: number }[];
  policies: { key: string; description: string }[];
  agentPermissions: Record<string, string[]>;
  budget: { maxActionsPerRun: number };
  successMetric: { description: string; withinDays: number };
  stopConditions: { key: string; description: string }[];
  status: WorkflowStatus;
  automationLevel: { level: number; label: string };
  source: 'SCAN' | 'TEXT' | 'TEMPLATE';
  discovery: AutomationCandidate | null;
  simulation: Replay | null;
  version: number;
  deployedAt: string | null;
  decidedReason: string | null;
  awaiting?: number;
  met?: number;
  notMet?: number;
  lastRunAt?: string | null;
}
export type ItemStatus = 'AWAITING_APPROVAL' | 'SHADOWED' | 'PREPARED_MANUAL' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
export interface WorkflowItem {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: number;
  target: string;
  amount: number;
  currency: string;
  context: { history?: { onTimeRate: number | null; paidInvoices: number; medianDelayDays: number | null }; invoices?: { number: string; ageDays: number; outstanding: number }[]; maxAgeDays?: number };
  draft: { text: string; tone: string; channel: string; generatedBy: string };
  status: ItemStatus;
  statusReason: string | null;
  agent: { agent: string; model: string; version: string; permissions: string[] };
  policy: { key: string; verdict: string }[];
  expectedOutcome: { withinDays: number; verification: string; baselineProbability: number | null };
  actedAt: string | null;
  verifyAfter: string | null;
  outcomeStatus: 'PENDING' | 'MET' | 'NOT_MET' | 'UNKNOWN' | 'NOT_APPLICABLE';
  outcome: { collected?: number; paidAt?: string } | null;
  expiresAt: string | null;
  createdAt: string;
}
export interface WorkflowRun {
  id: string;
  mode: string;
  trigger_source: string;
  status: string;
  counts: { created: number; targets: number; duplicates: number; replanned: number; failed: number; deferredByBudget: number; excluded: Record<string, number> };
  stopped_reason: string | null;
  started_at: string;
}
export interface OutcomeMode {
  resolved: number;
  met: number;
  observedRate: number;
  expectedRate: number;
  difference: number;
  interval80: [number, number] | null;
  collected: number;
  recommendation: string;
  why: string;
}
export interface MemoryResponse {
  outcomes: { workflowId: string; name: string; status: string; byMode: Record<string, OutcomeMode> }[];
  recentOutcomes: WorkflowItem[];
  knowledge: Partial<Record<KnowledgeKind, KnowledgeItem[]>>;
  decisionContracts: { status: string; n: number }[];
}

export const osApi = {
  bridge: () => call<BridgeOverview>('GET', '/bridge'),
  knowledge: () => call<{ knowledge: KnowledgeItem[] }>('GET', '/knowledge'),
  teach: (input: { statement: string; kind: string; scope?: { type: string; name?: string } }) => call<{ knowledge: KnowledgeItem; note: string }>('POST', '/knowledge', input),
  retireKnowledge: (id: string) => call<{ knowledge: KnowledgeItem }>('POST', `/knowledge/${id}/retire`),

  scan: () => call<ScanResult>('POST', '/scan', {}, 120_000),
  latestScan: () => call<{ scan: ScanResult | null }>('GET', '/scan/latest'),

  objectives: () => call<{ objectives: Objective[] }>('GET', '/objectives'),
  templates: () => call<{ templates: AutopilotTemplate[] }>('GET', '/objectives/templates'),
  createObjective: (input: { templateKey: string; metricKey: string; operator: string; target: number; horizonDays?: number; autopilotMode: AutopilotMode }) => call<ObjectiveEvaluation>('POST', '/objectives', input),
  evaluateObjectives: () => call<{ results: unknown[] }>('POST', '/objectives/evaluate'),
  brief: () => call<{ lines: BriefLine[]; generatedAt: string }>('GET', '/watch/brief'),

  workflows: (status?: string) => call<{ workflows: Workflow[] }>('GET', `/workflows${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  workflow: (id: string) => call<{ workflow: Workflow; runs: WorkflowRun[]; outcomes: Record<string, OutcomeMode> }>('GET', `/workflows/${id}`),
  items: (status?: string) => call<{ items: WorkflowItem[] }>('GET', `/workflows/items${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  approveItem: (id: string) => call<{ item: WorkflowItem }>('POST', `/workflows/items/${id}/approve`),
  rejectItem: (id: string) => call<{ item: WorkflowItem }>('POST', `/workflows/items/${id}/reject`),
  simulate: (id: string) => call<{ simulation: Replay }>('POST', `/workflows/${id}/simulate`, {}),
  deploy: (id: string, mode: 'SHADOW' | 'WITH_APPROVAL') => call<{ workflow: Workflow }>('POST', `/workflows/${id}/deploy`, { mode }),
  transition: (id: string, action: 'pause' | 'reject' | 'retire', reason?: string) => call<{ workflow: Workflow }>('POST', `/workflows/${id}/${action}`, { reason }),
  run: (id: string) => call<{ run: WorkflowRun; items: WorkflowItem[] }>('POST', `/workflows/${id}/run`),
  fromText: (text: string) => call<{ workflow: Workflow; understood: string[]; notes: string[] }>('POST', '/workflows/from-text', { text }),
  verify: () => call<{ checked: number; met: number; notMet: number; pending: number; unknown: number }>('POST', '/workflows/verify'),

  memory: () => call<MemoryResponse>('GET', '/memory'),
};

export const HEALTH_LABEL: Record<string, string> = {
  ON_TRACK: 'On track',
  AT_RISK: 'At risk',
  OFF_TRACK: 'Off track',
  UNKNOWN: 'Unknown',
};

export const WORKFLOW_STATUS_LABEL: Record<string, string> = {
  PROPOSED: 'Proposed',
  SHADOW: 'Shadow',
  WITH_APPROVAL: 'With approval',
  PAUSED: 'Paused',
  REJECTED: 'Rejected',
  RETIRED: 'Retired',
};

export const ITEM_STATUS_LABEL: Record<string, string> = {
  AWAITING_APPROVAL: 'Needs approval',
  SHADOWED: 'Recorded in shadow',
  PREPARED_MANUAL: 'Ready for you to send',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  FAILED: 'Handed to a person',
};

export const KIND_LABEL: Record<string, string> = {
  OBSERVED_FACT: 'Observed facts',
  SOURCE_CLAIM: 'From documents',
  HUMAN_OBSERVATION: 'What people told Starlane',
  INFERENCE: 'Inferences',
  HYPOTHESIS: 'Hypotheses',
  LEARNED_PATTERN: 'Learned patterns',
  POLICY: 'Rules',
  SEMANTIC_DEFINITION: 'Definitions',
};

export const AUTOPILOT_LABEL: Record<AutopilotMode, string> = {
  WATCH: 'Watch only',
  RECOMMEND: 'Recommend',
  PREPARE: 'Prepare',
  EXECUTE_WITH_APPROVAL: 'Act with my approval',
  EXECUTE_WITHIN_POLICY: 'Act within policy',
};
