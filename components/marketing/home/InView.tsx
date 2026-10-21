"use client";
import { useEffect, useRef } from "react";

// Adds .is-in once the element is 25% visible, so CSS can play a one-time
// reveal. Content is fully visible without JavaScript and under reduced
// motion; the page opts into hiding only after this runs (data-motion="on").
export function InView({ as: Tag = "div", className = "", children, ...rest }: { as?: keyof React.JSX.IntrinsicElements; className?: string; children: React.ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { el.classList.add("is-in"); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { el.classList.add("is-in"); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Any = Tag as unknown as React.ElementType;
  return <Any ref={ref} className={`iv ${className}`} {...rest}>{children}</Any>;
}

// Marks the page as motion-capable once hydrated, so reveals only hide
// content when they can also show it again.
export function MotionGate() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.querySelector(".sl-start")?.setAttribute("data-motion", "on");
  }, []);
  return null;
}
