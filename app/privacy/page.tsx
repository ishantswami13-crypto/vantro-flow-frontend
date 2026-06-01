import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Atlas by Vantro",
  description: "How Vantro collects, uses, and protects your business data inside Atlas.",
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

const S: React.CSSProperties = { fontFamily: "'Space Grotesk', system-ui" };

const sections = [
  {
    h: "Who we are",
    body: `Vantro is a fintech and AI business automation company, part of the Auren Group. Vantro operates Atlas — an AI-powered collections, cashflow and inventory management app for Indian businesses. This policy explains what data we collect, how we use it, and what rights you have. It applies to all users of vantro.in and the Atlas app.`,
  },
  {
    h: "What we collect",
    list: [
      { b: "Account information:", t: " Your name, email address, phone number and business name when you sign up." },
      { b: "Business data:", t: " Invoices, customer records, payment history, bank transaction data, and inventory levels — imported from Tally, Excel, GST portal or entered directly. This data belongs to you." },
      { b: "Integration data:", t: " When you connect Razorpay, WhatsApp Business, UPI or other tools, we receive the minimum data necessary to run those integrations on your behalf." },
      { b: "Usage data:", t: " Pages visited, features used, session duration, and error logs. We use this to fix bugs and improve Atlas." },
      { b: "Device data:", t: " IP address, browser type, and device identifiers — standard for any web application." },
    ],
  },
  {
    h: "How we use your data",
    list: [
      { t: "To operate Atlas and deliver the features you've subscribed to" },
      { t: "To send WhatsApp reminders to your customers on your behalf (only when you enable this)" },
      { t: "To generate your daily AI briefing and action list" },
      { t: "To detect fraud and ensure account security" },
      { t: "To send you product updates, invoices and support messages" },
      { t: "To improve Atlas's AI models, using anonymised and aggregated data only" },
    ],
    note: "We will never use your customer data to market to your customers directly. We will never sell or rent your data to any third party.",
  },
  {
    h: "Data storage and security",
    body: "All data is stored on servers physically located in India. Data is encrypted in transit using TLS 1.3 and at rest using AES-256. Full details are on our Security page.",
    secLink: true,
  },
  {
    h: "Third-party integrations",
    body: "When you connect third-party services (Tally, Razorpay, WhatsApp Business, GST portal), we share only the data necessary to operate those integrations. Sub-processors include AWS (infrastructure), Razorpay (payments), and WhatsApp Business API providers (messaging). We maintain data processing agreements with each.",
  },
  {
    h: "Your rights",
    body: "Under India's Digital Personal Data Protection Act 2023 and applicable IT laws, you have the right to:",
    list: [
      { b: "Access", t: " the personal data we hold about you" },
      { b: "Correct", t: " inaccurate data" },
      { b: "Delete", t: " your account and data (purged within 90 days)" },
      { b: "Export", t: " your business data as CSV at any time from Atlas settings" },
      { b: "Withdraw consent", t: " for specific processing activities" },
    ],
    note: "To exercise any of these rights, email legal@vantro.in. We respond within 30 days.",
  },
  {
    h: "Data retention",
    body: "We keep your data for as long as your account is active. After deletion, all personal data is purged within 90 days, except where we are legally required to retain it (e.g. GST records for 7 years).",
  },
  {
    h: "Children's data",
    body: "Atlas is a business tool and not intended for anyone under 18. We do not knowingly collect data from minors.",
  },
  {
    h: "Changes to this policy",
    body: "We'll notify you by email and in-app before material changes take effect. Continued use after notice constitutes acceptance.",
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ ...S, minHeight: "100vh", background: "#020202", color: "#fff", position: "relative" }}>
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
        <h1 style={{ fontWeight: 600, fontSize: "clamp(32px,5vw,64px)", letterSpacing: "-0.045em", lineHeight: 1, marginBottom: "16px" }}>Privacy Policy</h1>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,.28)", letterSpacing: ".1em" }}>Last updated: 31 May 2026 · Atlas by Vantro</div>
      </section>

      {/* Body */}
      <div style={{ position: "relative", zIndex: 1, padding: "64px 40px 100px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ maxWidth: "720px" }}>
          {sections.map(({ h, body, list, note, secLink }) => (
            <div key={h}>
              <h2 style={{ fontWeight: 600, fontSize: "19px", letterSpacing: "-0.025em", margin: "48px 0 10px", color: "rgba(255,255,255,.9)", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>{h}</h2>
              {body && (
                <p style={{ fontSize: "15px", color: "rgba(255,255,255,.5)", lineHeight: 1.75, marginBottom: "12px" }}>
                  {body}
                  {secLink && (
                    <>{" "}<Link href="/security" style={{ color: "rgba(255,255,255,.68)", textDecoration: "underline" }}>Security page</Link>.</>
                  )}
                </p>
              )}
              {list && (
                <ul style={{ margin: "6px 0 14px 18px", display: "flex", flexDirection: "column", gap: "5px", listStyle: "disc" }}>
                  {list.map((item: { b?: string; t: string }, i) => (
                    <li key={i} style={{ fontSize: "15px", color: "rgba(255,255,255,.5)", lineHeight: 1.65 }}>
                      {item.b && <strong style={{ color: "rgba(255,255,255,.78)" }}>{item.b}</strong>}
                      {item.t}
                    </li>
                  ))}
                </ul>
              )}
              {note && <p style={{ fontSize: "15px", color: "rgba(255,255,255,.5)", lineHeight: 1.75, marginBottom: "12px" }}>{note}</p>}
            </div>
          ))}

          <h2 style={{ fontWeight: 600, fontSize: "19px", letterSpacing: "-0.025em", margin: "48px 0 10px", color: "rgba(255,255,255,.9)", paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>Contact &amp; Grievance Officer</h2>
          <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "8px", padding: "16px 20px", margin: "24px 0", fontSize: "14px", color: "rgba(255,255,255,.45)", lineHeight: 1.6 }}>
            <strong style={{ color: "rgba(255,255,255,.78)" }}>Vantro · An Auren Group company</strong><br />
            Mumbai, India<br />
            Legal: <a href="mailto:legal@vantro.in" style={{ color: "rgba(255,255,255,.68)", textDecoration: "underline" }}>legal@vantro.in</a><br />
            Support: <a href="mailto:support@vantro.in" style={{ color: "rgba(255,255,255,.68)", textDecoration: "underline" }}>support@vantro.in</a><br />
            Response time: within 30 days
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
