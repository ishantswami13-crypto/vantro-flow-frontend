"use client";

// Token-styled bar chart for Simulate. Recharts draws SVG attributes, which
// do not resolve CSS variables reliably, so the token values are read from
// the document and re-read when the theme changes.

import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip } from "recharts";
import { inrShort } from "@/lib/format";

type Tokens = { ink: string; ink2: string; ink3: string; line: string; accent: string; positive: string; critical: string; warning: string; elevated: string; font: string };

function read(): Tokens {
  const fallback: Tokens = { ink: "currentColor", ink2: "currentColor", ink3: "currentColor", line: "currentColor", accent: "currentColor", positive: "currentColor", critical: "currentColor", warning: "currentColor", elevated: "transparent", font: "sans-serif" };
  if (typeof window === "undefined") return fallback;
  const cs = getComputedStyle(document.documentElement);
  const rgb = (name: string, a = 1) => {
    const v = cs.getPropertyValue(name).trim();
    if (!v) return fallback.ink;
    const parts = v.replace(/,/g, " ").split(/\s+/).filter(Boolean);
    return a === 1 ? `rgb(${parts.join(" ")})` : `rgb(${parts.join(" ")} / ${a})`;
  };
  return {
    ink: rgb("--tk-ink"), ink2: rgb("--tk-ink-2"), ink3: rgb("--tk-ink-3"), line: rgb("--tk-line"),
    accent: rgb("--accent-rgb"), positive: rgb("--tk-positive"), critical: rgb("--tk-critical"), warning: rgb("--tk-warning"),
    elevated: rgb("--tk-elevated"), font: cs.getPropertyValue("--font-sans").trim() || "sans-serif",
  };
}

export function useTokens(): Tokens {
  const [t, setT] = useState<Tokens>(read);
  useEffect(() => {
    setT(read());
    const obs = new MutationObserver(() => setT(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
    return () => obs.disconnect();
  }, []);
  return t;
}

export type BarTone = "ink" | "muted" | "accent" | "positive" | "critical" | "warning";
export interface SimBar { label: string; value: number; tone: BarTone; note?: string }

/** Horizontal bars: one per case, the scenario in the accent colour. */
export function SimBars({ bars, height, ariaLabel }: { bars: SimBar[]; height?: number; ariaLabel: string }) {
  const t = useTokens();
  const fill = (tone: BarTone) => ({ ink: t.ink2, muted: t.ink3, accent: t.accent, positive: t.positive, critical: t.critical, warning: t.warning }[tone]);
  const h = height ?? Math.max(140, bars.length * 46 + 36);
  return (
    <figure role="img" aria-label={ariaLabel} style={{ margin: 0, width: "100%", height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 72, bottom: 4, left: 0 }} barCategoryGap={12}>
          <CartesianGrid horizontal={false} stroke={t.line} strokeDasharray="0" />
          <XAxis type="number" tickFormatter={(v: number) => inrShort(v)} tick={{ fill: t.ink3, fontSize: 11, fontFamily: t.font }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={128} tick={{ fill: t.ink2, fontSize: 12, fontFamily: t.font }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: t.line, opacity: 0.5 }}
            contentStyle={{ background: t.elevated, border: `1px solid ${t.line}`, borderRadius: 8, fontSize: 12, fontFamily: t.font, color: t.ink }}
            labelStyle={{ color: t.ink2 }}
            itemStyle={{ color: t.ink }}
            formatter={(v: number) => [inrShort(v), "Amount"]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false} maxBarSize={22}>
            {bars.map((b) => <Cell key={b.label} fill={fill(b.tone)} />)}
            <LabelList dataKey="value" position="right" formatter={(v: number) => inrShort(v)} style={{ fill: t.ink, fontSize: 12, fontFamily: t.font, fontVariantNumeric: "tabular-nums" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
