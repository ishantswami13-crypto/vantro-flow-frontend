"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { EmptyLine, ThinkingDots } from "@/components/v32/ui";
import { IconCheck, IconCopy, IconHistory, IconPlus, IconWhatsApp } from "@/components/v32/icons";
import { AnswerMarkdown } from "@/components/scan/AnswerMarkdown";
import { ScanComposer, businessNameFromStorage } from "@/components/scan/ScanComposer";
import { api, getUser } from "@/lib/api";
import { appendTurn, getThread, messagesFor, type ScanThread, type ScanTurn } from "@/lib/scanStore";

// A Scan conversation: every question and answer in order, with the box
// docked underneath for the next one. POST /api/ai-chat (server.js) returns
// only { message, actions, navigate, waLinks }: no citations, record ids or
// typed figures. So each turn shows the answer, its WhatsApp drafts and its
// suggested next steps, and nothing is invented to fill a sources panel.
// The whole history is sent back with each follow-up so the assistant keeps
// the thread's context.
export default function ScanThreadPage() {
  const params = useParams<{ queryId: string }>();
  const [thread, setThread] = useState<ScanThread | null | undefined>(undefined);
  const [followUp, setFollowUp] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setThread(getThread(params.queryId)); }, [params.queryId]);

  // Keep the newest turn in view as the conversation grows.
  const turnCount = thread?.turns.length || 0;
  useEffect(() => {
    if (turnCount > 1 || pending) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turnCount, pending]);

  const send = async () => {
    const q = followUp.trim();
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
      setError(e instanceof Error ? e.message : "Couldn't reach Starlane for that follow-up.");
      setFollowUp(q);
    } finally {
      setPending(null);
    }
  };

  return (
    <DashboardLayout pageTitle="Scan">
      <div style={{ width: 760, maxWidth: "100%", margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 150px)" }}>
        <div className="flex items-center justify-between" style={{ padding: "4px 0 18px" }}>
          <Link href="/scan" className="scan-tool" style={{ marginLeft: -9 }}><IconPlus size={14} /> New conversation</Link>
          <Link href="/scan/history" className="scan-tool" style={{ marginRight: -9 }}><IconHistory size={14} /> History</Link>
        </div>

        {thread === undefined && <div style={{ padding: "40px 0" }}><ThinkingDots /></div>}

        {thread === null && (
          <EmptyLine
            title="This conversation isn't on this device"
            body="Scan keeps conversations in this browser only, so one asked on another device or cleared from History can't be opened here. Ask again for a fresh answer."
            action={<Link href="/scan" className="btn-secondary-v32" style={{ display: "inline-block", padding: "8px 14px", borderRadius: 6, fontSize: 12.5, textDecoration: "none", marginTop: 12 }}>Back to Scan</Link>}
          />
        )}

        {thread && (
          <>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 34 }}>
              {thread.turns.map((t, i) => <Turn key={`${t.askedAt}-${i}`} turn={t} />)}
              {pending && (
                <div className="fade-once" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="scan-q">{pending}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#8A8A86" }}>
                    <ThinkingDots /> Reading your data
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="scan-dock">
              <ScanComposer
                id="follow-up"
                value={followUp}
                onChange={setFollowUp}
                onSubmit={send}
                submitting={!!pending}
                placeholder="Ask a follow-up"
              />
              {error && <p role="alert" style={{ fontSize: 12.5, color: "#A64F4B", margin: "10px 4px 0" }}>{error}</p>}
              <p style={{ fontSize: 11.5, color: "#8A8A86", margin: "10px 0 0", textAlign: "center" }}>
                Starlane answers only from your connected data. This conversation is kept on this device.
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Turn({ turn }: { turn: ScanTurn }) {
  const [copied, setCopied] = useState(false);
  const { message, actions, waLinks } = turn.response;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: nothing to undo */ }
  };

  return (
    <div className="fade-once" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="scan-q">{turn.question}</div>

      <div>
        <AnswerMarkdown>{message}</AnswerMarkdown>

        {waLinks.length > 0 && (
          <div className="flex flex-wrap" style={{ gap: 8, marginTop: 6 }}>
            {waLinks.map((w, i) => (
              <a key={i} href={w.url} target="_blank" rel="noreferrer" className="scan-chip inline-flex items-center" style={{ gap: 7, textDecoration: "none" }}>
                <IconWhatsApp size={14} /> Draft for {w.to}
              </a>
            ))}
          </div>
        )}

        {actions.length > 0 && (
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(25,25,23,0.07)" }}>
            <div style={{ fontSize: 11, color: "#8A8A86", marginBottom: 6 }}>Suggested next steps</div>
            {actions.map((a, i) => (
              <p key={i} style={{ fontSize: 13, color: "#43433F", margin: i ? "4px 0 0" : 0, lineHeight: 1.5 }}>{a}</p>
            ))}
          </div>
        )}

        <div className="flex items-center" style={{ marginTop: 8, marginLeft: -9 }}>
          <button type="button" onClick={copy} className="scan-tool" aria-label="Copy answer">
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
