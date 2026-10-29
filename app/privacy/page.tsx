import type { Metadata, Viewport } from "next";
import "../landing.css";
import "../start.css";
import "../site.css";
import Link from "next/link";
import { SiteShell, PageHero } from "@/components/marketing/site/Site";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/privacy",
  title: "Privacy policy",
  description: "How Starlane collects, uses and protects your business data, and the rights you have over it.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// The legal text is unchanged; it now sits in the public site's frame.
export default function PrivacyPage() {
  return (
    <SiteShell>
      <PageHero
        kicker="Legal"
        title={<>Privacy <em>policy.</em></>}
        lead={<>How Starlane collects, uses and protects your business data, and the rights you have over it.<span className="lg-meta">Last updated 31 May 2026 · Draft, to be reviewed by a qualified legal professional before paid public launch</span></>}
      />
      <section className="f f-light lg" aria-label="Privacy policy">
        <div className="f-wrap">
          <div className="lg-body">
            <h2>Who we are</h2>
            <p><strong>Starlane</strong> is an AI-powered collections, cashflow and inventory management app for Indian businesses.</p>
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
            <div className="lg-notice">
              <strong>Starlane</strong><br/>
              Mumbai, India<br/>
              Legal: <a href="mailto:ishantswami13@gmail.com">ishantswami13@gmail.com</a><br/>
              Support: <a href="mailto:ishantswami13@gmail.com">ishantswami13@gmail.com</a><br/>
              Response time: within 30 days
            </div>
            <p className="lg-note">This is a draft template and should be reviewed by a qualified legal professional before paid public launch.</p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
