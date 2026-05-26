import Link from "next/link";
import type { Metadata } from "next";
import LogoMark from "@/components/LogoMark";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Vantro Flow — Business Automation OS for Indian MSMEs.",
};

const LAST_UPDATED = "May 26, 2025";

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p className="text-sm" style={{ color: "rgba(242,244,247,0.45)" }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed" style={{ color: "rgba(242,244,247,0.7)" }}>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>1. Agreement to Terms</h2>
            <p>
              By creating an account or using Vantro Flow (&ldquo;the Service&rdquo;), you agree to these Terms of Service (&ldquo;Terms&rdquo;) with Vantro Technologies (&ldquo;Vantro&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). If you do not agree, do not use the Service. These Terms apply to all users, including free and paid plan subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>2. Description of Service</h2>
            <p>
              Vantro Flow is a cloud-based business automation platform for Indian MSMEs. The Service includes collections management, AI-powered receivables tracking, automated WhatsApp reminders, invoice creation, payment link generation, cash flow forecasting, and related features (&ldquo;Automation Modules&rdquo;). Features vary by subscription plan.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>3. Eligibility</h2>
            <p>
              You must be at least 18 years old and legally authorized to enter into contracts under Indian law. By using Vantro, you confirm that you are operating a legitimate business and that the information you provide is accurate and complete. You are responsible for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>4. Accounts and Security</h2>
            <ul className="space-y-2 list-disc list-outside ml-5">
              <li>You are responsible for maintaining the confidentiality of your password.</li>
              <li>Notify us immediately at <a href="mailto:ishantswami13@gmail.com" className="underline" style={{ color: "#4F6EF7" }}>ishantswami13@gmail.com</a> if you suspect unauthorized access.</li>
              <li>You may not share your account credentials with others. Each business requires its own account.</li>
              <li>Vantro is not liable for losses caused by unauthorized use of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>5. Subscription Plans and Billing</h2>
            <ul className="space-y-2 list-disc list-outside ml-5">
              <li>Vantro offers Free and paid subscription plans. Paid plans are billed monthly or annually via Razorpay.</li>
              <li>Prices are inclusive of applicable taxes unless stated otherwise. Prices may change with 30 days&apos; notice.</li>
              <li>You can cancel at any time from Settings. Cancellation stops future billing; no refund is issued for the current billing period, except as described in our refund policy below.</li>
              <li>If you don&apos;t recover more than your plan cost in your first 30 days of a paid plan, contact us for a full refund — no questions asked.</li>
              <li>Failed payments may result in temporary suspension of paid features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>6. WhatsApp Automation</h2>
            <p className="mb-3">
              Vantro sends WhatsApp messages on your behalf to your customers via Vantro&apos;s managed Twilio integration. By using this feature:
            </p>
            <ul className="space-y-2 list-disc list-outside ml-5">
              <li>You confirm that you have a legitimate business relationship with the customers you add to the platform.</li>
              <li>You confirm that the customer contact numbers you provide are accurate and belong to the intended recipients.</li>
              <li>You are responsible for ensuring your use of automated messaging complies with applicable telemarketing and spam laws.</li>
              <li>You must not use Vantro to send unsolicited, deceptive, or harassing messages.</li>
              <li>Vantro reserves the right to suspend WhatsApp sending if abuse is detected.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>7. Your Data and Intellectual Property</h2>
            <ul className="space-y-2 list-disc list-outside ml-5">
              <li>You retain full ownership of your business data (customer records, invoices, etc.).</li>
              <li>You grant Vantro a limited license to process your data solely to provide the Service.</li>
              <li>Vantro owns all intellectual property in the platform, including software, design, algorithms, and trademarks.</li>
              <li>You may not copy, reverse-engineer, or resell the Service or any part of it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>8. Prohibited Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="space-y-2 list-disc list-outside ml-5">
              <li>Use the Service for any unlawful purpose or in violation of Indian law</li>
              <li>Enter false or fraudulent customer data</li>
              <li>Attempt to hack, overload, or disrupt the platform or its infrastructure</li>
              <li>Resell or sub-license access to the Service</li>
              <li>Use automated bots or scrapers against the platform</li>
              <li>Send spam or unsolicited bulk messages through the WhatsApp automation feature</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by Indian law, Vantro&apos;s total liability for any claim arising out of or related to the Service is limited to the fees you paid to Vantro in the 3 months prior to the event giving rise to the claim. Vantro is not liable for indirect, incidental, consequential, or punitive damages, including lost profits or data loss.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>10. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; Vantro does not warrant that the Service will be uninterrupted, error-free, or that it will meet your specific business requirements. We are not a financial advisor — cash flow forecasts are estimates only and should not be relied upon as financial advice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold Vantro harmless from any claims, damages, or expenses (including legal fees) arising from your use of the Service, your breach of these Terms, or your violation of any third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>12. Termination</h2>
            <p>
              Either party may terminate at any time. You can close your account from Settings. Vantro may suspend or terminate your account if you violate these Terms, with or without notice. Upon termination, your right to use the Service ends immediately. Data retention after termination is governed by our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>13. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you by email or in-app notification at least 7 days before material changes take effect. Continued use of the Service after the effective date constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>14. Governing Law and Disputes</h2>
            <p>
              These Terms are governed by the laws of India. Any dispute arising from these Terms or your use of the Service shall first be attempted to be resolved through good-faith negotiation. Unresolved disputes shall be subject to the exclusive jurisdiction of courts in India.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold mb-3" style={{ color: "#F2F4F7" }}>15. Contact</h2>
            <p>
              For questions about these Terms:
            </p>
            <div className="mt-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="font-semibold mb-1" style={{ color: "#F2F4F7" }}>Vantro Technologies</p>
              <p>Email: <a href="mailto:ishantswami13@gmail.com" className="underline" style={{ color: "#4F6EF7" }}>ishantswami13@gmail.com</a></p>
            </div>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-14 pt-8 border-t flex flex-wrap gap-4 text-xs" style={{ borderColor: "rgba(255,255,255,0.06)", color: "rgba(242,244,247,0.4)" }}>
          <Link href="/">Home</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/login">Login</Link>
          <Link href="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
