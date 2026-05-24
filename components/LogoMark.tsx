interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
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
        <linearGradient id="vantro-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1A6FFF" />
          <stop offset="100%" stopColor="#0047CC" />
        </linearGradient>
        <linearGradient id="vantro-glow" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10D98A" />
          <stop offset="100%" stopColor="#1A6FFF" />
        </linearGradient>
      </defs>

      {/* Background: Vantro blue gradient rounded square */}
      <rect width="100" height="100" rx="22" fill="url(#vantro-bg)" />

      {/* Subtle inner border */}
      <rect
        x="0.75" y="0.75" width="98.5" height="98.5" rx="21.5"
        stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none"
      />

      {/*
        THE VANTRO FUNNEL MARK
        Three bold rounded bars — wide → medium → narrow (top → bottom).
        Reads as a funnel: many receivables (wide) collecting into cash (narrow).
      */}

      {/* Bar 1 — widest (top) */}
      <rect x="15" y="22" width="70" height="14" rx="7" fill="white" />

      {/* Bar 2 — medium (middle) */}
      <rect x="25" y="43" width="50" height="14" rx="7" fill="white" fillOpacity="0.88" />

      {/* Bar 3 — narrowest (bottom) — accent green tint for "cash collected" */}
      <rect x="35" y="64" width="30" height="14" rx="7" fill="url(#vantro-glow)" fillOpacity="0.95" />
    </svg>
  );
}
