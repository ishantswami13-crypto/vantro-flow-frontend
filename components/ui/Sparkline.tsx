// A small, honest trend line — no interpolation, no smoothing that implies
// data that isn't there. Renders exactly the values it's given, flat line
// if everything is zero (that's a real signal — "no activity" — not a
// rendering failure). Kept dependency-free: a chart library is overkill for
// a 14-point line a few dozen pixels tall.
"use client";

interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

export function Sparkline({ values, color, width = 64, height = 20 }: SparklineProps) {
  if (!values || values.length < 2) return null;

  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const allZero = max === 0 && min === 0;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={allZero ? 0.25 : 0.85}
      />
    </svg>
  );
}
