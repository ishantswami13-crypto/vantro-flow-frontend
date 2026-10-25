import type { Metadata } from "next";
import "../landing.css";
import "../home.css";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { IntegrationHub } from "@/components/marketing/landing/IntegrationHub";
import { CATEGORIES } from "@/components/marketing/landing/integrationsData";

const count = (state: string) => CATEGORIES.reduce((n, c) => n + c.items.filter((i) => i.s === state).length, 0);

export const metadata: Metadata = {
  title: "Integrations · Starlane",
  description: "Every system Starlane connects to, by category, with how it connects and its real status: live today, planned, or built for your pilot.",
};

// The full integrations catalogue, as reference documentation. The homepage
// summary reads the same list; statuses mirror the backend connector registry.
export default function IntegrationsPage() {
  return (
    <div className="sl sl-home">
      <a className="sl-skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        <header className="st-page-head">
          <div className="st-wrap st-grid">
            <div className="st-col-wide">
              <p className="st-meta">Integrations · {count("live")} live · {count("planned")} planned · {count("custom")} custom</p>
              <h1 className="st-h1">Works with the systems your business already runs on.</h1>
              <p className="st-lead">
                Each entry shows how it connects and its real status. Live works in the product today. Planned is on the
                roadmap. Custom is built for your pilot on Starlane’s connector framework.
              </p>
            </div>
          </div>
        </header>
        <section className="st-section st-section-tight" aria-label="All integrations">
          <div className="st-wrap">
            <IntegrationHub />
          </div>
        </section>
        <section className="st-section st-stone st-section-tight" aria-labelledby="custom-h">
          <div className="st-wrap st-grid">
            <div className="st-col-head">
              <h2 id="custom-h" className="st-h3">Not listed?</h2>
            </div>
            <div className="st-col-body st-inline-cta">
              <p className="st-body">If a system has an API, a database or an export, it can be connected for your pilot on the connector framework.</p>
              <Link href="/access" className="sl-btn sl-btn-solid st-btn">Request a pilot</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
