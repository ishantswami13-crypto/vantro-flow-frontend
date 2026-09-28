"use client";

import React from "react";
import { IDENTITIES, saveIdentity } from "@/lib/identity";
import { useIdentity } from "./useIdentity";

// Row of gradient swatches — lets a user make the colour theirs.
export function IdentityPicker({ dark = false }: { dark?: boolean }) {
  const current = useIdentity();
  return (
    <div>
      <p className="text-[11px] mb-2" style={{ color: dark ? "#8A8A86" : "#8A8A86" }}>Your colour · {current.name}</p>
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
              className="h-6 w-6 rounded-full focus-ring transition-transform hover:scale-110"
              style={{
                background: `linear-gradient(135deg, ${id.stops[0]} 0%, ${id.stops[1]} 52%, ${id.stops[2]} 100%)`,
                boxShadow: active ? `0 0 0 2px ${dark ? "#1E1E1E" : "#FFFFFF"}, 0 0 0 3.5px ${dark ? "#F7F7F5" : "#191917"}` : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
