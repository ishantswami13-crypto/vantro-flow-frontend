interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Minimal V mark — two converging strokes */}
      <path
        d="M6.5 9.5 L16 22.5 L25.5 9.5"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
