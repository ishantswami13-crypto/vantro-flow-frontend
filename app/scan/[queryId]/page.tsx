"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser, type ChatMessage } from "@/lib/api";
import { getScanResult, updateScanResult, type ScanResult } from "@/lib/scanStore";

// ScanResult — visual spec reverse-engineered directly from the frozen V32
// mockup (`Starlane.html`, artboard "Scan — answered", decompressed to get
// exact markup/CSS) and STARLANE_FRONTEND_HANDOFF.md §5/§6/§17: two-column
// split (`flex:1.4` answer / `flex:1; max-width:300px` rail, `gap:32px`),
// question echo with the `border-left:2px solid #E5E4DF` treatment, 16.5px
// direct-answer line, 13.5px explanation copy, WHY causal-chain dots,
// order-batch style table, `entity_row`/`rail_section` shapes, `.fade-once`
// entrance, `.row-hover` rows.
//
// What's real vs. omitted: POST /api/ai-chat (server.js:6259) returns only
// { message, actions, navigate, waLinks } — no headline/explanation split,
// no typed key-number fields, no WHY causal chain, no order-batch-style
// data, no resolvable entity IDs, no "what happens next" prediction, and no
// evidence/citation records. So of V32's Direct Answer / Key Numbers / Why /
// order-batch table / Affected Entities / What Happens Next / Evidence
// hierarchy, this page renders the visual shell ONLY for what the backend
// actually supports (Direct Answer, Actions) and never fills the other
// slots with invented content just because V32's layout has room for them.
// Evidence keeps its exact rail_section visual treatment but shows the
// honest "not available yet" copy in place of citations.
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
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "8px 8px 32px", gap: 20, boxSizing: "border-box" }}>
        <button
          type="button"
          onClick={() => router.push("/scan")}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#63635F", background: "none", border: "none", cursor: "pointer", padding: 0, width: "fit-content" }}
        >
          <IconChevronLeft /> New scan
        </button>

        {result === undefined && <p style={{ fontSize: 12.5, color: "#63635F" }}>Loading…</p>}

        {result === null && (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917", marginBottom: 6 }}>
              This scan result isn&apos;t available anymore
            </p>
            <p style={{ fontSize: 13.5, color: "#63635F", marginBottom: 16, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
              Scan doesn&apos;t have a saved-query backend yet, so results only live in this browser
              tab for this session. Ask again to get a fresh answer.
            </p>
            <button
              onClick={() => router.push("/scan")}
              style={{ fontSize: 12.5, padding: "8px 16px", borderRadius: 20, border: "1px solid rgba(25,25,23,0.14)", color: "#191917", background: "none", cursor: "pointer" }}
            >
              Back to Scan
            </button>
          </div>
        )}

        {result && (
          <div className="fade-once" style={{ display: "flex", gap: 32, flex: 1, minHeight: 0 }}>
            {/* Left column — answer content, flex:1.4 per V32 §6 */}
            <div style={{ flex: 1.4, minWidth: 0, display: "flex", flexDirection: "column", gap: 22, overflowY: "auto", paddingRight: 4 }}>
              <div style={{ fontSize: 12, color: "#8A8A86", borderLeft: "2px solid #E5E4DF", paddingLeft: 10 }}>
                {result.question}
              </div>

              <div>
                <div style={{ fontSize: 16.5, lineHeight: 1.5, color: "#191917", whiteSpace: "pre-wrap" }}>
                  {result.response.message}
                </div>
              </div>

              {/* Key numbers / Why / order-batch table / Affected entities /
                  What happens next: all omitted — /api/ai-chat returns no
                  typed data for any of them. Not rendered with placeholders. */}

              {(result.response.actions.length > 0 || result.response.waLinks.length > 0) && (
                <div>
                  <div style={{ fontSize: 11, letterSpacing: 1, color: "#63635F", marginBottom: 10 }}>ACTIONS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {result.response.waLinks.map((w, i) => (
                      <a
                        key={`w-${i}`}
                        href={w.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary-v32"
                        style={{ padding: "9px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, textDecoration: "none" }}
                      >
                        Open WhatsApp draft for {w.to}
                      </a>
                    ))}
                  </div>
                  {result.response.actions.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      {result.response.actions.map((a, i) => (
                        <p key={`a-${i}`} style={{ fontSize: 13, color: "#43433F", margin: 0 }}>{a}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingTop: 14, borderTop: "1px solid #EBEAE6" }}>
                <input
                  value={followUp}
                  onChange={e => setFollowUp(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendFollowUp(); }}
                  placeholder="Ask a follow-up…"
                  disabled={sending}
                  style={{ flex: 1, fontSize: 13, color: "#191917", background: "none", border: "1px solid rgba(25,25,23,0.12)", borderRadius: 8, padding: "8px 12px", outline: "none" }}
                />
                <button
                  onClick={sendFollowUp}
                  disabled={sending || !followUp.trim()}
                  className="btn-secondary-v32"
                  style={{ padding: "9px 14px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, cursor: sending || !followUp.trim() ? "default" : "pointer", opacity: sending || !followUp.trim() ? 0.5 : 1 }}
                >
                  Ask
                </button>
              </div>
              {error && <p style={{ fontSize: 12, color: "#A64F4B", margin: 0 }}>{error}</p>}
            </div>

            {/* Right rail — flex:1, max-width:300px per V32 §6 */}
            <div style={{ flex: 1, minWidth: 0, maxWidth: 300, overflowY: "auto" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10.5, letterSpacing: 1, color: "#8A8A86", marginBottom: 6 }}>SOURCES</div>
                <div style={{ fontSize: 12.5, color: "#43433F", padding: "7px 0", borderBottom: "1px solid #EBEAE6" }}>
                  Your connected business data (invoices, customers, cash flow)
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10.5, letterSpacing: 1, color: "#8A8A86", marginBottom: 6 }}>EVIDENCE</div>
                <div style={{ fontSize: 12.5, color: "#8A8A86", padding: "7px 0", borderBottom: "1px solid #EBEAE6" }}>
                  Source-level evidence isn&apos;t available for Scan answers yet — this endpoint
                  doesn&apos;t return citations or record IDs behind its statements.
                </div>
              </div>
              {/* Entities: omitted — response contains customer names as free
                  text, not resolvable IDs, so there's nothing real to link
                  into LensDrawer here. */}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function IconChevronLeft() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"></polyline></svg>;
}
