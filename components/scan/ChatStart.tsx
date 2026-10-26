"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconPlus, IconUpload, IconLink, IconSparkle } from "@/components/v32/icons";
import { ScanFindings } from "@/components/os/ScanFindings";
import { ScanComposer } from "@/components/scan/ScanComposer";
import { greeting, firstName } from "@/lib/greeting";
import { startThread, listThreads } from "@/lib/scanStore";

// The chat start, shared by Home and the Assistant: a greeting and one box,
// nothing else until the person asks. Sending opens the conversation at once
// and the answer arrives there, so there is no wait on this screen. The
// ledger scan (POST /api/os/scan) stays behind the box's plus menu.
export function ChatStart() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [hello, setHello] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFindings, setShowFindings] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const name = firstName();
    setHello(`${greeting()}${name ? `, ${name}` : ""}`);
    setHasHistory(listThreads().length > 0);
    // Load the conversation screen ahead of time so sending opens it at once.
    router.prefetch("/scan/new");
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q && q.trim()) ask(q);
    if (params.get("books") === "1") setShowFindings(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/scan/${startThread(trimmed)}`);
  }

  return (
    <>
      <div className={`chat-start ${showFindings ? "has-findings" : ""}`}>
        <div className="chat-start-inner fade-once">
          <h1 className="chat-hello" suppressHydrationWarning>{hello || " "}</h1>
          <ScanComposer
            value={question}
            onChange={setQuestion}
            onSubmit={() => ask(question)}
            submitting={false}
            autoFocus
            placeholder="Ask Starlane anything about your business"
            leading={
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  aria-label="Add data or scan your books"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
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
          <p className="chat-foot">
            Starlane answers only from your connected data.
            {hasHistory && <> <Link href="/scan/history" className="chat-foot-link">Past conversations</Link></>}
          </p>
        </div>
      </div>

      {showFindings && (
        <div className="fade-once" style={{ width: 880, maxWidth: "100%", margin: "0 auto" }}>
          <ScanFindings />
        </div>
      )}
    </>
  );
}

function MenuItem({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className="scan-menu-item">
      <span className="scan-menu-icon">{icon}</span>
      <span className="flex flex-col text-left min-w-0">
        <span style={{ fontSize: 13, color: "#191917" }}>{title}</span>
        <span style={{ fontSize: 11.5, color: "#6E6E69" }}>{hint}</span>
      </span>
    </button>
  );
}
