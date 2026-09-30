import Link from "next/link";
import "./landing.css";

export default function NotFound() {
  return (
    <div className="sl" style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <main style={{ maxWidth: 520, textAlign: "center" }}>
        <span className="sl-eyebrow">404</span>
        <h1 className="sl-h2">This page doesn’t exist.</h1>
        <p className="sl-p" style={{ marginTop: 14 }}>It may have moved, or the link may be mistyped.</p>
        <div className="sl-hero-ctas" style={{ justifyContent: "center" }}>
          <Link href="/bridge" className="sl-btn sl-btn-solid">Open Starlane</Link>
          <Link href="/" className="sl-link-arrow">Starlane home</Link>
        </div>
      </main>
    </div>
  );
}
