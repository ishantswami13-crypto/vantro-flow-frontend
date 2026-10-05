// Scan conversations. POST /api/ai-chat (server.js) is stateless per call:
// it takes only the message array the caller sends and has no thread or
// history table. So conversations are kept in this browser's localStorage,
// keyed per signed-in user so two accounts on one device never see each
// other's questions. They survive a refresh and power the History page,
// but they do not follow the person to another device; the UI says so.

import type { ChatMessage } from "./api";
import { getUser } from "./api";

export type ScanResponse = { message: string; actions: string[]; navigate: string | null; waLinks: { to: string; phone: string; message: string; url: string }[] };

export interface ScanTurn {
  question: string;
  response: ScanResponse;
  askedAt: string;
}

export interface ScanThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: ScanTurn[];
}

const MAX_THREADS = 60;

function storeKey(): string {
  const id = getUser()?.id;
  return `starlane_scan_threads_${id || "anon"}`;
}

function readAll(): ScanThread[] {
  try {
    const raw = localStorage.getItem(storeKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(threads: ScanThread[]): void {
  try {
    localStorage.setItem(storeKey(), JSON.stringify(threads.slice(0, MAX_THREADS)));
  } catch { /* storage full or blocked: the conversation still shows in this tab */ }
}

function newId(): string {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Newest first. */
export function listThreads(): ScanThread[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getThread(id: string): ScanThread | null {
  return readAll().find((t) => t.id === id) || null;
}

/** Starts a conversation with its first answered question; returns its id. */
export function createThread(turn: ScanTurn): string {
  const id = newId();
  const thread: ScanThread = { id, title: turn.question, createdAt: turn.askedAt, updatedAt: turn.askedAt, turns: [turn] };
  writeAll([thread, ...readAll()]);
  return id;
}

export function appendTurn(id: string, turn: ScanTurn): ScanThread | null {
  const all = readAll();
  const t = all.find((x) => x.id === id);
  if (!t) return null;
  t.turns.push(turn);
  t.updatedAt = turn.askedAt;
  writeAll([t, ...all.filter((x) => x.id !== id)]);
  return t;
}

export function deleteThread(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id));
}

/** The message history /api/ai-chat expects, ending with a new question. */
export function messagesFor(thread: ScanThread | null, nextQuestion: string): ChatMessage[] {
  const msgs: ChatMessage[] = [];
  for (const turn of thread?.turns || []) {
    msgs.push({ role: "user", content: turn.question });
    msgs.push({ role: "assistant", content: turn.response.message });
  }
  msgs.push({ role: "user", content: nextQuestion });
  return msgs;
}
