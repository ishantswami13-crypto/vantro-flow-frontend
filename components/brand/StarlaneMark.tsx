// The Starlane mark: a serif S (outlined from Playfair Display Bold, SIL OFL) on
// the dark rail colour. Master is brand/starlane-s.svg; every raster icon (web,
// desktop, mobile) is regenerated from it with `node scripts/make-brand.mjs`.

/** The S on a 1000 x 1000 grid (cap height = 1000). */
export const STARLANE_S_PATH =
  "M479.6 0Q559.9 0 603.4 17Q646.9 34 678.2 53.1Q694.6 62.6 704.8 67.3Q715 72.1 724.5 72.1Q738.1 72.1 744.2 57.1Q750.3 42.2 754.4 12.2L785.7 12.2Q784.4 38.1 782.3 74.1Q780.3 110.2 779.6 168.7Q778.9 227.2 778.9 322.4L747.6 322.4Q742.2 251.7 715 185Q687.8 118.4 638.1 75.5Q588.4 32.7 516.3 32.7Q451 32.7 408.8 69.4Q366.7 106.1 366.7 171.4Q366.7 225.9 393.9 264.6Q421.1 303.4 473.5 340.1Q525.9 376.9 600.7 428.6Q666 470.7 717.7 512.9Q769.4 555.1 800.7 608.2Q832 661.2 832 734.7Q832 824.5 785 883Q738.1 941.5 661.9 970.7Q585.7 1000 494.6 1000Q410.2 1000 359.9 983.7Q309.5 967.3 275.5 949.7Q245.6 930.6 229.3 930.6Q215.6 930.6 209.5 945.6Q203.4 960.5 199.3 990.5L168 990.5Q170.7 957.8 171.4 914.3Q172.1 870.7 172.8 800.7Q173.5 730.6 173.5 623.1L204.8 623.1Q210.2 712.9 235.4 791.2Q260.5 869.4 312.9 917Q365.3 964.6 452.4 964.6Q500 964.6 537.4 947.6Q574.8 930.6 598 896.6Q621.1 862.6 621.1 812.2Q621.1 755.1 594.6 712.9Q568 670.7 522.4 634Q476.9 597.3 417 559.2Q353.1 517 297.3 474.8Q241.5 432.7 208.2 378.2Q174.8 323.8 174.8 249Q174.8 163.3 217.7 108.2Q260.5 53.1 330.6 26.5Q400.7 0 479.6 0";

const RAIL = "var(--text-primary)";
const INK = "#F2F1EC";

interface StarlaneMarkProps {
  size?: number;
  /** "tile": off-white S on the dark rounded square. "glyph": the S alone, in currentColor. */
  variant?: "tile" | "glyph";
  className?: string;
  title?: string;
}

export default function StarlaneMark({ size = 28, variant = "tile", className = "", title }: StarlaneMarkProps) {
  const label = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  if (variant === "glyph") {
    return (
      <svg width={size} height={size} viewBox="0 0 1000 1000" className={className} style={{ flexShrink: 0 }} {...label}>
        <path d={STARLANE_S_PATH} fill="currentColor" />
      </svg>
    );
  }
  // Same geometry as public/icon.svg: the S at 56% of the tile, nudged down 1% optically.
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={{ flexShrink: 0 }} {...label}>
      <rect width="100" height="100" rx="22" fill={RAIL} />
      <path transform="translate(22 22.56) scale(0.056)" d={STARLANE_S_PATH} fill={INK} />
    </svg>
  );
}
