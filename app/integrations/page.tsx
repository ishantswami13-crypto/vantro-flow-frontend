import type { Metadata } from "next";
import "../landing.css";
import "../home.css";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { IntegrationHub } from "@/components/marketing/landing/IntegrationHub";

export const metadata: Metadata = {
  title: "Integrations · Starlane",
  description: "Every system Starlane connects to, by category, with its real status: live today, planned, or built for your pilot.",
};

// The full integrations catalogue. The homepage summary reads the same list;
// statuses mirror the backend connector registry.
export default function IntegrationsPage() {
  return (
    <div className="sl sl-home">
      <a className="sl-skip" href="#main">Skip to content</a>
      <Nav tone="dark" />
      <main id="main">
        <header className="sx-dark sx-int-hero">
          <div className="sx-planet" aria-hidden />
          <div className="sl-wrap">
            <p className="sx-eyebrow">Integrations</p>
            <h1 className="sx-display">Connect the systems your business already runs on.</h1>
            <p className="sx-lede">
              Each connection carries its real status. Live works in the product today. Planned is on the roadmap.
              Custom is built for your pilot on Starlane’s connector framework.
            </p>
          </div>
        </header>
        <section className="sx-ivory sx-int-body" aria-label="All integrations">
          <div className="sl-wrap">
            <IntegrationHub />
            <div className="sx-int-cta">
              <p>Not on the list? If it has an API, a database or an export, it can be built for your pilot.</p>
              <Link href="/access" className="sl-btn sl-btn-solid sx-btn">Request a pilot</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
