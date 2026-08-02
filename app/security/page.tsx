import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security — Starlane by Atlax",
  description: "How Atlax protects your business data inside Starlane.",
};

function StarlaneMark({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundImage: 'url("/brand/starlane-icon.jpeg")',
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
        borderRadius: Math.max(4, Math.round(size * 0.18)),
        flexShrink: 0,
      }}
    />
  );
}

export default function SecurityPage() {
  return (
    <div className="atlas-page">
      <div className="grain"/>
      <div className="draft-banner">⚠ Draft template — to be reviewed by a qualified legal professional before paid public launch</div>

      <nav className="nav on">
        <div className="wrap nav-inner">
          <Link href="/" className="brand" style={{display:"flex",alignItems:"center",gap:"9px",textDecoration:"none"}}>
            <StarlaneMark/> <span style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:700,fontSize:"13.5px",letterSpacing:".2em",textTransform:"uppercase",color:"white"}}>Starlane</span>
          </Link>
          <div className="nav-links"><Link href="/#features">Features</Link><Link href="/#pricing">Pricing</Link><Link href="/#faq">FAQ</Link></div>
          <div className="nav-cta">
            <Link className="nav-login" href="/login">Log in</Link>
            <Link className="btn btn-primary" href="/signup">Start free</Link>
          </div>
        </div>
      </nav>

      <section className="legal-header">
        <div className="wrap">
          <span className="s-label">Trust &amp; Safety</span>
          <h1>Security</h1>
          <div className="lh-meta">Last updated: 31 May 2026 &middot; Starlane by Atlax</div>
        </div>
      </section>

      <div className="legal-body">
        <div className="wrap">
          <div className="legal-content">
            <p>Your business data is sensitive. Here&apos;s exactly how Atlax protects it inside Starlane — no vague claims.</p>

            <h2>Where your data lives</h2>
            <p>All Starlane data is stored on servers physically located in India. We do not transfer your data outside India. Backups are also stored within India.</p>

            <h2>Encryption</h2>
            <ul>
              <li><strong>In transit:</strong> All connections to Starlane use TLS 1.3. HTTPS is enforced across every endpoint.</li>
              <li><strong>At rest:</strong> All data is encrypted using AES-256 at the infrastructure level — databases, backups, and file storage.</li>
              <li><strong>Passwords:</strong> Never stored in plaintext. Hashed using bcrypt with a strong cost factor.</li>
            </ul>

            <h2>Access controls</h2>
            <p><strong>Role-based access:</strong> You control who in your team sees what inside Starlane. Your accountant can have read-only access without seeing customer contacts or payment details.</p>
            <p><strong>Atlax employee access:</strong> Production data access is restricted to a small number of engineers, requires multi-factor authentication, and every access is logged. We access your data only to resolve support issues you&apos;ve raised, and only with your knowledge.</p>
            <p><strong>MFA:</strong> Multi-factor authentication is available for all Starlane accounts and strongly recommended for admins.</p>

            <h2>Audit trail</h2>
            <p>Every action in Starlane — every message sent, every invoice updated, every AI action taken — is logged with a timestamp and the user who performed it. You can view the full audit log from Starlane settings at any time. Logs are retained for 12 months.</p>

            <h2>Application security</h2>
            <ul>
              <li>Regular penetration testing; critical findings addressed before each major release</li>
              <li>OWASP Top 10 guidelines followed in development</li>
              <li>Automated dependency scanning for known vulnerabilities</li>
              <li>Vulnerability management programme with tracked resolution</li>
            </ul>

            <h2>Payment security</h2>
            <p>Starlane does not store, process or transmit cardholder data. All payment processing is handled by <strong>Razorpay</strong>, which is PCI-DSS Level 1 compliant. We store only a non-reversible payment token for subscription management.</p>

            <h2>Uptime and resilience</h2>
            <p>We target 99.9% uptime. Infrastructure uses automated failover, daily backups with point-in-time recovery, and continuous health monitoring. Planned maintenance is communicated in advance.</p>

            <h2>CERT-In compliance</h2>
            <p>Atlax complies with CERT-In directions on information security practices, including mandatory incident reporting timelines under the IT (Amendment) Act.</p>

            <h2>Responsible disclosure</h2>
            <p>If you discover a security vulnerability in Starlane, please report it to us before disclosing publicly. We will acknowledge within 48 hours and work to resolve confirmed findings promptly.</p>
            <div className="notice">
              <strong>Security contact:</strong> <a href="mailto:ishantswami13@gmail.com">ishantswami13@gmail.com</a><br/>
              Subject line: <em>Security Disclosure — Starlane</em><br/>
              We do not have a bug bounty programme at this time but will credit researchers who report valid findings responsibly.
            </div>

            <h2>Questions</h2>
            <p>For security questions, email <a href="mailto:ishantswami13@gmail.com">ishantswami13@gmail.com</a>. For general privacy matters, see our <Link href="/privacy">Privacy Policy</Link>.</p>
            <p style={{marginTop:"32px",fontSize:"13px",color:"rgba(255,255,255,.3)"}}>This is a draft template and should be reviewed by a qualified legal professional before paid public launch.</p>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <Link href="/" className="brand" style={{display:"flex",alignItems:"center",gap:"9px",textDecoration:"none"}}>
                <StarlaneMark/> <span style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:700,fontSize:"13px",letterSpacing:".2em",textTransform:"uppercase",color:"white"}}>Starlane</span>
              </Link>
              <p>Starlane by Atlax — the AI business control room for Indian founders.</p>
              <p className="foot-made">Made in India &middot; Data stays in India</p>
            </div>
            <div className="foot-col"><h4>Product</h4><Link href="/#features">Features</Link><Link href="/#pricing">Pricing</Link><Link href="/#faq">FAQ</Link></div>
            <div className="foot-col"><h4>Contact</h4><a href="mailto:ishantswami13@gmail.com">ishantswami13@gmail.com</a></div>
          </div>
          <div className="wm">STARLANE</div>
          <div className="foot-bottom">
            <span>&copy; 2026 Atlax. Starlane is a product of Atlax.</span>
            <span className="foot-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/security">Security</Link></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
