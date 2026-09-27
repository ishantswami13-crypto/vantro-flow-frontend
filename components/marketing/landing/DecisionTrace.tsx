"use client";
import { useEffect, useRef, useState } from "react";

// Hero visual: one decision, traced end to end the way Starlane records it.
//
// Every figure is computed from the sample day book bundled with the real
// Starlane Tally bridge (tally-connector/sample-daybook.xml): two sales, one
// receipt, one purchase, one payment. The one number that is not in the data
// — days overdue — is shown as what it is: an assumption (30-day terms).
// The evidence block mirrors the structure the collections agent writes to
// ai_actions.reason_json.
//
// Motion explains the system: stages resolve in order, each one built from
// the one before. It pauses on hover/focus, has an explicit pause control
// (WCAG 2.2.2), and under prefers-reduced-motion shows the finished trace.

const STAGES = ["Sources", "State", "Paths", "Evidence", "Approval", "Verification"] as const;
const STEP_MS = 1900;
const HOLD_MS = 5200;

// Indian grouping; paise shown only when present, and then always two digits.
const inr = (n: number) => `₹${n.toLocaleString("en-IN", Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function DecisionTrace() {
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => { setReduced(mq.matches); if (mq.matches) setStage(STAGES.length - 1); };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || paused || !inView) return;
    const last = stage === STAGES.length - 1;
    const t = setTimeout(() => setStage(last ? 0 : stage + 1), last ? HOLD_MS : STEP_MS);
    return () => clearTimeout(t);
  }, [stage, paused, reduced, inView]);

  const on = (i: number) => stage >= i;

  return (
    <div
      ref={ref}
      className="sl-trace"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="sl-trace-bar">
        <span className="sl-trace-title">Decision trace</span>
        <ol className="sl-trace-steps" aria-label="Stages">
          {STAGES.map((s, i) => (
            <li key={s} className={on(i) ? "on" : ""} aria-current={stage === i ? "step" : undefined}>{s}</li>
          ))}
        </ol>
        {!reduced && (
          <button type="button" className="sl-trace-ctl" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play the trace" : "Pause the trace"}>
            {paused ? "Play" : "Pause"}
          </button>
        )}
      </div>

      <div className="sl-trace-grid">
        {/* 1 — Sources */}
        <section className={`sl-trace-cell ${on(0) ? "on" : ""}`} aria-label="Sources">
          <h4>Sources</h4>
          <dl className="sl-kv">
            <div><dt>TallyPrime bridge</dt><dd>5 vouchers</dd></div>
            <div><dt>Sales</dt><dd className="sl-num">2</dd></div>
            <div><dt>Receipts</dt><dd className="sl-num">1</dd></div>
            <div><dt>Purchases</dt><dd className="sl-num">1</dd></div>
            <div><dt>Payments</dt><dd className="sl-num">1</dd></div>
          </dl>
        </section>

        {/* 2 — State */}
        <section className={`sl-trace-cell ${on(1) ? "on" : ""}`} aria-label="State">
          <h4>Current state</h4>
          <dl className="sl-kv">
            <div><dt>Open receivables</dt><dd className="sl-num">{inr(153500.5)}</dd></div>
            <div><dt>Gupta &amp; Sons</dt><dd className="sl-num">{inr(128500.5)}</dd></div>
            <div><dt>Sharma Traders <span className="sl-muted">(after {inr(20000)} received)</span></dt><dd className="sl-num">{inr(25000)}</dd></div>
            <div><dt>Owed to Metro Wholesale</dt><dd className="sl-num">{inr(37000)}</dd></div>
          </dl>
        </section>

        {/* 3 — Paths */}
        <section className={`sl-trace-cell sl-trace-wide ${on(2) ? "on" : ""}`} aria-label="Paths">
          <h4>Options for Gupta &amp; Sons, {inr(128500.5)} open</h4>
          <ol className="sl-paths">
            <li className={on(3) ? "chosen" : ""}><span className="sl-rank">1</span>Firm reminder on WhatsApp<span className="sl-why">20 days overdue sits in the 8–30 day band</span></li>
            <li><span className="sl-rank">2</span>Owner call<span className="sl-why">reserved for 36–89 days</span></li>
            <li className="out"><span className="sl-rank">–</span>Wait for promised date<span className="sl-why">no promise on record</span></li>
          </ol>
        </section>

        {/* 4 — Evidence */}
        <section className={`sl-trace-cell sl-trace-wide ${on(3) ? "on" : ""}`} aria-label="Evidence">
          <h4>Evidence</h4>
          <dl className="sl-kv sl-kv-2col">
            <div><dt><span className="sl-tag">Observed</span> Invoice S/1043</dt><dd className="sl-num">{inr(128500.5)}</dd></div>
            <div><dt><span className="sl-tag">Observed</span> Receipts from party</dt><dd className="sl-num">none</dd></div>
            <div><dt><span className="sl-tag sl-tag-assume">Assumption</span> Payment terms</dt><dd className="sl-num">30 days</dd></div>
            <div><dt><span className="sl-tag">Calculated</span> Days overdue</dt><dd className="sl-num">20</dd></div>
          </dl>
          <p className="sl-trace-rule">Rule applied: <span className="sl-num">collections_stage_by_days_overdue</span></p>
        </section>

        {/* 5 — Approval */}
        <section className={`sl-trace-cell ${on(4) ? "on" : ""}`} aria-label="Approval">
          <h4>Approval</h4>
          <p className="sl-trace-state">
            <span className={`sl-dot ${on(4) ? "ok" : ""}`} aria-hidden />
            {on(4) ? "Approved by the owner" : "Waiting for a person"}
          </p>
          <p className="sl-trace-note">Nothing is sent until someone approves. The message text is frozen at proposal and shown in full.</p>
        </section>

        {/* 6 — Verification */}
        <section className={`sl-trace-cell ${on(5) ? "on" : ""}`} aria-label="Verification">
          <h4>Verification</h4>
          <p className="sl-trace-state"><span className={`sl-dot ${on(5) ? "wait" : ""}`} aria-hidden />Checking each Tally sync for a receipt</p>
          <p className="sl-trace-note">The outcome — paid, partly paid, or not — is recorded against this decision and informs the next one.</p>
        </section>
      </div>

      <p className="sl-trace-caption">
        Sample data: the day book bundled with the Starlane Tally bridge. Figures are computed from its vouchers; payment terms are an assumption, labelled as one.
      </p>
    </div>
  );
}
