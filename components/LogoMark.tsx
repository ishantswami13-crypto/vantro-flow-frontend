interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  const rx = Math.round(size * 0.22);
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
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="vantro-shine" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="100" height="100" rx={22} fill="url(#vantro-bg)" />

      {/* Shine */}
      <rect width="100" height="100" rx={22} fill="url(#vantro-shine)" />

      {/* Left arm — thick (bold downstroke) */}
      <line x1="19" y1="24" x2="50" y2="76"
        stroke="white" strokeWidth="13.5" strokeLinecap="round" />

      {/* Right arm — thinner (upstroke) */}
      <line x1="81" y1="24" x2="50" y2="76"
        stroke="rgba(255,255,255,0.88)" strokeWidth="9.5" strokeLinecap="round" />

      {/* Vertex dot */}
      <circle cx="50" cy="76" r="4" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}
