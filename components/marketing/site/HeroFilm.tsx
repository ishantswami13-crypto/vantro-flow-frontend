"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHANGES } from "@/components/marketing/home/HeroStage";

// The homepage hero's product film: the Starlane app, floating on a textured
// panel, playing one morning on a fictional business in five chapters. It is
// drawn in the page (no video file), so it stays sharp at any size and its
// text is real. It plays only while on screen, pauses on request, and under
// reduced motion it holds still on a chapter the visitor picks. Sample data.

type Chapter = { k: string; nav: string; title: string };

const CHAPTERS: Chapter[] = [
  { k: "Connect", nav: "Sources", title: "Reading your books" },
  { k: "Brief", nav: "Today", title: "Morning brief" },
  { k: "Evidence", nav: "Customers", title: "Harbor Supply Co." },
  { k: "Approve", nav: "Approvals", title: "Waiting for you" },
  { k: "Collected", nav: "Collections", title: "Collected" },
];

const NAV = ["Today", "Customers", "Collections", "Approvals", "Sources"];
const NAV_ICON: Record<string, string> = {
  Today: "M3 8.5 8 4l5 4.5V13H3z",
  Customers: "M5.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm5 0a2 2 0 1 0 0-4M2 13c0-2 1.6-3.5 3.5-3.5S9 11 9 13m2.5-3.4c1.4.3 2.5 1.6 2.5 3.4",
  Collections: "M2.5 12.5h11M4 10V7m3 3V4.5m3 5.5V6m3 4V8",
  Approvals: "M3 8.5 6.5 12 13 4.5",
  Sources: "M8 2.5c3 0 5 .9 5 2s-2 2-5 2-5-.9-5-2 2-2 5-2Zm-5 2v7c0 1.1 2 2 5 2s5-.9 5-2v-7M3 8c0 1.1 2 2 5 2s5-.9 5-2",
};

const SCENE_MS = 6200;
const TOTAL_MS = SCENE_MS * CHAPTERS.length;

const SOURCES: Array<[string, string, number]> = [
  ["Accounting", "entries read", 1284],
  ["Bank statements", "bank lines matched", 312],
  ["Stock", "items checked", 86],
];

// Twelve weeks of Harbor Supply Co. paying later and later, then not at all.
const STRIP = [0, 0, 1, 0, 1, 1, 2, 1, 2, 2, 3, 3];

const usd = (n: number) => n.toLocaleString("en-US");

export function HeroFilm() {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const t = useRef(0);
  const visible = useRef(false);
  const fills = useRef<Array<HTMLSpanElement | null>>([]);
  const counters = useRef<Array<HTMLElement | null>>([]);

  // Paint progress and counters straight to the DOM, so the film runs at the
  // screen's frame rate without re-rendering React.
  const paint = useCallback(() => {
    const now = t.current;
    const idx = Math.min(CHAPTERS.length - 1, Math.floor(now / SCENE_MS));
    const local = (now - idx * SCENE_MS) / SCENE_MS;
    fills.current.forEach((el, i) => {
      if (el) el.style.transform = `scaleX(${i < idx ? 1 : i === idx ? local : 0})`;
    });
    const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    counters.current.forEach((el) => {
      if (!el) return;
      const target = Number(el.dataset.to);
      const at = Number(el.dataset.scene);
      const from = Number(el.dataset.delay ?? 0);
      const p = idx === at ? ease((local * SCENE_MS - from) / 1600) : idx > at ? 1 : 0;
      el.textContent = usd(Math.round(target * p));
    });
    return idx;
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
  const ch = CHAPTERS[scene];

  return (
    <div ref={root} className={`fm${still ? " is-still" : ""}`} data-scene={scene}>
      <div className="fm-tex" aria-hidden>
        <svg className="fm-tex-svg" preserveAspectRatio="none" viewBox="0 0 1600 900" focusable="false">
          <defs>
            <filter id="fm-spray" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7" result="grain" />
              <feColorMatrix in="grain" type="matrix" values="0 0 0 0 .93  0 0 0 0 .94  0 0 0 0 .91  0 0 0 7 -3.9" />
            </filter>
            <filter id="fm-cloud" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency=".0028 .004" numOctaves="4" seed="3" />
              <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -3.2 2.1" />
            </filter>
            <mask id="fm-mask"><rect width="1600" height="900" filter="url(#fm-cloud)" /></mask>
          </defs>
          <rect width="1600" height="900" fill="url(#fm-base)" />
          <g className="fm-tex-drift" mask="url(#fm-mask)"><rect x="-200" y="-100" width="2000" height="1100" filter="url(#fm-spray)" /></g>
          <linearGradient id="fm-base" x1="0" y1="0" x2="1" y2=".6">
            <stop offset="0" stopColor="#3B4743" />
            <stop offset=".45" stopColor="#2A3532" />
            <stop offset="1" stopColor="#4C5753" />
          </linearGradient>
        </svg>
      </div>

      <div className="fm-app" aria-hidden>
        <aside className="fm-side">
          <p className="fm-brand">Starlane<span className="fm-side-ic"><i /><i /></span></p>
          <p className="fm-new"><b>+</b>Ask Starlane</p>
          <ul>
            {NAV.map((n) => (
              <li key={n} className={n === ch.nav ? "is-on" : undefined}>
                <svg viewBox="0 0 16 16"><path d={NAV_ICON[n]} /></svg>{n}
              </li>
            ))}
            <li><svg viewBox="0 0 16 16"><path d="M3.5 8h.01M8 8h.01M12.5 8h.01" /></svg>More</li>
          </ul>
          <p className="fm-biz"><span>NP</span>Narmada Pipes &amp; Fittings</p>
        </aside>

        <div className="fm-main">
          <div className="fm-main-top">
            <p className="fm-crumb"><span>{ch.nav}</span><b key={scene}>{ch.title}</b></p>
            <p className="fm-main-act"><span>Sample data</span><b>Tue 14 Oct · 07:42</b></p>
          </div>

          <div className="fm-stage">
            {/* 01 Connect */}
            <section className={`fm-scene fs-connect${scene === 0 ? " is-on" : ""}`}>
              <ul className="fs-srcs">
                {SOURCES.map(([name, unit, n], i) => (
                  <li key={name} style={{ "--i": i } as React.CSSProperties}>
                    <p className="fs-name"><i />{name}<em>Read-only</em></p>
                    <p className="fs-n num"><b ref={counter(n, 0, 500 + i * 250)}>{usd(n)}</b></p>
                    <p className="fs-unit">{unit}</p>
                  </li>
                ))}
              </ul>
              <div className="fs-sync"><span className="fs-sync-bar"><i /></span><p>Overnight sync complete · nothing in your books was changed</p></div>
            </section>

            {/* 02 Brief */}
            <section className={`fm-scene fs-brief${scene === 1 ? " is-on" : ""}`}>
              <p className="fs-h">Four things changed overnight</p>
              <ol>
                {CHANGES.map((c, i) => (
                  <li key={c.what} className={i === 0 ? "is-sel" : undefined} style={{ "--i": i } as React.CSSProperties}>
                    <span className={`fs-sq t-${c.tone}`} />
                    <div><span className="fs-cat">{c.cat}</span><b>{c.what}</b><span className="fs-who">{c.who}</span></div>
                    <span className="fs-amt num">{c.amt}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* 03 Evidence */}
            <section className={`fm-scene fs-evidence${scene === 2 ? " is-on" : ""}`}>
              <div className="fs-ev-grid">
                <div>
                  <p className="fs-kick t-risk">Receivables · needs a decision</p>
                  <p className="fs-big num">$<b ref={counter(184200, 2, 300)}>{usd(184200)}</b></p>
                  <p className="fs-meta">3 invoices · 47 days overdue · 2 promises missed</p>
                  <div className="fs-strip">
                    {STRIP.map((v, i) => <i key={i} className={`v${v}`} style={{ "--i": i } as React.CSSProperties} />)}
                  </div>
                  <p className="fs-strip-k"><span>12 weeks ago</span><span>now</span></p>
                </div>
                <ul className="fs-ev">
                  <li style={{ "--i": 0 } as React.CSSProperties}><i className="tag tag-fact">Fact</i><span>3 open invoices</span><em>Ledger</em></li>
                  <li style={{ "--i": 1 } as React.CSSProperties}><i className="tag tag-calc">Calculated</i><span>47 days overdue</span><em>Ledger</em></li>
                  <li style={{ "--i": 2 } as React.CSSProperties}><i className="tag tag-asm">Assumption</i><span>30-day terms</span><em>Yours to change</em></li>
                  <li style={{ "--i": 3 } as React.CSSProperties}><i className="tag tag-est">Estimate</i><span>$96–151K likely in 30 days</span><em>Simulation</em></li>
                </ul>
              </div>
            </section>

            {/* 04 Approve */}
            <section className={`fm-scene fs-approve${scene === 3 ? " is-on" : ""}`}>
              <div className="fs-draft">
                <p className="fs-draft-k">Draft WhatsApp reminder · to {first.who}</p>
                <p className="fs-draft-body">Hi Dana, three invoices totalling $184,200 are now overdue, the oldest by 47 days. Please confirm a date for the transfer today.</p>
                <p className="fs-draft-src">INV-1042, 1051, 1066 · Ledger</p>
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
              <p className="fs-paid num">$<b ref={counter(60000, 4, 400)}>{usd(60000)}</b></p>
              <p className="fs-recv"><i />Received against INV-1042 · confirmed in your books</p>
              <ol className="fs-trail">
                {["Raised", "Shown", "Proposed", "Approved", "Checked"].map((s, i) => (
                  <li key={s} style={{ "--i": i } as React.CSSProperties}><i />{s}</li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>

      <div className="fm-bar">
        {!still && (
          <button type="button" className="fm-play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause the film" : "Play the film"}>
            {playing
              ? <svg viewBox="0 0 16 16" aria-hidden><rect x="4" y="3" width="2.6" height="10" rx=".8" /><rect x="9.4" y="3" width="2.6" height="10" rx=".8" /></svg>
              : <svg viewBox="0 0 16 16" aria-hidden><path d="M4.5 3v10a.5.5 0 0 0 .77.42l7.6-5a.5.5 0 0 0 0-.84l-7.6-5A.5.5 0 0 0 4.5 3Z" /></svg>}
          </button>
        )}
        <ol className="fm-chapters">
          {CHAPTERS.map((c, i) => (
            <li key={c.k}>
              <button type="button" onClick={() => jump(i)} aria-current={scene === i ? "step" : undefined} aria-label={`Chapter ${i + 1}: ${c.k}`}>
                <span className="fm-ck">{c.k}</span>
                <span className="fm-track"><span className="fm-fill" ref={(el) => { fills.current[i] = el; }} /></span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <p className="sl-sr">
        A short film of the Starlane app on a fictional business. Starlane reads the accounting system, bank statements and stock overnight,
        read-only. The morning brief raises four changes: {CHANGES.map((c) => `${c.what}, ${c.who}, ${c.amt}`).join("; ")}. The first,
        {" "}{first.who}, shows {first.amt} open across three invoices, 47 days overdue, each figure labelled fact, calculated, assumption
        or estimate. A firm reminder is drafted and waits until the owner approves it, then is sent once. Eight days later the books
        confirm $60,000 received against INV-1042.
      </p>
    </div>
  );
}
