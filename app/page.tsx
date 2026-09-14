"use client";
import "./landing.css";
import Link from "next/link";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Footer";
import { ProductReveal } from "@/components/marketing/ProductReveal";
import { CategoryStatement } from "@/components/marketing/CategoryStatement";
import { IntelligenceStory } from "@/components/marketing/IntelligenceStory";
import { PastPresentFuture } from "@/components/marketing/PastPresentFuture";
import { WorldAndBusiness } from "@/components/marketing/WorldAndBusiness";
import { Evidence } from "@/components/marketing/Evidence";
import { SystemFlow } from "@/components/marketing/SystemFlow";
import { Capabilities } from "@/components/marketing/Capabilities";
import { OutcomeMeasurement } from "@/components/marketing/OutcomeMeasurement";
import { ResearchBlock } from "@/components/marketing/ResearchBlock";
import { FinalCTA } from "@/components/marketing/FinalCTA";

export default function LandingPage() {

  return (
    <div className="sl">
      <a className="sl-skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">

      {/* ── Section 02: Hero ─────────────────────────────────── */}
      <header className="sl-wrap sl-hero">
        <h1 className="sl-h1 sl-rv in" style={{ maxWidth: 760 }}>Know what happens next.</h1>
        <p className="sl-sub sl-rv in" style={{ maxWidth: 540, marginTop: 28 }}>
          Starlane understands your business, connects it to the world around it, and surfaces what needs your
          attention before it becomes obvious.
        </p>
        <div className="sl-rv in" style={{ marginTop: 36, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/signup" className="sl-btn sl-btn-solid" >Request access</Link>
          <a href="#product" className="sl-link-arrow">See Intelligence →</a>
        </div>
      </header>

      <ProductReveal />

      <CategoryStatement />

      <div id="story">
        <IntelligenceStory />
      </div>
      <PastPresentFuture />
      <WorldAndBusiness />
      <Evidence />
      <SystemFlow />
      <Capabilities />
      <OutcomeMeasurement />
      <ResearchBlock />

      <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
