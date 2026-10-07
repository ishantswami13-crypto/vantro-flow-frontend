"use client";

import { useEffect, useRef } from "react";
import { ThinkingDots } from "@/components/v32/ui";
import { IconArrowUp } from "@/components/v32/icons";

// The one rounded box Scan asks through, on the start page and docked under
// a conversation. Enter sends, Shift+Enter adds a line, and the box grows
// with the question up to a few lines before it scrolls.
export function ScanComposer({ value, onChange, onSubmit, submitting, placeholder, leading, autoFocus, id = "ask" }: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  placeholder: string;
  leading?: React.ReactNode;
  autoFocus?: boolean;
  id?: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => { if (autoFocus) taRef.current?.focus(); }, [autoFocus]);

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="composer-glow scan-composer">
      <label htmlFor={id} className="sr-only">Ask a question about your business data</label>
      <textarea
        id={id}
        ref={taRef}
        rows={1}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
        placeholder={placeholder}
        disabled={submitting}
        className="scan-input"
      />
      <div className="flex items-center justify-between" style={{ padding: "4px 10px 10px 10px" }}>
        <div>{leading}</div>
        <button type="submit" disabled={submitting || !value.trim()} aria-label="Ask" className="scan-round scan-send">
          {submitting ? <ThinkingDots color="var(--bg)" /> : <IconArrowUp size={16} />}
        </button>
      </div>
    </form>
  );
}

export function businessNameFromStorage(fallback?: string): string {
  try {
    const stored = JSON.parse(localStorage.getItem("vantro_user") || "{}");
    return stored.business_name || fallback || "";
  } catch {
    return fallback || "";
  }
}
