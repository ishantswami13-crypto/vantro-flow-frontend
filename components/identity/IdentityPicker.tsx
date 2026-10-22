"use client";

import React from "react";
import { IDENTITIES, saveIdentity } from "@/lib/identity";
import { useIdentity } from "./useIdentity";

// The ten Version 32 accents — lets a user make the colour theirs.
export function IdentityPicker({ dark = false }: { dark?: boolean }) {
  const current = useIdentity();
  return (
    <div>
      <p className="text-[11px] mb-2" style={{ color: dark ? "var(--ink-3)" : "var(--ink-3)" }}>Your colour · {current.name}</p>
      <div className="grid grid-cols-5 gap-2">
        {IDENTITIES.map(id => {
          const active = id.key === current.key;
          return (
            <button
              key={id.key}
              type="button"
              title={id.name}
              aria-label={`Use ${id.name}`}
              aria-pressed={active}
              onClick={() => saveIdentity(id.key)}
              className="h-5 w-5 rounded-full focus-ring hover-dim"
              style={{
                background: id.color,
                boxShadow: active ? `0 0 0 2px ${dark ? "#1E1E1E" : "#FFFFFF"}, 0 0 0 3.5px ${dark ? "#F7F7F5" : "var(--ink)"}` : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
