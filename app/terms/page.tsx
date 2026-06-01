import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Atlas by Vantro",
  description: "Terms and conditions for using Atlas by Vantro.",
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

const p: React.CSSProperties = { fontSize: "15px", color: "rgba(255,255,255,.5)", lineHeight: 1.75, marginBottom: "12px" };
const h2style: React.CSSProperties = { fontWeight: 600, fontSize: "19px", letterSpacing: "-0.025em", margin: "48px 0 10px", color: "rgba(255,255,255,.9)", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,.07)" };
const li: React.CSSProperties = { fontSize: "15px", color: "rgba(255,255,255,.5)", lineHeight: 1.65 };
const ul: React.CSSProperties = { margin: "6px 0 14px 18px", display: "flex", flexDirection: "column", gap: "5px", listStyle: "disc" };

export default function TermsPage() {
  return (
    <div style={{ fontFamily: "'Space Grotesk', system-ui", minHeight: "100vh", background: "#020202", color: "#fff", position: "relative" }}>
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
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.28)", marginBottom: "16px" }}>Legal</div>
        <h1 style={{ fontWeight: 600, fontSize: "clamp(32px,5vw,64px)", letterSpacing: "-0.045em", lineHeight: 1, marginBottom: "16px" }}>Terms of Service</h1>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,.28)", letterSpacing: ".1em" }}>Last updated: 31 May 2026 · Atlas by Vantro</div>
      </section>

      {/* Body */}
      <div style={{ position: "relative", zIndex: 1, padding: "64px 40px 100px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ maxWidth: "720px" }}>

          <h2 style={h2style}>Acceptance of terms</h2>
          <p style={p}>By creating an Atlas account or using our services, you agree to these Terms of Service. If you are signing up on behalf of a business, you confirm that you have authority to bind that business to these terms.</p>
          <p style={p}>These terms form a binding agreement under the Indian Contract Act, 1872 and the Information Technology Act, 2000.</p>

          <h2 style={h2style}>Who operates Atlas</h2>
          <p style={p}><strong style={{ color: "rgba(255,255,255,.78)" }}>Atlas</strong> is a product by <strong style={{ color: "rgba(255,255,255,.78)" }}>Vantro</strong>, part of the <strong style={{ color: "rgba(255,255,255,.78)" }}>Auren Group</strong>. Vantro is headquartered in Mumbai, India.</p>

          <h2 style={h2style}>What Atlas does</h2>
          <p style={p}>Atlas is an AI-powered platform for Indian businesses that automates accounts receivable collections, cashflow forecasting, inventory monitoring, and WhatsApp-based customer follow-ups. <strong style={{ color: "rgba(255,255,255,.78)" }}>Atlas is a software tool — it does not provide legal, financial, tax or accounting advice.</strong></p>

          <h2 style={h2style}>Your account</h2>
          <p style={p}>You are responsible for keeping your account credentials secure. Notify us immediately at <a href="mailto:support@vantro.in" style={{ color: "rgba(255,255,255,.68)", textDecoration: "underline" }}>support@vantro.in</a> if you suspect unauthorised access. You must provide accurate information when registering. Accounts may not be shared between multiple businesses.</p>

          <h2 style={h2style}>Subscription and payment</h2>
          <p style={p}>Atlas offers three plans:</p>
          <ul style={ul}>
            <li style={li}><strong style={{ color: "rgba(255,255,255,.78)" }}>Free:</strong> ₹0/month — up to 5 invoices/month, manual WhatsApp, basic dashboard.</li>
            <li style={li}><strong style={{ color: "rgba(255,255,255,.78)" }}>Pro:</strong> ₹999/month + applicable GST — unlimited invoices, full AI automation, all integrations.</li>
            <li style={li}><strong style={{ color: "rgba(255,255,255,.78)" }}>Success:</strong> ₹0/month + 1.5% of Atlas-collected invoices only — everything in Pro, no monthly fee.</li>
          </ul>
          <p style={p}>Pro subscriptions are billed monthly in advance via Razorpay. GST at the applicable rate applies. You can cancel at any time from Atlas settings; your plan remains active until the end of the paid billing period. No refunds for partial months except where required by law.</p>

          <h2 style={h2style}>Your data</h2>
          <p style={p}>You own all data you upload to or generate within Atlas — invoices, customer records, payment histories. Vantro processes it only to provide the service to you. You can export your data in CSV format at any time. Vantro claims no rights over your business data.</p>

          <h2 style={h2style}>Acceptable use</h2>
          <p style={p}>You agree not to:</p>
          <ul style={ul}>
            <li style={li}>Use Atlas to send unsolicited messages to customers who have no business relationship with you</li>
            <li style={li}>Reverse-engineer, copy, or resell any part of Atlas</li>
            <li style={li}>Use Atlas for any unlawful purpose or in violation of RBI, SEBI, or GST regulations</li>
            <li style={li}>Introduce malware, scripts, or automated bots that interfere with Atlas</li>
          </ul>
          <p style={p}>Violations may result in immediate account suspension without refund.</p>

          <h2 style={h2style}>Intellectual property</h2>
          <p style={p}>Atlas, its AI models, code, design, and brand are the property of Vantro / Auren Group. These terms grant you a limited, non-exclusive, non-transferable licence to use Atlas for your own business operations.</p>

          <h2 style={h2style}>Disclaimers</h2>
          <p style={p}>Atlas is provided "as is". We work hard to keep it accurate and reliable, but do not warrant that it will be error-free or uninterrupted. The AI-generated action lists and forecasts are decision-support tools — not substitutes for professional judgement.</p>

          <h2 style={h2style}>Limitation of liability</h2>
          <p style={p}>To the maximum extent permitted by Indian law, Vantro&apos;s total liability for any claim shall not exceed the amounts paid by you in the 3 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>

          <h2 style={h2style}>Termination</h2>
          <p style={p}>Either party may terminate this agreement at any time. Close your account in Atlas settings. We may suspend accounts that violate these terms. On termination, your data is retained for 90 days then deleted.</p>

          <h2 style={h2style}>Changes to these terms</h2>
          <p style={p}>We will notify you by email at least 14 days before material changes take effect. Continued use after that date constitutes acceptance.</p>

          <h2 style={h2style}>Governing law and disputes</h2>
          <p style={p}>These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Mumbai. Email <a href="mailto:legal@vantro.in" style={{ color: "rgba(255,255,255,.68)", textDecoration: "underline" }}>legal@vantro.in</a> and we&apos;ll respond within 10 business days.</p>

          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "8px", padding: "16px 20px", margin: "40px 0 24px", fontSize: "14px", color: "rgba(255,255,255,.45)", lineHeight: 1.6 }}>
            <strong style={{ color: "rgba(255,255,255,.78)" }}>Vantro · An Auren Group company</strong><br />
            Mumbai, India · <a href="mailto:legal@vantro.in" style={{ color: "rgba(255,255,255,.68)", textDecoration: "underline" }}>legal@vantro.in</a>
          </div>
          <p style={{ marginTop: "16px", fontSize: "13px", color: "rgba(255,255,255,.3)" }}>This is a draft template and should be reviewed by a qualified legal professional before paid public launch.</p>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,.08)", background: "#020202" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AtlasMark size={20} />
            <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: ".15em", textTransform: "uppercase" as const }}>Atlas by Vantro</span>
          </div>
          <div style={{ display: "flex", gap: "24px", fontSize: "13px" }}>
            <Link href="/privacy" style={{ color: "rgba(255,255,255,.35)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ color: "rgba(255,255,255,.35)", textDecoration: "none" }}>Terms</Link>
            <Link href="/security" style={{ color: "rgba(255,255,255,.35)", textDecoration: "none" }}>Security</Link>
          </div>
        </div>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 40px 32px", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,.18)", letterSpacing: ".06em" }}>
          © 2026 Vantro · An Auren Group company
        </div>
      </footer>
    </div>
  );
}
