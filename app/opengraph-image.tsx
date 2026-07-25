import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Starlane — AI-powered Business OS for Indian MSMEs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          background: "linear-gradient(135deg, #050B1A 0%, #0A1628 50%, #0C1F3D 100%)",
          display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "72px 80px",
          fontFamily: "sans-serif", position: "relative",
        }}
      >
        {/* Grid pattern overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(0,102,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Accent glow */}
        <div style={{
          position: "absolute", top: -100, left: -100,
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(0,102,255,0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />

        {/* Logo mark — simplified inline */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "#000000",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 5,
            border: "1px solid rgba(255,255,255,0.12)",
          }}>
            <div style={{ width: 32, height: 5, borderRadius: 3, background: "white" }} />
            <div style={{ width: 22, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.82)" }} />
            <div style={{ width: 13, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.60)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "white", letterSpacing: -0.5 }}>Starlane</span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: "#0066FF",
              background: "rgba(0,102,255,0.15)", padding: "2px 8px",
              borderRadius: 20, border: "1px solid rgba(0,102,255,0.3)",
              marginTop: 2, alignSelf: "flex-start",
            }}>BETA · Live for Indian MSMEs</span>
          </div>
        </div>

        {/* Headline — Satori requires an explicit display on any element with
            more than one child, and does not lay out <br /> inside flex, so the
            two lines are separate rows rather than a single wrapped block. */}
        <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 900, color: "white", lineHeight: 1.05, letterSpacing: -2, marginBottom: 24 }}>
          <div style={{ display: "flex" }}>
            <span>Stop Chasing&nbsp;</span>
            <span style={{ color: "#1A6FFF" }}>Payments.</span>
          </div>
          <div style={{ display: "flex" }}>Start Collecting.</div>
        </div>

        {/* Subheading */}
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.65)", marginBottom: 48, maxWidth: 700, lineHeight: 1.4 }}>
          AI-powered Collections OS for Indian MSMEs. WhatsApp follow-ups, payment links, and cash flow forecasting — in Hinglish.
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 48 }}>
          {[
            { value: "₹45Cr+", label: "Receivables Managed" },
            { value: "18 days", label: "Avg DSO Reduction" },
            { value: "73%", label: "WhatsApp Open Rate" },
          ].map(({ value, label }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#1A6FFF" }}>{value}</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Bottom right */}
        <div style={{
          position: "absolute", bottom: 48, right: 80,
          fontSize: 14, color: "rgba(255,255,255,0.3)",
        }}>
          Starlane by Atlax
        </div>
      </div>
    ),
    { ...size }
  );
}
