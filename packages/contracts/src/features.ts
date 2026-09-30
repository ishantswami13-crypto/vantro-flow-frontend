// Starlane's seven features — shapes returned by the backend's
// lib/routes/features.js. Change together with the backend.

/** What kind of figure this is. Never present an estimate or a model output as a fact. */
export type EvidenceKind = 'fact' | 'calculated' | 'assumption' | 'estimate' | 'model';
export interface EvidenceItem { label: string; value: unknown; kind: EvidenceKind; unit?: string; source?: string; ids?: string[]; note?: string }
export interface EvidenceSet { summary: string; facts: EvidenceItem[]; sources: string[]; computedAt: string; method: string | null }

// One lifecycle for every action, whichever feature proposed it.
export type ActionLifecycle =
  | 'PROPOSED' | 'VALIDATED' | 'APPROVAL_REQUIRED' | 'APPROVED' | 'EXECUTING' | 'EXECUTED' | 'VERIFYING' | 'VERIFIED'
  | 'REJECTED' | 'BLOCKED' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'UNKNOWN' | 'NOT_EFFECTIVE';
export const LIFECYCLE_LABEL: Record<ActionLifecycle, string> = {
  PROPOSED: 'Proposed', VALIDATED: 'Ready for you', APPROVAL_REQUIRED: 'Needs your approval', APPROVED: 'Approved',
  EXECUTING: 'Carrying out', EXECUTED: 'Done', VERIFYING: 'Checking the result', VERIFIED: 'Result confirmed',
  REJECTED: 'Declined', BLOCKED: 'Stopped by policy', FAILED: 'Failed', EXPIRED: 'Expired', CANCELLED: 'Cancelled',
  UNKNOWN: 'Result unknown', NOT_EFFECTIVE: 'Did not work',
};
export const LIFECYCLE_TONE: Record<ActionLifecycle, 'accent' | 'ok' | 'warn' | 'bad' | 'muted'> = {
  PROPOSED: 'muted', VALIDATED: 'accent', APPROVAL_REQUIRED: 'accent', APPROVED: 'accent', EXECUTING: 'accent', EXECUTED: 'ok',
  VERIFYING: 'accent', VERIFIED: 'ok', REJECTED: 'muted', BLOCKED: 'bad', FAILED: 'bad', EXPIRED: 'muted', CANCELLED: 'muted',
  UNKNOWN: 'warn', NOT_EFFECTIVE: 'warn',
};

export interface FeatureAction {
  id: string; type: string; title: string; description: string | null; status: string;
  lifecycle: ActionLifecycle; lifecycleNote: string | null; canDecide: boolean;
  riskLevel: 'low' | 'medium' | 'high'; requiresApproval: boolean; missionId: string | null;
  relates: { type: string; id: string } | null; draft: string | null; createdAt: string; updatedAt: string | null;
}

// ── WATCH ────────────────────────────────────────────────────────────────
export type WatchState = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
export type Severity = 'low' | 'normal' | 'high' | 'critical';
export interface WatchEvent {
  id: string; kind: 'invoice_overdue' | 'sync_failed' | 'sync_stale' | 'watch_triggered' | 'promise_broken' | string;
  severity: Severity; state: WatchState; title: string; detail: string | null;
  entity: { type: string; id: string } | null; evidence: EvidenceSet; missionId: string | null;
  firstSeenAt: string; lastSeenAt: string; acknowledgedAt: string | null; resolvedAt: string | null; resolution: string | null;
}
export interface WatchList { events: WatchEvent[]; counts: Partial<Record<WatchState, number>>; refreshed: { at: string; created: number; resolved: number } | null }
export interface WatchDetail { event: WatchEvent; actions: FeatureAction[]; mission: Mission | null; next: { scan: string; mission: string } | null }

// ── MISSIONS ─────────────────────────────────────────────────────────────
export type MissionStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
export interface MissionConstraints { allowEscalation: boolean; excludeDisputed: boolean; minDaysBetweenReminders: number }
export interface MissionBlocker { code: string; text: string }
export interface MissionProgress {
  collected: number; targetAmount: number; ratio: number; remaining?: number; daysLeft: number | null;
  blockers: MissionBlocker[] | number; actions?: Record<string, number>;
  byInvoice?: Array<{ id: string; customer: string; invoiceNumber: string | null; baseline: number; now: number; collected: number; status: 'open' | 'part_paid' | 'paid_or_removed'; disputed: boolean; hasPhone: boolean | null }>;
  evidence?: EvidenceSet;
}
export interface Mission {
  id: string; type: 'collections'; status: MissionStatus; title: string; objective: string;
  target: { amount: number; invoiceIds: string[] }; horizonDays: number; constraints: MissionConstraints;
  baseline: { at: string; outstanding: number; invoices: Array<{ id: string; customer: string; invoiceNumber: string | null; amount: number; daysOverdue: number }> } | null;
  outcome: { result: 'completed' | 'failed'; collected: number; target: number; text: string; decidedAt: string } | null;
  createdAt: string; updatedAt: string; activatedAt: string | null; endsAt: string | null; closedAt: string | null;
  progress?: MissionProgress;
  actions?: FeatureAction[];
  history?: Array<{ event: string; at: string }>;
  allowed?: Array<'activate' | 'pause' | 'cancel'>;
  targetInvoices?: Array<{ id: string; customer: string; invoiceNumber: string | null; amount: number; daysOverdue: number }> | null;
}
export interface MissionInput { title?: string; customer?: string; invoiceIds?: string[]; targetAmount?: number; horizonDays?: number; constraints?: Partial<MissionConstraints> }
export interface MissionDraft { title: string; objective: string; target: { amount: number; invoiceIds: string[] }; horizonDays: number; constraints: MissionConstraints; excluded: Array<{ id: string; customer: string; reason: string }> }

// ── SIMULATE ─────────────────────────────────────────────────────────────
export type BandId = 'current' | '1_7' | '8_30' | '31_90' | '90_plus';
export interface SimAssumption { band: BandId; label: string; rate: number; source: 'you' | 'your_history' | 'starting_assumption'; sample?: number; kind: 'assumption' }
export interface Simulation {
  horizonDays: number;
  facts: EvidenceItem[];
  assumptions: SimAssumption[];
  estimate: {
    expected: { label: string; value: number; kind: 'estimate'; unit: 'INR' };
    range: { label: string; low: number; high: number; kind: 'estimate'; unit: 'INR' };
    stillOwed: { label: string; value: number; kind: 'estimate'; unit: 'INR' };
  };
  bands: Array<{ band: BandId; label: string; amount: number; count: number; rate: number; expected: number }>;
  method: string; caveat: string | null;
  target?: { amount: number; kind: 'assumption'; reach: 'likely' | 'possible' | 'unlikely'; text: string };
}
export interface SimulateInput { horizonDays?: number; rates?: Partial<Record<BandId, number>>; missionId?: string; invoiceIds?: string[]; targetAmount?: number }

// ── MEMORY ───────────────────────────────────────────────────────────────
export interface MemoryRecord {
  id: string; subject: { type: 'customer' | 'business'; key: string; label: string }; topic: string;
  statement: string; value: Record<string, unknown> | null; status: 'inferred' | 'confirmed' | 'corrected' | 'removed';
  provenance: { source: 'your_books' | 'mission' | 'you' | string; table?: string; ids?: string[]; method?: string; sampleSize?: number; correctedFrom?: string };
  observedAt: string; decidedAt: string | null; updatedAt: string; freshness: 'current' | 'stale' | 'changed_since_confirmed';
}

// ── PREPARED ─────────────────────────────────────────────────────────────
export interface PreparedItem {
  id: string; horizon: '24h' | '7d' | '30d'; kind: 'invoices_due' | 'crossing_band' | 'promise_due' | 'mission_ending' | 'decisions_waiting';
  title: string; reason: string; amount: number | null; severity?: Severity;
  source: { table: string; ids: string[] }; route: string; customers?: string[];
}
export interface PreparedHorizon { horizon: '24h' | '7d' | '30d'; label: string; status: 'ready' | 'nothing_due' | 'insufficient_data'; note: string | null; items: PreparedItem[] }

// ── SCAN ─────────────────────────────────────────────────────────────────
export interface CustomerScan {
  subject: { type: 'customer'; key: string; name: string };
  headline: string; why: string[]; nextStep: { stage: string; text: string } | null; evidence: EvidenceSet;
  invoices: Array<{ id: string; invoiceNumber: string | null; amount: number; daysOverdue: number; dueDate: string | null; disputed: boolean }>;
  actions: FeatureAction[]; watch: WatchEvent[]; missions: Mission[]; memory: MemoryRecord[];
}
export interface InvoiceScan {
  subject: { type: 'invoice'; id: string; invoiceNumber: string | null; customer: string; customerKey: string };
  headline: string; evidence: EvidenceSet; customer: CustomerScan | null;
}
export interface ScanSearch {
  customers: Array<{ key: string; name: string; openCount: number; openTotal: number; oldestDays: number }>;
  invoices: Array<{ id: string; customer: string; invoiceNumber: string | null; amount: number; daysOverdue: number }>;
}

// ── THE BRIDGE ───────────────────────────────────────────────────────────
export interface BridgeView {
  generatedAt: string; dataAsOf: string | null; freshness: 'fresh' | 'delayed' | 'stale' | 'none'; hasData: boolean;
  state: {
    currency: string; openReceivables: number; overdueReceivables: number; openInvoiceCount: number; overdueInvoiceCount: number;
    ageing: Array<{ id: BandId; label: string; amount: number; count: number }>;
    topOverdue: Array<{ key: string; name: string; amount: number; count: number; oldestDays: number }>;
    evidence: EvidenceSet;
  } | null;
  attention: {
    decisions: number; topDecisions: FeatureAction[];
    watch: { open: number; acknowledged: number; urgent: number; latest: WatchEvent[] };
  };
  missions: Mission[];
  prepared: Array<{ horizon: '24h' | '7d' | '30d'; label: string; status: PreparedHorizon['status']; count: number; first: PreparedItem | null }> | null;
  sources: Array<{ id: string; name: string; health: string; lastSuccessAt: string | null }>;
  partial: boolean;
}

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  draft: 'Draft', active: 'Active', paused: 'Paused', completed: 'Completed', failed: 'Missed target', cancelled: 'Cancelled',
};
export const SIM_SOURCE_LABEL: Record<SimAssumption['source'], string> = {
  you: 'Set by you', your_history: 'From your paid invoices', starting_assumption: 'Starlane’s starting assumption',
};
export const MEMORY_STATUS_LABEL: Record<MemoryRecord['status'], string> = {
  inferred: 'Inferred', confirmed: 'Confirmed by you', corrected: 'Corrected by you', removed: 'Removed',
};
