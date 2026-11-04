"use client";
import { useEffect, useRef, useState } from "react";

// The Command Center film: a real 38-second video (public/film/), rendered
// from scripts/film/command-center.html, in a plain dark player with play,
// scrub and fullscreen. It loads nothing until it is near the screen, plays
// muted while visible, and under reduced motion waits for a press instead of
// playing on its own. The film has no sound. Sample data on a fictional business.

const SRC = "/film/command-center";

export function CommandCenterVideo() {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(38);
  const userPaused = useRef(false);

  // Load when close to the screen; play while on it, unless reduced motion or paused by hand.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setNear(true);
      const v = vid.current;
      if (!v) return;
      if (e.intersectionRatio >= 0.5 && !still && !userPaused.current && !v.ended) v.play().catch(() => {});
      else if (e.intersectionRatio < 0.5 && !v.paused) v.pause();
    }, { rootMargin: "300px 0px", threshold: [0, 0.5] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    if (v.paused || v.ended) { userPaused.current = false; if (v.ended) v.currentTime = 0; v.play().catch(() => {}); }
    else { userPaused.current = true; v.pause(); }
  };
  const seek = (t: number) => { const v = vid.current; if (v) { v.currentTime = t; setPos(t); setEnded(false); } };
  const full = () => {
    const el = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = vid.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.(); // iPhone Safari
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <figure className="ccv-fig">
      <div ref={box} className="ccv" data-playing={playing || undefined}>
        <video
          ref={vid}
          className="ccv-v"
          poster={`${SRC}-title.jpg`}
          muted
          playsInline
          preload={near ? "auto" : "none"}
          aria-label="Starlane Command Center, a 38 second product film with no sound: Starlane reviews twelve overdue invoices, opens Gupta Traders with the evidence behind each figure, a collections agent prepares a reminder, and the owner approves it once."
          onClick={toggle}
          onPlay={() => { setPlaying(true); setEnded(false); }}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setEnded(true); }}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 38)}
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        >
          {near && <source src={`${SRC}.webm`} type="video/webm" />}
          {near && <source src={`${SRC}.mp4`} type="video/mp4" />}
        </video>

        {ended && (
          <button type="button" className="ccv-replay" onClick={toggle} aria-label="Play again">
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden><path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}

        <div className="ccv-bar">
          <button type="button" className="ccv-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
            {playing
              ? <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>
              : <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M7 4.5v15L19.5 12z" fill="currentColor" /></svg>}
          </button>
          <input
            className="ccv-scrub"
            type="range"
            min={0}
            max={dur}
            step={0.1}
            value={pos}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Position in film"
            aria-valuetext={`${fmt(pos)} of ${fmt(dur)}`}
            style={{ ["--p" as string]: `${(pos / dur) * 100}%` }}
          />
          <span className="ccv-time" aria-hidden>{fmt(pos)}</span>
          <button type="button" className="ccv-btn" onClick={full} aria-label="Full screen">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
          </button>
        </div>
      </div>
      <figcaption className="ccv-cap">Sample data on a fictional business · no sound</figcaption>
    </figure>
  );
}
