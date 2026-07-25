import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Starlane — the operating layer every modern business runs on";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The brand assets in /public/brand are white-on-black, but the site header
// renders the mark black-on-white, so the star is drawn as vector here rather
// than embedding those files. Geometry traced from public/brand/starlane-icon.jpeg.
function StarlaneMark({ size: s = 96 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" fill="none">
      {/* orbital swoosh, lower-left crescent */}
      <path
        d="M45 53.5 C33 59, 22.5 66.5, 20.8 71.6 C19.6 75.2, 24.5 77.4, 34 76.6 C27.2 75.2, 24.4 73.2, 25.8 70.2 C28.6 64.8, 36.4 58, 46 54.4 Z"
        fill="#0A0A0A"
      />
      {/* orbital tail rising to the dot */}
      <path
        d="M57 46.2 C66 43.2, 74.5 38.4, 80.6 33.2"
        stroke="#0A0A0A"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="84.2" cy="30.6" r="3.4" fill="#0A0A0A" />
      {/* four-pointed star */}
      <path
        d="M50 20.5 C50.8 40.2, 51.9 46.7, 73.5 48.2 C51.9 49.7, 50.8 56.2, 50 75.5 C49.2 56.2, 48.1 49.7, 26.5 48.2 C48.1 46.7, 49.2 40.2, 50 20.5 Z"
        fill="#0A0A0A"
      />
    </svg>
  );
}

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 76px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <StarlaneMark size={112} />
          <span
            style={{
              fontSize: 46,
              fontWeight: 500,
              color: "#0A0A0A",
              letterSpacing: 13,
            }}
          >
            STARLANE
          </span>
        </div>

        {/* Copy */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 21,
              fontWeight: 700,
              color: "#6B7280",
              letterSpacing: 4,
              marginBottom: 22,
            }}
          >
            AI BUSINESSOS
          </span>

          <div
            style={{
              fontSize: 66,
              fontWeight: 800,
              color: "#0A0A0A",
              lineHeight: 1.08,
              letterSpacing: -1.8,
              maxWidth: 1000,
              marginBottom: 26,
            }}
          >
            The operating layer every modern business runs on.
          </div>

          <div
            style={{
              fontSize: 25,
              color: "#4B5563",
              lineHeight: 1.45,
              maxWidth: 940,
            }}
          >
            Starlane helps businesses connect data, understand operations, and run
            evidence-based, approval-gated workflows across finance, sales,
            purchases, inventory, customers, suppliers, and operations.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", width: 8, height: 8, borderRadius: 4, background: "#0A0A0A" }} />
          <span style={{ fontSize: 20, color: "#6B7280" }}>
            Pilot program now open for selected businesses
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
