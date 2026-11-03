import type { Metadata, Viewport } from "next";
import "../landing.css";
import "../start.css";
import "../site.css";
import { SiteShell, PageHero } from "@/components/marketing/site/Site";
import { LEGAL, pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/terms",
  title: "Terms of service",
  description: "The terms that apply when you use Starlane.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Entity, address, governing law and contact come from LEGAL in lib/site.ts.
export default function TermsPage() {
  return (
    <SiteShell>
      <PageHero
        kicker="Legal"
        title={<>Terms of <em>service.</em></>}
        lead={<>The terms that apply when you use Starlane.<span className="lg-meta">Last updated {LEGAL.lastUpdated} · Draft, to be reviewed by a qualified legal professional before paid public launch</span></>}
      />
      <section className="f f-light lg" aria-label="Terms of service">
        <div className="f-wrap">
          <div className="lg-body">
            <h2>Acceptance of terms</h2>
            <p>By creating a Starlane account or using our services, you agree to these Terms of Service. If you are signing up on behalf of a business, you confirm that you have authority to bind that business to these terms.</p>
            <p>These terms form a binding agreement between you and {LEGAL.entityName}.</p>

            <h2>Who operates Starlane</h2>
            <p>Starlane is operated by <strong>{LEGAL.entityName}</strong>, {LEGAL.address}. Starlane builds AI business automation infrastructure for businesses in many countries.</p>

            <h2>What Starlane does</h2>
            <p>Starlane is an AI-powered platform for businesses that automates accounts receivable collections, cashflow forecasting, inventory monitoring, and customer follow-ups over email and messaging channels. <strong>Starlane is a software tool — it does not provide legal, financial, tax or accounting advice.</strong></p>

            <h2>Your account</h2>
            <p>You are responsible for keeping your account credentials secure. Notify us immediately at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> if you suspect unauthorised access. You must provide accurate information when registering. Accounts may not be shared between multiple businesses.</p>

            <h2>Subscription and payment</h2>
            <p>Plans, prices and what each includes are shown on our <a href="/pricing">Pricing page</a> and in your order or pilot agreement. Prices are in the currency shown at checkout and exclude applicable taxes (such as sales tax, VAT or GST), which are added where required.</p>
            <p>Paid subscriptions are billed in advance through our payment processor. You can cancel at any time from Starlane settings. No refunds for partial months except where required by law.</p>

            <h2>Your data</h2>
            <p>You own all data you upload to or generate within Starlane. We process it only to provide the service to you. You can export your data in CSV format at any time.</p>

            <h2>Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use Starlane to send unsolicited messages to customers who have no business relationship with you</li>
              <li>Reverse-engineer, copy, or resell any part of Starlane</li>
              <li>Use Starlane for any unlawful purpose or in violation of applicable laws, including financial, consumer-protection, anti-spam, privacy and tax laws</li>
              <li>Introduce malware, scripts, or automated bots that interfere with Starlane</li>
            </ul>
            <p>Violations may result in immediate account suspension without refund.</p>

            <h2>Intellectual property</h2>
            <p>Starlane, its AI models, code, design, and brand are proprietary. These terms grant you a limited, non-exclusive, non-transferable licence to use Starlane for your own business operations.</p>

            <h2>Disclaimers</h2>
            <p>Starlane is provided &ldquo;as is&rdquo;. We work hard to keep it accurate and reliable, but do not warrant that it will be error-free or uninterrupted. The AI-generated action lists and forecasts are decision-support tools — not substitutes for professional judgement.</p>

            <h2>Limitation of liability</h2>
            <p>To the maximum extent permitted by applicable law, Starlane&apos;s total liability for any claim shall not exceed the amounts paid by you in the 3 months preceding the claim.</p>

            <h2>Termination</h2>
            <p>Either party may terminate this agreement at any time. Close your account in Starlane settings. We may suspend accounts that violate these terms. On termination, your data is retained for 90 days then deleted.</p>

            <h2>Changes to these terms</h2>
            <p>We will notify you by email at least 14 days before material changes take effect. Continued use after that date constitutes acceptance.</p>

            <h2>Governing law and disputes</h2>
            <p>These terms are governed by the laws of {LEGAL.governingLaw}, without regard to its conflict-of-laws rules. Disputes shall be subject to the exclusive jurisdiction of {LEGAL.venue}, except where the law of your country gives you the right to bring a claim locally. Before bringing a claim, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and we&apos;ll respond within 10 business days.</p>

            <div className="lg-notice">
              <strong>{LEGAL.entityName}</strong><br/>
              {LEGAL.address} &middot; <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
            </div>
            <p className="lg-note">This is a draft template and should be reviewed by a qualified legal professional before paid public launch.</p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
