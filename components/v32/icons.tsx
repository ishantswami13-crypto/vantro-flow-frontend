// Line icons copied from the Version 32 design (Starlane.html ICONS map):
// 24px grid, 1.5px stroke, currentColor. Sources / Agents / Control /
// Settings / More are not in the design's ICONS map; they are drawn in the
// same style so the second nav group matches the first.

import React from "react";

type P = { size?: number; className?: string; style?: React.CSSProperties };

function Svg({ size = 16, className, style, children, strokeWidth = 1.5 }: P & { children: React.ReactNode; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={{ flexShrink: 0, ...style }}>
      {children}
    </svg>
  );
}

export const IconBridge = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="9" /></Svg>;
export const IconScan = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><line x1="12" y1="12" x2="12" y2="4" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></Svg>;
export const IconDiscover = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><polygon points="15.5,8.5 13.2,13.2 8.5,15.5 10.8,10.8" /></Svg>;
export const IconWatch = (p: P) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Svg>;
export const IconMissions = (p: P) => <Svg {...p}><line x1="5" y1="3" x2="5" y2="21" /><path d="M5 4h13l-3 4 3 4H5" /></Svg>;
export const IconSimulate = (p: P) => <Svg {...p}><circle cx="5" cy="12" r="2" /><path d="M7 12h4" /><path d="M11 12c0-4 2-6 4-6s4 2 4 6-2 6-4 6-4-2-4-6z" /></Svg>;
export const IconMemory = (p: P) => <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3,4 3,9 8,9" /><polyline points="12,7 12,12 16,14" /></Svg>;
export const IconPrepared = (p: P) => <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><polyline points="8,12.5 11,15.5 16,9" /></Svg>;
export const IconSources = (p: P) => <Svg {...p}><ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" /><path d="M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" /></Svg>;
export const IconAgents = (p: P) => <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9.5" cy="11" r="0.9" fill="currentColor" stroke="none" /><circle cx="14.5" cy="11" r="0.9" fill="currentColor" stroke="none" /><path d="M9.5 15h5" /></Svg>;
export const IconControl = (p: P) => <Svg {...p}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /></Svg>;
export const IconSettings = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></Svg>;
export const IconMore = (p: P) => <Svg {...p}><circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" /></Svg>;
export const IconBell = (p: P) => <Svg {...p} strokeWidth={1.6}><path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c0.5-0.5 2-2 2-6z" /><path d="M9.5 18a2.5 2.5 0 0 0 5 0" /></Svg>;
export const IconSearch = (p: P) => <Svg {...p} strokeWidth={1.8}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p} strokeWidth={1.6}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>;
export const IconCalendar = (p: P) => <Svg {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="9" y1="3" x2="9" y2="7" /><line x1="15" y1="3" x2="15" y2="7" /></Svg>;
export const IconClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12,7 12,12 15,14" /></Svg>;
export const IconFileCheck = (p: P) => <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><polyline points="8,12.5 11,15.5 16,9" /></Svg>;
export const IconMic = (p: P) => <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="21" /></Svg>;
export const IconArrowUp = (p: P) => <Svg {...p} strokeWidth={1.8}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="6,11 12,5 18,11" /></Svg>;
// Drawn in the same style for the Scan composer menu and row tiles.
export const IconUpload = (p: P) => <Svg {...p}><path d="M12 15V4" /><polyline points="7,9 12,4 17,9" /><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></Svg>;
export const IconLink = (p: P) => <Svg {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>;
export const IconRupee = (p: P) => <Svg {...p}><path d="M6 4h12M6 9h12" /><path d="M9 4c4.2 0 6.5 1.8 6.5 5s-2.3 5-6.5 5H7l8.5 7" /></Svg>;
export const IconPromise = (p: P) => <Svg {...p}><path d="M4 12l4 4 4-4" /><path d="M8 16V8a4 4 0 0 1 8 0" /><path d="M14 18h6" /></Svg>;
export const IconSync = (p: P) => <Svg {...p}><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" /><polyline points="4,3 4,8 9,8" /><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" /><polyline points="20,21 20,16 15,16" /></Svg>;
export const IconSparkle = (p: P) => <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></Svg>;
