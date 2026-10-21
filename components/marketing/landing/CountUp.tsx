"use client";
import { useEffect, useRef, useState } from "react";

// A big number that counts up once when it scrolls into view. The final value
// is server-rendered, so it reads correctly without JavaScript, for screen
// readers, and under prefers-reduced-motion.
export function CountUp({ to, suffix = "", ms = 1400 }: { to: number; suffix?: string; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || to === 0 || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setV(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / ms);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, ms]);

  return (
    <span ref={ref}>
      <span aria-hidden>{v}{suffix}</span>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{to}{suffix}</span>
    </span>
  );
}
