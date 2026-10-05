"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ThinkingDots } from "@/components/v32/ui";
import { IconPlus, IconArrowUp, IconUpload, IconLink, IconSparkle } from "@/components/v32/icons";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ScanFindings } from "@/components/os/ScanFindings";
import { api, getUser } from "@/lib/api";
import { saveScanResult } from "@/lib/scanStore";

// Scan is a chat start: a greeting and one box. The assistant answers only
// from connected data, and its tools can read and draft but never mark
// payments or record orders. The ledger scan (POST /api/os/scan: process,
// bottleneck, automation candidates, opportunities, decisions) stays out of
// the way until the person opens it from the box's plus menu.
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The box grows with the question, up to a few lines, then scrolls.
  const grow = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 200)}px`; };

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  useEffect(() => {
    const user = getUser();
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem("vantro_user") || "{}"); } catch { return {}; }
    })();
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim()) { setQuestion(q); void submit(q); }
    setOwnerName((stored.owner_name || stored.business_name || user?.business_name || user?.email?.split("@")[0] || "there").split(" ")[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="scan-stage" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: showFindings ? "flex-start" : "center", minHeight: showFindings ? undefined : "calc(100vh - 190px)", padding: showFindings ? "32px 0 8px" : "24px 0", boxSizing: "border-box" }}>
        <div className="fade-once" style={{ width: 720, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1 className="scan-greeting" style={{ margin: "0 0 26px 0", fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, color: "#191917", textAlign: "center" }}>
            {getGreeting()}, {ownerName}
          </h1>

          <form
            onSubmit={e => { e.preventDefault(); submit(question); }}
            className="composer-glow scan-composer"
          >
            <label htmlFor="ask" className="sr-only">Ask a question about your business data</label>
            <textarea
              id="ask"
              ref={taRef}
              rows={1}
              value={question}
              onChange={e => { setQuestion(e.target.value); grow(e.currentTarget); }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(question); }
              }}
              placeholder="Ask Starlane about your business"
              disabled={submitting}
              className="scan-input"
            />

            <div className="flex items-center justify-between" style={{ padding: "4px 10px 10px 10px" }}>
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  aria-label="Add data or run a scan"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(v => !v)}
                  className="scan-round scan-plus"
                >
                  <IconPlus size={16} />
                </button>
                {menuOpen && (
                  <div role="menu" className="pop-in scan-menu">
                    <MenuItem icon={<IconUpload size={16} />} title="Upload a file" hint="A receivables or sales export" onClick={() => router.push("/decisions/import")} />
                    <MenuItem icon={<IconLink size={16} />} title="Connect a source" hint="Tally or another system" onClick={() => router.push("/sources")} />
                    <MenuItem icon={<IconSparkle size={16} />} title="Scan my books" hint="See how invoices turn into cash" onClick={() => { setMenuOpen(false); setShowFindings(true); }} />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || !question.trim()}
                aria-label="Ask"
                className="scan-round scan-send"
              >
                {submitting ? <ThinkingDots color="#F7F7F4" /> : <IconArrowUp size={16} />}
              </button>
            </div>
          </form>

          {!showFindings && (
            <div className="flex flex-wrap justify-center" style={{ gap: 8, marginTop: 18 }}>
              {SUGGESTIONS.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => submit(q)}
                  disabled={submitting}
                  className="scan-chip"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {error && <p role="alert" style={{ fontSize: 12.5, color: "#A64F4B", marginTop: 14 }}>{error}</p>}
          <p style={{ fontSize: 11.5, color: "#8A8A86", marginTop: 18, textAlign: "center" }}>Starlane answers only from your connected data.</p>
        </div>
      </div>

      {showFindings && (
        <div className="fade-once" style={{ width: 880, maxWidth: "100%", margin: "0 auto" }}>
          <ScanFindings />
        </div>
      )}
    </DashboardLayout>
  );
}

function MenuItem({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="scan-menu-item">
      <span className="scan-menu-icon">{icon}</span>
      <span className="flex flex-col text-left min-w-0">
        <span style={{ fontSize: 13, color: "#191917" }}>{title}</span>
        <span style={{ fontSize: 11.5, color: "#8A8A86" }}>{hint}</span>
      </span>
    </button>
  );
}

// Starter questions, answered by the same assistant over the tenant's data.
const SUGGESTIONS = ["Who owes us the most?", "What is overdue this week?", "Which customers pay late?"];
