// Starlane's app icon set, drawn on the same grid as the public site's
// glyphs (components/marketing/home/Glyph.tsx): 16px, 1.25 stroke, square
// caps, mitred joins, currentColor. Geometric and quiet, so they sit next to
// text without competing with it. Export names are unchanged from the
// Version 32 set so every caller keeps working.

import React from "react";

type P = { size?: number; className?: string; style?: React.CSSProperties };

function Svg({ size = 16, className, style, children }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false" className={className} style={{ flexShrink: 0, ...style }}>
      {children}
    </svg>
  );
}

const Fill = (props: React.SVGProps<SVGRectElement>) => <rect {...props} fill="currentColor" stroke="none" />;

// Places
export const IconBridge = (p: P) => <Svg {...p}><path d="M2.5 13.5V6.8L8 2.6l5.5 4.2v6.7z" /><path d="M6.5 13.5V9.5h3v4" /></Svg>;
export const IconScan = (p: P) => <Svg {...p}><path d="M2.5 3h11v8h-5.5l-3 2.5V11H2.5z" /><Fill x="5" y="6.4" width="1.3" height="1.3" /><Fill x="7.35" y="6.4" width="1.3" height="1.3" /><Fill x="9.7" y="6.4" width="1.3" height="1.3" /></Svg>;
export const IconDiscover = (p: P) => <Svg {...p}><circle cx="8" cy="8" r="5.75" /><path d="M10.4 5.6L9.2 9.2 5.6 10.4 6.8 6.8z" /></Svg>;
export const IconWatch = (p: P) => <Svg {...p}><path d="M1.5 11h4V5h4v4h5" /></Svg>;
export const IconMissions = (p: P) => <Svg {...p}><Fill x="2" y="3.4" width="2" height="2" /><Fill x="2" y="7" width="2" height="2" /><Fill x="2" y="10.6" width="2" height="2" /><path d="M6.5 4.4h7.5M6.5 8h7.5M6.5 11.6h5" /></Svg>;
export const IconDecision = (p: P) => <Svg {...p}><path d="M8 2l6 6-6 6-6-6z" /><Fill x="7" y="7" width="2" height="2" /></Svg>;
export const IconSimulate = (p: P) => <Svg {...p}><path d="M2 8h12M5 5v6M11 5v6" /><Fill x="5" y="7.25" width="6" height="1.5" /></Svg>;
export const IconMemory = (p: P) => <Svg {...p}><path d="M8 2.5l5.5 2.75L8 8 2.5 5.25z" /><path d="M2.5 8.25L8 11l5.5-2.75M2.5 11.25L8 14l5.5-2.75" /></Svg>;
export const IconPrepared = (p: P) => <Svg {...p}><path d="M3 2.5h7l3 3v8H3z" /><path d="M5.6 9.2l1.6 1.5 3.2-3.3" /></Svg>;
export const IconSources = (p: P) => <Svg {...p}><ellipse cx="8" cy="4" rx="5" ry="1.75" /><path d="M3 4v8c0 1 2.2 1.75 5 1.75s5-.75 5-1.75V4" /><path d="M3 8c0 1 2.2 1.75 5 1.75S13 9 13 8" /></Svg>;
export const IconAgents = (p: P) => <Svg {...p}><rect x="2.5" y="4.5" width="11" height="8.5" /><path d="M8 2v2.5" /><Fill x="5.25" y="7.75" width="1.5" height="1.5" /><Fill x="9.25" y="7.75" width="1.5" height="1.5" /></Svg>;
export const IconControl = (p: P) => <Svg {...p}><path d="M8 1.9l5.25 2v4c0 3.1-2.3 5.3-5.25 6.3-2.95-1-5.25-3.2-5.25-6.3v-4z" /><path d="M5.8 8.2l1.5 1.5 3-3" /></Svg>;
export const IconSettings = (p: P) => <Svg {...p}><path d="M2 4.5h7M12.5 4.5H14M2 11.5h1.5M7 11.5h7" /><rect x="9" y="3" width="3" height="3" /><rect x="3.5" y="10" width="3" height="3" /></Svg>;
export const IconMore = (p: P) => <Svg {...p}><Fill x="2.5" y="7.25" width="1.5" height="1.5" /><Fill x="7.25" y="7.25" width="1.5" height="1.5" /><Fill x="12" y="7.25" width="1.5" height="1.5" /></Svg>;
export const IconLibrary = (p: P) => <Svg {...p}><path d="M2.5 2.5h3v11h-3zM6.5 2.5h3v11h-3z" /><path d="M10.4 3.4l2.5-.7 2.3 10.4-2.5.6z" /></Svg>;
export const IconHistory = (p: P) => <Svg {...p}><path d="M2.75 8a5.25 5.25 0 1 0 1.55-3.7" /><path d="M2.5 2.5v2.75h2.75" /><path d="M8 5.25V8l2 1.5" /></Svg>;

// Controls
export const IconBell = (p: P) => <Svg {...p}><path d="M4 11.5V7a4 4 0 0 1 8 0v4.5l1.25 1.25h-10.5z" /><path d="M6.5 14.5h3" /></Svg>;
export const IconSearch = (p: P) => <Svg {...p}><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5l3.5 3.5" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p}><path d="M8 3v10M3 8h10" /></Svg>;
export const IconCalendar = (p: P) => <Svg {...p}><rect x="2.5" y="3.5" width="11" height="10" /><path d="M2.5 6.75h11M5.5 2v2.5M10.5 2v2.5" /></Svg>;
export const IconClock = (p: P) => <Svg {...p}><circle cx="8" cy="8" r="5.75" /><path d="M8 4.75V8l2.25 1.5" /></Svg>;
export const IconFileCheck = IconPrepared;
export const IconMic = (p: P) => <Svg {...p}><rect x="6" y="2.5" width="4" height="6.5" /><path d="M3.75 7.5a4.25 4.25 0 0 0 8.5 0M8 11.75v2" /></Svg>;
export const IconArrowUp = (p: P) => <Svg {...p}><path d="M8 13V3.5M4 7.25L8 3.25l4 4" /></Svg>;
export const IconArrowRight = (p: P) => <Svg {...p}><path d="M2.75 8h10M9 4l4 4-4 4" /></Svg>;
export const IconUpload = (p: P) => <Svg {...p}><path d="M8 10.5V2.75M4.5 6.25L8 2.75l3.5 3.5M2.5 10.5v3h11v-3" /></Svg>;
export const IconLink = (p: P) => <Svg {...p}><path d="M6.5 9.5l3-3" /><path d="M7.25 4.25L8.5 3a2.5 2.5 0 0 1 3.5 3.5L10.75 7.75M8.75 11.75L7.5 13A2.5 2.5 0 0 1 4 9.5l1.25-1.25" /></Svg>;
export const IconRupee = (p: P) => <Svg {...p}><path d="M4.5 3h7M4.5 6.25h7" /><path d="M6 3c2.8 0 4.25 1.2 4.25 3.25S8.8 9.5 6 9.5H4.75l5.5 4.5" /></Svg>;
export const IconRanked = (p: P) => <Svg {...p}><path d="M2.5 4h11M2.5 8h7.5M2.5 12h4" /></Svg>;
export const IconPromise = (p: P) => <Svg {...p}><path d="M2.5 3h11v8h-5.5l-3 2.5V11H2.5z" /><path d="M5.6 7l1.5 1.5 3.3-3.2" /></Svg>;
export const IconSync = (p: P) => <Svg {...p}><path d="M13 6.75A5.1 5.1 0 0 0 3.5 5.25M3 2.5v2.75h2.75" /><path d="M3 9.25a5.1 5.1 0 0 0 9.5 1.5M13 13.5v-2.75h-2.75" /></Svg>;
export const IconSparkle = (p: P) => <Svg {...p}><path d="M8 1.75L9.4 6.6 14.25 8 9.4 9.4 8 14.25 6.6 9.4 1.75 8 6.6 6.6z" /></Svg>;
export const IconCopy = (p: P) => <Svg {...p}><rect x="5.5" y="5.5" width="8" height="8" /><path d="M10.5 5.5V2.5h-8v8h3" /></Svg>;
export const IconCheck = (p: P) => <Svg {...p}><path d="M3 8.5l3 3 7-7" /></Svg>;
export const IconTrash = (p: P) => <Svg {...p}><path d="M2.5 4h11M6 4V2.5h4V4M4 4l.75 9.5h6.5L12 4M6.75 6.75v4.5M9.25 6.75v4.5" /></Svg>;
export const IconWhatsApp = (p: P) => <Svg {...p}><path d="M2.5 13.5l.9-2.7A5.5 5.5 0 1 1 5.6 12.9z" /></Svg>;
export const IconBookmark = (p: P) => <Svg {...p}><path d="M4 2.5h8v11l-4-3-4 3z" /></Svg>;
export const IconBookmarkFilled = (p: P) => <Svg {...p}><path d="M4 2.5h8v11l-4-3-4 3z" fill="currentColor" /></Svg>;
