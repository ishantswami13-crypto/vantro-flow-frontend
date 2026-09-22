interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  return (
    <img
      src="/branding/starlane-mark.png"
      alt="Starlane"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Starlane"
      style={{
        display: "inline-block",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${Math.max(4, Math.round(size * 0.18))}px`,
        flexShrink: 0,
        userSelect: "none",
      }}
    />
  );
}
