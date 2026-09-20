"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, type ChatMessage } from "@/lib/api";
import { getScanResult, updateScanResult, type ScanResult } from "@/lib/scanStore";
import { FiArrowRight, FiAlertCircle } from "react-icons/fi";

// Scan Result — renders only what POST /api/ai-chat can actually back up.
//
// The endpoint returns { message, actions, navigate, waLinks } — one
// free-text explanation plus two backend-populated arrays. It has no typed
// numeric fields, no entity IDs, and no evidence/citation records. So of
// V32's Direct Answer / Key Numbers / Why / Affected Entities / What Happens
// Next / Possible Actions / Evidence hierarchy, only two are real here:
//   - Direct Answer  -> response.message
//   - Actions        -> response.actions (things Starlane's tools actually
//                        did, e.g. "Marked X as paid") + response.waLinks
//                        (WhatsApp drafts it prepared)
// Key Numbers, Why, Affected Entities, What Happens Next, and Evidence are
// never rendered — the backend has no structured data to fill them with,
// and this page does not ask the model to invent that structure just
// because the layout has room for it.
//
// Lens: not wired. The tool results server-side (get_invoices, get_overdue,
// etc.) return customer_name strings, not customer IDs, so there is no real
// entity reference in this response to hand LensDrawer. Wiring it would mean
// fabricating IDs — not done.
//
// Evidence: not wired, for the same reason — EvidenceDrawer is fed by
// api.intelligence.impact(signalId) elsewhere in the app (see /bridge), and
// ai-chat has no equivalent. The honest gap notice below says so plainly.

export default function ScanResultPage() {
  const params = useParams<{ queryId: string }>();
  const router = useRouter();
  const [result, setResult] = useState<ScanResult | null | undefined>(undefined);
  const [followUp, setFollowUp] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setResult(getScanResult(params.queryId));
  }, [params.queryId]);

  const sendFollowUp = async () => {
    const trimmed = followUp.trim();
    if (!trimmed || !result || sending) return;
    setSending(true);
    setError(null);
    try {
      const user = getUser();
      const stored = (() => {
        try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; }
      })();
      const businessName = stored.business_name || user?.business_name || "";
      const nextMessages: ChatMessage[] = [
        ...result.messages,
        { role: "assistant", content: result.response.message },
        { role: "user", content: trimmed },
      ];
      const response = await api.aiChat(user?.id || "", nextMessages, businessName);
      const updated: ScanResult = { question: trimmed, messages: nextMessages, response, askedAt: new Date().toISOString() };
      updateScanResult(params.queryId, updated);
      setResult(updated);
      setFollowUp("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach Starlane for that follow-up.");
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Scan">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        {result === undefined && <p className="v32-meta">Loading…</p>}

        {result === null && (
          <div className="py-10 text-center">
            <FiAlertCircle size={20} style={{ color: "#8A8A86", display: "inline-block", marginBottom: 10 }} />
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917" }} className="mb-1.5">
              This scan result isn&apos;t available anymore
            </p>
            <p className="v32-body mb-4" style={{ color: "#63635F" }}>
              Scan doesn&apos;t have a saved-query backend yet, so results only live in this browser
              tab for this session. Ask again to get a fresh answer.
            </p>
            <button
              onClick={() => router.push("/scan")}
              className="v32-meta px-4 py-2 rounded-full"
              style={{ border: "1px solid rgba(25,25,23,0.14)", color: "#191917" }}
            >
              Back to Scan
            </button>
          </div>
        )}

        {result && (
          <>
            <p className="v32-section-label mb-2">Question</p>
            <p className="mb-6" style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 19, color: "#191917" }}>
              {result.question}
            </p>

            <section className="mb-6">
              <p className="v32-section-label mb-2">Direct answer</p>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#191917", whiteSpace: "pre-wrap" }}>
                {result.response.message}
              </p>
            </section>

            {(result.response.actions.length > 0 || result.response.waLinks.length > 0) && (
              <section className="mb-6">
                <p className="v32-section-label mb-2">Actions</p>
                <div className="space-y-2">
                  {result.response.actions.map((a, i) => (
                    <p key={`a-${i}`} className="v32-body" style={{ color: "#191917" }}>{a}</p>
                  ))}
                  {result.response.waLinks.map((w, i) => (
                    <a
                      key={`w-${i}`}
                      href={w.url}
                      target="_blank"
                      rel="noreferrer"
                      className="v32-body block"
                      style={{ color: "#4F6EF7" }}
                    >
                      Open WhatsApp draft for {w.to} →
                    </a>
                  ))}
                </div>
              </section>
            )}

            <section className="mb-6">
              <p className="v32-section-label mb-2">Evidence</p>
              <p className="v32-body" style={{ color: "#8A8A86" }}>
                Source-level evidence is not available for Scan answers yet — this endpoint doesn&apos;t
                return citations or record IDs behind its statements. Treat the answer above as
                unverified against a specific source record until that's built.
              </p>
            </section>

            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl mt-8"
              style={{ border: "1px solid rgba(25,25,23,0.14)", background: "#fff" }}
            >
              <input
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendFollowUp(); }}
                placeholder="Ask a follow-up…"
                className="flex-1 outline-none"
                style={{ fontSize: 14, color: "#191917", background: "transparent" }}
                disabled={sending}
              />
              <button
                onClick={sendFollowUp}
                disabled={sending || !followUp.trim()}
                className="flex items-center justify-center rounded-lg"
                style={{ width: 32, height: 32, background: "#191917", color: "#fff", opacity: sending || !followUp.trim() ? 0.4 : 1 }}
                aria-label="Ask follow-up"
              >
                <FiArrowRight size={15} />
              </button>
            </div>
            {error && <p className="v32-meta mt-2" style={{ color: "#A64F4B" }}>{error}</p>}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
