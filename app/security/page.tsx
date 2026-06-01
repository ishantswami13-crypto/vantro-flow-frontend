import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security — Atlas by Vantro",
  description: "How Vantro protects your business data inside Atlas.",
};

const GRAIN = "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E";

function AtlasMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path fill="white" fillRule="evenodd" className="atlas-mark-anim"
        d="M 50 8 L 4 92 L 96 92 Z M 50 78 L 38 92 L 62 92 Z M 26 59 L 74 59 L 74 68 L 26 68 Z" />
    </svg>
  );
}

const base = { fontFamily: "'Space Grotesk', system-ui" };

export default function SecurityPage() {
  return (
    <div style={{ ...base, minHeight: "100vh", background: "#020202", color: "#fff", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `url("${GRAIN}")`, opacity: 0.5 }} />

      {/* Draft banner */}
      <div style={{ position: "relative", zIndex: 2, background: "rgba(255,200,0,.07)", borderBottom: "1px solid rgba(255,200,0,.15)", padding: "12px 40px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px", letterSpacing: ".08em", color: "rgba(255,200,0,.6)" }}>
        ⚠ Draft template — to be reviewed by a qualified legal professional before paid public launch
      </div>

      {/* Nav */}
      <nav style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff" }}>
          <AtlasMark />
          <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: ".2em", textTransform: "uppercase" as const }}>Atlas</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <Link href="/#features" style={{ fontSize: "14px", color: "rgba(255,255,255,.5)", textDecoration: "none" }}>Features</Link>
          <Link href="/#pricing" style={{ fontSize: "14px", color: "rgba(255,255,255,.5)", textDecoration: "none" }}>Pricing</Link>
          <Link href="/login" style={{ fontSize: "14px", color: "rgba(255,255,255,.5)", textDecoration: "none" }}>Log in</Link>
          <Link href="/signup" style={{ background: "#fff", color: "#000", fontWeight: 700, fontSize: "13px", padding: "8px 18px", borderRadius: "6px", textDecoration: "none" }}>Start free</Link>
        </div>
      </nav>

      {/* Header */}
      <section style={{ position: "relative", zIndex: 1, padding: "clamp(88px,12vw,120px) 40px clamp(40px,5vw,56px)", borderBottom: "1px solid rgba(255,255,255,.08)", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)", marginBottom: "16px" }}>Trust &amp; Safety</div>
        <h1 style={{ fontWeight: 600, fontSize: "clamp(32px,5vw,64px)", letterSpacing: "-0.045em", lineHeight: 1, marginBottom: "16px" }}>Security</h1>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,.28)", letterSpacing: ".1em" }}>Last updated: 31 May 2026 · Atlas by Vantro</div>
      </section>

      {/* Body */}
      <div style={{ position: "relative", zIndex: 1, padding: "64px 40px 100px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ maxWidth: "720px" }}>

          <p style={{ fontSize: "15px", color: "rgba(255,255,255,.5)", lineHeight: 1.75, marginBottom: "12px" }}>
            Your business data is sensitive. Here's exactly how Vantro protects it inside Atlas — no vague claims.
          </p>

          {[
            {
              h: "Where your data lives",
              content: <p>All Atlas data is stored on servers physically located in India. We do not transfer your data outside India. Backups are also stored within India.</p>
            },
            {
              h: "Encryption",
              content: (
                <ul>
                  <li><strong>In transit:</strong> All connections to Atlas use TLS 1.3. HTTPS is enforced across every endpoint.</li>
                  <li><strong>At rest:</strong> All data is encrypted using AES-256 at the infrastructure level — databases, backups, and file storage.</li>
                  <li><strong>Passwords:</strong> Never stored in plaintext. Hashed using bcrypt with a strong cost factor.</li>
                </ul>
              )
            },
            {
              h: "Access controls",
              content: (
                <>
                  <p><strong>Role-based access:</strong> You control who in your team sees what inside Atlas. Your accountant can have read-only access without seeing customer contacts or payment details.</p>
                  <p><strong>Vantro employee access:</strong> Production data access is restricted to a small number of engineers, requires multi-factor authentication, and every access is logged. We access your data only to resolve support issues you've raised, and only with your knowledge.</p>
                  <p><strong>MFA:</strong> Multi-factor authentication is available for all Atlas accounts and strongly recommended for admins.</p>
                </>
              )
            },
            {
              h: "Audit trail",
              content: <p>Every action in Atlas — every message sent, every invoice updated, every AI action taken — is logged with a timestamp and the user who performed it. You can view the full audit log from Atlas settings at any time. Logs are retained for 12 months.</p>
            },
            {
              h: "Application security",
              content: (
                <ul>
                  <li>Regular penetration testing; critical findings addressed before each major release</li>
                  <li>OWASP Top 10 guidelines followed in development</li>
                  <li>Automated dependency scanning for known vulnerabilities</li>
                  <li>Vulnerability management programme with tracked resolution</li>
                </ul>
              )
            },
            {
              h: "Payment security",
              content: <p>Vantro / Atlas does not store, process or transmit cardholder data. All payment processing is handled by <strong>Razorpay</strong>, which is PCI-DSS Level 1 compliant. We store only a non-reversible payment token for subscription management.</p>
            },
            {
              h: "Uptime and resilience",
              content: <p>We target 99.9% uptime. Infrastructure uses automated failover, daily backups with point-in-time recovery, and continuous health monitoring. Planned maintenance is communicated in advance.</p>
            },
            {
              h: "CERT-In compliance",
              content: <p>Vantro complies with CERT-In directions on information security practices, including mandatory incident reporting timelines under the IT (Amendment) Act.</p>
            },
          ].map(({ h, content }) => (
            <div key={h}>
              <h2 style={{ fontWeight: 600, fontSize: "19px", letterSpacing: "-0.025em", margin: "48px 0 10px", color: "rgba(255,255,255,.9)", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>{h}</h2>
              <div style={{ fontSize: "15px", color: "rgba(255,255,255,.5)", lineHeight: 1.75 }}>{content}</div>
            </div>
          ))}

          <h2 style={{ fontWeight: 600, fontSize: "19px", letterSpacing: "-0.025em", margin: "48px 0 10px", color: "rgba(255,255,255,.9)", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>Responsible disclosure</h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,.5)", lineHeight: 1.75, marginBottom: "12px" }}>
            If you discover a security vulnerability in Atlas, please report it to us before disclosing publicly. We will acknowledge within 48 hours and work to resolve confirmed findings promptly.
          </p>
          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "8px", padding: "16px 20px", margin: "24px 0", fontSize: "14px", color: "rgba(255,255,255,.45)", lineHeight: 1.6 }}>
            <strong style={{ color: "rgba(255,255,255,.78)" }}>Security contact:</strong>{" "}
            <a href="mailto:legal@vantro.in" style={{ color: "rgba(255,255,255,.68)", textDecoration: "underline", textUnderlineOffset: "3px" }}>legal@vantro.in</a><br />
            Subject line: <em>Security Disclosure — Atlas</em><br />
            We do not have a bug bounty programme at this time but will credit researchers who report valid findings responsibly.
          </div>

          <h2 style={{ fontWeight: 600, fontSize: "19px", letterSpacing: "-0.025em", margin: "48px 0 10px", color: "rgba(255,255,255,.9)", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>Questions</h2>
          <p style={{ fontSize: "15px", color: "rgba(255,255,255,.5)", lineHeight: 1.75, marginBottom: "12px" }}>
            For security questions, email <a href="mailto:legal@vantro.in" style={{ color: "rgba(255,255,255,.68)", textDecoration: "underline" }}>legal@vantro.in</a>. For general privacy matters, see our <Link href="/privacy" style={{ color: "rgba(255,255,255,.68)", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>
          <p style={{ marginTop: "32px", fontSize: "13px", color: "rgba(255,255,255,.3)" }}>
            This is a draft template and should be reviewed by a qualified legal professional before paid public launch.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,.08)", background: "#020202" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <AtlasMark size={20} />
              <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: ".15em", textTransform: "uppercase" as const }}>Atlas by Vantro</span>
            </div>
            <div style={{ display: "flex", gap: "24px", fontSize: "13px", color: "rgba(255,255,255,.35)" }}>
              <Link href="/privacy" style={{ color: "rgba(255,255,255,.35)", textDecoration: "none" }}>Privacy</Link>
              <Link href="/terms" style={{ color: "rgba(255,255,255,.35)", textDecoration: "none" }}>Terms</Link>
              <Link href="/security" style={{ color: "rgba(255,255,255,.35)", textDecoration: "none" }}>Security</Link>
            </div>
          </div>
          <div style={{ marginTop: "24px", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,.18)", letterSpacing: ".06em" }}>
            © 2026 Vantro · An Auren Group company
          </div>
        </div>
      </footer>

      <style>{`
        strong { color: rgba(255,255,255,.78); }
        ul { margin: 6px 0 14px 18px; display: flex; flex-direction: column; gap: 5px; list-style: disc; }
        li { font-size: 15px; color: rgba(255,255,255,.5); line-height: 1.65; }
      `}</style>
    </div>
  );
}
