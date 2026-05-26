interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Vantro logomark — bold serif "V" in Playfair Display.
 * Mirrors Harvey.ai's editorial serif lettermark approach.
 */
export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
        fontWeight: 800,
        fontSize: `${size}px`,
        color: "#ffffff",
        lineHeight: 1,
        letterSpacing: "-0.03em",
        display: "inline-block",
        userSelect: "none",
      }}
      aria-label="Vantro"
    >
      V
    </span>
  );
}
