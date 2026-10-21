import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/marketing/PublicShell";

export const metadata: Metadata = {
  title: "Security and control · Starlane",
  description: "The controls Starlane has today, stated plainly, and what it does not claim.",
};

// Only controls that exist in the product and backend today. Anything not yet
// achieved (certifications, audits, uptime commitments) is said to be absent,
// not implied.
const CONTROLS: Array<[string, string]> = [
  ["Approval queue", "Proposed actions wait for a person, and higher-risk action types always require approval. Opening an approval link changes nothing; you confirm with a button on the page."],
  ["Runs at most once", "Each approved action is claimed atomically and runs at most once. The message text you approve is the text that is sent."],
  ["Evidence", "Figures are labelled as fact, calculated, assumption or estimate, with the records they came from. Simulations show a low to high range and the assumptions behind it."],
  ["Audit trail", "Decisions are logged with who made them, when, and the values before and after."],
  ["Read-only connections", "TallyPrime is read through export only. Each Bridge device has its own credential, which you can revoke."],
  ["Outbound messaging off by default", "Nothing is sent to customers or suppliers until messaging is explicitly enabled for the account."],
  ["Limits on AI agents", "AI agents are blocked from marking payments received, changing amounts or deleting records."],
  ["Account scoping", "Every request is scoped to the signed-in account. One account is one business."],
  ["Passwords and sign-in", "Passwords are hashed with bcrypt. Sign-in is rate-limited."],
  ["Transport and headers", "HTTPS with HTTP Strict Transport Security, standard security headers, and a content security policy on the web app."],
];

export default function SecurityPage() {
  return (
    <PublicShell>
      <article className="sl-wrap" style={{ maxWidth: 880, paddingTop: "clamp(56px, 8vw, 112px)", paddingBottom: "clamp(88px, 10vw, 144px)" }}>
        <span className="sl-eyebrow">Security and control</span>
        <h1 className="sl-h2" style={{ margin: 0, maxWidth: "18ch" }}>The controls Starlane has today.</h1>
        <p className="sl-sub" style={{ marginTop: 22, maxWidth: 620 }}>
          Starlane is built to be checked. This page lists what exists now, in plain words. It does not list plans.
        </p>

        <dl className="sl-facts" style={{ marginTop: 56 }}>
          {CONTROLS.map(([k, v]) => (
            <div key={k} className="sl-fact"><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>

        <section style={{ marginTop: 72 }} aria-labelledby="claims-h">
          <h2 id="claims-h" className="sl-h3" style={{ fontSize: 24, fontWeight: 400, margin: 0 }}>What Starlane does not claim</h2>
          <p className="sl-p" style={{ marginTop: 14, maxWidth: 640 }}>
            Starlane does not hold SOC 2, ISO 27001 or other third-party certifications, and does not claim compliance
            with frameworks it has not been assessed against. It does not yet support multi-user organisations or single
            sign-on. During a pilot we take your team through the controls above and how they are built.
          </p>
        </section>

        <section style={{ marginTop: 56 }} aria-labelledby="report-h">
          <h2 id="report-h" className="sl-h3" style={{ fontSize: 24, fontWeight: 400, margin: 0 }}>Reporting a vulnerability</h2>
          <p className="sl-p" style={{ marginTop: 14, maxWidth: 640 }}>
            Please report it privately before disclosing it, to{" "}
            <a href="mailto:ishantswami13@gmail.com?subject=Security%20disclosure" style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>ishantswami13@gmail.com</a>{" "}
            with the subject “Security disclosure”. There is no bug bounty programme.
          </p>
        </section>

        <p className="sl-p" style={{ marginTop: 56 }}>
          <Link href="/privacy" className="sl-link-arrow">Privacy policy</Link>
        </p>
      </article>
    </PublicShell>
  );
}
