"use client";

import { useEffect, useState } from "react";
import { ThinkingDots } from "@/components/v32/ui";
import { IconCheck } from "@/components/v32/icons";

// What Scan is doing while the answer is on its way, shown as steps the way
// Harvey shows its thinking. POST /api/ai-chat does not stream progress, so
// these are the phases every request goes through in server.js, in order:
// it always loads the business's pending invoices first, then the model
// calls whichever read-only lookups the question needs, then writes. The
// step moves on by elapsed time, and the last step stays open until the
// answer actually arrives, so nothing is shown as done before it is.
const STEPS = ["Reading your invoices", "Looking up what the question needs", "Writing the answer"];
const AT_MS = [0, 1600, 4200];

export function ScanThinking() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - start), 250);
    return () => clearInterval(t);
  }, []);

  const current = AT_MS.reduce((acc, at, i) => (elapsed >= at ? i : acc), 0);

  return (
    <div role="status" aria-live="polite" className="fade-once" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {STEPS.map((s, i) => {
        if (i > current) return null;
        const done = i < current;
        return (
          <div key={s} className="rise-in" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: done ? "var(--ink-3)" : "var(--body)" }}>
            <span style={{ width: 16, display: "inline-flex", justifyContent: "center" }}>
              {done ? <IconCheck size={13} /> : <ThinkingDots />}
            </span>
            {s}
          </div>
        );
      })}
      <span className="sr-only">{STEPS[current]}</span>
    </div>
  );
}
