// A slow, deep-space backdrop for the sign-in rail: three parallax layers of
// stars that drift and twinkle, two faint nebula glows, and an occasional
// shooting star. Canvas only, no images. Still frame for reduced motion, and it
// pauses while the window is hidden. Mirrors components/brand/Starfield.tsx.
import { useEffect, useRef } from 'react';

type Star = { x: number; y: number; r: number; layer: number; phase: number; speed: number; tint: string };
type Meteor = { x: number; y: number; vx: number; vy: number; life: number };

const TINTS = ['255,255,255', '214,226,255', '255,236,214', '236,228,255'];

export function Starfield({ className, density = 1 }: { className?: string; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now(), nextMeteor = last + 2500;
    let stars: Star[] = [];
    let meteor: Meteor | null = null;

    const seed = () => {
      const count = Math.round(((w * h) / 2600) * density);
      stars = Array.from({ length: count }, () => {
        const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.75 ? 1 : 2;
        return {
          x: Math.random() * w, y: Math.random() * h,
          r: [0.45, 0.8, 1.25][layer] * (0.7 + Math.random() * 0.6),
          layer, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 1.4,
          tint: TINTS[Math.floor(Math.random() * TINTS.length)],
        };
      });
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduced) draw(0, 0);
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      // Nebulae: two soft glows that breathe and drift very slowly.
      const glows: [number, number, number, string][] = [
        [0.78 + Math.sin(t / 23000) * 0.05, 0.22 + Math.cos(t / 31000) * 0.04, 0.62, '120,104,255'],
        [0.18 + Math.cos(t / 27000) * 0.05, 0.82 + Math.sin(t / 19000) * 0.04, 0.55, '64,140,255'],
      ];
      for (const [gx, gy, gr, c] of glows) {
        const g = ctx.createRadialGradient(gx * w, gy * h, 0, gx * w, gy * h, gr * Math.max(w, h));
        g.addColorStop(0, `rgba(${c},0.16)`); g.addColorStop(0.45, `rgba(${c},0.05)`); g.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      // Stars: nearer layers drift faster (parallax) and twinkle more.
      const drift = [3, 7, 14];
      for (const s of stars) {
        if (dt) {
          s.x -= (drift[s.layer] * dt) / 1000; s.y += (drift[s.layer] * 0.35 * dt) / 1000;
          if (s.x < -2) s.x = w + 2; if (s.y > h + 2) s.y = -2;
        }
        const tw = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(s.phase + (t / 1000) * s.speed);
        ctx.globalAlpha = [0.45, 0.7, 0.95][s.layer] * tw;
        ctx.fillStyle = `rgb(${s.tint})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        if (s.layer === 2 && tw > 0.85) { // a faint cross-glint on the brightest stars
          ctx.globalAlpha = (tw - 0.85) * 2;
          ctx.fillRect(s.x - s.r * 4, s.y - 0.25, s.r * 8, 0.5); ctx.fillRect(s.x - 0.25, s.y - s.r * 4, 0.5, s.r * 8);
        }
      }
      ctx.globalAlpha = 1;
      // Shooting star.
      if (meteor) {
        meteor.x += (meteor.vx * dt) / 1000; meteor.y += (meteor.vy * dt) / 1000; meteor.life -= dt;
        const a = Math.max(0, Math.min(1, meteor.life / 400));
        const tail = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * 0.18, meteor.y - meteor.vy * 0.18);
        tail.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); tail.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = tail; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(meteor.x, meteor.y); ctx.lineTo(meteor.x - meteor.vx * 0.18, meteor.y - meteor.vy * 0.18); ctx.stroke();
        if (meteor.life <= 0 || meteor.x < -50 || meteor.y > h + 50) meteor = null;
      } else if (!reduced && t > nextMeteor) {
        const speed = 520 + Math.random() * 260;
        meteor = { x: w * (0.45 + Math.random() * 0.55), y: h * Math.random() * 0.35, vx: -speed * 0.86, vy: speed * 0.5, life: 900 + Math.random() * 500 };
        nextMeteor = t + 5000 + Math.random() * 7000;
      }
    };

    const loop = (t: number) => {
      const dt = Math.min(64, t - last); last = t;
      draw(t, dt);
      raf = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) { last = performance.now(); raf = requestAnimationFrame(loop); }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (!reduced) raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [density]);
  return <canvas ref={ref} className={className} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}
