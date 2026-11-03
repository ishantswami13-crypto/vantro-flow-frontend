"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// The public site's moving parts. Every one of them renders its final, fully
// readable state on the server; motion is added only after hydration and never
// under reduced motion.

const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Turns on reveals for the page and plays each .hx-r once it is on screen. */
export function HxMotion() {
  const path = usePathname();
  useEffect(() => {
    if (still() || !("IntersectionObserver" in window)) return;
    document.documentElement.setAttribute("data-hx-motion", "");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    const els = document.querySelectorAll(".hx-r:not(.in)");
    els.forEach((el) => {
      // Anything already above the fold plays straight away.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.94) requestAnimationFrame(() => el.classList.add("in"));
      else io.observe(el);
    });
    return () => io.disconnect();
  }, [path]);
  return null;
}

/** Plays a callback on a timer while the element is on screen and not hovered. */
function useAutoplay(ref: React.RefObject<HTMLElement | null>, ms: number, next: () => void, key: unknown) {
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [motion, setMotion] = useState(false);
  useEffect(() => { setMotion(!still()); }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    const on = () => setHover(true), off = () => setHover(false);
    el.addEventListener("pointerenter", on); el.addEventListener("pointerleave", off);
    el.addEventListener("focusin", on); el.addEventListener("focusout", off);
    return () => { io.disconnect(); el.removeEventListener("pointerenter", on); el.removeEventListener("pointerleave", off); el.removeEventListener("focusin", on); el.removeEventListener("focusout", off); };
  }, [ref]);
  const running = motion && visible && !hover;
  const left = useRef(ms);
  const started = useRef(0);
  useEffect(() => { left.current = ms; }, [key, ms]);
  useEffect(() => {
    if (!running) return;
    started.current = Date.now();
    const t = window.setTimeout(next, left.current);
    return () => { window.clearTimeout(t); left.current = Math.max(400, left.current - (Date.now() - started.current)); };
  }, [running, next, key]);
  return { paused: !running, motion };
}

/** A grid of source names; each cell cross-fades to the next name on its own beat. */
export function SourceGrid({ sets, className = "" }: { sets: string[][]; className?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLUListElement>(null);
  const next = useCallback(() => setN((v) => (v + 1) % sets.length), [sets.length]);
  useAutoplay(ref, 3200, next, n);
  const cells = sets[0].length;
  return (
    <ul ref={ref} className={`hx-src ${className}`} aria-label="Sources Starlane reads">
      {Array.from({ length: cells }, (_, i) => (
        <li key={i}>
          {sets.map((set, s) => (
            <span key={s} className={s === n ? "on" : ""} aria-hidden={s !== n} style={{ "--i": i } as React.CSSProperties}>{set[i]}</span>
          ))}
        </li>
      ))}
    </ul>
  );
}

export type AccItem = { k: string; title: string; body: string; href?: string; cta?: string; view: React.ReactNode };

/** Tabs that advance on a timer, with the active row's line filling as it runs. */
export function Accordion({ items, ms = 7000, className = "" }: { items: AccItem[]; ms?: number; className?: string }) {
  const [on, setOn] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const next = useCallback(() => setOn((v) => (v + 1) % items.length), [items.length]);
  const { paused } = useAutoplay(ref, ms, next, on);
  return (
    <div ref={ref} className={`hx-acc${paused ? " paused" : ""} ${className}`} style={{ "--dur": `${ms}ms` } as React.CSSProperties}>
      <div className="hx-acc-l" role="tablist" aria-orientation="vertical">
        {items.map((it, i) => (
          <div key={it.k} className={`hx-acc-i${i === on ? " on" : ""}`}>
            <button type="button" role="tab" id={`acc-${it.k}`} aria-selected={i === on} aria-controls={`accp-${it.k}`} className="hx-acc-b" onClick={() => setOn(i)}>{it.title}</button>
            <div className="hx-acc-p"><div>
              <p>{it.body}</p>
              {it.href && <Link href={it.href} className="hx-arrow hx-b2">{it.cta ?? "Learn more"} <i>→</i></Link>}
            </div></div>
            <div className="hx-acc-bar" key={i === on ? `on-${on}` : "off"} />
          </div>
        ))}
      </div>
      <div className="hx-acc-v">
        {items.map((it, i) => (
          <div key={it.k} id={`accp-${it.k}`} role="tabpanel" aria-labelledby={`acc-${it.k}`} className={i === on ? "on" : ""} aria-hidden={i !== on}>{it.view}</div>
        ))}
      </div>
    </div>
  );
}

export type Quote = { text: string; by: string; role: string; href?: string; cta?: string; view?: React.ReactNode };

/** One statement at a time, with a row of progress bars to move between them. */
export function Quotes({ items, ms = 8000, wide = false }: { items: Quote[]; ms?: number; wide?: boolean }) {
  const [on, setOn] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const next = useCallback(() => setOn((v) => (v + 1) % items.length), [items.length]);
  const { paused } = useAutoplay(ref, ms, next, on);
  return (
    <div ref={ref} className={`${wide ? "hx-q-wide " : ""}${paused ? "hx-q paused" : "hx-q"}`} style={{ display: "block", "--dur": `${ms}ms` } as React.CSSProperties}>
      <div className="hx-q-stage" aria-live="polite">
        {items.map((q, i) => (
          <figure key={q.by + i} className={`hx-q-slide${i === on ? " on" : ""}`} aria-hidden={i !== on}>
            {wide ? (
              <figcaption className="hx-q-by" style={{ marginTop: 0, paddingLeft: 0 }}><b>{q.by}</b><span>{q.role}</span></figcaption>
            ) : (q.view ?? <div />)}
            <div>
              <blockquote>“{q.text}”</blockquote>
              {!wide && (
                <figcaption className="hx-q-by">
                  <b>{q.by}</b><span>{q.role}</span>
                  {q.href && <><br /><Link href={q.href} className="hx-arrow" tabIndex={i === on ? 0 : -1}>{q.cta ?? "Read more"} <i>→</i></Link></>}
                </figcaption>
              )}
            </div>
          </figure>
        ))}
      </div>
      <div className="hx-q-bars">
        {items.map((q, i) => (
          <button key={q.by + i} type="button" aria-label={`Show statement ${i + 1} of ${items.length}`} aria-current={i === on} className={i === on ? "on" : i < on ? "done" : ""} onClick={() => setOn(i)} />
        ))}
      </div>
    </div>
  );
}

/** Horizontal cards with previous and next buttons. */
export function Rail({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => { const el = ref.current; if (el) el.scrollBy({ left: d * el.clientWidth * 0.4, behavior: still() ? "auto" : "smooth" }); };
  return (
    <>
      <div className="hx-rail" ref={ref} role="region" aria-label={label} tabIndex={0}>{children}</div>
      <div className="hx-rail-nav" style={{ marginTop: 24 }}>
        <button type="button" aria-label="Previous" onClick={() => go(-1)}>←</button>
        <button type="button" aria-label="Next" onClick={() => go(1)}>→</button>
      </div>
    </>
  );
}

/** A wide picture rail that slides on a timer, peeking at its neighbours. */
export function Gallery({ slides, ms = 6000 }: { slides: React.ReactNode[]; ms?: number }) {
  const [on, setOn] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const next = useCallback(() => setOn((v) => (v + 1) % slides.length), [slides.length]);
  const { paused } = useAutoplay(ref, ms, next, on);
  return (
    <div ref={ref} className={`hx-gal${paused ? " hx-q paused" : " hx-q"}`} style={{ display: "block", "--dur": `${ms}ms` } as React.CSSProperties}>
      <div className="hx-gal-track" style={{ transform: `translateX(calc(17% - ${on} * (66% + var(--gap))))` }}>
        {slides.map((s, i) => <div key={i} aria-hidden={i !== on}>{s}</div>)}
      </div>
      <div className="hx-gal-bars hx-q-bars">
        {slides.map((_, i) => (
          <button key={i} type="button" aria-label={`Show picture ${i + 1} of ${slides.length}`} aria-current={i === on} className={i === on ? "on" : i < on ? "done" : ""} onClick={() => setOn(i)} />
        ))}
      </div>
    </div>
  );
}

/** Filters for the resources list: narrows the cards in place. */
export function ResourceFilter({ types, topics }: { types: string[]; topics: string[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [topic, setTopic] = useState("");
  const [aud, setAud] = useState("");
  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>("[data-res]");
    const needle = q.trim().toLowerCase();
    cards.forEach((c) => {
      const ok = (!needle || (c.textContent ?? "").toLowerCase().includes(needle)) && (!type || c.dataset.type === type) && (!topic || c.dataset.topic === topic) && (!aud || (c.dataset.aud ?? "").includes(aud));
      c.style.display = ok ? "" : "none";
    });
  }, [q, type, topic, aud]);
  return (
    <div className="hx-filter" role="search">
      <label><input type="search" placeholder="Search all resources" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search all resources" /><span aria-hidden>⌕</span></label>
      <label><select value={type} onChange={(e) => setType(e.target.value)} aria-label="Content type"><option value="">Content type</option>{types.map((t) => <option key={t}>{t}</option>)}</select><span aria-hidden>⌄</span></label>
      <label><select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic"><option value="">Topic</option>{topics.map((t) => <option key={t}>{t}</option>)}</select><span aria-hidden>⌄</span></label>
      <label><select value={aud} onChange={(e) => setAud(e.target.value)} aria-label="Audience"><option value="">Audience</option><option>Owners</option><option>Finance teams</option><option>Collections teams</option></select><span aria-hidden>⌄</span></label>
    </div>
  );
}
