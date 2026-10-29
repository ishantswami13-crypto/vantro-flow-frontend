import Link from "next/link";
import { preload } from "react-dom";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { MotionGate } from "@/components/marketing/home/InView";

// The public site's frame and its shared pieces. Every marketing page uses the
// same "Operating Record" surfaces (start.css + site.css): light editorial
// sections carry the argument, dark rooms carry the product.

// The faces above the fold: the display serif (roman and italic) and the UI sans.
// Preloaded so the hero renders in its own type on first paint.
const FONTS = ["newsreader-normal-latin", "newsreader-italic-latin", "plus-jakarta-sans-normal-latin"];

export function SiteShell({ children }: { children: React.ReactNode }) {
  for (const f of FONTS) preload(`/fonts/${f}.woff2`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <div className="sl sl-start">
      <MotionGate />
      <a className="sl-skip" href="#main">Skip to content</a>
      <Nav tone="dark" />
      <main id="main">{children}</main>
      <Footer tone="dark" />
    </div>
  );
}

export function Index({ n, k }: { n?: string; k: string }) {
  return <p className="f-index">{n && <span>{n}</span>}{k}</p>;
}

// Opening frame for an inner page: one sentence, one supporting paragraph,
// and, where it helps, an index of the page's sections.
export function PageHero({ kicker, title, lead, children, index, visual }: {
  kicker: string; title: React.ReactNode; lead: React.ReactNode; children?: React.ReactNode;
  index?: Array<[string, string]>; visual?: React.ReactNode;
}) {
  return (
    <header className="f f-dark ph">
      <div className="f-wrap">
        <Index k={kicker} />
        <div className="ph-grid">
          <h1 className="f-display ph-h">{title}</h1>
          <div className="ph-side">
            <p className="f-lead ph-lead">{lead}</p>
            {children}
          </div>
        </div>
        {visual && <div className="ph-visual">{visual}</div>}
        {index && (
          <nav className="ph-index" aria-label="On this page">
            <ol>
              {index.map(([href, label], i) => (
                <li key={href}><a href={href}><span>{String(i + 1).padStart(2, "0")}</span>{label}</a></li>
              ))}
            </ol>
          </nav>
        )}
      </div>
    </header>
  );
}

// The closing call, shared by every page so the next step is always the same.
export function CloseBand({ title = "See it on your own business.", secondary = ["/platform", "See the product"] }: { title?: string; secondary?: [string, string] }) {
  return (
    <section className="f f-dark f-close cb" aria-labelledby="cb-h">
      <div className="f-close-bg" aria-hidden />
      <div className="f-wrap">
        <div className="f-close-copy">
          <h2 id="cb-h" className="f-display f-display-close">{title}</h2>
          <div className="f-actions">
            <Link href="/access" className="sl-btn sl-btn-solid sl-btn-lg">Request a pilot</Link>
            <Link href={secondary[0]} className="f-link">{secondary[1]}<span aria-hidden>→</span></Link>
          </div>
          <p className="cb-note">Read-only connections · Nothing is sent without approval · Private pilots</p>
        </div>
      </div>
    </section>
  );
}
