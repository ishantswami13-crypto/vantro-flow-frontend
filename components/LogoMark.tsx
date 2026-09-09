interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Starlane logomark — the branded mark image.
 */
export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  return (
    <img
      src="/branding/starlane-mark.png"
      alt="Starlane"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: "4px", display: "inline-block" }}
    />
  );
}
