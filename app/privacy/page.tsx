import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Starlane by Atlax",
  description: "How Atlax collects, uses, and protects your business data inside Starlane.",
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

export default function PrivacyPage() {
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
          <span className="s-label">Legal</span>
          <h1>Privacy Policy</h1>
          <div className="lh-meta">Last updated: 31 May 2026 &middot; Starlane by Atlax</div>
        </div>
      </section>

      <div className="legal-body">
        <div className="wrap">
          <div className="legal-content">
            <h2>Who we are</h2>
            <p>Atlax is an AI business automation company. Atlax operates <strong>Starlane</strong> — an AI-powered collections, cashflow and inventory management app for Indian businesses.</p>
            <p>This policy explains what data we collect, how we use it, and what rights you have. It applies to all users of the Starlane app.</p>

            <h2>What we collect</h2>
            <p><strong>Account information:</strong> Your name, email address, phone number and business name when you sign up.</p>
            <p><strong>Business data:</strong> Invoices, customer records, payment history, bank transaction data, and inventory levels — imported from Tally, Excel, GST portal or entered directly. This data belongs to you.</p>
            <p><strong>Integration data:</strong> When you connect Razorpay, WhatsApp Business, UPI or other tools, we receive the minimum data necessary to run those integrations on your behalf.</p>
            <p><strong>Usage data:</strong> Pages visited, features used, session duration, and error logs. We use this to fix bugs and improve Starlane.</p>
            <p><strong>Device data:</strong> IP address, browser type, and device identifiers — standard for any web application.</p>

            <h2>How we use your data</h2>
            <ul>
              <li>To operate Starlane and deliver the features you&apos;ve subscribed to</li>
              <li>To send WhatsApp reminders to your customers on your behalf (only when you enable this)</li>
              <li>To generate your daily AI briefing and action list</li>
              <li>To detect fraud and ensure account security</li>
              <li>To send you product updates, invoices and support messages</li>
              <li>To improve Starlane&apos;s AI models, using anonymised and aggregated data only</li>
            </ul>
            <p>We will never use your customer data to market to your customers directly. We will never sell or rent your data to any third party.</p>

            <h2>Data storage and security</h2>
            <p>All data is stored on servers physically located in India. Data is encrypted in transit using TLS 1.3 and at rest using AES-256. Full details are on our <Link href="/security">Security page</Link>.</p>

            <h2>Third-party integrations</h2>
            <p>When you connect third-party services (Tally, Razorpay, WhatsApp Business, GST portal), we share only the data necessary to operate those integrations. Sub-processors include AWS (infrastructure), Razorpay (payments), and WhatsApp Business API providers (messaging). We maintain data processing agreements with each.</p>

            <h2>Your rights</h2>
            <p>Under India&apos;s Digital Personal Data Protection Act 2023 and applicable IT laws, you have the right to:</p>
            <ul>
              <li><strong>Access</strong> the personal data we hold about you</li>
              <li><strong>Correct</strong> inaccurate data</li>
              <li><strong>Delete</strong> your account and data (purged within 90 days)</li>
              <li><strong>Export</strong> your business data as CSV at any time from Starlane settings</li>
              <li><strong>Withdraw consent</strong> for specific processing activities</li>
            </ul>
            <p>To exercise any of these rights, email <a href="mailto:ishantswami13@gmail.com">ishantswami13@gmail.com</a>. We respond within 30 days.</p>

            <h2>Data retention</h2>
            <p>We keep your data for as long as your account is active. After deletion, all personal data is purged within 90 days, except where we are legally required to retain it (e.g. GST records for 7 years).</p>

            <h2>Children&apos;s data</h2>
            <p>Starlane is a business tool and not intended for anyone under 18. We do not knowingly collect data from minors.</p>

            <h2>Changes to this policy</h2>
            <p>We&apos;ll notify you by email and in-app before material changes take effect. Continued use after notice constitutes acceptance.</p>

            <h2>Contact &amp; Grievance Officer</h2>
            <div className="notice">
              <strong>Atlax</strong><br/>
              Mumbai, India<br/>
              Legal: <a href="mailto:ishantswami13@gmail.com">ishantswami13@gmail.com</a><br/>
              Support: <a href="mailto:ishantswami13@gmail.com">ishantswami13@gmail.com</a><br/>
              Response time: within 30 days
            </div>
            <p style={{marginTop:"16px",fontSize:"13px",color:"rgba(255,255,255,.3)"}}>This is a draft template and should be reviewed by a qualified legal professional before paid public launch.</p>
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
