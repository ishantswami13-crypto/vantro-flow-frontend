// Starlane design tokens shared by desktop and mobile. They continue the web
// product (app/globals.css V32 values): warm-neutral paper, near-black ink,
// a dark navigation rail, Fraunces for the one sentence that matters on a
// screen, Plus Jakarta Sans for the interface, IBM Plex Mono for figures.
// One functional accent (slate) for focus/selection; green/amber/red only for
// state, never decoration.
export const color = {
  paper: '#F7F7F4',
  surface: '#FFFFFF',
  sunk: '#F1F0EC',
  ink: '#191917',
  graphite: '#63635F',
  faint: '#6E6D67',     // 5.0:1 on paper (WCAG AA for body text); was #8D8C86 at 3.3:1
  rule: '#EBEAE6',
  ruleStrong: '#D9D7D0',
  rail: '#1B1B18',
  railInk: '#F2F1EC',
  railFaint: '#A09F98',
  accent: '#4B5170',
  accentSoft: '#E8E9F0',
  ok: '#2F6B4F', okSoft: '#E9F2EC',
  warn: '#8A5A12', warnSoft: '#F7EFDF',
  bad: '#A23B3B', badSoft: '#F7E9E9',
} as const;

export const font = {
  display: 'Fraunces',
  ui: 'Plus Jakarta Sans',
  mono: 'IBM Plex Mono',
} as const;

// A short, strict scale (Bringhurst-style ratios around 15px body).
export const type = {
  sentence: { size: 30, line: 38, weight: '400' },   // the "Now" sentence
  title: { size: 22, line: 28, weight: '400' },
  heading: { size: 15, line: 20, weight: '600' },
  body: { size: 14, line: 21, weight: '400' },
  small: { size: 12.5, line: 18, weight: '400' },
  figure: { size: 14, line: 20, weight: '500' },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;
export const radius = { control: 6, panel: 10, pill: 999 } as const;

// Motion carries meaning only (sync starting, state change, approval done).
export const motion = { quick: 140, state: 220, reveal: 320, easing: 'cubic-bezier(.2,.7,.2,1)' } as const;

export const healthTone: Record<string, 'ok' | 'warn' | 'bad' | 'muted' | 'accent'> = {
  healthy: 'ok', syncing: 'accent', connected: 'accent', pairing: 'accent',
  delayed: 'warn', stale: 'warn', error: 'bad', revoked: 'muted', not_connected: 'muted',
  disconnected: 'muted', unavailable: 'muted',
};
