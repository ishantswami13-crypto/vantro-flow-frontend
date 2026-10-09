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
      className="int-cite focus-ring"
    >
      {n}
    </button>
  );
}
