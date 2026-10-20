"use client";
import { useEffect } from "react";

// Scroll reveal for the landing page. Everything marked data-reveal is fully
// visible without JavaScript; only once this runs does the page opt in (the
// "sl-js" class) to fading each block up as it enters the viewport. Skipped
// entirely with prefers-reduced-motion. Also drives the pointer spotlight on
// the landing cards.
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
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    // Anything already on screen is shown at once, so the first paint never blanks.
    for (const el of els) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.setAttribute("data-in", "");
      else io.observe(el);
    }
    root.classList.add("sl-js");
    // Cards light up under the pointer.
    const spot = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest<HTMLElement>(".slh-b-link, .slh-c, .slh-control");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    root.addEventListener("pointermove", spot, { passive: true });
    return () => { io.disconnect(); root.removeEventListener("pointermove", spot); };
  }, []);
  return null;
}
