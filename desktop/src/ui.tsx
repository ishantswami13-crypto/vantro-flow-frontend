import type { ReactNode } from 'react';
import { asOf, healthLabel, healthTone } from '@starlane/contracts';
import type { Resource } from './lib/useResource';

export function Mark({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  // Same four-point star as the app icon (desktop/scripts/make-icon.mjs).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c.6 5.6 4.4 9.4 10 10-5.6.6-9.4 4.4-10 10-.6-5.6-4.4-9.4-10-10 5.6-.6 9.4-4.4 10-10Z" fill={color} />
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
