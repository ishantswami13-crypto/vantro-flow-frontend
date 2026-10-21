"use client";
import { useEffect, useRef } from "react";

// The hero and closing backdrop: a slow field of stars drifting toward the
// viewer from a vanishing point, each leaving a short trail — a "star lane".
// Drawn on a canvas so it stays a few KB instead of a video. It pauses when
// off screen or in a background tab, and with prefers-reduced-motion it draws
// a single still frame.

type Star = { x: number; y: number; z: number };

export function StarField({ density = 1, horizon = 0.42, className = "" }: { density?: number; horizon?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0, visible = true;
    let stars: Star[] = [];

    const spawn = (z = Math.random()): Star => ({ x: (Math.random() * 2 - 1) * 1.4, y: (Math.random() * 2 - 1) * 1.1, z: Math.max(0.04, z) });

    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(900, Math.round(((w * h) / 3000) * density));
      stars = Array.from({ length: n }, () => spawn());
    };

    const project = (s: Star, z: number) => {
      const scale = Math.max(w, h) * 0.32;
      return [w / 2 + (s.x / z) * scale, h * horizon + (s.y / z) * scale] as const;
    };

    const frame = (step: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const pz = s.z;
        s.z -= step;
        if (s.z <= 0.04) { Object.assign(s, spawn(1)); continue; }
        const [x, y] = project(s, s.z);
        if (x < -40 || x > w + 40 || y < -40 || y > h + 40) { Object.assign(s, spawn(1)); continue; }
        const near = 1 - s.z;
        const alpha = Math.min(0.95, near * near * 1.25 + 0.08);
        if (step > 0) {
          const [px, py] = project(s, pz + step * 5);
          ctx.strokeStyle = `rgba(250, 244, 232, ${alpha * 0.4})`;
          ctx.lineWidth = Math.max(0.5, near * 1.6);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        }
        ctx.fillStyle = `rgba(255, 250, 240, ${alpha})`;
        const r = Math.max(0.35, near * 1.5);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = () => { frame(0.0011); raf = requestAnimationFrame(loop); };
    const start = () => { cancelAnimationFrame(raf); if (reduced) frame(0); else if (visible && !document.hidden) loop(); };

    resize();
    start();
    const ro = new ResizeObserver(() => { resize(); if (reduced) frame(0); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else cancelAnimationFrame(raf); });
    io.observe(canvas);
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else start(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [density, horizon]);

  return <canvas ref={ref} className={`slh-stars ${className}`} aria-hidden />;
}
