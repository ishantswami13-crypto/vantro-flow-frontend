"use client";
import { useEffect, useRef, useState } from "react";

// Landing visual for Scan (the assistant): a question, the tool it looks up, an
// answer built from records — then a request to change something, and the
// assistant declining, because it cannot change records (server-enforced,
// lib/ai/assistantTools.js). Fictional demo company; labelled as such.
//
// Motion follows perception, not decoration:
//  - typing at ~26 chars/s reads as a person, not a paste;
//  - the "thinking" dots appear only after 300 ms (below that, a pause feels
//    instant and an indicator is noise), and the lookup chip names the actual
//    tool, so waiting has a visible cause;
//  - rows arrive 70 ms apart and bars grow from the baseline over 600 ms with
//    ease-out: the eye reads rank before value (pre-attentive length);
//  - figures count up over the same 600 ms in tabular numerals, inside a box
//    sized for the final string, so Indian-grouping commas never shift;
//  - pause on hover/focus and an explicit control (WCAG 2.2.2); with
//    prefers-reduced-motion the finished conversation is shown, still.

const Q1 = "Who owes me the most right now?";
const Q2 = "Mark Mehta Hardware's invoice as paid";
const ROWS = [
  { name: "Mehta Hardware", amount: 128500, days: 45 },
  { name: "Kapoor & Co", amount: 64000, days: 12 },
  { name: "Sharma Traders", amount: 25000, days: 9 },
];
const TOTAL = ROWS.reduce((a, r) => a + r.amount, 0);
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

type Phase = "q1" | "think1" | "a1" | "q2" | "think2" | "a2";
const TYPE_MS = 38;

function CountUp({ to, run, ms = 600 }: { to: number; run: boolean; ms?: number }) {
  const [v, setV] = useState(run ? 0 : to);
  useEffect(() => {
    if (!run) { setV(to); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, run, ms]);
  // Reserve the final width so growing digits and commas never nudge the layout.
  return <span className="sl-ask-fig" style={{ minWidth: `${inr(to).length}ch` }}>{inr(v)}</span>;
}

function Dots() {
  return <span className="sl-ask-dots" aria-label="Starlane is looking this up"><i /><i /><i /></span>;
}

export function AskDemo() {
  const [phase, setPhase] = useState<Phase>("q1");
  const [typed, setTyped] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [showChip, setShowChip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply(); mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = !reduced && !paused && inView;
  useEffect(() => {
    if (!running) return;
    const q = phase === "q1" ? Q1 : phase === "q2" ? Q2 : null;
    let t: ReturnType<typeof setTimeout>;
    if (q) {
      t = typed < q.length ? setTimeout(() => setTyped(typed + 1), TYPE_MS) : setTimeout(() => { setPhase(phase === "q1" ? "think1" : "think2"); setShowChip(false); }, 420);
    } else if (phase === "think1") {
      t = setTimeout(() => setShowChip(true), 300);
      const u = setTimeout(() => setPhase("a1"), 1500);
      return () => { clearTimeout(t); clearTimeout(u); };
    } else if (phase === "think2") t = setTimeout(() => setPhase("a2"), 900);
    else if (phase === "a1") t = setTimeout(() => { setTyped(0); setPhase("q2"); }, 3400);
    else t = setTimeout(() => { setTyped(0); setPhase("q1"); }, 5200);
    return () => clearTimeout(t!);
  }, [running, phase, typed]);

  const order: Phase[] = ["q1", "think1", "a1", "q2", "think2", "a2"];
  const at = reduced ? order.length - 1 : order.indexOf(phase);
  const q1Text = at > 0 ? Q1 : Q1.slice(0, typed);
  const q2Text = at > 3 ? Q2 : Q2.slice(0, typed);
  const animate = !reduced;

  return (
    <div ref={ref} className="sl-ask" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="sl-trace-bar">
        <span className="sl-trace-title">Scan</span>
        <span className="sl-ask-badge">Read-only</span>
        <span style={{ flex: 1 }} />
        {!reduced ? (
          <button type="button" className="sl-trace-ctl" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? "Play" : "Pause"}
          </button>
        ) : null}
      </div>
      <div className="sl-ask-log" aria-live="polite">
        <p className="sl-ask-q">{q1Text}{phase === "q1" && animate ? <span className="sl-ask-caret" /> : null}</p>

        {at === 1 ? (
          <div className="sl-ask-thinking">
            <Dots />
            {showChip ? <span className="sl-ask-chip sl-ask-in">Looked up overdue invoices · 3 open</span> : null}
          </div>
        ) : null}

        {at >= 2 ? (
          <div className="sl-ask-a sl-ask-in">
            <p className="sl-ask-sentence">Mehta Hardware owes the most — <CountUp to={128500} run={animate && at === 2} />, 45 days overdue. Together these three owe <CountUp to={TOTAL} run={animate && at === 2} />.</p>
            <ol className="sl-ask-rows">
              {ROWS.map((r, i) => (
                <li key={r.name} className="sl-ask-row" style={{ animationDelay: animate && at === 2 ? `${120 + i * 70}ms` : "0ms" }}>
                  <span className="sl-ask-name">{r.name}</span>
                  <span className="sl-ask-bar"><span style={{ transform: `scaleX(${r.amount / ROWS[0].amount})`, animationDelay: animate && at === 2 ? `${160 + i * 70}ms` : "0ms" }} className={animate && at === 2 ? "grow" : "full"} /></span>
                  <CountUp to={r.amount} run={animate && at === 2} />
                  <span className="sl-ask-days">{r.days}d</span>
                </li>
              ))}
            </ol>
            <p className="sl-ask-source">Worked out from 3 open invoices in the books</p>
          </div>
        ) : null}

        {at >= 3 ? <p className="sl-ask-q">{q2Text}{phase === "q2" && animate ? <span className="sl-ask-caret" /> : null}</p> : null}
        {at === 4 ? <div className="sl-ask-thinking"><Dots /></div> : null}
        {at >= 5 ? (
          <div className="sl-ask-a sl-ask-in">
            <p className="sl-ask-sentence">I can’t change your records. Mark it paid in Collections, where the change is recorded in the audit trail.</p>
          </div>
        ) : null}
      </div>
      <p className="sl-trace-caption">Fictional demo company. Answers come only from your own records; when they can’t, Starlane says so.</p>
    </div>
  );
}
