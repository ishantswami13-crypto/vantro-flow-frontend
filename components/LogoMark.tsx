interface LogoMarkProps {
  size?: number;
  className?: string;
}

export default function LogoMark({ size = 32, className = "" }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background: pure black rounded square */}
      <rect width="100" height="100" rx="22" fill="#000000" />

      {/* Subtle inner border */}
      <rect
        x="0.75" y="0.75" width="98.5" height="98.5" rx="21.5"
        stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" fill="none"
      />

      {/*
        THE VANTRO FUNNEL MARK
        Three bold rounded bars — wide → medium → narrow (top → bottom).
        Reads as a funnel: many receivables (wide) collecting into cash (narrow).
      */}

      {/* Bar 1 — widest (top) */}
      <rect x="15" y="23" width="70" height="13" rx="6.5" fill="white" />

      {/* Bar 2 — medium (middle) */}
      <rect x="25" y="43" width="50" height="13" rx="6.5" fill="white" fillOpacity="0.85" />

      {/* Bar 3 — narrowest (bottom) */}
      <rect x="35" y="63" width="30" height="13" rx="6.5" fill="white" fillOpacity="0.60" />
    </svg>
  );
}
