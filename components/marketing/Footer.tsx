import Link from "next/link";
import StarlaneWordmark from "@/components/brand/StarlaneWordmark";

// Public footer. tone="dark" continues a dark closing section into the footer.
// It ends on the wordmark at full measure, cut by the page edge: the last thing
// a visitor sees is the name.
const COLS: Array<{ h: string; links: Array<[string, string]> }> = [
  { h: "Product", links: [["/platform", "Overview"], ["/platform#connect", "Connect"], ["/platform#watch", "Watch"], ["/platform#decide", "Decide"], ["/platform#verify", "Verify"], ["/product", "Product guide"]] },
  { h: "Platform", links: [["/integrations", "Integrations"], ["/security", "Security and control"], ["/pricing", "Pricing and pilots"]] },
  { h: "Company", links: [["/company", "About Starlane"], ["/access", "Request a pilot"], ["/login", "Sign in"]] },
  { h: "Legal", links: [["/terms", "Terms"], ["/privacy", "Privacy"], ["/security#disclosure", "Report a vulnerability"]] },
];

export function Footer({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <footer className={`sl-foot${tone === "dark" ? " sl-foot-dark" : ""}`}>
      <div className="sl-wrap" style={{ paddingTop: 72, paddingBottom: 28 }}>
        <div className="sl-footer-grid sl-footer-grid-5">
          <div>
            <Link href="/" aria-label="Starlane home" className="sl-wordmark sl-wordmark-lockup"><StarlaneWordmark height={20} title={null} /></Link>
            <p className="sl-p" style={{ marginTop: 18, maxWidth: 280 }}>Know what changed in your business, with the evidence, before it costs you.</p>
          </div>
          {COLS.map((c) => (
            <div key={c.h} className="sl-footer-col">
              <h2>{c.h}</h2>
              {c.links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
            </div>
          ))}
        </div>
        <div className="sl-foot-legal">
          <span>© {new Date().getFullYear()} Vantro Technologies</span>
          <span>Product figures on this site are illustrative, on a fictional company.</span>
        </div>
      </div>
      <div className="sl-foot-sign" aria-hidden>
        <div className="sl-wrap"><StarlaneWordmark fluid title={null} className="sl-foot-sign-mark" /></div>
      </div>
    </footer>
  );
}
