import Link from "next/link";
import StarlaneMark from "@/components/brand/StarlaneMark";

// Public footer. tone="dark" continues a dark closing section into the footer.
const COLS: Array<{ h: string; links: Array<[string, string]> }> = [
  { h: "Product", links: [["/platform", "Overview"], ["/platform#connect", "Connect"], ["/platform#watch", "Watch"], ["/platform#decide", "Decide"], ["/platform#verify", "Verify"], ["/product", "Product guide"]] },
  { h: "Platform", links: [["/integrations", "Integrations"], ["/security", "Security and control"], ["/pricing", "Pricing and pilots"]] },
  { h: "Company", links: [["/company", "About Starlane"], ["/access", "Request a pilot"], ["/login", "Sign in"]] },
  { h: "Legal", links: [["/terms", "Terms"], ["/privacy", "Privacy"], ["/security#disclosure", "Report a vulnerability"]] },
];

export function Footer({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <footer className={`sl-foot${tone === "dark" ? " sl-foot-dark" : ""}`}>
      <div className="sl-wrap" style={{ paddingTop: 64, paddingBottom: 32 }}>
      <div className="sl-footer-grid sl-footer-grid-5">
        <div>
          <span className="sl-wordmark" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><StarlaneMark size={22} />Starlane</span>
          <p className="sl-p" style={{ marginTop: 14, maxWidth: 280 }}>The intelligence layer for your business.</p>
        </div>
        {COLS.map((c) => (
          <div key={c.h} className="sl-footer-col">
            <h3>{c.h}</h3>
            {c.links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </div>
        ))}
      </div>
      <div style={{ paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontSize: 12.5, color: "var(--sl-ink-faint)" }}>© {new Date().getFullYear()} Vantro Technologies</span>
        <span style={{ fontSize: 12.5, color: "var(--sl-ink-faint)" }}>Product figures on this site are illustrative, on a fictional company.</span>
      </div>
      </div>
    </footer>
  );
}
