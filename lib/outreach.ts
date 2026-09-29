// Client for the outbound engine (backend: lib/routes/outreach.js, /api/outreach).
// The backend decides everything: who is eligible, what is sent, when, and
// whether START is allowed. This file only moves JSON.

import { API_BASE, authHeaders } from '@/lib/api';
import { DecisionApiError } from '@/lib/decisions';

async function call<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/outreach${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let data: Record<string, unknown> = {};
    try { data = await res.json(); } catch { data = {}; }
    if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/login';
    // START answers 409 with the preflight that refused it; callers read it.
    if (!res.ok && !(res.status === 409 && 'preflight' in data)) throw new DecisionApiError(res.status, data);
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new DecisionApiError(0, { error: 'The request timed out. Check your connection and try again.' });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export type SendMode = 'SHADOW' | 'TEST' | 'LIVE';

export interface PreflightCheck { name: string; status: 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED' | 'WARN' | string; critical: boolean; detail: string }
export interface Preflight { ready: boolean; verdict: string; checks: PreflightCheck[]; at: string }

export interface ProviderAccount {
  id: string; provider: 'gmail' | 'sink' | string; fromAddress: string; status: string; reason?: string | null; statusReason?: string | null;
  dailyMax: number; throttleFactor: number; lastSuccessAt: string | null; lastPollAt: string | null; hasCredentials?: boolean;
}
export interface CampaignRow { id: string; name: string; status: string; status_reason: string | null; daily_budget: number; goal: string; goal_target: number | null }
export interface Alert { kind: string; severity: string; message: string; created_at?: string }
export interface OutreachStatus {
  headline: string;
  engine: { status: string; mode: SendMode; startedAt: string | null; reason: string | null };
  globalStop: { stopped: boolean; source?: string; reason?: string | null };
  providers: ProviderAccount[];
  eligibleTargets: number; awaitingReview: number; queued: number; sent: number;
  market: { activeNow: string | null; next: { market: string; at: string } | null; rotation: string[] };
  sendRatePerHour: number;
  dailyRemaining: number | null; dailyUsed: number | null;
  repliesNeedingAttention: number;
  lastSuccessfulSend: string | null;
  alerts: Alert[];
  campaigns: CampaignRow[];
}
export interface ReviewMessage {
  id: string; campaign_id: string; step: number; version: number; subject: string; body: string;
  evidence: { fact: string; source: string; retrievedAt: string }[];
  validation: { ok: boolean; errors: string[]; warnings: string[]; wordCount: number } | null;
  review_status: string; full_name: string; role_title: string | null; email: string; company: string | null;
}
export interface Reply { id: string; classification: string; subject: string | null; snippet: string | null; needs_attention: boolean; handled_at: string | null; received_at: string; full_name: string | null; email: string | null; company: string | null }
export interface Job { id: string; status: string; mode: string; run_after: string; attempts: number; last_error: string | null; full_name: string; email: string; company: string | null; sent_at: string | null }
export interface TargetRow {
  company: { name: string; domain?: string; industry?: string; country?: string; facts?: { fact: string; source: string; retrievedAt: string }[] };
  contact: { fullName: string; roleTitle?: string; email: string; country?: string; timezone?: string; verification?: { source: string; method: string; verifiedAt: string; confidence?: string }; roleVerifiedAt?: string; roleSource?: string };
}
export interface ImportResult { results: { row: number; status: string; contactId?: string; error?: string }[]; created: number; merged: number; rejected: number }

export const outreachApi = {
  status: () => call<OutreachStatus>('GET', '/status'),
  preflight: (mode?: SendMode) => call<Preflight>('GET', `/preflight${mode ? `?mode=${mode}` : ''}`),
  start: (mode: SendMode, confirm?: string) => call<{ started: boolean; mode?: SendMode; preflight: Preflight }>('POST', '/start', { mode, confirm }),
  stopAll: (reason?: string) => call<{ stopped: boolean; released: number }>('POST', '/stop-all', { reason }),
  providers: () => call<{ accounts: ProviderAccount[]; gmailOAuthConfigured: boolean; credentialsKeyConfigured: boolean }>('GET', '/providers'),
  addSink: () => call<ProviderAccount>('POST', '/providers', { provider: 'sink' }),
  gmailConnectUrl: (dailyMax = 40) => call<{ url: string }>('GET', `/providers/gmail/connect-url?dailyMax=${dailyMax}`),
  providerAction: (id: string, action: 'pause' | 'resume') => call<ProviderAccount>('POST', `/providers/${id}/${action}`),
  campaigns: () => call<{ campaigns: CampaignRow[] }>('GET', '/campaigns'),
  createCampaign: (input: Record<string, unknown>) => call<CampaignRow>('POST', '/campaigns', input),
  campaignAction: (id: string, action: 'start' | 'pause' | 'resume' | 'stop') => call<{ id: string; status: string }>('POST', `/campaigns/${id}/${action}`),
  importTargets: (rows: TargetRow[]) => call<ImportResult>('POST', '/targets/import', { rows, source: 'outreach-page' }),
  enroll: (campaignId: string, contactIds: string[]) => call<{ enrolled: number }>('POST', `/campaigns/${campaignId}/enroll`, { contactIds }),
  drafts: (campaignId: string) => call<{ drafted: number; blockedByValidation: number; approved: number; excluded: { contactId: string; reasons: string[] }[] }>('POST', `/campaigns/${campaignId}/drafts`, { limit: 200 }),
  messages: (status = 'PENDING_REVIEW') => call<{ messages: ReviewMessage[] }>('GET', `/messages?status=${status}`),
  review: (id: string, decision: 'APPROVE' | 'REJECT') => call<{ id: string; review_status: string }>('POST', `/messages/${id}/review`, { decision }),
  replies: () => call<{ replies: Reply[] }>('GET', '/replies'),
  replyHandled: (id: string) => call<{ handled: boolean }>('POST', `/replies/${id}/handled`),
  jobs: (status?: string) => call<{ jobs: Job[] }>('GET', `/jobs${status ? `?status=${status}` : ''}`),
};

// CSV → import rows. Columns (header row required, any order):
// company, domain, industry, country, full_name, role, email, timezone,
// verification_source, verification_method, verified_at, fact, fact_source, fact_date
export function parseTargetsCsv(text: string): { rows: TargetRow[]; problems: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], problems: ['Paste a header row and at least one target.'] };
  const split = (line: string) => {
    const out: string[] = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i += 1; } else q = !q; } else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const head = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const need = ['company', 'full_name', 'email'];
  const missing = need.filter((n) => !head.includes(n));
  if (missing.length) return { rows: [], problems: [`Missing column(s): ${missing.join(', ')}`] };
  const rows: TargetRow[] = [];
  const problems: string[] = [];
  lines.slice(1).forEach((line, i) => {
    const v = split(line);
    const g = (k: string) => { const idx = head.indexOf(k); return idx === -1 ? '' : (v[idx] || ''); };
    if (!g('email')) { problems.push(`Row ${i + 2}: no email (emails are never guessed)`); return; }
    const verified = g('verification_source') && g('verification_method');
    rows.push({
      company: {
        name: g('company'), domain: g('domain') || undefined, industry: g('industry') || undefined, country: g('country') || undefined,
        facts: g('fact') ? [{ fact: g('fact'), source: g('fact_source'), retrievedAt: g('fact_date') }] : [],
      },
      contact: {
        fullName: g('full_name'), roleTitle: g('role') || undefined, email: g('email'), country: g('country') || undefined, timezone: g('timezone') || undefined,
        verification: verified ? { source: g('verification_source'), method: g('verification_method'), verifiedAt: g('verified_at') || new Date().toISOString().slice(0, 10) } : undefined,
        roleVerifiedAt: verified ? (g('verified_at') || undefined) : undefined, roleSource: verified ? g('verification_source') : undefined,
      },
    });
  });
  return { rows, problems };
}
