"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ScanFindings } from "@/components/os/ScanFindings";
import { api, getUser } from "@/lib/api";
import { saveScanResult } from "@/lib/scanStore";

// Scan answers "What did Starlane discover?". The findings (process,
// bottleneck, automation candidates, opportunities, decisions) come from
// POST /api/os/scan over the tenant's own ledger. Below them, a person can
// ask a question; the assistant answers only from connected data, and its
// tools can read and draft but never mark payments or record orders.
// The V32 mockup's world/scope selectors and pills were removed: the backend
// has no such scoping, and a control that does nothing is not shown.
function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function ScanPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>("there");

  useEffect(() => {
    const user = getUser();
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; }
    })();
    setOwnerName((stored.owner_name || stored.business_name || user?.business_name || user?.email?.split("@")[0] || "there").split(" ")[0]);
  }, []);

  const submit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = getUser();
      const stored = (() => {
        try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; }
      })();
      const businessName = stored.business_name || user?.business_name || "";
      const result = await api.aiChat(user?.id || "", [{ role: "user", content: trimmed }], businessName);
      const queryId = saveScanResult({
        question: trimmed,
        messages: [{ role: "user", content: trimmed }],
        response: result,
        askedAt: new Date().toISOString(),
      });
      router.push(`/scan/${queryId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach Starlane to answer that.");
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Scan">
      <div style={{ width: 880, maxWidth: "100%", margin: "0 auto", paddingTop: 8 }}>
        <ScanFindings />
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px 40px",
          boxSizing: "border-box",
        }}
      >
        <div className="fade-once" style={{ width: 680, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1
            style={{
              margin: "0 0 16px 0",
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 400,
              fontSize: 24,
              color: "#191917",
              textAlign: "center",
            }}
          >
            {getGreeting()}, {ownerName}. Ask about your data.
          </h1>

          <form
            onSubmit={e => { e.preventDefault(); submit(question); }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid rgba(25,25,23,0.12)",
              borderRadius: 12,
              background: "#FFFFFF",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "18px 16px 12px 16px" }}>
              <label htmlFor="ask" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                Ask a question about your business data
              </label>
              <textarea
                id="ask"
                rows={2}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(question); }
                }}
                placeholder="Ask about your business, e.g. which customers owe us the most?"
                disabled={submitting}
                style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", resize: "none", fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif", fontSize: 15, color: "#191917", background: "none" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 16px 16px" }}>
              <span style={{ fontSize: 12, color: "#8A8A86" }}>Answers come only from your connected data.</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Real submit action — V32 shows a mic/voice glyph here, but
                    Starlane has no real voice-input pipeline, so this button
                    submits the typed question instead of claiming voice
                    support that doesn't exist. Same 30x30 dark circle style. */}
                <button
                  type="submit"
                  disabled={submitting || !question.trim()}
                  aria-label="Ask"
                  className="hover-lift"
                  style={{ width: 30, height: 30, borderRadius: "50%", background: "#191917", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#F7F7F4", cursor: submitting || !question.trim() ? "default" : "pointer", opacity: submitting || !question.trim() ? 0.5 : 1 }}
                >
                  <IconArrowUp />
                </button>
              </div>
            </div>
          </form>

          {error && <p style={{ fontSize: 12, color: "#A64F4B", marginTop: 8 }}>{error}</p>}

          {submitting && <p style={{ fontSize: 12, color: "#63635F", marginTop: 16 }}>Checking your connected data…</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}

function IconArrowUp() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6,11 12,5 18,11"></polyline></svg>;
}
