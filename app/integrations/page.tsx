import type { Metadata } from "next";
import "../landing.css";
import "../home.css";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { StarField } from "@/components/marketing/landing/StarField";
import { IntegrationHub } from "@/components/marketing/landing/IntegrationHub";

export const metadata: Metadata = {
  title: "Integrations · Starlane",
  description: "Every system Starlane connects to, by category, with its real status: live today, planned, or built for your pilot.",
};

// The full integrations list, every row shown. Same component and statuses as
// the landing section; the statuses mirror the backend connector registry.
export default function IntegrationsPage() {
  return (
    <div className="sl sl-home">
      <a className="sl-skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main" className="sl-dark slh-intpage">
        <div className="slh-sky" aria-hidden>
          <StarField density={0.6} />
          <div className="slh-planet slh-planet-int" />
          <div className="slh-grain" />
        </div>
        <div className="sl-wrap slh-connect-inner">
          <div className="slh-center-head">
            <p className="sl-eyebrow">Integrations</p>
            <h1 className="slh-display slh-connect-h">Connect to the systems <br className="sl-br" />your business already runs on.</h1>
            <p className="slh-lede">Starlane connects your systems, operational data and outside signals into one continuously updated understanding of your business. Bring your tools, and we’ll handle the rest.</p>
          </div>
          <IntegrationHub />
          <div className="slh-ctas"><Link href="/access" className="sl-btn sl-btn-solid slh-btn-lg">Request a pilot <span aria-hidden>→</span></Link></div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
