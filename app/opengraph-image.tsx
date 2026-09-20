import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Starlane — Know what happens next.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#F7F4EE", color: "#16150F", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 88px" }}>
      <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>Starlane</div>
      <div style={{ display: "flex", maxWidth: 950, fontSize: 88, lineHeight: 1.08, letterSpacing: -3, fontWeight: 700, marginBottom: 38 }}>Know what happens next.</div>
    </div>,
    size,
  );
}
