"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconTile } from "@/components/v32/ui";
import { IconPlus, IconUpload, IconLink, IconSparkle, IconRupee, IconMissions, IconSimulate, IconHistory, IconLibrary } from "@/components/v32/icons";
import Button from "@/components/ui/Button";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ScanFindings } from "@/components/os/ScanFindings";
import { ScanComposer, businessNameFromStorage } from "@/components/scan/ScanComposer";
import { ScanThinking } from "@/components/scan/ScanThinking";
import { api, getUser } from "@/lib/api";
import { createThread, listThreads } from "@/lib/scanStore";
import { humaneError } from "@/components/scan/humaneError";

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
  const [lastAsked, setLastAsked] = useState<string>("");
  const [ownerName, setOwnerName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    if (new URLSearchParams(window.location.search).get("books") === "1") setShowFindings(true);
    setHasHistory(listThreads().length > 0);
    // Greet the person by their own first name only. A business name or an
    // email prefix is not a name, so without one the greeting stands alone.
    const own = String(stored.owner_name || (user as { owner_name?: string } | null)?.owner_name || "").trim();
    setOwnerName(own.split(/\s+/)[0] || "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    setLastAsked(trimmed);
    try {
      const user = getUser();
      const businessName = businessNameFromStorage(user?.business_name);
      const result = await api.aiChat(user?.id || "", [{ role: "user", content: trimmed }], businessName);
      const threadId = createThread({ question: trimmed, response: result, askedAt: new Date().toISOString() });
      router.push(`/scan/${threadId}`);
    } catch (e) {
      // Keep the question in the box so Try again (or Enter) re-asks it.
      setQuestion(trimmed);
      setError(humaneError(e));
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Scan">
      <div className="scan-stage" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: showFindings ? "flex-start" : "center", minHeight: showFindings ? undefined : "calc(100vh - 200px)", padding: showFindings ? "24px 0 8px" : "24px 0", boxSizing: "border-box" }}>
        <div className="fade-once" style={{ width: 720, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1 className="scan-greeting" style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 400, color: "var(--ink)", textAlign: "center" }}>
            {getGreeting()}{ownerName ? `, ${ownerName}` : ""}
          </h1>
          <p style={{ margin: "10px 0 28px", fontSize: 14, color: "var(--ink-2)", textAlign: "center" }}>
            Ask about money owed, cash coming in or any customer.
          </p>

          <ScanComposer
            value={question}
            onChange={setQuestion}
            onSubmit={() => submit(question)}
            submitting={submitting}
            placeholder="Ask Starlane about your business"
            autoFocus
            hint={<span className="hidden sm:inline">Answers come only from your connected data</span>}
            leading={
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
            }
          />

          {submitting && (
            <div style={{ alignSelf: "stretch", marginTop: 28, padding: "0 4px" }}><ScanThinking /></div>
          )}

          {error && !submitting && (
            <div role="alert" className="fade-once flex items-center justify-between flex-wrap" style={{ alignSelf: "stretch", gap: 12, marginTop: 16, padding: "10px 12px 10px 14px", borderRadius: "var(--radius-md)", border: "1px solid rgb(var(--tk-critical) / 0.25)", background: "rgb(var(--tk-critical) / 0.06)" }}>
              <span style={{ fontSize: 13, color: "var(--ink)" }}>{error}</span>
              <Button variant="secondary" size="sm" onClick={() => submit(lastAsked || question)}>Try again</Button>
            </div>
          )}

          {!showFindings && !submitting && (
            <div className="scan-flows" style={{ marginTop: 22 }}>
              {WORKFLOWS.map((w, i) => {
                const body = (
                  <>
                    <IconTile size={30}>{w.icon}</IconTile>
                    <span className="flex flex-col min-w-0">
                      <span style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.35 }}>{w.title}</span>
                      <span style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.4 }}>{w.hint}</span>
                    </span>
                  </>
                );
                return "ask" in w
                  ? <button key={w.title} type="button" disabled={submitting} onClick={() => submit(w.ask)} className="scan-flow rise-in" style={{ animationDelay: `${i * 50}ms` }}>{body}</button>
                  : <Link key={w.title} href={w.href} className="scan-flow rise-in" style={{ animationDelay: `${i * 50}ms` }}>{body}</Link>;
              })}
            </div>
          )}

          <div className="flex items-center justify-center flex-wrap" style={{ gap: 4, marginTop: 20 }}>
            {hasHistory && (
              <Link href="/scan/history" className="scan-tool"><IconHistory size={14} /> Past conversations</Link>
            )}
            <Link href="/library" className="scan-tool"><IconLibrary size={14} /> Library</Link>
          </div>
        </div>
      </div>

      {showFindings && (
        <div className="fade-once" style={{ width: "100%", maxWidth: "var(--content-max)" }}>
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
        <span style={{ fontSize: 13, color: "var(--ink)" }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{hint}</span>
      </span>
    </button>
  );
}

// Starting points under the box. One asks the assistant straight away; the
// others open the screen that does that job, so nothing here is a promise
// the product cannot keep.
type Workflow = { title: string; hint: string; icon: React.ReactNode } & ({ ask: string } | { href: string });
const WORKFLOWS: Workflow[] = [
  { title: "Who owes us the most?", hint: "Ranked from your invoices", icon: <IconRupee size={15} />, ask: "Who owes us the most?" },
  { title: "Chase overdue invoices", hint: "Start a collections mission", icon: <IconMissions size={15} />, href: "/missions/new" },
  { title: "Forecast cash", hint: "Simulate the next weeks", icon: <IconSimulate size={15} />, href: "/simulate" },
  { title: "Import invoices", hint: "From a sheet or Tally export", icon: <IconUpload size={15} />, href: "/decisions/import" },
];
