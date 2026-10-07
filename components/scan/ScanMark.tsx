// The small mark that heads every Starlane answer: a serif "S" on an inverse
// disc, the same in Scan conversations and intelligence answers.
export function ScanMark({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: size, height: size, borderRadius: "50%", background: "var(--inverse)", color: "var(--on-inverse)",
        fontFamily: "var(--font-display)", fontSize: Math.round(size * 0.52), lineHeight: 1,
      }}
    >
      S
    </span>
  );
}
