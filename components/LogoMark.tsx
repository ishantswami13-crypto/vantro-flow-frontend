interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  return (
    <span
      className={className}
      role="img"
      aria-label="Starlane"
      style={{
        display: "inline-block",
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: 'url("/brand/starlane-icon.jpeg")',
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
        borderRadius: `${Math.max(4, Math.round(size * 0.18))}px`,
        flexShrink: 0,
        userSelect: "none",
      }}
    />
  );
}
