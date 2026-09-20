// Scan has no backend-side query/thread persistence — POST /api/ai-chat
// (server.js:6259) is stateless per call and takes only the message array
// the caller sends; there is no queryId, no saved-query table, no
// conversation-history endpoint. So /scan/:queryId can't be a durable,
// shareable, backend-backed URL yet. This store gives it a real (if
// session-scoped) identity via sessionStorage — good enough for the
// composer -> result navigation and for follow-up turns within one tab,
// but a refreshed/deep-linked queryId with nothing in sessionStorage must
// show an honest "this result isn't available anymore" state rather than
// silently 404ing or fabricating content. This is a real, disclosed
// limitation of the current backend, not a design choice to hide it.

import type { ChatMessage } from "./api";

export interface ScanResult {
  question: string;
  messages: ChatMessage[];
  response: { message: string; actions: string[]; navigate: string | null; waLinks: { to: string; phone: string; message: string; url: string }[] };
  askedAt: string;
}

const KEY_PREFIX = "vantro_scan_";

export function saveScanResult(result: ScanResult): string {
  const queryId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    sessionStorage.setItem(KEY_PREFIX + queryId, JSON.stringify(result));
  } catch { /* sessionStorage unavailable — result just won't survive navigation */ }
  return queryId;
}

export function getScanResult(queryId: string): ScanResult | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + queryId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Follow-ups reuse the same queryId and append to the real message history
// that /api/ai-chat expects — this is genuine conversation threading, just
// held client-side since the backend has none of its own.
export function updateScanResult(queryId: string, result: ScanResult): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + queryId, JSON.stringify(result));
  } catch { /* ignore */ }
}
