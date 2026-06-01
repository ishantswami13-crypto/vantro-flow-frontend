import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Atlas by Vantro",
  description: "Terms and conditions for using Atlas by Vantro.",
};

function AtlasMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path fill="white" fillRule="evenodd" className="atlas-mark-spin"
        d="M 50 8 L 4 92 L 96 92 Z M 50 78 L 38 92 L 62 92 Z M 26 59 L 74 59 L 74 68 L 26 68 Z"/>
    </svg>
  );
}

export default function TermsPage() {
  return (
    <div className="atlas-page">
      <div className="grain"/>
      <div className="draft-banner">⚠ Draft template — to be reviewed by a qualified legal professional before paid public launch</div>

      <nav className="nav on">
        <div className="wrap nav-inner">
          <Link href="/" className="brand" style={{display:"flex",alignItems:"center",gap:"9px",textDecoration:"none"}}>
            <AtlasMark/> <span style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:700,fontSize:"13.5px",letterSpacing:".2em",textTransform:"uppercase",color:"white"}}>Atlas</span>
          </Link>
          <div className="nav-links"><a href="/#features">Features</a><a href="/#pricing">Pricing</a><a href="/#faq">FAQ</a></div>
          <div className="nav-cta">
            <Link className="nav-login" href="/login">Log in</Link>
            <Link className="btn btn-primary" href="/signup">Start free</Link>
          </div>
        </div>
      </nav>

      <section className="legal-header">
        <div className="wrap">
          <span className="s-label">Legal</span>
          <h1>Terms of Service</h1>
          <div className="lh-meta">Last updated: 31 May 2026 &middot; Atlas by Vantro</div>
        </div>
      </section>

      <div className="legal-body">
        <div className="wrap">
          <div className="legal-content">
            <h2>Acceptance of terms</h2>
            <p>By creating an Atlas account or using our services, you agree to these Terms of Service. If you are signing up on behalf of a business, you confirm that you have authority to bind that business to these terms.</p>
            <p>These terms form a binding agreement under the Indian Contract Act, 1872 and the Information Technology Act, 2000.</p>

            <h2>Who operates Atlas</h2>
            <p><strong>Atlas</strong> is a product by <strong>Vantro</strong>, part of the <strong>Auren Group</strong>. Vantro is headquartered in Mumbai, India.</p>

            <h2>What Atlas does</h2>
            <p>Atlas is an AI-powered platform for Indian businesses that automates accounts receivable collections, cashflow forecasting, inventory monitoring, and WhatsApp-based customer follow-ups. <strong>Atlas is a software tool — it does not provide legal, financial, tax or accounting advice.</strong></p>

            <h2>Your account</h2>
            <p>You are responsible for keeping your account credentials secure. Notify us immediately at <a href="mailto:support@vantro.in">support@vantro.in</a> if you suspect unauthorised access. You must provide accurate information when registering. Accounts may not be shared between multiple businesses.</p>

            <h2>Subscription and payment</h2>
            <p>Atlas offers three plans:</p>
            <ul>
              <li><strong>Free:</strong> ₹0/month — up to 5 invoices/month, manual WhatsApp, basic dashboard.</li>
              <li><strong>Pro:</strong> ₹999/month + applicable GST — unlimited invoices, full AI automation, all integrations.</li>
              <li><strong>Success:</strong> ₹0/month + 1.5% of Atlas-collected invoices only — everything in Pro, no monthly fee.</li>
            </ul>
            <p>Pro subscriptions are billed monthly in advance via Razorpay. You can cancel at any time from Atlas settings. No refunds for partial months except where required by law.</p>

            <h2>Your data</h2>
            <p>You own all data you upload to or generate within Atlas. Vantro processes it only to provide the service to you. You can export your data in CSV format at any time.</p>

            <h2>Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use Atlas to send unsolicited messages to customers who have no business relationship with you</li>
              <li>Reverse-engineer, copy, or resell any part of Atlas</li>
              <li>Use Atlas for any unlawful purpose or in violation of RBI, SEBI, or GST regulations</li>
              <li>Introduce malware, scripts, or automated bots that interfere with Atlas</li>
            </ul>
            <p>Violations may result in immediate account suspension without refund.</p>

            <h2>Intellectual property</h2>
            <p>Atlas, its AI models, code, design, and brand are the property of Vantro / Auren Group. These terms grant you a limited, non-exclusive, non-transferable licence to use Atlas for your own business operations.</p>

            <h2>Disclaimers</h2>
            <p>Atlas is provided &ldquo;as is&rdquo;. We work hard to keep it accurate and reliable, but do not warrant that it will be error-free or uninterrupted. The AI-generated action lists and forecasts are decision-support tools — not substitutes for professional judgement.</p>

            <h2>Limitation of liability</h2>
            <p>To the maximum extent permitted by Indian law, Vantro&apos;s total liability for any claim shall not exceed the amounts paid by you in the 3 months preceding the claim.</p>

            <h2>Termination</h2>
            <p>Either party may terminate this agreement at any time. Close your account in Atlas settings. We may suspend accounts that violate these terms. On termination, your data is retained for 90 days then deleted.</p>

            <h2>Changes to these terms</h2>
            <p>We will notify you by email at least 14 days before material changes take effect. Continued use after that date constitutes acceptance.</p>

            <h2>Governing law and disputes</h2>
            <p>These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Mumbai. Email <a href="mailto:legal@vantro.in">legal@vantro.in</a> and we&apos;ll respond within 10 business days.</p>

            <div className="notice">
              <strong>Vantro &middot; An Auren Group company</strong><br/>
              Mumbai, India &middot; <a href="mailto:legal@vantro.in">legal@vantro.in</a>
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
                <AtlasMark/> <span style={{fontFamily:"'Space Grotesk',system-ui",fontWeight:700,fontSize:"13px",letterSpacing:".2em",textTransform:"uppercase",color:"white"}}>Atlas</span>
              </Link>
              <p>Atlas by Vantro — the AI business control room for Indian founders.</p>
              <p className="foot-made">Made in India &middot; Data stays in India</p>
            </div>
            <div className="foot-col"><h4>Product</h4><a href="/#features">Features</a><a href="/#pricing">Pricing</a><a href="/#faq">FAQ</a></div>
            <div className="foot-col"><h4>Contact</h4><a href="mailto:support@vantro.in">support@vantro.in</a></div>
          </div>
          <div className="wm">VANTRO</div>
          <div className="foot-bottom">
            <span>&copy; 2026 Vantro &middot; An Auren Group company</span>
            <span className="foot-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/security">Security</Link></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
