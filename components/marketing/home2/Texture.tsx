// A painted, grainy panel background drawn as SVG: a base wash, a cloudy mask
// and a fine spray of light grain through it. No image file; each instance
// needs its own id so filters don't collide.

const TONES = {
  moss: ["#3B4743", "#2A3532", "#4C5753"],
  slate: ["#3E4650", "#2B3139", "#56606B"],
  clay: ["#6B5A4A", "#4E4136", "#857260"],
  ink: ["#2C2B29", "#1B1A19", "#3C3A37"],
  plum: ["#3A3542", "#25212C", "#4B4556"],
  umber: ["#4A4136", "#2D2721", "#5B5144"],
  stone: ["#9BA19C", "#6F7672", "#B2B6B0"],
  night: ["#1E1D1C", "#121110", "#2A2826"],
} as const;

export type TextureTone = keyof typeof TONES;

export function Texture({ id, tone = "moss", seed = 3, className = "" }: { id: string; tone?: TextureTone; seed?: number; className?: string }) {
  const [a, b, c] = TONES[tone];
  return (
    <svg className={`tx ${className}`} preserveAspectRatio="none" viewBox="0 0 1600 900" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2=".6">
          <stop offset="0" stopColor={a} /><stop offset=".45" stopColor={b} /><stop offset="1" stopColor={c} />
        </linearGradient>
        <filter id={`${id}-s`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed={seed + 4} />
          <feColorMatrix type="matrix" values="0 0 0 0 .93  0 0 0 0 .94  0 0 0 0 .91  0 0 0 7 -3.9" />
        </filter>
        <filter id={`${id}-c`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency=".0028 .004" numOctaves="4" seed={seed} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -3.2 2.1" />
        </filter>
        <mask id={`${id}-m`}><rect width="1600" height="900" filter={`url(#${id}-c)`} /></mask>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-b)`} />
      <g className="tx-drift" mask={`url(#${id}-m)`}><rect x="-200" y="-100" width="2000" height="1100" filter={`url(#${id}-s)`} /></g>
    </svg>
  );
}
