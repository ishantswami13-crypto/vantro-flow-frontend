import type { Metadata, Viewport } from "next";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import "../landing.css";
import "../start.css";
import "../site.css";
import Link from "next/link";
import { SiteShell, PageHero, Index, CloseBand } from "@/components/marketing/site/Site";
import { Glyph } from "@/components/marketing/home/Glyph";
import { InView } from "@/components/marketing/home/InView";

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

const FLOW = [
  { g: "decision", k: "Proposed", b: "Starlane proposes an action, with its evidence and options." },
  { g: "scope", k: "Policy check", b: "Blocked outright if it would mark a payment received, change an amount or delete a record." },
  { g: "gate", k: "Waits for a person", b: "Opening an approval link changes nothing. You confirm with a button on the page." },
  { g: "once", k: "Runs once", b: "The approved action is claimed atomically. The text you approved is the text sent." },
  { g: "audit", k: "Recorded", b: "Who decided, when, and the values before and after, in an append-only log." },
];

const GROUPS: Array<{ k: string; items: Array<[string, string, string]> }> = [
  { k: "Decisions", items: [
    ["gate", "Approval queue", "Proposed actions wait for a person, and higher-risk action types always require approval."],
    ["once", "Runs at most once", "Each approved action is claimed atomically and runs at most once. The message text you approve is the text that is sent."],
    ["scope", "Hard limits", "Starlane is blocked from marking payments received, changing amounts or deleting records, whatever it is asked."],
    ["audit", "Audit trail", "Decisions are logged with who made them, when, and the values before and after."],
  ] },
  { k: "Data", items: [
    ["readonly", "Read-only connections", "TallyPrime is read through export only. Each Bridge device has its own credential, which you can revoke."],
    ["evidence", "Evidence on every figure", "Figures are labelled as fact, calculated, assumption or estimate, with the records they came from. Simulations show a low to high range and the assumptions behind it."],
    ["system", "Account scoping", "Every request is scoped to the signed-in account. One account is one business."],
  ] },
  { k: "Access and transport", items: [
    ["signal", "Outbound messaging off by default", "Nothing is sent to customers or suppliers until messaging is explicitly enabled for the account."],
    ["verified", "Passwords and sign-in", "Passwords are hashed with bcrypt. Sign-in is rate-limited."],
    ["external", "Transport and headers", "HTTPS with HTTP Strict Transport Security, standard security headers, and a content security policy on the web app."],
  ] },
];

const ABSENT = [
  ["Certifications", "Starlane does not hold SOC 2, ISO 27001 or other third-party certifications, and does not claim compliance with frameworks it has not been assessed against."],
  ["Organisations and SSO", "Multi-user organisations and single sign-on are not supported yet."],
  ["Bug bounty", "There is no bug bounty programme."],
];

export default function SecurityPage() {
  return (
    <SiteShell>
      <JsonLd data={breadcrumb("/security", "Security and control")} />
      <PageHero
        kicker="Security and control"
        title={<>Built to be <em>checked.</em></>}
        lead="This page lists the controls that exist in Starlane today, in plain words. It does not list plans. During a pilot we take your team through each one and how it is built."
        index={[["#flow", "How an action moves"], ["#controls", "Controls"], ["#claims", "What we do not claim"], ["#disclosure", "Report a vulnerability"]]}
      />

      <section id="flow" className="f f-dark f-room" aria-labelledby="s1-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="01" k="How an action moves" />
              <h2 id="s1-h" className="f-h2">Starlane recommends. People decide.</h2>
            </div>
            <p className="f-body">Every action Starlane proposes takes the same path, and none of it can be skipped. Outbound messaging stays off until it is enabled for the account.</p>
          </div>
          <InView as="ol" className="sf">
            {FLOW.map((s, i) => (
              <li key={s.k} style={{ "--n": i } as React.CSSProperties}>
                <span className="sf-node"><Glyph name={s.g} size={18} /></span>
                <span className="sf-n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.k}</h3>
                <p>{s.b}</p>
              </li>
            ))}
          </InView>
        </div>
      </section>

      <section id="controls" className="f f-light" aria-labelledby="s2-h">
        <div className="f-wrap">
          <div className="f-head f-head-split">
            <div>
              <Index n="02" k="Controls" />
              <h2 id="s2-h" className="f-h2">Ten controls, in place today.</h2>
            </div>
            <p className="f-body">Each is confirmed against the product’s code. Where a control depends on a setting, the default is stated.</p>
          </div>
          {GROUPS.map((g) => (
            <div key={g.k} className="sg">
              <h3 className="sg-k">{g.k}</h3>
              <ul className="pz-list">
                {g.items.map(([gl, k, v]) => (
                  <li key={k}><h4 className="pz-h"><Glyph name={gl} size={18} />{k}</h4><p>{v}</p></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="claims" className="f f-slab" aria-labelledby="s3-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="03" k="What we do not claim" />
            <h2 id="s3-h" className="f-h2">What is absent, said plainly.</h2>
            <p className="f-body">A security page is only useful if you can trust what it leaves out.</p>
          </div>
          <div className="f-main">
            <ul className="pz-list">
              {ABSENT.map(([k, v]) => <li key={k}><h3 className="pz-h">{k}</h3><p>{v}</p></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section id="disclosure" className="f f-light" aria-labelledby="s4-h">
        <div className="f-wrap f-grid">
          <div className="f-side">
            <Index n="04" k="Disclosure" />
            <h2 id="s4-h" className="f-h2">Report a vulnerability.</h2>
          </div>
          <div className="f-main">
            <p className="f-lede" style={{ maxWidth: "34ch", marginTop: 0 }}>Please report it privately before disclosing it.</p>
            <p className="f-body">
              Write to{" "}
              <a href="mailto:ishantswami13@gmail.com?subject=Security%20disclosure" className="f-inline">ishantswami13@gmail.com</a>{" "}
              with the subject “Security disclosure”.
            </p>
            <p className="f-after"><Link href="/privacy" className="f-link">Privacy policy<span aria-hidden>→</span></Link></p>
          </div>
        </div>
      </section>

      <CloseBand title="Walk your team through the controls." secondary={["/platform", "See the product"]} />
    </SiteShell>
  );
}
