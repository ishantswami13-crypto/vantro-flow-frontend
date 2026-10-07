"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { IconCheck, IconAlert, IconInfo, IconX } from "@/components/v32/icons";

type Tone = "positive" | "critical" | "neutral";
interface ToastItem { id: number; message: React.ReactNode; tone: Tone }
type Notify = (message: React.ReactNode, tone?: Tone) => void;

const ToastContext = createContext<Notify>(() => {});

/** Brief confirmations ("Saved", "Couldn't save") in the bottom-right.
 *  Only for the result of something the person just did. */
export function useToast(): Notify {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems(list => list.filter(t => t.id !== id));
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const notify = useCallback<Notify>((message, tone = "neutral") => {
    const id = next.current++;
    setItems(list => [...list.slice(-2), { id, message, tone }]);
    timers.current.set(id, setTimeout(() => dismiss(id), tone === "critical" ? 7000 : 4000));
  }, [dismiss]);

  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); };
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-live="polite" role="status" className="fixed flex flex-col gap-2" style={{ right: 16, bottom: 16, zIndex: "var(--z-toast)" as unknown as number, maxWidth: "calc(100vw - 32px)" }}>
        {items.map(t => {
          const Icon = t.tone === "positive" ? IconCheck : t.tone === "critical" ? IconAlert : IconInfo;
          const color = t.tone === "positive" ? "var(--positive)" : t.tone === "critical" ? "var(--critical)" : "var(--ink-2)";
          return (
            <div key={t.id} className="pop-in flex items-center gap-3" style={{ width: 340, maxWidth: "100%", padding: "10px 10px 10px 14px", background: "var(--elevated)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)", fontSize: 13, color: "var(--ink)" }}>
              <Icon size={15} style={{ color }} />
              <div className="flex-1 min-w-0">{t.message}</div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="icon-btn"><IconX size={13} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
