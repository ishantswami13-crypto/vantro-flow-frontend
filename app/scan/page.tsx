"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, getUser } from "@/lib/api";
import { saveScanResult } from "@/lib/scanStore";

// Scan — visual spec reverse-engineered directly from the frozen V32 mockup
// (`Starlane.html`, artboard "Scan — new query", extracted + decompressed to
// get exact markup/CSS rather than approximating from the handoff's prose)
// and cross-checked against STARLANE_FRONTEND_HANDOFF.md §5/§6. Backend
// reality: /api/ai-chat (server.js:6259) has no "world"/"field scope"
// concept, so those two selector buttons and the four scope pills below the
// composer are rendered exactly as V32 shows them but are visually inert —
// clicking them does nothing yet, and no comment or label claims they filter
// anything. That's a real gap, not hidden: see the code comments at each
// element. The composer itself, the greeting, and the ask flow are fully
// real and wired to api.aiChat().
//
// V32's mockup textarea placeholder ("Scan the field for what's moving your
// world") and its four pill labels (Your World / The Field / Starlane Guide
// / Market Data) are generic UI chrome, not fact-assertions about this
// account — safe to reproduce verbatim, unlike the dashboard's existing
// fact-asserting example prompts, which this turn still does not touch.
function getGreeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good evening" : "Good evening";
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
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          boxSizing: "border-box",
          minHeight: "calc(100vh - 140px)",
        }}
      >
        <div className="fade-once" style={{ width: 680, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1
            style={{
              margin: "0 0 28px 0",
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 400,
              fontSize: 38,
              color: "#191917",
              textAlign: "center",
            }}
          >
            {getGreeting()}, {ownerName}
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
            {/* World / scope selectors — visual parity with V32; backend has no
                scoping concept yet, so these are inert (no onClick handler
                claims a real filter). */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid rgba(25,25,23,0.08)",
              }}
            >
              <button
                type="button"
                disabled
                style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#43433F", cursor: "default", padding: 0, opacity: 0.7 }}
              >
                <IconWorld /> Select your world <IconChevronDown />
              </button>
              <button
                type="button"
                disabled
                style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#43433F", cursor: "default", padding: 0, opacity: 0.7 }}
              >
                <IconGlobe /> Field scope: Global <IconChevronDown />
              </button>
            </div>

            <div style={{ padding: "18px 16px 12px 16px" }}>
              <label htmlFor="ask" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                Scan the field and your world
              </label>
              <textarea
                id="ask"
                rows={2}
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(question); }
                }}
                placeholder="Scan the field for what's moving your world"
                disabled={submitting}
                style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", resize: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, color: "#191917", background: "none" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 16px 16px" }}>
              <button
                type="button"
                disabled
                aria-label="Add a source"
                style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid rgba(25,25,23,0.16)", background: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#43433F", cursor: "default", opacity: 0.7 }}
              >
                <IconPlus />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  disabled
                  aria-label="Scan settings"
                  style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "#63635F", cursor: "default", opacity: 0.7 }}
                >
                  <IconSettings />
                </button>
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

          {/* Scope pills — visual parity with V32's four pills (Your World /
              The Field / Starlane Guide / Market Data). Backend has no real
              scoping, so these are presentational only for now (disabled,
              no fake "active" state). */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <ScopePill icon={<IconWorld />} label="Your World" />
            <ScopePill icon={<IconGlobe />} label="The Field" />
            <ScopePill icon={<IconGuide />} label="Starlane Guide" />
            <ScopePill icon={<IconMarket />} label="Market Data" />
          </div>

          {submitting && <p style={{ fontSize: 12, color: "#63635F", marginTop: 16 }}>Checking your connected data…</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ScopePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      className="hover-lift"
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
        border: "1px solid rgba(25,25,23,0.12)", borderRadius: 20, background: "#FFFFFF",
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12.5, color: "#43433F",
        cursor: "default", opacity: 0.85,
      }}
    >
      {icon} {label} <IconChevronUpDown />
    </button>
  );
}

function IconWorld() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="1"></rect><line x1="4" y1="10" x2="20" y2="10"></line><line x1="10" y1="10" x2="10" y2="20"></line></svg>;
}
function IconGlobe() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"></circle><ellipse cx="12" cy="12" rx="4" ry="9"></ellipse><line x1="3" y1="12" x2="21" y2="12"></line></svg>;
}
function IconGuide() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12h4l2-7 4 14 2-7h6"></path></svg>;
}
function IconMarket() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4,17 10,10 14,13 20,5"></polyline></svg>;
}
function IconChevronDown() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6,9 12,15 18,9"></polyline></svg>;
}
function IconChevronUpDown() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
function IconPlus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
}
function IconSettings() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="5" y1="6" x2="19" y2="6"></line><circle cx="9" cy="6" r="2"></circle><line x1="5" y1="12" x2="19" y2="12"></line><circle cx="15" cy="12" r="2"></circle><line x1="5" y1="18" x2="19" y2="18"></line><circle cx="9" cy="18" r="2"></circle></svg>;
}
function IconArrowUp() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6,11 12,5 18,11"></polyline></svg>;
}
