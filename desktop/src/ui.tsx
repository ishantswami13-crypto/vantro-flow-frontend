import { useEffect, useRef, useState, type ReactNode } from 'react';
import { asOf, healthLabel, healthTone, LIFECYCLE_LABEL, LIFECYCLE_TONE, type ActionLifecycle, type EvidenceItem, type EvidenceSet, type FeatureAction } from '@starlane/contracts';
import type { Resource } from './lib/useResource';

export function Mark({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  // The serif S from the app icon (public/brand/starlane-mark.svg in the repo root).
  return (
    <svg width={size} height={size} viewBox="20 20 60 60" aria-hidden="true">
      <path d="M52.19 79.92L52.19 79.92Q48.7 79.92 46.2 79.08Q43.69 78.23 42.11 77.39Q40.53 76.55 39.83 76.55L39.83 76.55Q39.09 76.55 38.62 77.06Q38.15 77.58 37.74 78.28Q37.33 78.97 36.86 79.49Q36.38 80 35.64 80L35.64 80Q34.86 80 34.37 79.53Q33.88 79.06 33.67 77.99L33.67 77.99L30.76 64.76Q30.59 63.94 30.94 63.35Q31.29 62.75 32.11 62.46L32.11 62.46Q33.02 62.18 33.67 62.53Q34.33 62.87 34.82 63.82L34.82 63.82Q37.08 68.34 39.77 71.05Q42.46 73.76 45.46 74.95Q48.46 76.14 51.54 76.14L51.54 76.14Q55.93 76.14 58.44 73.8Q60.94 71.46 60.98 67.6L60.98 67.6Q60.98 65.17 59.85 63.14Q58.72 61.11 55.58 59.2Q52.44 57.29 46.36 55.28L46.36 55.28Q40.2 53.22 36.46 50.57Q32.73 47.93 31.04 44.46Q29.36 40.99 29.36 36.47L29.36 36.47Q29.36 31.58 31.66 27.89Q33.96 24.19 38.15 22.14Q42.34 20.08 47.88 20.08L47.88 20.08Q51.66 20.08 54.1 20.88Q56.55 21.68 58.07 22.51Q59.59 23.33 60.57 23.33L60.57 23.33Q61.48 23.33 61.89 22.51Q62.3 21.68 62.77 20.84Q63.24 20 64.31 20L64.31 20Q65.13 20 65.64 20.51Q66.16 21.03 66.57 22.38L66.57 22.38L70.51 35.81Q70.8 36.76 70.45 37.54Q70.1 38.32 69.28 38.56L69.28 38.56Q68.37 38.85 67.7 38.52Q67.02 38.19 66.57 37.29L66.57 37.29Q64.1 32.28 61.23 29.32Q58.35 26.37 55.23 25.11Q52.11 23.86 48.91 23.86L48.91 23.86Q44.43 23.86 41.8 26.41Q39.18 28.95 39.18 33.1L39.18 33.1Q39.18 35.56 40.3 37.68Q41.43 39.79 44.51 41.81Q47.59 43.82 53.38 45.95L53.38 45.95Q59.75 48.25 63.49 50.88Q67.22 53.51 68.85 56.76Q70.47 60 70.43 64.15L70.43 64.15Q70.43 68.5 68.27 72.07Q66.12 75.65 62.07 77.78Q58.03 79.92 52.19 79.92Z" fill={color} />
    </svg>
  );
}

export function Health({ health }: { health: string }) {
  const tone = healthTone[health] || 'muted';
  return <span className={`chip ${tone === 'muted' ? '' : tone}`}><span className={`dot ${tone}`} />{healthLabel(health)}</span>;
}

export function Page({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="page fade-in">
      <div className="page-head"><h1 className="page-title">{title}</h1>{aside ? <div className="aside">{aside}</div> : null}</div>
      {children}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><div className="t">{title}</div>{children ? <div className="small">{children}</div> : null}</div>;
}

export function Spinner({ label }: { label?: string }) {
  return <span className="muted small" style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spin" />{label}</span>;
}

/** Loading / error / stale-data framing shared by every screen. */
export function Loaded<T>({ r, children, empty }: { r: Resource<T>; children: (d: T) => ReactNode; empty?: ReactNode }) {
  if (r.data === undefined) {
    if (r.loading) return <div className="panel panel-pad"><Spinner label="Loading…" /></div>;
    if (r.error) {
      return (
        <div className="panel panel-pad">
          <div className="err" style={{ marginBottom: 10 }}>{r.offline ? 'Starlane cannot be reached from this computer.' : r.error.message}</div>
          <button className="btn sm" onClick={() => void r.reload()}>Try again</button>
        </div>
      );
    }
    return <>{empty}</>;
  }
  return <>{children(r.data)}</>;
}

export function Stale({ r }: { r: Resource<unknown> }) {
  if (!r.error || r.data === undefined) return null;
  return <span className="chip warn" title={r.error.message}>{r.offline ? 'Offline' : 'Not refreshed'} · {asOf(r.fetchedAt)}</span>;
}

export const Chevron = () => <span className="chev" aria-hidden="true">›</span>;

// ── Motion primitives ─────────────────────────────────────────────────────
// Motion here carries meaning only (a value changed, work is happening, a
// decision landed). Durations sit in the 150–600 ms band people read as
// "responsive but visible"; ease-out because things arriving should settle,
// not accelerate. prefers-reduced-motion turns all of it off (styles.css).
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A figure that counts from its previous value to the new one — only when the
 * value really changes, so a refresh with the same number stays still. Tabular
 * numerals in a box sized for the final string keep Indian-grouping commas
 * from shifting as digits grow.
 */
export function Figure({ value, format, ms = 600 }: { value: number; format: (n: number) => string; ms?: number }) {
  const prev = useRef<number | null>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === null || from === value || reducedMotion()) { setShown(value); return; }
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setShown(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  const final = format(value);
  return <span className="fig" style={{ display: 'inline-block', minWidth: `${final.length}ch` }}>{format(Number.isInteger(value) ? Math.round(shown) : Math.round(shown * 100) / 100)}</span>;
}

/** A proportion bar that grows from its start (scaleX) — pre-attentive length reads faster than numbers. */
export function Bar({ ratio, tone = 'ink', label }: { ratio: number; tone?: 'ink' | 'warn' | 'ok' | 'bad' | 'faint'; label?: string }) {
  const r = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  return (
    <span className="bar" role={label ? 'img' : undefined} aria-label={label}>
      <span className={`bar-fill ${tone}`} style={{ transform: `scaleX(${r})` }} />
    </span>
  );
}

/** Three dots that rise in turn — "working", with a visible rhythm but no false progress. */
export function TypingDots({ label = 'Working' }: { label?: string }) {
  return <span className="typing" role="status" aria-label={label}><i /><i /><i /></span>;
}

/** A check that draws itself once — closure for a completed decision. */
export function DoneCheck() {
  return (
    <svg className="done-check" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M7 12.5l3.2 3.2L17 9" />
    </svg>
  );
}

// ── Shared feature primitives ─────────────────────────────────────────────

const KIND_TITLE: Record<string, string> = {
  fact: 'From your records', calculated: 'Worked out from your records', assumption: 'An assumption — change it if you know better',
  estimate: 'A projection that depends on assumptions', model: 'Inferred by Starlane — may be wrong', observed: 'From your records', forecast: 'A projection',
};

export function showValue(v: unknown, unit?: string): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') {
    if (unit === 'INR') return `₹${Math.round(v).toLocaleString('en-IN')}`;
    const s = Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return unit && unit !== 'INR' ? `${s} ${unit}` : s;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function KindTag({ kind }: { kind: string }) {
  return <span className={`kind ${kind}`} title={KIND_TITLE[kind] || kind}>{kind}</span>;
}

export function FactRow({ f }: { f: EvidenceItem }) {
  return (
    <div className="fact">
      <span>{f.label}{f.note ? <span className="faint small"> · {f.note}</span> : null}</span>
      <span className="fig">{showValue(f.value, f.unit)}</span>
      <KindTag kind={f.kind} />
    </div>
  );
}

/** Evidence is one primitive across features: what, what kind, from where. */
export function EvidencePanel({ ev, title = 'Evidence' }: { ev: EvidenceSet | null | undefined; title?: string }) {
  if (!ev) return null;
  return (
    <div>
      <h2 className="section">{title}</h2>
      <div className="panel">{ev.facts.length ? ev.facts.map((f, i) => <FactRow key={i} f={f} />) : <Empty title="No evidence was recorded." />}</div>
      <div className="small faint" style={{ marginTop: 8 }}>
        {ev.summary}{ev.method ? ` ${ev.method}.` : ''}{ev.sources.length ? ` Source: ${ev.sources.join(', ')}.` : ''}
      </div>
    </div>
  );
}

export function LifecycleChip({ state }: { state: ActionLifecycle }) {
  const tone = LIFECYCLE_TONE[state] || 'muted';
  return <span className={`chip ${tone === 'muted' ? '' : tone}`}>{LIFECYCLE_LABEL[state] || state}</span>;
}

export function ActionList({ actions, onOpen, empty }: { actions: FeatureAction[]; onOpen: (id: string) => void; empty?: ReactNode }) {
  if (!actions.length) return <>{empty ?? <Empty title="No actions." />}</>;
  return (
    <ul className="rows">
      {actions.map((a) => (
        <li key={a.id}>
          <button className="row" onClick={() => onOpen(a.id)}>
            <span className={`risk ${a.riskLevel}`} aria-label={`${a.riskLevel} risk`} />
            <span style={{ minWidth: 0 }}>
              <div className="t">{a.title}</div>
              <div className="s">{a.description || a.type.replace(/_/g, ' ')}</div>
            </span>
            <LifecycleChip state={a.lifecycle} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export const inrShort = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
