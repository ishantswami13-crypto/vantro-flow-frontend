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
  ["Approval before action", "Actions wait for a person. Opening an approval link never approves anything; you confirm on the page."],
  ["Runs at most once", "What you approve is frozen when it is proposed. Each approved action is claimed once and runs once."],
  ["Evidence", "Every recommendation shows the records, rule and assumptions behind it. Observed, calculated, assumed and simulated figures are labelled apart."],
  ["Audit trail", "Decisions are recorded with who made them, when, what was proposed and what followed."],
  ["Read-only connections", "Starlane reads your systems. Each Bridge device has its own credentials, which you can revoke."],
  ["External messages off by default", "Nothing is sent to a customer or supplier until messaging is explicitly enabled, and then only after approval."],
  ["No silent changes to records", "Starlane never marks a payment received, changes an amount or deletes a record on its own."],
  ["Scoped to your company", "Every request is tied to the signed-in account, and data is read only within that company’s scope."],
  ["Passwords", "Never stored in plain text. Hashed with bcrypt."],
  ["Transport", "HTTPS only, with HTTP Strict Transport Security on the web app and the API."],
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
            with frameworks it has not been assessed against. During a pilot we take your team through the controls above
            and how they are built.
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
