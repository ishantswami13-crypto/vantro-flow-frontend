"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// Real screens, not drawings: captures of the Starlane app from its golden-flow
// run (docs/client-platform/desktop) on a test company's books. Tabs on the
// left, the screen on the right; it advances on its own while in view and
// stops for good once someone picks a tab, on hover, and under reduced motion.

const STEPS = [
  { k: "watch", t: "Watch raises it", d: "Invoices slipping into a worse overdue band, raised once, with the amount and age.", alt: "Watch in the Starlane app: invoices that slipped past 30 days and a week overdue, each with amount outstanding and days past due." },
  { k: "scan", t: "Scan shows why", d: "Every figure behind the alert, each labelled fact or calculated, and the next step it suggests.", alt: "Scan on Mehta Hardware: 45 days overdue on ₹1,28,500, with each figure labelled fact or calculated and a suggested next step." },
  { k: "missions", t: "A mission sets the goal", d: "Collect ₹1,00,000 in 14 days, with progress measured from your books and blockers in plain words.", alt: "A collections mission for Mehta Hardware: ₹1,00,000 to collect in 14 days, progress from the books, one action waiting for approval." },
  { k: "simulate", t: "Simulate shows the range", d: "Likely collections over the next 30 days, with every assumption visible and yours to change.", alt: "Simulate: expected collections in 30 days with a range, overdue bands, and adjustable assumptions for each band." },
  { k: "approve", t: "You approve the words", d: "The exact reminder, in the language you use with the customer, waits for Approve or Decline.", alt: "A firm reminder to Mehta Hardware in Hinglish, shown in full with why Starlane suggests it, and Approve and Decline buttons." },
  { k: "memory", t: "Memory learns, openly", d: "How each customer really pays, where that came from, and buttons to confirm, correct or forget it.", alt: "Memory: Mehta Hardware usually pays about 8 days after the due date, worked out from three paid invoices, with confirm, correct and forget." },
];

export function ProductTour() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAuto(false); return; }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || hover || !inView) return;
    const t = setTimeout(() => setI((n) => (n + 1) % STEPS.length), 5200);
    return () => clearTimeout(t);
  }, [i, auto, hover, inView]);

  return (
    <div ref={ref} className="slt" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="slt-tabs" role="tablist" aria-label="Starlane screens">
        {STEPS.map((s, n) => (
          <button key={s.k} role="tab" id={`slt-tab-${s.k}`} aria-selected={n === i} aria-controls="slt-panel"
            className={`slt-tab${n === i ? " on" : ""}`} onClick={() => { setI(n); setAuto(false); }}>
            <span className="slt-n sl-num">{String(n + 1).padStart(2, "0")}</span>
            <span className="slt-t">{s.t}</span>
            <span className="slt-d">{s.d}</span>
            {n === i && auto && <span className={`slt-timer${hover || !inView ? " paused" : ""}`} aria-hidden />}
          </button>
        ))}
      </div>
      <div className="slt-stage" id="slt-panel" role="tabpanel" aria-labelledby={`slt-tab-${STEPS[i].k}`}>
        <div className="slt-window">
          <div className="slh-shot-bar"><span /><span /><span /><em>{STEPS[i].t} · Starlane</em></div>
          <div className="slt-frames">
            {STEPS.map((s, n) => (
              <Image key={s.k} src={`/product/tour/${s.k}.webp`} width={1280} height={820} sizes="(max-width: 860px) 100vw, 760px"
                alt={n === i ? s.alt : ""} aria-hidden={n !== i} className={n === i ? "on" : ""} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
