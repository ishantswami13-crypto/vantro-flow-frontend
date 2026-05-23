"use client";

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
      {/* Background: pure black */}
      <rect width="100" height="100" rx="22" fill="#000000" />

      {/* Inner border: subtle white edge */}
      <rect
        x="1" y="1" width="98" height="98" rx="21"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none"
      />

      {/* LEFT ARM — bold calligraphic bezier, white */}
      <path
        d="M 18,19 C 10,40 28,64 50,81"
        stroke="white"
        strokeWidth="13.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* RIGHT ARM — thinner, semi-white */}
      <path
        d="M 82,19 C 90,40 72,64 50,81"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
      />

      {/* VERTEX — white dot */}
      <circle cx="50" cy="81" r="3.5" fill="white" />
    </svg>
  );
}
