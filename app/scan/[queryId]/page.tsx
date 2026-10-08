"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyLine, SkeletonRows } from "@/components/v32/ui";
import { IconBookmark, IconBookmarkFilled, IconCheck, IconCopy, IconHistory, IconPlus, IconScan, IconWhatsApp } from "@/components/v32/icons";
import Button from "@/components/ui/Button";
import { AnswerMarkdown } from "@/components/scan/AnswerMarkdown";
import { ScanComposer, businessNameFromStorage } from "@/components/scan/ScanComposer";
import { ScanThinking } from "@/components/scan/ScanThinking";
import { ScanMark } from "@/components/scan/ScanMark";
import { humaneError } from "@/components/scan/humaneError";
import { isPromptSaved, removeSavedPrompt, savePrompt } from "@/lib/promptStore";
import { api, getUser } from "@/lib/api";
import { formatClock, formatRelative } from "@/lib/format";
import { appendTurn, getThread, messagesFor, type ScanThread, type ScanTurn } from "@/lib/scanStore";

// A Scan conversation: every question and answer in order, with the box
// docked underneath for the next one. POST /api/ai-chat (server.js) returns
// only { message, actions, navigate, waLinks }: no citations, record ids or
// typed figures, so no sources panel is invented. What the answer does carry
// is shown plainly: `actions` is the server's log of the tools it actually
// ran for this answer (drafted a reminder, found an invoice...), so it is
// shown as "What Starlane did", and each WhatsApp draft is a link the owner
// opens and sends. The whole history is sent back with each follow-up so
// the assistant keeps the thread's context.
export default function ScanThreadPage() {
  const params = useParams<{ queryId: string }>();
  const [thread, setThread] = useState<ScanThread | null | undefined>(undefined);
  const [followUp, setFollowUp] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setThread(getThread(params.queryId)); }, [params.queryId]);

  // Keep the newest turn in view as the conversation grows.
  const turnCount = thread?.turns.length || 0;
  useEffect(() => {
    if (turnCount > 1 || pending) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turnCount, pending]);

  const send = async (text?: string) => {
    const q = (text ?? followUp).trim();
    if (!q || !thread || pending) return;
    setPending(q);
    setFollowUp("");
    setError(null);
    try {
      const user = getUser();
      const response = await api.aiChat(user?.id || "", messagesFor(thread, q), businessNameFromStorage(user?.business_name));
      const turn: ScanTurn = { question: q, response, askedAt: new Date().toISOString() };
      const saved = appendTurn(thread.id, turn);
      setThread(saved || { ...thread, turns: [...thread.turns, turn], updatedAt: turn.askedAt });
    } catch (e) {
      setError(humaneError(e));
      setFailed(q);
      setFollowUp(q);
    } finally {
      setPending(null);
    }
  };

  return (
    <DashboardLayout pageTitle={thread?.title || "Scan"}>
      <div style={{ width: "100%", maxWidth: "var(--content-max)", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 150px)" }}>
        <div className="flex items-start justify-between flex-wrap fade-once" style={{ gap: 12, paddingBottom: 20, marginBottom: 28, borderBottom: "1px solid var(--line)" }}>
          <div className="min-w-0" style={{ flex: "1 1 320px" }}>
            <h1 className="scan-thread-title" style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 22, lineHeight: 1.25, color: "var(--ink)", overflowWrap: "anywhere" }}>
              {thread ? thread.title : thread === null ? "Conversation not found" : " "}
            </h1>
            {thread && (
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 6 }}>
                {thread.turns.length} {thread.turns.length === 1 ? "question" : "questions"} · started {formatRelative(thread.createdAt)} · kept on this device
              </div>
            )}
          </div>
          <div className="flex items-center shrink-0" style={{ gap: 8 }}>
            <Link href="/scan/history" className="ui-btn ui-btn-ghost ui-btn-sm"><IconHistory size={14} /> History</Link>
            <Link href="/scan" className="ui-btn ui-btn-secondary ui-btn-sm"><IconPlus size={14} /> New conversation</Link>
          </div>
        </div>

        {thread === undefined && <SkeletonRows rows={3} />}

        {thread === null && (
          <EmptyLine
            icon={<IconScan size={17} />}
            title="This conversation isn't on this device"
            body="Scan keeps conversations in this browser only, so one asked on another device, or deleted from History, can't be opened here. Ask again for a fresh answer."
            action={<Link href="/scan" className="ui-btn ui-btn-secondary ui-btn-sm">Back to Scan</Link>}
          />
        )}

        {thread && (
          <div className="scan-thread" style={{ flex: 1 }}>
            <div className="min-w-0" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 40 }}>
                {thread.turns.map((t, i) => <Turn key={`${t.askedAt}-${i}`} turn={t} index={i} />)}
                {pending && (
                  <div className="scan-turn fade-once">
                    <div className="scan-q">{pending}</div>
                    <ScanThinking />
                  </div>
                )}
                <div ref={endRef} style={{ scrollMarginBottom: 170 }} />
              </div>

              <div className="scan-dock">
                {error && (
                  <div role="alert" className="fade-once flex items-center justify-between flex-wrap" style={{ gap: 12, marginBottom: 10, padding: "8px 10px 8px 14px", borderRadius: "var(--radius-md)", border: "1px solid rgb(var(--tk-critical) / 0.25)", background: "var(--surface)" }}>
                    <span style={{ fontSize: 13, color: "var(--ink)" }}>{error}</span>
                    <Button variant="secondary" size="sm" onClick={() => send(failed)}>Try again</Button>
                  </div>
                )}
                <ScanComposer
                  id="follow-up"
                  value={followUp}
                  onChange={setFollowUp}
                  onSubmit={() => send()}
                  submitting={!!pending}
                  placeholder="Ask a follow-up"
                  hint={<span className="hidden sm:inline">Enter to send, Shift + Enter for a new line</span>}
                />
              </div>
            </div>

            <aside className="scan-rail" aria-label="About this conversation">
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>In this conversation</div>
              <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {thread.turns.map((t, i) => (
                  <li key={`${t.askedAt}-${i}`}>
                    <a href={`#turn-${i + 1}`} className="scan-rail-link">
                      <span className="tabular-nums" style={{ color: "var(--ink-3)", minWidth: 14 }}>{i + 1}</span>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.question}</span>
                    </a>
                  </li>
                ))}
              </ol>
              <div style={{ borderTop: "1px solid var(--line)", marginTop: 20, paddingTop: 16, fontSize: 12.5, lineHeight: 1.6, color: "var(--ink-2)" }}>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 6 }}>How answers are made</div>
                Starlane reads your open invoices and runs read-only lookups. It can draft a WhatsApp message for you to send, but never sends one or marks a payment.
              </div>
              <div style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.6, color: "var(--ink-3)" }}>
                Kept in this browser only. It won&rsquo;t appear on your other devices.
              </div>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// The server prefixes each logged tool action with an emoji (server.js
// actions.push). Status is never shown as emoji here, so strip it.
function plainAction(a: string): string {
  return a.replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}️‍\s]+/u, "").trim();
}

function Turn({ turn, index }: { turn: ScanTurn; index: number }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const { message, actions, waLinks } = turn.response;
  const did = (actions || []).map(plainAction).filter(Boolean);

  useEffect(() => { setSaved(isPromptSaved(turn.question)); }, [turn.question]);

  const toggleSave = () => {
    if (saved) removeSavedPrompt(turn.question); else savePrompt(turn.question);
    setSaved(!saved);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: nothing to undo */ }
  };

  return (
    <article id={`turn-${index + 1}`} className="scan-turn fade-once" aria-label={`Question ${index + 1}`}>
      <div className="scan-q">{turn.question}</div>

      <div className="scan-answer">
        <div className="scan-answer-head">
          <ScanMark />
          <span style={{ color: "var(--ink)", fontWeight: 500 }}>Starlane</span>
          <span style={{ color: "var(--ink-3)" }}>{formatClock(turn.askedAt)}</span>
        </div>

        <AnswerMarkdown>{message}</AnswerMarkdown>

        {waLinks.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {waLinks.map((w, i) => (
                <a key={i} href={w.url} target="_blank" rel="noreferrer" className="scan-chip">
                  <IconWhatsApp size={14} /> Open draft for {w.to}
                </a>
              ))}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ink-3)" }}>Opens WhatsApp with the message written. You review it and send it yourself.</p>
          </div>
        )}

        {did.length > 0 && (
          <div className="scan-steps">
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>What Starlane did for this answer</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {did.map((a, i) => (
                <li key={i}>
                  <span style={{ color: "var(--ink-3)", marginTop: 3, flexShrink: 0 }}><IconCheck size={13} /></span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center flex-wrap" style={{ marginTop: 10, marginLeft: -9, gap: 2 }}>
          <button type="button" onClick={copy} className="scan-tool" aria-label="Copy answer">
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />} {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={toggleSave} className="scan-tool" aria-pressed={saved} title={saved ? "Remove from your Library" : "Save this question to your Library"}>
            {saved ? <IconBookmarkFilled size={14} /> : <IconBookmark size={14} />} {saved ? "Saved to Library" : "Save prompt"}
          </button>
          <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 8 }}>From your connected data</span>
        </div>
      </div>
    </article>
  );
}
