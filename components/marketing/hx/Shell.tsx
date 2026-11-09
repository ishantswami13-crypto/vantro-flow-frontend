import Link from "next/link";
import { preload } from "react-dom";
import { TopBar } from "@/components/marketing/site/TopBar";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { Texture, type TextureTone } from "@/components/marketing/home2/Texture";
import { HxMotion } from "./Interactive";
import "@/app/topbar.css";
import "@/app/hx.css";

// The public site's frame: the top bar, the page, then the closing call and
// footer every page ends on.

const FONTS = ["newsreader-normal-latin", "hanken-grotesk-normal-latin"];

export const FOOT: Array<{ h: string; links: Array<[string, string]> }> = [
  { h: "Platform", links: [["/platform", "Overview"], ["/platform/agents", "Agents"], ["/platform/command-center", "Command Center"], ["/platform/decisions", "Decisions"], ["/platform/vault", "Vault"], ["/platform/memory", "Memory"], ["/platform/connectors", "Connectors"], ["/download", "Desktop bridge"]] },
  { h: "Solutions", links: [["/solutions/finance-teams", "Finance Teams"], ["/solutions/owners", "Owners & Founders"], ["/solutions/collections", "Collections"], ["/solutions/global-trade", "Exporters & Global Trade"], ["/solutions/distribution", "Distribution & Wholesale"], ["/solutions/manufacturing", "Manufacturing"]] },
  { h: "Company", links: [["/pilots", "Customers"], ["/security", "Security"], ["/company", "About"], ["/pricing", "Pricing & Pilots"], ["/access", "Request a Demo"]] },
  { h: "Resources", links: [["/resources", "Resources Hub"], ["/product", "Product Guide"], ["/integrations", "Integrations"], ["/legal", "Legal"], ["/privacy", "Privacy Policy"], ["/terms", "Terms"]] },
  { h: "Account", links: [["/login", "Sign in"], ["/signup", "Create account"], ["/download", "Download"]] },
];

export function HxFooter({ cta = "Put agents to work on your finance operations" }: { cta?: string }) {
  return (
    <footer className="hx-foot">
      <div className="hx-w">
        <div className="hx-foot-cta">
          <p>{cta}</p>
          <Link href="/access" className="hx-btn light">Request a Demo</Link>
        </div>
        <div className="hx-foot-g">
          <div className="hx-foot-mark">
            <Link href="/" aria-label="Starlane home"><StarlaneMark variant="glyph" size={38} /></Link>
            <p>© {new Date().getFullYear()} Starlane. All rights reserved.</p>
          </div>
          {FOOT.map((c) => (
            <nav key={c.h} className="hx-foot-col" aria-label={c.h}>
              <h2>{c.h}</h2>
              {c.links.map(([href, label]) => <Link key={href + label} href={href}>{label}</Link>)}
            </nav>
          ))}
        </div>
        <div className="hx-foot-legal">
          <span>Product views on this site show sample data on a fictional business.</span>
        </div>
      </div>
    </footer>
  );
}

export function HxShell({ children, cta }: { children: React.ReactNode; cta?: string }) {
  for (const f of FONTS) preload(`/fonts/${f}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <div className="hx">
      <HxMotion />
      <a className="hx-skip" href="#main">Skip to content</a>
      <TopBar />
      <main id="main">{children}</main>
      <HxFooter cta={cta} />
    </div>
  );
}

/** A painted, grainy background for a panel or card. */
export function Paint({ id, tone = "moss", seed = 3 }: { id: string; tone?: TextureTone; seed?: number }) {
  return <Texture id={id} tone={tone} seed={seed} />;
}
