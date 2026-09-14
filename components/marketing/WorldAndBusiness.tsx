"use client";
import { useEffect, useRef, useState } from "react";

const WORLD = ["Events & geography", "Trade & logistics", "Markets & FX", "Supplier conditions"];
const BUSINESS = ["Orders & inventory", "Customers & cash", "Suppliers", "Operations"];

export function WorldAndBusiness() {
  const diagram = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const el = diagram.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setConnected(true); observer.disconnect(); }
    }, { threshold: 0.45 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <section id="world-business" className="sl-section">
      <div className="sl-wrap">
        <span className="sl-eyebrow">World ↔ Business</span>
        <h2 className="sl-h2" style={{ maxWidth: 640, marginBottom: 48 }}>Your business, in context.</h2>
        <div ref={diagram} className={"sl-converge" + (connected ? " is-connected" : "")}>
          <div className="sl-converge-col">
            <h3 className="sl-story-kicker">World signals</h3>
            <ul>{WORLD.map(w => <li key={w} className="sl-converge-item">{w}</li>)}</ul>
          </div>
          <div className="sl-converge-link sl-converge-link-left" aria-hidden="true" />
          <div className="sl-converge-core"><span>Starlane<br />Intelligence</span></div>
          <div className="sl-converge-link sl-converge-link-right" aria-hidden="true" />
          <div className="sl-converge-col right">
            <h3 className="sl-story-kicker">Business state</h3>
            <ul>{BUSINESS.map(b => <li key={b} className="sl-converge-item">{b}</li>)}</ul>
          </div>
          <p className="sl-converge-result">Connected context. Decisions with evidence.</p>
        </div>
      </div>
    </section>
  );
}
