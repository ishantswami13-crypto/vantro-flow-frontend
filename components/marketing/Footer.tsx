import Link from "next/link";

export function Footer() {
  return (
    <footer className="sl-wrap" style={{ paddingTop: 64, paddingBottom: 32 }}>
      <div className="sl-footer-grid">
        <div>
          <span className="sl-wordmark">Starlane</span>
          <p className="sl-p" style={{ marginTop: 14, maxWidth: 280 }}>Intelligence and execution infrastructure, by Vantro Technologies.</p>
        </div>
        <div className="sl-footer-col">
          <h3>Product</h3>
          <a href="#product">Intelligence</a>
          <a href="#story">How it reasons</a>
          <a href="#capabilities">Capabilities</a>
        </div>
        <div className="sl-footer-col">
          <h3>Company</h3>
          <Link href="/security">Security</Link>
          <a href="#trust">Evidence &amp; controls</a>
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
        <span style={{ fontFamily: "var(--sl-mono)", fontSize: 11, color: "var(--sl-ink-faint)" }}>Decisions grounded in evidence.</span>
      </div>
    </footer>
  );
}
