import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell } from "@/components/marketing/hx/Shell";
import { Hero, IconCards, Controls, Faq, Cards } from "@/components/marketing/hx/Blocks";
import { CONTROLS } from "@/components/marketing/hx/data";
import { TrustFrameworks } from "@/components/marketing/TrustFrameworks";
import { PublicControls } from "@/components/marketing/PublicControls";

export const metadata: Metadata = pageMetadata({
  path: "/security",
  title: "Security and control",
  description:
    "The controls Starlane has today, stated plainly: read-only connections, an approval queue, actions that run at most once, an append-only audit trail, and what it does not claim.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

// Only controls that exist in the product and backend today. Anything not yet
// achieved (certifications, audits, uptime commitments) is said to be absent,
// not implied.

const PROTECTION: Array<[string, string, string]> = [
  ["eye", "Read-only for your books", "TallyPrime is read through export only. Each desktop bridge device has its own credential, which you can revoke. Nothing in your books is created, changed or deleted."],
  ["check", "A person decides", "Proposed actions wait in an approval queue. Opening an approval link changes nothing; you confirm with a button on the page, and higher-risk action types always need approval."],
  ["stop", "Hard limits", "Starlane is blocked from marking payments received, changing amounts or deleting records, whatever it is asked."],
  ["once", "Runs at most once", "Each approved action is claimed atomically and runs at most once. The message text you approve is the text that is sent."],
  ["log", "Append-only audit trail", "Who decided, when, and the values before and after, in a log that is only ever added to."],
  ["log", "Tamper-evident audit", "Each audit event is chained to the one before it with SHA-256, and the database refuses edits and deletes. Admins can verify the chain and export it for an auditor."],
  ["lock", "Encrypted credentials", "Keys and tokens for connected apps are encrypted with AES-256-GCM before they are stored and are never shown again. Calls to other apps are https only and can never reach private networks."],
  ["check", "Changes to other apps wait for you", "Agents can read from connected apps. Anything that would change data in another app, or call an MCP tool, waits for a person to approve the exact request."],
  ["eye", "Your data, on request", "Any member can download everything stored about them, and an owner can export the whole organization or schedule its deletion."],
  ["key", "Passkeys and two-step sign-in", "Sign in with a passkey on your phone, laptop or security key, or add an authenticator-app code after your password. Organizations can require a second factor for admins or for everyone."],
  ["shield", "Single sign-on", "SAML 2.0 or OpenID Connect with your identity provider, for email domains you prove you own. An organization can make it the only way in."],
  ["stop", "Sessions you can end", "See every device signed in to your account and end any of them, or sign out everywhere. A password change ends every other session, and organizations can set a maximum session length."],
  ["lock", "Scoped and hashed", "Every request is scoped to the signed-in account; one account is one business. Passwords are hashed with bcrypt and sign-in is rate-limited."],
];

const FAQ: Array<[string, string]> = [
  ["Does Starlane change anything in my accounting system?", "No. Accounting connections are read-only. TallyPrime is read through export only, and each bridge device has its own credential, which you can revoke."],
  ["Will Starlane message my customers or suppliers?", "Not unless outbound messaging is enabled for your account, and then only with text a person has approved, sent once."],
  ["Are the figures made up by AI?", "No language model produces the figures. They come from your records, simple calculations and simulations you can inspect, each labelled fact, calculation, assumption or estimate."],
  ["Who can see my data?", "Every request is scoped to your account, and one account is one business."],
  ["How is the site and app protected in transit?", "HTTPS with HTTP Strict Transport Security, standard security headers, and a content security policy on the web app."],
  ["Does Starlane hold SOC 2 or ISO 27001?", "No. Starlane is designed around SOC 2 and ISO/IEC 27001 controls, but it holds no certification and no independent auditor has assessed it. It does not claim compliance with frameworks it has not been assessed against."],
  ["Do you support SSO, MFA and multi-user organisations?", "Yes. Organisations have Owner, Admin, Member and Viewer roles. Single sign-on works with SAML 2.0 and OpenID Connect providers, and people can sign in with passkeys or add an authenticator-app code. Automatic user provisioning (SCIM) is not built yet."],
  ["Is there a bug bounty?", "There is no bug bounty programme. Please report vulnerabilities privately, as described below."],
];

export default function SecurityPage() {
  return (
    <HxShell>
      <JsonLd data={breadcrumb("/security", "Security and control")} />
      <Hero variant="stack" kicker="Security" title="For the Numbers That Run Your Business" lead="Starlane keeps your records safe by reading them, never writing to them, and by leaving every decision to a person." cta={["#claims", "What We Do Not Claim"]} />

      <section id="controls" className="hx-s pt128 pb128" aria-labelledby="prot-h">
        <div className="hx-w">
          <h2 id="prot-h" className="hx-h2 hx-r">Protection in Place Today</h2>
          <IconCards items={PROTECTION} />
        </div>
      </section>

      <section id="flow" className="hx-s ink2 grain pt128 pb128" aria-label="Controls">
        <div className="hx-w">
          <Controls
            title="Controls built in, not bolted on"
            body="Starlane recommends and a person decides. Each proposed action passes a policy check, waits for approval, runs once and is recorded, in that order."
            href="#disclosure" cta="Report a Vulnerability"
            items={CONTROLS}
          />
        </div>
      </section>

      <section id="claims" className="hx-s alt pt128 pb128" aria-label="Questions">
        <div className="hx-w">
          <Faq
            title="Security Is Stated Plainly, Including What Is Absent"
            body="We would rather lose a deal than imply something exists. Starlane does not hold certifications, has not had an independent penetration test and has no bug bounty programme. Every control listed on this page is in the product today."
            href="/privacy" cta="Read the Privacy Policy"
            items={FAQ}
          />
        </div>
      </section>

      <section id="security-controls" className="hx-s alt pt128 pb128" aria-labelledby="sc-h">
        <div className="hx-w">
          <h2 id="sc-h" className="hx-h2 hx-r" style={{ marginBottom: "calc(32px * var(--s))" }}>Designed Around SOC 2 and ISO 27001 Controls</h2>
          <PublicControls />
        </div>
      </section>

      <section id="frameworks" className="hx-s pt128 pb128" aria-labelledby="fw-h">
        <div className="hx-w">
          <h2 id="fw-h" className="hx-h2 hx-r">Certifications and Frameworks</h2>
          <TrustFrameworks />
        </div>
      </section>

      <section id="disclosure" className="hx-s pt128 pb128" aria-labelledby="disc-h">
        <div className="hx-w">
          <div className="hx-2" style={{ marginBottom: "calc(48px * var(--s))" }}>
            <h2 id="disc-h" className="hx-d3 hx-r">Report a Vulnerability</h2>
            <p className="hx-b1 hx-r">Please report it privately before disclosing it. Write to <a href="mailto:ishantswami13@gmail.com?subject=Security%20disclosure" style={{ textDecoration: "underline" }}>ishantswami13@gmail.com</a> with the subject “Security disclosure”. <Link href="/privacy" className="hx-arrow">Privacy policy <i>→</i></Link></p>
          </div>
          <Cards items={[
            { href: "/company", title: "Software that shows its work: the five rules Starlane is built on", meta: "Company", tone: "night", art: "Five rules the product is built on", tag: "Principles" },
            { href: "/platform/decisions", title: "Four kinds of figure: fact, calculation, assumption and estimate", meta: "Platform", tone: "moss", art: "Every figure shows its working", tag: "Decisions" },
          ]} />
        </div>
      </section>
    </HxShell>
  );
}
