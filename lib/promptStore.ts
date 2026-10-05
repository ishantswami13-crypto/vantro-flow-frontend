// Saved Scan prompts. Like conversations (lib/scanStore.ts), they live in
// this browser's localStorage, keyed per signed-in user: the backend has no
// prompt table, so a saved prompt does not follow the person to another
// device and the Library says so.

import { getUser } from "./api";

export interface SavedPrompt { id: string; text: string; savedAt: string }

export const SAVED_PROMPTS_EVENT = "starlane:saved-prompts";
const MAX_PROMPTS = 100;

function storeKey(): string {
  return `starlane_saved_prompts_${getUser()?.id || "anon"}`;
}

export function listSavedPrompts(): SavedPrompt[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storeKey()) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(prompts: SavedPrompt[]): void {
  try {
    localStorage.setItem(storeKey(), JSON.stringify(prompts.slice(0, MAX_PROMPTS)));
    window.dispatchEvent(new Event(SAVED_PROMPTS_EVENT));
  } catch { /* storage blocked: nothing saved, the UI shows the unchanged list */ }
}

export function isPromptSaved(text: string): boolean {
  const t = text.trim();
  return listSavedPrompts().some(p => p.text === t);
}

/** Saves a prompt once; saving the same text again is a no-op. */
export function savePrompt(text: string): void {
  const t = text.trim();
  if (!t || isPromptSaved(t)) return;
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  writeAll([{ id, text: t, savedAt: new Date().toISOString() }, ...listSavedPrompts()]);
}

export function removeSavedPrompt(text: string): void {
  const t = text.trim();
  writeAll(listSavedPrompts().filter(p => p.text !== t));
}
