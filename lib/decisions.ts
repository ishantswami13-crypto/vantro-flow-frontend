// Client for the Starlane decision loop (backend: lib/routes/decisions.js).
// Every number shown on the decision screens comes from these responses;
// the frontend formats, it never calculates financial values.

import { API_BASE, authHeaders } from '@/lib/api';

export type Band = 'KNOWN' | 'LIKELY' | 'POSSIBLE' | 'UNKNOWN' | 'CONTRADICTED';
export type DecisionStatus =
  | 'OPEN' | 'NEEDS_INFORMATION' | 'SELECTED' | 'APPROVED' | 'EXECUTING'
  | 'SHADOWED' | 'EXECUTED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'RESOLVED' | 'SUPERSEDED';

export interface Interval { mean: number; p10: number; p50: number; p90: number }

export interface DecisionOption {
  key: string;
  label: string;
  summary?: string;
  intent: { type: string; steps?: { type: string }[]; channel?: string };
  isDoNothing: boolean;
  reversibility?: string;
  blastRadius?: { summary?: string; entities?: number; amount?: number; external?: boolean } | null;
  approval?: { level?: string; label?: string; reason?: string } | null;
  valid: boolean;
  invalidReason?: string | null;
  executableAs?: string | null;
  assumptions?: { key: string; label: string; range: [number, number]; basis?: string }[];
  futures: {
    cash30?: Interval; cash60?: Interval; cash90?: Interval;
    probFullRecovery90?: number;
    creditLossAvoided?: Interval; marginLost?: Interval;
    value?: Interval; bestShare?: number; robustness?: number | null;
    stockoutProbability?: number; expectedCost?: Interval; workingCapitalFreed?: Interval;
  };
}

export interface EvidenceItem {
  kind: 'OBSERVED_FACT' | 'CALCULATED_FACT' | 'OBSERVED_ASSOCIATION' | 'SIMULATED' | 'ASSUMPTION' | string;
  label: string;
  detail: string;
  calculation?: string;
  source?: { table?: string; id?: string; invoiceId?: string };
  observedAt?: string | null;
  value?: number;
}

export interface Unknown {
  key: string;
  label: string;
  detail?: string;
  valueOfInformation?: number | null;
  changesRecommendation?: boolean;
  status?: string;
  acquisition?: { how?: string; cost?: string; time?: string };
}

export interface Recommendation {
  key: string;
  label: string;
  why?: string;
  whyNot?: { key: string; reason: string }[];
  wouldChangeIf?: { assumption?: string; label: string; detail: string }[];
  informationFirst?: boolean;
  gainOverDoNothing?: number;
  stability?: number;
}

export interface DecisionListItem {
  id: string;
  kind: string;
  title: string;
  description?: string;
  status: DecisionStatus;
  currency?: string;
  deadline?: string | null;
  window?: { latestSafeAt?: string; costOfDelayPerWeek?: number | null; basis?: string };
  whyNow?: string[];
  expectedValue?: number | null;
  urgency?: number | null;
  materiality?: Record<string, number> | null;
  confidence?: { band: Band; score: number; components?: { name: string; value: number; detail?: string }[] } | null;
  attentionScore?: number | null;
  recommendation?: { key: string; label: string; informationFirst: boolean } | null;
  selectedOption?: string | null;
  collisions?: { type: string; with: string; withTitle: string; detail: string }[];
  discoveredAt?: string;
  updatedAt?: string;
  revision?: number;
}

export interface Decision extends Omit<DecisionListItem, 'recommendation'> {
  asOf: string;
  triggers: { code: string; label: string }[];
  whatIfIgnored?: string;
  affectedEntities: { type: string; id?: string; name?: string; number?: string; outstanding?: number; key?: string }[];
  objectives: { key: string; label: string; weight: number }[];
  constraints: { key: string; label: string; hard?: boolean; status?: string; type?: string }[];
  options: DecisionOption[];
  doNothingKey: string;
  evidence: EvidenceItem[];
  unknowns: Unknown[];
  assumptions: { key?: string; label: string; detail?: string; basis?: string }[];
  contradictions: { type: string; label?: string; detail?: string; authorityRule?: string; toResolve?: string }[];
  downsideRisk?: number | null;
  upsidePotential?: number | null;
  reversibility?: string;
  recommendation: Recommendation | null;
  informationRequests?: { unknownKey: string; label: string; taskId: string; requestedAt: string; status: string }[];
  analysis?: {
    stress?: { scenarios?: { key: string; label: string; best: string; values: Record<string, number> }[]; [k: string]: unknown } | null;
    sensitivity?: { results?: { assumption: string; label: string; flips: boolean; switches: { from: string; to: string; between: [number, number] }[] }[] } | null;
    robustness?: unknown;
    costOfDelay?: unknown;
    method?: string[] | string | null;
    process?: unknown;
    [k: string]: unknown;
  } | null;
  modelVersions?: Record<string, string>;
  definitions?: Record<string, unknown>;
  resolutionReason?: string | null;
}

export interface DecisionEvent {
  id: string;
  type: string;
  actor: { type: string; id: string; onBehalfOf?: string | null; agentKey?: string | null; agentVersion?: string | null; model?: string | null };
  payload: Record<string, unknown>;
  policy?: Record<string, unknown> | null;
  at: string;
}

export interface ActionRun {
  id: string;
  step_index: number;
  intent_type: string;
  adapter: string;
  connector: string;
  mode: 'SHADOW' | 'LIVE';
  status: string;
  would_have?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  postcondition?: { verified?: boolean; note?: string } | null;
  error?: string | null;
  delegation_chain?: { type: string; id: string; role?: string }[];
  created_at: string;
}

export interface Contract {
  id: string;
  selected_option: string;
  mode: 'SHADOW' | 'LIVE';
  status: string;
  rationale: Record<string, unknown>;
  expected_outcomes: { metric: string; horizonDays: number; scenario: string; option: string; mean?: number; p10?: number; p90?: number; probability?: number }[];
  success_criteria: { label: string }[];
  failure_criteria: { label: string }[];
  abort_conditions: { key: string; label: string }[];
  review_at: { afterDays: number }[];
  rollback_plan: { step: number; intent: string; how: string }[];
  activated_at?: string | null;
  verification?: {
    checkedAt: string; status: string; reason: string; realizedScenario: string; attributionNote: string;
    predictions: { target: string; horizonDays: number; expected: number | null; range: [number, number] | null; status: string; actual: number | null; insideRange: boolean | null }[];
  } | null;
  regret?: { exAnte: number; bestAtDecisionTime: string; note: string } | null;
  attribution?: string | null;
}

export interface DecisionDetail {
  decision: Decision;
  contract: Contract | null;
  runs: ActionRun[];
  observations: { id: string; text: string; confidence: string; author: string; at: string; trust: string }[];
  events: DecisionEvent[];
  pilotMode: 'SHADOW' | 'LIVE';
  externalSendEnabled: boolean;
}

export interface HealthDimension { key: string; label: string; status: string; detail: string }

export interface TodayResponse {
  asOf: string;
  lastDiscovery: { at: string; status: string } | null;
  command: {
    open: number; needsInformation: number; awaitingApproval: number; readyToRun: number;
    underWatch: number; deadlinesThisWeek: number; offTrack: number;
    expectedUncollectedIfIgnored: Record<string, number>;
  };
  top: DecisionListItem[];
  receivables: { totalsByCurrency: Record<string, { open: number; overdue: number; openCount: number; overdueCount: number }>; invoices: number };
  health: { dimensions: HealthDimension[] };
  pilotMode: 'SHADOW' | 'LIVE';
  externalSendEnabled: boolean;
  stops: { allowed: boolean; blockedBy: { scope: string; key: string; reason: string }[] };
}

export interface DiscoverResponse {
  status: string;
  discovered: number; revised: number; reobserved: number; resolved: number;
  watched: { kind: string; customer?: string; reason: string }[];
  degraded: { detector: string; error: string }[];
  durationMs: number;
}

export interface ControlsResponse {
  pilotMode: 'SHADOW' | 'LIVE';
  pilotModeIsDefault: boolean;
  autonomyCeiling: string;
  externalSendEnabled: boolean;
  globalStop: boolean;
  controls: { scope: string; scope_key: string; stopped: boolean; reason: string | null; set_at: string; cleared_at: string | null }[];
  effective: { allowed: boolean; blockedBy: { scope: string; key: string; reason: string }[] };
  agent: { key: string; version: string; model: string };
  scopes: string[];
}

export interface TrackRecord {
  contracts: number;
  byStatus: Record<string, number>;
  followedRecommendation: { count: number; share: number } | null;
  valueLedger: { entries: { decisionId: string; title: string; currency: string; horizonDays: number; collected: number; doNothingExpected: number; estimatedUplift: number }[]; estimatedUpliftByCurrency: Record<string, number>; note: string };
  autonomy: { ceiling: string; perAction: { action: string; verifiedLive: number; met: number; successRate: number | null; suggestedLevel: string; basis: string }[]; note: string };
  recent: { decisionId: string; title: string; option: string; mode: string; status: string; activatedAt: string | null; reason: string | null }[];
  calibration: { resolvedPredictions: number; pendingPredictions: number; intervalCoverage: number | null; nominalCoverage: number; meanBias: number | null; meanAbsoluteError: number | null; status: string };
}

export interface BacktestResponse {
  status: 'OK' | 'INSUFFICIENT_HISTORY';
  detail?: string;
  method?: { horizonDays: number; cutoffs: string[]; materialEvent: string; leakageGuard: string; excludedInvoiceObservations: number };
  scorecard: null | {
    engine: { flagged: number; materialEvents: number; detected: number; missed: number; falsePositives: number; precision: number | null; recall: number | null; medianWarningDaysBeforeBadDebt: number | null };
    simpleRule: { flagged: number; materialEvents: number; detected: number; missed: number; falsePositives: number; precision: number | null; recall: number | null; rule: string };
    doNothingForecast: { intervals: number; coverage: number | null; nominalCoverage: number; meanAbsoluteError: number | null; bias: number | null; biasNote: string };
    sampleWarning: string | null;
  };
}

export interface SimulateResponse {
  pinned: { assumptions: Record<string, number>; paymentSpeed: number | null };
  options: { key: string; label: string; valid: boolean; futures: DecisionOption['futures'] }[];
  recommendation: { key: string; label: string; changed: boolean };
  baselineRecommendation: string | null;
  persisted: false;
}

export class DecisionApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body?.error === 'string' ? body.error : `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function call<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/decisions${path}`, {
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

export const decisionsApi = {
  today: () => call<TodayResponse>('GET', '/today'),
  list: (scope: 'active' | 'closed' | 'all' = 'active') => call<{ decisions: DecisionListItem[]; lastDiscovery: { at: string; status: string } | null }>('GET', `?scope=${scope}`),
  discover: () => call<DiscoverResponse>('POST', '/discover', {}, 120_000),
  get: (id: string) => call<DecisionDetail>('GET', `/${encodeURIComponent(id)}`),
  simulate: (id: string, body: { assumptions?: Record<string, number>; paymentSpeed?: number }) => call<SimulateResponse>('POST', `/${encodeURIComponent(id)}/simulate`, body),
  select: (id: string, optionKey: string, note?: string) => call<{ contract: Contract }>('POST', `/${encodeURIComponent(id)}/select`, { optionKey, note }),
  approve: (id: string, note?: string) => call<{ status: string }>('POST', `/${encodeURIComponent(id)}/approve`, { note }),
  execute: (id: string, authorizeLive = false) => call<{ mode: string; status: string; runs: ActionRun[] }>('POST', `/${encodeURIComponent(id)}/execute`, { authorizeLive }),
  reject: (id: string, reason?: string) => call<{ status: string }>('POST', `/${encodeURIComponent(id)}/reject`, { reason }),
  requestInformation: (id: string, unknownKey?: string, note?: string) => call<{ request: { taskId: string; label: string } }>('POST', `/${encodeURIComponent(id)}/request-information`, { unknownKey, note }),
  observe: (id: string, text: string, confidence: 'LOW' | 'MEDIUM' | 'HIGH') => call<{ observation: { id: string } }>('POST', `/${encodeURIComponent(id)}/observations`, { text, confidence }),
  verify: (id: string) => call<{ contract: Contract; final: boolean }>('POST', `/${encodeURIComponent(id)}/verify`),
  controls: () => call<ControlsResponse>('GET', '/controls'),
  setControls: (body: { pilotMode?: 'SHADOW' | 'LIVE'; scope?: string; scopeKey?: string; stopped?: boolean; reason?: string }) => call<Record<string, unknown>>('POST', '/controls', body),
  trackRecord: () => call<TrackRecord>('GET', '/track-record'),
  backtest: (horizonDays = 60) => call<BacktestResponse>('POST', '/backtest', { horizonDays }, 120_000),
};

// ── Formatting (display only) ─────────────────────────────────────────────

export function money(value: number | null | undefined, currency = 'INR'): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (currency !== 'INR') return `${currency} ${Math.round(value).toLocaleString('en-IN')}`;
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)}L`;
  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
}

export function pct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${Math.round(v * 100)}%`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00`).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today.getTime()) / 86400000);
}

export const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Needs a decision',
  NEEDS_INFORMATION: 'Waiting on information',
  SELECTED: 'Needs approval',
  APPROVED: 'Approved, ready to run',
  EXECUTING: 'Running',
  SHADOWED: 'Recorded in shadow mode',
  EXECUTED: 'Done, being verified',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  RESOLVED: 'Resolved on its own',
  SUPERSEDED: 'Superseded',
};

export const BAND_LABEL: Record<string, string> = {
  KNOWN: 'Known',
  LIKELY: 'Likely',
  POSSIBLE: 'Possible',
  UNKNOWN: 'Unknown',
  CONTRADICTED: 'Contradicted',
};

export const EVIDENCE_LABEL: Record<string, string> = {
  OBSERVED_FACT: 'Observed',
  CALCULATED_FACT: 'Calculated',
  OBSERVED_ASSOCIATION: 'Pattern',
  SIMULATED: 'Simulated',
  ASSUMPTION: 'Assumption',
};
