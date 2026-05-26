import Link from "next/link";
import type { Metadata } from "next";
import LogoMark from "@/components/LogoMark";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Vantro collects, uses, and protects your business data.",
};

const LAST_UPDATED = "May 26, 2025";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0D0F14" }}>

      {/* Nav */}
      <nav className="border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="font-bold text-sm" style={{ color: "#F2F4F7" }}>Vantro</span>
          </Link>
          <Link href="/" className="text-xs hover:underline" style={{ color: "rgba(242,244,247,0.5)" }}>
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: "#F2F4F7" }}>
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: "rgba(242,244,247,0.45)" }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: "rgba(242,244,247,0.7)" }}>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>1. Who We Are</h2>
            <p>
              Vantro Technologies (&ldquo;Vantro&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;) operates the Vantro Flow platform — a business automation OS for Indian MSMEs. Our registered address is India. You can reach us at{" "}
              <a href="mailto:ishantswami13@gmail.com" className="underline" style={{ color: "#4F6EF7" }}>
                ishantswami13@gmail.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>2. Information We Collect</h2>
            <ul className="space-y-2 list-disc list-outside ml-5">
              <li><span className="font-semibold" style={{ color: "#F2F4F7" }}>Account data:</span> Your name, business name, email address, and phone number when you sign up.</li>
              <li><span className="font-semibold" style={{ color: "#F2F4F7" }}>Business data:</span> Invoice details, customer names and contact numbers, payment records, and outstanding receivables you enter into the platform.</li>
              <li><span className="font-semibold" style={{ color: "#F2F4F7" }}>Usage data:</span> Pages visited, features used, and actions taken — collected via PostHog analytics to improve the product.</li>
              <li><span className="font-semibold" style={{ color: "#F2F4F7" }}>Payment data:</span> Billing and subscription information processed via Razorpay. Vantro does not store full card or bank details.</li>
              <li><span className="font-semibold" style={{ color: "#F2F4F7" }}>Communication data:</span> WhatsApp messages sent through Vantro&apos;s managed Twilio integration on your behalf.</li>
              <li><span className="font-semibold" style={{ color: "#F2F4F7" }}>Device data:</span> Browser type, device type, IP address, and operating system for security and debugging purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>3. How We Use Your Information</h2>
            <ul className="space-y-2 list-disc list-outside ml-5">
              <li>To provide and operate the Vantro Flow platform</li>
              <li>To send automated WhatsApp and email reminders to your customers on your behalf</li>
              <li>To generate payment links and collect payments via Razorpay</li>
              <li>To provide cash flow forecasts and collections analytics</li>
              <li>To send you product updates, billing notifications, and support communications</li>
              <li>To detect fraud, abuse, and security threats</li>
              <li>To comply with applicable Indian laws including the IT Act, 2000 and GST regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>4. Data Sharing</h2>
            <p className="mb-3">We do not sell your data. We share data only in these situations:</p>
            <ul className="space-y-2 list-disc list-outside ml-5">
              <li><span className="font-semibold" style={{ color: "#F2F4F7" }}>Service providers:</span> Twilio (WhatsApp messaging), Razorpay (payments), Supabase (database), Vercel (hosting), PostHog (analytics). All are bound by data processing agreements.</li>
              <li><span className="font-semibold" style={{ color: "#F2F4F7" }}>Legal requirements:</span> If required by Indian law, court order, or regulatory authority.</li>
              <li><span className="font-semibold" style={{ color: "#F2F4F7" }}>Business transfers:</span> If Vantro is acquired or merges, your data may transfer to the new entity, with prior notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>5. Data Security</h2>
            <p>
              We use industry-standard security measures including 256-bit TLS encryption in transit, encrypted storage in Supabase (hosted on AWS), row-level security on all database tables, and token-based authentication. No system is 100% secure — if you suspect unauthorized access, contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>6. Data Retention</h2>
            <p>
              We retain your account and business data for as long as your account is active and for up to 3 years after closure, as required under Indian tax and financial recordkeeping laws. You may request deletion of your account at any time by emailing us — we will action it within 30 days, subject to legal retention obligations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>7. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="space-y-2 list-disc list-outside ml-5">
              <li>Access a copy of the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data (subject to legal holds)</li>
              <li>Opt out of marketing communications (you can unsubscribe from any email)</li>
              <li>Withdraw consent for optional processing</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{" "}
              <a href="mailto:ishantswami13@gmail.com" className="underline" style={{ color: "#4F6EF7" }}>
                ishantswami13@gmail.com
              </a>{" "}
              with &ldquo;Privacy Request&rdquo; in the subject line.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>8. Cookies</h2>
            <p>
              Vantro uses essential cookies for authentication and session management, and analytics cookies via PostHog to understand how users interact with the product. You can disable cookies in your browser settings; however, disabling essential cookies will prevent you from logging in.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>9. Third-Party Links</h2>
            <p>
              Our platform may link to third-party services (e.g., Razorpay payment gateway). We are not responsible for their privacy practices. Please review their policies separately.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>10. Children&apos;s Privacy</h2>
            <p>
              Vantro is a B2B platform intended for business use. We do not knowingly collect data from individuals under 18 years of age.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app banner at least 7 days before they take effect. Continued use of Vantro after the effective date constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>12. Governing Law</h2>
            <p>
              This Privacy Policy is governed by the laws of India, including the Information Technology Act, 2000 and applicable rules thereunder. Disputes shall be subject to the exclusive jurisdiction of courts in India.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>13. Contact Us</h2>
            <p>
              For any questions, concerns, or requests regarding this Privacy Policy:
            </p>
            <div className="mt-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="font-semibold mb-1" style={{ color: "#F2F4F7" }}>Vantro Technologies</p>
              <p>Email: <a href="mailto:ishantswami13@gmail.com" className="underline" style={{ color: "#4F6EF7" }}>ishantswami13@gmail.com</a></p>
              <p className="mt-1">We respond to all privacy inquiries within 5 business days.</p>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-14 pt-8 border-t flex flex-wrap gap-4 text-xs" style={{ borderColor: "rgba(255,255,255,0.06)", color: "rgba(242,244,247,0.4)" }}>
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/login" className="hover:underline">Login</Link>
          <Link href="/signup" className="hover:underline">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
