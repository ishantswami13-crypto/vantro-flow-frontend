// The AI model a person picked for Ask Starlane. The list and which models
// can actually run come from GET /api/ai/health (a model is available only
// when its provider is configured on the server). The pick is kept in this
// browser; "auto" lets the server choose and fail over.

import { request } from "./api";

export interface AiModel { id: string; label: string; note: string; provider: string | null; available: boolean }

const KEY = "starlane_ai_model";
const EVENT = "starlane-model-change";

export function getModelChoice(): string {
  try { return localStorage.getItem(KEY) || "auto"; } catch { return "auto"; }
}

export function setModelChoice(id: string) {
  try { localStorage.setItem(KEY, id); } catch { /* private mode: pick lasts this page only */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

export function onModelChoice(fn: (id: string) => void) {
  const h = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

let cached: Promise<AiModel[]> | null = null;
export function loadModels(): Promise<AiModel[]> {
  if (!cached) {
    cached = request<{ models?: AiModel[] }>("/api/ai/health")
      .then((h) => (Array.isArray(h.models) ? h.models : []))
      .catch(() => { cached = null; return []; });
  }
  return cached;
}
