import { ImageResponse } from "next/og";
import { STARLANE_WORDMARK, STARLANE_WORDMARK_SIZE } from "./og-wordmark";

export const runtime = "edge";
export const alt = "Starlane — the operating layer every modern business runs on";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const WORDMARK_WIDTH = 470;
const WORDMARK_HEIGHT = Math.round(
  (STARLANE_WORDMARK_SIZE.height / STARLANE_WORDMARK_SIZE.width) * WORDMARK_WIDTH
);

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
          padding: "70px 76px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Official brand lockup, recoloured from the shipped file — not redrawn */}
        <img
          src={STARLANE_WORDMARK}
          width={WORDMARK_WIDTH}
          height={WORDMARK_HEIGHT}
          alt=""
        />

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
