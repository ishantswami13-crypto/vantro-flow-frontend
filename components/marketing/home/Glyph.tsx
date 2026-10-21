// Starlane's glyph set: 16px grid, 1.25 stroke, square caps and mitred joins.
// Used sparingly (systems, integrations, control, verification), never as
// decoration.

const PATHS: Record<string, React.ReactNode> = {
  system: <><rect x="2" y="3" width="12" height="10" /><path d="M2 7h12" /></>,
  signal: <path d="M1 11h5V5h4v4h5" />,
  evidence: <><path d="M2.5 2.5h8l3 3v8h-11z" /><rect x="5" y="8" width="3" height="3" className="g-fill" /></>,
  decision: <><path d="M8 2l6 6-6 6-6-6z" /><rect x="7" y="7" width="2" height="2" className="g-fill" /></>,
  gate: <><path d="M1 8h4M11 8h4" /><rect x="5" y="4" width="6" height="8" /></>,
  once: <path d="M2 8h8M7 5l3 3-3 3M13 4v8" />,
  verified: <><rect x="2" y="2" width="12" height="12" /><path d="M5 8.5l2.2 2.1L11 5.6" /></>,
  external: <><path d="M8 1v4M8 11v4M1 8h4M11 8h4" /><rect x="7" y="7" width="2" height="2" className="g-fill" /></>,
  range: <><path d="M2 8h12M5 5v6M11 5v6" /><rect x="5" y="7" width="6" height="2" className="g-fill" /></>,
  readonly: <><rect x="3" y="7" width="10" height="7" /><path d="M5.5 7V4.5h5V7" /></>,
  audit: <><path d="M3 2h10v12H3z" /><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" /></>,
  scope: <><rect x="2" y="2" width="12" height="12" /><rect x="5" y="5" width="6" height="6" /></>,
};

export type GlyphName = keyof typeof PATHS;

export function Glyph({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={`g ${className}`} width={size} height={size} viewBox="0 0 16 16" aria-hidden focusable="false">
      {PATHS[name]}
    </svg>
  );
}
