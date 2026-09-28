import React from "react";

// Inline numbered citation. Pressing it points the reader at the matching
// item in the Sources rail (desktop) or opens the evidence drawer (mobile).
export function Cite({ n, onCite }: { n?: number; onCite: (n: number) => void }) {
  if (n == null) return null;
  return (
    <button
      type="button"
      onClick={() => onCite(n)}
      aria-label={`Source ${n}`}
      className="inline-flex items-center justify-center align-[2px] ml-0.5 min-w-[16px] h-[16px] px-1 rounded text-[10px] font-semibold leading-none focus-ring hover:bg-surface-3"
      style={{ background: "#EDEDE9", color: "#63635F", fontVariantNumeric: "tabular-nums" }}
    >
      {n}
    </button>
  );
}
