"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconTile } from "@/components/v32/ui";
import { IconPlus, IconUpload, IconLink, IconSparkle, IconRupee, IconMissions, IconSimulate, IconHistory } from "@/components/v32/icons";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ScanFindings } from "@/components/os/ScanFindings";
import { ScanComposer, businessNameFromStorage } from "@/components/scan/ScanComposer";
import { ScanThinking } from "@/components/scan/ScanThinking";
import { api, getUser } from "@/lib/api";
import { createThread, listThreads } from "@/lib/scanStore";

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
    setOwnerName((stored.owner_name || stored.business_name || user?.business_name || user?.email?.split("@")[0] || "there").split(" ")[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = getUser();
      const businessName = businessNameFromStorage(user?.business_name);
      const result = await api.aiChat(user?.id || "", [{ role: "user", content: trimmed }], businessName);
      const threadId = createThread({ question: trimmed, response: result, askedAt: new Date().toISOString() });
      router.push(`/scan/${threadId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach Starlane to answer that.");
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Scan">
      <div className="scan-stage" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: showFindings ? "flex-start" : "center", minHeight: showFindings ? undefined : "calc(100vh - 190px)", padding: showFindings ? "32px 0 8px" : "24px 0", boxSizing: "border-box" }}>
        <div className="fade-once" style={{ width: 720, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1 className="scan-greeting" style={{ margin: "0 0 26px 0", fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--text-primary)", textAlign: "center" , letterSpacing: "-0.015em"}}>
            {getGreeting()}, {ownerName}
          </h1>

          <ScanComposer
            value={question}
            onChange={setQuestion}
            onSubmit={() => submit(question)}
            submitting={submitting}
            placeholder="Ask Starlane about your business"
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
            <div style={{ alignSelf: "flex-start", marginTop: 22, paddingLeft: 6 }}><ScanThinking /></div>
          )}

          {!showFindings && !submitting && (
            <div className="scan-flows" style={{ marginTop: 22 }}>
              {WORKFLOWS.map((w, i) => {
                const body = (
                  <>
                    <IconTile size={32}>{w.icon}</IconTile>
                    <span className="flex flex-col min-w-0">
                      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{w.title}</span>
                      <span style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>{w.hint}</span>
                    </span>
                  </>
                );
                return "ask" in w
                  ? <button key={w.title} type="button" disabled={submitting} onClick={() => submit(w.ask)} className="scan-flow rise-in" style={{ animationDelay: `${i * 50}ms` }}>{body}</button>
                  : <Link key={w.title} href={w.href} className="scan-flow rise-in" style={{ animationDelay: `${i * 50}ms` }}>{body}</Link>;
              })}
            </div>
          )}

          {error && <p role="alert" style={{ fontSize: 12.5, color: "var(--status-danger)", marginTop: 14 }}>{error}</p>}
          <div className="flex items-center justify-center" style={{ gap: 14, marginTop: 20, fontSize: 11.5, color: "var(--text-tertiary)" }}>
            <span>Starlane answers only from your connected data.</span>
            {hasHistory && (
              <Link href="/scan/history" className="inline-flex items-center hover:text-[var(--text-primary)]" style={{ gap: 5, color: "var(--text-secondary)" }}>
                <IconHistory size={13} /> History
              </Link>
            )}
          </div>
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
        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{title}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{hint}</span>
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
