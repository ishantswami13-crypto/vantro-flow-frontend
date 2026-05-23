"use client";

import { useState } from "react";

// Module-level counter ensures unique gradient IDs when multiple
// LogoMark instances are rendered on the same page simultaneously.
let _uid = 0;

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  // Stable unique ID per component instance — avoids SVG gradient ID collisions
  const [id] = useState(() => ++_uid);
  const bg   = `vtbg-${id}`;
  const la   = `vtla-${id}`;
  const ra   = `vtra-${id}`;
  const bloom = `vtbl-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* ── Background: deep navy ── */}
        <linearGradient id={bg} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0E1830" />
          <stop offset="100%" stopColor="#06091A" />
        </linearGradient>

        {/* ── Left arm: electric blue, bright top → deep base ── */}
        <linearGradient id={la} x1="18" y1="19" x2="50" y2="81" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#5AABFF" />
          <stop offset="52%"  stopColor="#1A6FFF" />
          <stop offset="100%" stopColor="#1040CC" />
        </linearGradient>

        {/* ── Right arm: violet-purple ── */}
        <linearGradient id={ra} x1="82" y1="19" x2="50" y2="81" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#9D6FFF" />
          <stop offset="100%" stopColor="#5B10E0" />
        </linearGradient>

        {/* ── Vertex bloom: radial blue glow ── */}
        <radialGradient id={bloom} cx="50" cy="81" r="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1A6FFF" stopOpacity="0"   />
        </radialGradient>
      </defs>

      {/* ① Background */}
      <rect width="100" height="100" rx="22" fill={`url(#${bg})`} />

      {/* ② Inner glass border — 1px white glow edge (premium finish) */}
      <rect
        x="0.75" y="0.75" width="98.5" height="98.5" rx="21.5"
        stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" fill="none"
      />

      {/* ③ Vertex bloom — soft radial glow beneath the convergence point */}
      <circle cx="50" cy="81" r="22" fill={`url(#${bloom})`} />

      {/* ④ LEFT ARM — bold calligraphic bezier curve
           Control points bow the stroke outward (left) before sweeping
           to vertex — calligraphic brushstroke quality, not mechanical lines. */}
      <path
        d="M 18,19 C 10,40 28,64 50,81"
        stroke={`url(#${la})`}
        strokeWidth="13.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ⑤ RIGHT ARM — thinner, mirrored curve, violet */}
      <path
        d="M 82,19 C 90,40 72,64 50,81"
        stroke={`url(#${ra})`}
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />

      {/* ⑥ VERTEX — layered circles: faint halo → solid blue → white core */}
      <circle cx="50" cy="81" r="5"   fill="#1A6FFF" fillOpacity="0.35" />
      <circle cx="50" cy="81" r="3.2" fill="#60A5FA" />
      <circle cx="50" cy="81" r="1.6" fill="white"   />
    </svg>
  );
}
