import { WORDMARK_PATH, WORDMARK_VIEWBOX } from "./wordmark";

// The official Starlane wordmark (brand/starlane-wordmark.svg), drawn from its
// outline so it is identical everywhere and inherits currentColor. Set the
// height; the width follows the lockup's proportions.
export default function StarlaneWordmark({ height = 20, fluid = false, className, title = "Starlane", fill = "currentColor" }: {
  /** Pixel height. Ignored when fluid. */
  height?: number;
  /** Fill the container's width instead, keeping proportions. */
  fluid?: boolean;
  className?: string; title?: string | null; fill?: string;
}) {
  const { width: w, height: h } = WORDMARK_VIEWBOX;
  const label = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      height={fluid ? undefined : height}
      className={className}
      style={fluid ? { display: "block", width: "100%", height: "auto" } : { display: "block", width: "auto", flexShrink: 0 }}
      {...label}
    >
      <path d={WORDMARK_PATH} fill={fill} />
    </svg>
  );
}
