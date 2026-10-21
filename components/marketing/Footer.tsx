import Link from "next/link";
import StarlaneMark from "@/components/brand/StarlaneMark";

export function Footer() {
  return (
    <footer className="sl-wrap" style={{ paddingTop: 64, paddingBottom: 32 }}>
      <div className="sl-footer-grid">
        <div>
          <span className="sl-wordmark" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><StarlaneMark size={26} />Starlane</span>
          <p className="sl-p" style={{ marginTop: 14, maxWidth: 280 }}>The intelligence layer for your business.</p>
        </div>
        <div className="sl-footer-col">
          <h3>Product</h3>
          <Link href="/product/bridge">The Bridge</Link>
          <Link href="/product/scan">Scan</Link>
          <Link href="/product/watch">Watch</Link>
          <Link href="/product/missions">Missions</Link>
          <Link href="/product/simulate">Simulate</Link>
          <Link href="/product/memory">Memory</Link>
          <Link href="/product/prepared">Prepared</Link>
        </div>
        <div className="sl-footer-col">
          <h3>Starlane</h3>
          <Link href="/integrations">Integrations</Link>
          <Link href="/security">Security</Link>
          <Link href="/access">Request a pilot</Link>
          <a href="/download/windows">Download for Windows</a>
          <Link href="/login">Sign in</Link>
        </div>
        <div className="sl-footer-col">
          <h3>Legal</h3>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
      <div style={{ paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontSize: 12.5, color: "var(--sl-ink-faint)" }}>© {new Date().getFullYear()} Vantro Technologies</span>
      </div>
    </footer>
  );
}
