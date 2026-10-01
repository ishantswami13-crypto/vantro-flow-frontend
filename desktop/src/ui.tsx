import { useEffect, useRef, useState, type ReactNode } from 'react';
import { asOf, healthLabel, healthTone, LIFECYCLE_LABEL, LIFECYCLE_TONE, type ActionLifecycle, type EvidenceItem, type EvidenceSet, type FeatureAction } from '@starlane/contracts';
import type { Resource } from './lib/useResource';

export function Mark({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  // The Starlane S, same master as the app icon (brand/starlane-s.svg).
  return (
    <svg width={size} height={size} viewBox="0 0 1000 1000" aria-hidden="true">
      <path d="M479.6 0Q559.9 0 603.4 17Q646.9 34 678.2 53.1Q694.6 62.6 704.8 67.3Q715 72.1 724.5 72.1Q738.1 72.1 744.2 57.1Q750.3 42.2 754.4 12.2L785.7 12.2Q784.4 38.1 782.3 74.1Q780.3 110.2 779.6 168.7Q778.9 227.2 778.9 322.4L747.6 322.4Q742.2 251.7 715 185Q687.8 118.4 638.1 75.5Q588.4 32.7 516.3 32.7Q451 32.7 408.8 69.4Q366.7 106.1 366.7 171.4Q366.7 225.9 393.9 264.6Q421.1 303.4 473.5 340.1Q525.9 376.9 600.7 428.6Q666 470.7 717.7 512.9Q769.4 555.1 800.7 608.2Q832 661.2 832 734.7Q832 824.5 785 883Q738.1 941.5 661.9 970.7Q585.7 1000 494.6 1000Q410.2 1000 359.9 983.7Q309.5 967.3 275.5 949.7Q245.6 930.6 229.3 930.6Q215.6 930.6 209.5 945.6Q203.4 960.5 199.3 990.5L168 990.5Q170.7 957.8 171.4 914.3Q172.1 870.7 172.8 800.7Q173.5 730.6 173.5 623.1L204.8 623.1Q210.2 712.9 235.4 791.2Q260.5 869.4 312.9 917Q365.3 964.6 452.4 964.6Q500 964.6 537.4 947.6Q574.8 930.6 598 896.6Q621.1 862.6 621.1 812.2Q621.1 755.1 594.6 712.9Q568 670.7 522.4 634Q476.9 597.3 417 559.2Q353.1 517 297.3 474.8Q241.5 432.7 208.2 378.2Q174.8 323.8 174.8 249Q174.8 163.3 217.7 108.2Q260.5 53.1 330.6 26.5Q400.7 0 479.6 0" fill={color} />
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
