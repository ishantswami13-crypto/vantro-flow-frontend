"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck } from "@/components/v32/icons";
import { getModelChoice, loadModels, onModelChoice, setModelChoice, type AiModel } from "@/lib/modelChoice";

const PROVIDER: Record<string, string> = { groq: "Groq", gemini: "Google", anthropic: "Anthropic", openai: "OpenAI", xai: "xAI", perplexity: "Perplexity" };

// A small "Model" control inside the Ask box. Every model the server knows is
// listed; the ones whose provider has no key are shown but can't be picked.
// Hidden entirely when the server doesn't report a model list.
export function ModelPicker({ compact = false }: { compact?: boolean } = {}) {
  const [models, setModels] = useState<AiModel[]>([]);
  const [choice, setChoice] = useState("auto");
  const [open, setOpen] = useState(false);
  // Opens toward whichever side of the box has more room, and never past the screen.
  const [place, setPlace] = useState<{ down: boolean; max: number }>({ down: false, max: 440 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChoice(getModelChoice());
    let live = true;
    void loadModels().then((m) => {
      if (!live) return;
      setModels(m);
      // A saved pick that can no longer run falls back to Auto.
      const saved = m.find((x) => x.id === getModelChoice());
      if (m.length && (!saved || !saved.available)) { setModelChoice("auto"); setChoice("auto"); }
    });
    const off = onModelChoice(setChoice);
    return () => { live = false; off(); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!models.length) return null;
  const current = models.find((m) => m.id === choice) || models[0];
  const groups: [string, AiModel[]][] = [];
  for (const m of models) {
    const g = m.provider ? PROVIDER[m.provider] || m.provider : "";
    const last = groups[groups.length - 1];
    if (last && last[0] === g) last[1].push(m); else groups.push([g, [m]]);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" className={`mp-btn ${compact ? "mp-compact" : ""}`} aria-haspopup="listbox" aria-expanded={open} onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const below = window.innerHeight - r.bottom - 16, above = r.top - 16;
        const down = below > above;
        setPlace({ down, max: Math.max(200, Math.min(440, down ? below : above)) });
        setOpen((v) => !v);
      }} title={compact ? `Model: ${current.label}` : "Choose the AI model"} aria-label={compact ? `Model: ${current.label}` : undefined}>
        {compact ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden><path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" /><circle cx="10" cy="4.5" r="1.5" /><circle cx="6" cy="11.5" r="1.5" /></svg>
        ) : (
          <>
            <span className="mp-btn-label">{current.label}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M2.5 4l2.5 2.5L7.5 4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </>
        )}
      </button>
      {open && (
        <div role="listbox" aria-label="AI model" className={`pop-in mp-menu ${place.down ? "mp-down" : ""}`} style={{ maxHeight: place.max }}>
          {groups.map(([g, list]) => (
            <div key={g || "auto"} className="mp-group">
              {g && <div className="mp-group-title">{g}</div>}
              {list.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={m.id === current.id}
                  aria-disabled={!m.available}
                  disabled={!m.available}
                  className="mp-item"
                  onClick={() => { setModelChoice(m.id); setOpen(false); }}
                >
                  <span className="flex flex-col text-left min-w-0">
                    <span className="mp-item-label">{m.label}</span>
                    <span className="mp-item-note">{m.available ? m.note : "Not set up on this workspace"}</span>
                  </span>
                  {m.id === current.id && <IconCheck size={14} />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

