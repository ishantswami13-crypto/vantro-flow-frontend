"use client";

import { useEffect, useState } from "react";
import { ThinkingDots } from "@/components/v32/ui";
import { ScanMark } from "./ScanMark";

// What Scan shows while an answer is on its way. POST /api/ai-chat does not
// stream and reports no progress, so nothing here pretends to: one honest
// line, the real seconds elapsed, and a plain description of what every
// request does on the server (server.js reads the open invoices first, then
// runs whichever read-only lookups the question needs, then writes). No step
// is ever ticked off before the answer actually arrives.
export function ScanThinking() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div role="status" aria-live="polite" className="scan-answer fade-once">
      <div className="scan-answer-head">
        <ScanMark />
        <span style={{ color: "var(--ink)", fontWeight: 500 }}>Starlane</span>
        <span className="tabular-nums" style={{ color: "var(--ink-3)" }}>{seconds > 0 ? `${seconds}s` : ""}</span>
      </div>
      <div className="flex items-center" style={{ gap: 10, fontSize: 14, color: "var(--body)", minHeight: 24 }}>
        <ThinkingDots /> Reading your data and writing an answer
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
        Starlane reads your open invoices, then runs any read-only lookups the question needs.
      </p>
    </div>
  );
}
