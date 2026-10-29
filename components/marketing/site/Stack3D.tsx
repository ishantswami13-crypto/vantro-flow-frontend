// A physical scene drawn in CSS 3D: plates with real thickness, stacked,
// stepped or laid out as a grid. Each plate's top face carries a title and a
// few faint lines standing in for its contents. The scene is decorative; the
// legend beside it (or the caption) carries the meaning for screen readers.
// Under reduced motion, or without scroll-driven animation, it is shown at
// rest in its final arrangement.

export type Plate = {
  k: string;          // small label, e.g. "Source"
  title: string;      // what the plate is
  lines?: number;     // faint content lines on the face
  tone?: "risk" | "warn" | "info" | "ok";
  kind?: "top" | "plan";
};

export function Stack3D({ plates, variant = "stack", label }: { plates: Plate[]; variant?: "stack" | "stairs" | "grid"; label: string }) {
  return (
    <div className={`s3 s3-${variant}`} role="img" aria-label={label}>
      <div className="s3-scene" style={{ "--n": plates.length } as React.CSSProperties}>
        {plates.map((p, i) => (
          <div
            key={p.title}
            className={`s3-plate${p.kind ? ` s3-${p.kind}` : ""}${p.tone ? ` t-${p.tone}` : ""}`}
            style={{ "--i": i, "--x": i % 3, "--y": Math.floor(i / 3) } as React.CSSProperties}
          >
            <div className="s3-face">
              <p className="s3-k">{p.k}</p>
              <p className="s3-t">{p.title}</p>
              <span className="s3-lines" aria-hidden>
                {Array.from({ length: p.lines ?? 3 }, (_, j) => <i key={j} style={{ "--w": `${88 - ((j * 23 + i * 11) % 40)}%` } as React.CSSProperties} />)}
              </span>
            </div>
            <div className="s3-side s3-side-b" />
            <div className="s3-side s3-side-r" />
          </div>
        ))}
      </div>
    </div>
  );
}

// The same scene with a numbered legend beside it, for page heroes and sections.
export function Scene3D({ plates, variant, label, legend }: { plates: Plate[]; variant?: "stack" | "stairs" | "grid"; label: string; legend?: Array<[string, string]> }) {
  return (
    <div className="s3-wrap">
      <Stack3D plates={plates} variant={variant} label={label} />
      {legend && (
        <ol className="s3-legend">
          {legend.map(([k, v], i) => (
            <li key={k}><span className="num">{String(i + 1).padStart(2, "0")}</span><b>{k}</b><em>{v}</em></li>
          ))}
        </ol>
      )}
    </div>
  );
}
