// Data feeds (backend lib/routes/feeds.js): products, bills of materials,
// customer orders and purchase orders kept up to date from a Google Sheet,
// any file address, a connected app, or rows other software pushes. Every
// run goes through the same checked import as a file upload.

import { API_BASE, authHeaders, fetchWithRetry } from '@/lib/api';
import { DecisionApiError, type OpsKind, type OpsImportOptions, type OpsPreview, type OpsSummary } from '@/lib/decisions';

export type FeedSourceType = 'sheet_link' | 'file_url' | 'push' | 'app';
export type FeedStatus = 'ACTIVE' | 'PAUSED' | 'NEEDS_ATTENTION';
export type RunStatus = 'running' | 'imported' | 'unchanged' | 'needs_attention' | 'failed';

export interface FeedRun {
  id: string; trigger: 'manual' | 'schedule' | 'push' | 'setup'; status: RunStatus; startedAt: string; finishedAt: string | null;
  rowsReceived: number; rowsAccepted: number; rowsRejected: number; rowsReview: number; batchId: string | null; error: string | null;
  details: { note?: string; truncated?: string; counts?: OpsSummary['counts']; errors?: string[]; columns?: string[] | null };
}

export interface Feed {
  id: string; name: string; kind: OpsKind; kindLabel: string; sourceType: FeedSourceType;
  source: { url: string | null; connectorId: string | null; headerName: string | null; hasHeader: boolean | null };
  mapping: Partial<OpsImportOptions> & { auto?: boolean; canonical?: boolean };
  autoMapping: boolean; intervalMinutes: number | null; status: FeedStatus; statusReason: string | null;
  nextRunAt: string | null; lastRunAt: string | null; lastSuccessAt: string | null; lastBatchId: string | null; pushPath: string | null;
  createdAt: string; lastRun: FeedRun | null;
}

export interface FeedApp { connectorId: string; name: string; kinds: OpsKind[]; live: boolean; connected: boolean; status: string | null; label: string | null }
export interface FeedColumn { field: string; column: string; required: boolean; type: string; alsoAccepted: string[] }

export interface FeedsResponse {
  feeds: Feed[];
  apps: FeedApp[];
  intervals: number[];
  kinds: { kind: OpsKind; label: string; columns: FeedColumn[] }[];
  scheduler: 'on' | 'off';
}

export interface FeedSourceInput {
  url?: string;
  connectorId?: string;
  header?: { name: string; value: string } | null;
}

export interface FeedPreviewResponse {
  ok: true; kind: OpsKind; sourceType: FeedSourceType; columns: FeedColumn[];
  rowsReceived?: number | null; truncated?: boolean; empty?: boolean;
  preview: OpsPreview | null; suggestedInput?: OpsImportOptions;
}

export interface RunResult {
  runId: string; status: RunStatus; error?: string; errors?: string[]; note?: string; batchId?: string;
  summary?: OpsSummary | null; details?: FeedRun['details'];
}

export interface FeedCreateBody {
  name?: string; kind: OpsKind; sourceType: FeedSourceType; source: FeedSourceInput;
  mapping: Partial<OpsImportOptions> & { auto?: boolean }; intervalMinutes?: number | null;
}

async function call<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown, timeoutMs = 120_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/feeds${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let data: Record<string, unknown> = {};
    try { data = await res.json(); } catch { data = {}; }
    if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/login';
    if (!res.ok) throw new DecisionApiError(res.status, data);
    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new DecisionApiError(0, { error: 'The request timed out. Check your connection and try again.' });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const feedsApi = {
  list: () => call<FeedsResponse>('GET', ''),
  preview: (body: { kind: OpsKind; sourceType: FeedSourceType; source: FeedSourceInput; mapping?: OpsImportOptions | null; sample?: unknown }) =>
    call<FeedPreviewResponse>('POST', '/preview', body),
  create: (body: FeedCreateBody) => call<{ feed: Feed; firstRun: RunResult | null; pushKey?: string; pushUrl?: string }>('POST', '', body),
  update: (id: string, body: { name?: string; intervalMinutes?: number | null; status?: 'ACTIVE' | 'PAUSED'; mapping?: Partial<OpsImportOptions> & { auto?: boolean } }) =>
    call<{ feed: Feed }>('PATCH', `/${encodeURIComponent(id)}`, body),
  run: (id: string) => call<{ run: RunResult; feed: Feed | null }>('POST', `/${encodeURIComponent(id)}/run`, {}),
  runs: (id: string) => call<{ runs: FeedRun[] }>('GET', `/${encodeURIComponent(id)}/runs`),
  rotateKey: (id: string) => call<{ pushKey: string; pushUrl: string }>('POST', `/${encodeURIComponent(id)}/rotate-key`, {}),
  remove: (id: string) => call<{ deleted: true }>('DELETE', `/${encodeURIComponent(id)}`),
};

export function everyLabel(minutes: number | null): string {
  if (!minutes) return 'Only when you press Run now';
  if (minutes < 60) return `Every ${minutes} minutes`;
  if (minutes === 60) return 'Every hour';
  if (minutes < 1440) return `Every ${minutes / 60} hours`;
  if (minutes === 1440) return 'Every day';
  return 'Every week';
}
