"use client";
import { useEffect, useRef, useState } from "react";

// A product film in the launch-video pattern: while it is on screen the film
// loops silently as a preview behind a light scrim and a frosted round play
// button. Pressing it starts the film from the beginning with sound and a
// full player (play, scrub, sound, full screen). Nothing loads until the
// player is near the screen, and under reduced motion the preview does not
// play on its own: the poster waits for a press.
//
// Files come from scripts/film/render.mjs: <src>.webm, <src>.mp4,
// <src>-poster.jpg. Sample data on fictional businesses.

export type FilmPlayerProps = {
  /** Path without extension, e.g. "/film/introducing". */
  src: string;
  /** Seconds, used until the file's own length is known. */
  duration: number;
  /** What the film shows, for screen readers. */
  label: string;
  caption?: string;
};

type Mode = "preview" | "full";

export function FilmPlayer({ src, duration, label, caption }: FilmPlayerProps) {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [mode, setMode] = useState<Mode>("preview");
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(duration);
  const [idle, setIdle] = useState(false);
  const modeRef = useRef<Mode>("preview");
  const userPaused = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load when close to the screen. The silent preview plays only while at
  // least half the player is visible; the full film pauses when scrolled away.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setNear(true);
      const v = vid.current;
      if (!v) return;
      const visible = e.intersectionRatio >= 0.5;
      if (visible && modeRef.current === "preview" && !still) v.play().catch(() => {});
      else if (visible && modeRef.current === "full" && !userPaused.current && !v.ended) v.play().catch(() => {});
      else if (!visible && !v.paused) v.pause();
    }, { rootMargin: "300px 0px", threshold: [0, 0.5] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(idleTimer.current), []);

  const wake = () => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2400);
  };

  const start = () => {
    const v = vid.current;
    if (!v) return;
    modeRef.current = "full";
    setMode("full");
    userPaused.current = false;
    v.loop = false;
    v.muted = false;
    setMuted(false);
    v.currentTime = 0;
    setEnded(false);
    v.play().catch(() => {
      // A browser that refuses sound without a gesture still plays it muted.
      v.muted = true; setMuted(true); v.play().catch(() => {});
    });
    wake();
  };

  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    if (modeRef.current === "preview") { start(); return; }
    if (v.paused || v.ended) { userPaused.current = false; if (v.ended) v.currentTime = 0; v.play().catch(() => {}); }
    else { userPaused.current = true; v.pause(); }
    wake();
  };
  const seek = (t: number) => { const v = vid.current; if (v) { v.currentTime = t; setPos(t); setEnded(false); } wake(); };
  const sound = () => { const v = vid.current; if (v) { v.muted = !v.muted; setMuted(v.muted); } wake(); };
  const full = () => {
    const el = box.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = vid.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.(); // iPhone Safari
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const isFull = mode === "full";

  return (
    <figure className="ccv-fig">
      <div
        ref={box}
        className="ccv"
        data-mode={mode}
        data-playing={playing || undefined}
        data-idle={(isFull && playing && idle) || undefined}
        onMouseMove={isFull ? wake : undefined}
        onClick={isFull ? undefined : start}
      >
        <video
          ref={vid}
          className="ccv-v"
          poster={`${src}-poster.jpg`}
          muted
          loop
          playsInline
          preload={near ? "auto" : "none"}
          aria-label={label}
          onClick={isFull ? toggle : undefined}
          onPlay={() => { setPlaying(true); setEnded(false); }}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setEnded(true); setIdle(false); }}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration || duration)}
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
        >
          {near && <source src={`${src}.webm`} type="video/webm" />}
          {near && <source src={`${src}.mp4`} type="video/mp4" />}
        </video>

        {/* Preview: a light scrim and the frosted round play button. */}
        <div className="ccv-scrim" aria-hidden />
        <button type="button" className="ccv-big" onClick={(e) => { e.stopPropagation(); start(); }} aria-label="Play video with sound" tabIndex={isFull ? -1 : 0}>
          <svg viewBox="0 0 24 25" width="24" height="25" aria-hidden><path d="M19 12.67 7 20.67V4.67z" fill="currentColor" /></svg>
        </button>

        {isFull && ended && (
          <button type="button" className="ccv-replay" onClick={toggle} aria-label="Play again">
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden><path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}

        {isFull && (
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
            <button type="button" className="ccv-btn" onClick={sound} aria-label={muted ? "Turn sound on" : "Mute"}>
              {muted
                ? <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" /><path d="m15.5 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                : <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>}
            </button>
            <button type="button" className="ccv-btn" onClick={full} aria-label="Full screen">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
            </button>
          </div>
        )}
      </div>
      {caption && <figcaption className="ccv-cap">{caption}</figcaption>}
    </figure>
  );
}
