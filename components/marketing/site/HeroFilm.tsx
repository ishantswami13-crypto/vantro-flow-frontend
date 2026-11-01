"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHANGES } from "@/components/marketing/home/HeroStage";

// The homepage hero's product film: one morning on a fictional business, told
// in five chapters that play like a video. It is drawn in the page (no video
// file), so it stays sharp at any size, weighs almost nothing and its text is
// real. It plays only while on screen, pauses on request, and under reduced
// motion it holds still on a chapter the visitor picks. Sample data, labelled.

type Chapter = { k: string; title: string; line: string };

const CHAPTERS: Chapter[] = [
  { k: "Connect", title: "Read overnight", line: "06:00. Starlane reads TallyPrime, the bank and stock. Read-only." },
  { k: "Brief", title: "Four changes", line: "07:42. Four things changed overnight. Everything else stays quiet." },
  { k: "Evidence", title: "Every figure sourced", line: "Each figure shows where it came from, and what kind of figure it is." },
  { k: "Approve", title: "You decide", line: "A reminder is drafted. Nothing is sent until you approve it." },
  { k: "Collected", title: "Checked in the books", line: "Eight days later, the books confirm the payment." },
];

const SCENE_MS = 6200;
const TOTAL_MS = SCENE_MS * CHAPTERS.length;

const SOURCES: Array<[string, string, number]> = [
  ["TallyPrime", "vouchers read", 1284],
  ["Bank statements", "bank lines matched", 312],
  ["Stock", "items checked", 86],
];

// Twelve weeks of Gupta Traders paying later and later, then not at all.
const STRIP = [0, 0, 1, 0, 1, 1, 2, 1, 2, 2, 3, 3];

const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `00:${String(s).padStart(2, "0")}`;
};
const inr = (n: number) => n.toLocaleString("en-IN");

export function HeroFilm() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const t = useRef(0); // ms into the film
  const visible = useRef(false);
  const fills = useRef<Array<HTMLSpanElement | null>>([]);
  const clock = useRef<HTMLSpanElement>(null);
  const counters = useRef<Array<HTMLElement | null>>([]);

  // Paint progress bars, timecode and counters straight to the DOM, so the
  // film runs at the screen's frame rate without re-rendering React.
  const paint = useCallback(() => {
    const now = t.current;
    const idx = Math.min(CHAPTERS.length - 1, Math.floor(now / SCENE_MS));
    const local = (now - idx * SCENE_MS) / SCENE_MS;
    fills.current.forEach((el, i) => {
      if (el) el.style.transform = `scaleX(${i < idx ? 1 : i === idx ? local : 0})`;
    });
    if (clock.current) clock.current.textContent = fmtTime(now);
    const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    counters.current.forEach((el) => {
      if (!el) return;
      const target = Number(el.dataset.to);
      const at = Number(el.dataset.scene);
      const from = Number(el.dataset.delay ?? 0);
      const p = idx === at ? ease((local * SCENE_MS - from) / 1600) : idx > at ? 1 : 0;
      el.textContent = inr(Math.round(target * p));
    });
    return idx;
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStill(true);
      setPlaying(false);
      t.current = SCENE_MS * 2 - 1;
      setScene(1);
      paint();
      return;
    }
    const el = root.current;
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { threshold: 0.15 });
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [paint]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (visible.current && !document.hidden) {
        t.current = (t.current + dt) % TOTAL_MS;
        const idx = paint();
        setScene((s) => (s === idx ? s : idx));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, paint]);

  const jump = (i: number) => {
    t.current = still ? SCENE_MS * (i + 1) - 1 : SCENE_MS * i;
    setScene(i);
    paint();
  };

  const counter = (to: number, sceneAt: number, delay = 0) => (el: HTMLElement | null) => {
    if (!el) return;
    el.dataset.to = String(to);
    el.dataset.scene = String(sceneAt);
    el.dataset.delay = String(delay);
    if (!counters.current.includes(el)) counters.current.push(el);
  };

  const first = CHANGES[0];

  return (
    <div ref={root} className={`fm${still ? " is-still" : ""}`} data-scene={scene}>
      <div className="fm-glow" aria-hidden />
      <div className="fm-frame">
        <div className="fm-screen" aria-hidden>
          <div className="fm-vignette" />
          <p className="fm-corner fm-tl"><i className="fm-dot" />Starlane<span>One morning, start to finish</span></p>
          <p className="fm-corner fm-tr">Sample data · Fictional business</p>

          {/* 01 Connect */}
          <section className={`fm-scene fs-connect${scene === 0 ? " is-on" : ""}`}>
            <div className="fs-core"><span>S</span></div>
            <svg className="fs-lines" viewBox="0 0 600 220" preserveAspectRatio="none">
              <path d="M100 20 C 100 120, 300 100, 300 200" />
              <path d="M300 20 L 300 200" />
              <path d="M500 20 C 500 120, 300 100, 300 200" />
            </svg>
            <ul className="fs-srcs">
              {SOURCES.map(([name, unit, n], i) => (
                <li key={name} style={{ "--i": i } as React.CSSProperties}>
                  <p className="fs-name"><i />{name}</p>
                  <p className="fs-n num"><b ref={counter(n, 0, 500 + i * 250)}>{inr(n)}</b></p>
                  <p className="fs-unit">{unit}</p>
                </li>
              ))}
            </ul>
            <p className="fs-tag">Read-only · Nothing in your books is changed</p>
          </section>

          {/* 02 Brief */}
          <section className={`fm-scene fs-brief${scene === 1 ? " is-on" : ""}`}>
            <div className="fs-card">
              <div className="fs-card-top">
                <p><b>Morning brief</b><span className="num">Tue 14 Oct · 07:42</span></p>
                <p className="fs-count">4 changes</p>
              </div>
              <ol>
                {CHANGES.map((c, i) => (
                  <li key={c.what} className={i === 0 ? "is-sel" : undefined} style={{ "--i": i } as React.CSSProperties}>
                    <span className={`fs-sq t-${c.tone}`} />
                    <div><span className="fs-cat">{c.cat}</span><b>{c.what}</b><span className="fs-who">{c.who}</span></div>
                    <span className="fs-amt num">{c.amt}</span>
                  </li>
                ))}
              </ol>
              <p className="fs-quiet">Everything else is unchanged</p>
            </div>
          </section>

          {/* 03 Evidence */}
          <section className={`fm-scene fs-evidence${scene === 2 ? " is-on" : ""}`}>
            <div className="fs-card">
              <p className="fs-kick t-risk">Receivables · needs a decision</p>
              <p className="fs-title">{first.who}</p>
              <p className="fs-big num">₹<b ref={counter(1842000, 2, 300)}>{inr(1842000)}</b></p>
              <p className="fs-meta">3 invoices · 47 days overdue · 2 promises missed</p>
              <div className="fs-strip">
                {STRIP.map((v, i) => <i key={i} className={`v${v}`} style={{ "--i": i } as React.CSSProperties} />)}
              </div>
              <p className="fs-strip-k"><span>12 weeks ago</span><span>now</span></p>
              <ul className="fs-ev">
                <li style={{ "--i": 0 } as React.CSSProperties}><i className="tag tag-fact">Fact</i><span>3 open invoices</span><em>TallyPrime</em></li>
                <li style={{ "--i": 1 } as React.CSSProperties}><i className="tag tag-calc">Calculated</i><span>47 days overdue</span><em>Ledger</em></li>
                <li style={{ "--i": 2 } as React.CSSProperties}><i className="tag tag-asm">Assumption</i><span>30-day terms</span><em>Yours to change</em></li>
              </ul>
            </div>
          </section>

          {/* 04 Approve */}
          <section className={`fm-scene fs-approve${scene === 3 ? " is-on" : ""}`}>
            <div className="fs-phone">
              <p className="fs-ph-head"><b>Starlane</b><span>Approval needed · {first.who}</span></p>
              <div className="fs-bubble">
                <p className="fs-bubble-k">Draft reminder</p>
                <p>Namaste Guptaji, three invoices totalling ₹18,42,000 are now overdue, the oldest by 47 days. Please confirm a date for the transfer today.</p>
                <p className="fs-bubble-src">INV-1042, 1051, 1066 · TallyPrime</p>
              </div>
              <div className="fs-choices">
                <span className="fs-go">Approve and send<i className="fs-tap" /></span>
                <span>Edit</span>
                <span>Skip</span>
              </div>
              <p className="fs-sent"><i />Approved by you · sent once, as written</p>
            </div>
          </section>

          {/* 05 Collected */}
          <section className={`fm-scene fs-done${scene === 4 ? " is-on" : ""}`}>
            <p className="fs-later">8 days later</p>
            <p className="fs-paid num">₹<b ref={counter(600000, 4, 400)}>{inr(600000)}</b></p>
            <p className="fs-recv"><i />Received against INV-1042 · confirmed in TallyPrime</p>
            <ol className="fs-trail">
              {["Raised", "Shown", "Proposed", "Approved", "Checked"].map((s, i) => (
                <li key={s} style={{ "--i": i } as React.CSSProperties}><i />{s}</li>
              ))}
            </ol>
          </section>

          <p className="fm-sub" key={scene}>{CHAPTERS[scene].line}</p>
        </div>

        <div className="fm-bar">
          {!still && (
            <button type="button" className="fm-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause the film" : "Play the film"}>
              {playing
                ? <svg viewBox="0 0 16 16" aria-hidden><rect x="3.5" y="2.5" width="3" height="11" rx="1" /><rect x="9.5" y="2.5" width="3" height="11" rx="1" /></svg>
                : <svg viewBox="0 0 16 16" aria-hidden><path d="M4 2.6v10.8a.6.6 0 0 0 .9.5l8.6-5.4a.6.6 0 0 0 0-1L4.9 2.1a.6.6 0 0 0-.9.5Z" /></svg>}
            </button>
          )}
          <ol className="fm-chapters">
            {CHAPTERS.map((c, i) => (
              <li key={c.k}>
                <button type="button" onClick={() => jump(i)} aria-current={scene === i ? "step" : undefined} aria-label={`Chapter ${i + 1}: ${c.title}`}>
                  <span className="fm-track"><span className="fm-fill" ref={(el) => { fills.current[i] = el; }} /></span>
                  <span className="fm-ck"><span className="num">{String(i + 1).padStart(2, "0")}</span>{c.k}</span>
                </button>
              </li>
            ))}
          </ol>
          {!still && <p className="fm-time num"><span ref={clock}>00:00</span><span> / {fmtTime(TOTAL_MS)}</span></p>}
        </div>
      </div>

      <p className="sl-sr">
        A short film on a fictional business. At 06:00 Starlane reads TallyPrime, bank statements and stock, read-only. At 07:42 the
        morning brief raises four changes: {CHANGES.map((c) => `${c.what}, ${c.who}, ${c.amt}`).join("; ")}. The first, {first.who},
        shows {first.amt} open across three invoices, 47 days overdue, each figure labelled fact, calculated or assumption. A firm reminder
        is drafted and waits on the owner&apos;s phone until it is approved and sent once. Eight days later the books confirm ₹6,00,000
        received against INV-1042.
      </p>
    </div>
  );
}
