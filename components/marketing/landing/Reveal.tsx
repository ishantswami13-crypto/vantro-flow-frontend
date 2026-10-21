"use client";
import { useEffect } from "react";

// Scroll reveal for the public pages. Everything marked data-reveal is fully
// visible without JavaScript; only once this runs does the page opt in (the
// "sl-js" class) to a short opacity fade as each block enters the viewport.
// Skipped entirely with prefers-reduced-motion.
export function Reveal() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".sl-home");
    if (!root) return;
    // On narrow screens the business graph scrolls sideways; start it centred.
    root.querySelectorAll<HTMLElement>(".slg").forEach((g) => { g.scrollLeft = (g.scrollWidth - g.clientWidth) / 2; });
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.setAttribute("data-in", ""); io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    // Anything already on screen is shown at once, so the first paint never blanks.
    for (const el of els) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.setAttribute("data-in", "");
      else io.observe(el);
    }
    root.classList.add("sl-js");
    return () => io.disconnect();
  }, []);
  return null;
}
