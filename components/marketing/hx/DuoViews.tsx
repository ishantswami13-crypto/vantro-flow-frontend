// Product windows for the two home cards ("For Finance Teams", "For Owners").
// Laid out on a fixed 979 x 547 unit grid (one unit = one CSS pixel at a
// 1440px viewport), so every gap, row and label lands on the same spot at
// any width. Sample data on a fictional business.

import type { CSSProperties, ReactNode } from "react";

const at = (x: number, y: number, w?: number, h?: number): CSSProperties =>
  ({ "--x": x, "--y": y, ...(w != null ? { "--w": w } : {}), ...(h != null ? { "--h": h } : {}) }) as CSSProperties;

const P = {
  plus: "M8 3v10M3 8h10",
  agent: "M3 5.5A2.5 2.5 0 0 1 5.5 3h5A2.5 2.5 0 0 1 13 5.5v3A2.5 2.5 0 0 1 10.5 11H7l-3 2v-2.3A2.5 2.5 0 0 1 3 8.5z",
  vault: "M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z",
  more: "M4 8h.01M8 8h.01M12 8h.01",
  apps: "M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z",
  spaces: "M3 4h10v3H3zM3 9h10v3H3z",
  pin: "M10 2.5l3.5 3.5-2 1-2.5 2.5.5 2.5-1 1-2.5-2.5L3 13.5l2.5-3L3 8l1-1 2.5.5L9 5l1-2.5z",
  recent: "M8 3a5 5 0 1 1-5 5M8 5v3l2 1.5",
  folder: "M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z",
  doc: "M4.5 2.5h5l2.5 2.5v8.5h-7.5z",
  sheet: "M3 3h10v10H3zM3 6.5h10M3 10h10M7 3v10",
};

function I({ d, className }: { d: string; className?: string }) {
  return (
    <svg className={className ?? "dw-i"} viewBox="0 0 16 16" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const RAIL: Array<[string, string, number]> = [
  ["New", P.plus, 38], ["Agent", P.agent, 65], ["Vault", P.vault, 93], ["More", P.more, 120],
  ["Apps", P.apps, 161], ["Spaces", P.spaces, 188], ["Pinned", P.pin, 216], ["Recent", P.recent, 243],
];

function Rail({ active }: { active?: string }) {
  return (
    <aside className="dw-rail" aria-hidden>
      <b className="dw-logo" style={at(17, 16)}>S</b>
      {RAIL.map(([l, d, y]) => (
        <span key={l} className={`dw-rl${active === l ? " on" : ""}`} style={at(17, y)}>
          <I d={d} />
          <small>{l}</small>
        </span>
      ))}
    </aside>
  );
}

function Win({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`dw-host ${className}`} role="img" aria-label={label}>
      <div className="dw">{children}</div>
    </div>
  );
}

/* For Finance Teams: one close, its files, agents and playbooks. */
export function CloseWindow() {
  const vaults = ["Bank Statements", "Supplier Bills", "Sales Ledger"];
  const plays = ["Reconcile Bank Lines", "Chase Overdue Invoices", "Review FX Revaluation"];
  return (
    <Win label="A month-end close in Starlane: the files attached, an agent instruction, and the vaults and playbooks for the close. Sample data.">
      <Rail />
      <div className="dw-band" />
      <p className="dw-t xs mute" style={at(89, 27)}>Close period #: 2026-10 · Halden UK</p>
      <b className="dw-badge" style={at(61, 35)}>O</b>
      <p className="dw-t serif xl" style={at(89, 45)}>October Close — Halden UK</p>
      <span className="dw-ext" style={at(326, 45)}><I d={P.doc} />Internal</span>
      <span className="dw-tab on" style={at(61, 80, 35)}>Home</span>
      {[["Tasks", 104], ["Vault", 139], ["Agents", 171], ["Ledgers", 212], ["Reports", 254], ["History", 297]].map(([t, x]) => (
        <span key={t} className="dw-tab" style={at(x as number, 80)}>{t}</span>
      ))}

      <div className="dw-box" style={at(61, 112, 960, 110)} />
      <span className="dw-chip" style={at(74, 125, 107, 27)}><I d={P.folder} className="dw-i fold" />Bank Statement Oct</span>
      <span className="dw-chip" style={at(188, 125, 107, 27)}><I d={P.sheet} className="dw-i red" />Trial Balance Oct</span>
      <p className="dw-t sm" style={at(74, 170)}>Please run</p>
      <span className="dw-ref" style={at(118, 170)}><i />Match bank lines against open invoices and flag the gaps</span>
      <p className="dw-t sm" style={at(301, 170)}>for the files attached.</p>
      <I d={P.plus} className="dw-i plus" />

      <p className="dw-t md" style={at(61, 247)}>Vaults</p>
      <p className="dw-t xs mute" style={at(61, 261)}>Ledgers and statements for this close</p>
      {vaults.map((v, i) => (
        <div key={v} className="dw-card" style={at(61 + i * 207.5, 277, 198, 81)}>
          <I d={P.folder} className="dw-i card" />
          <span>{v}</span>
        </div>
      ))}
      <p className="dw-t md" style={at(61, 382)}>Library</p>
      <p className="dw-t xs mute" style={at(61, 397)}>Agent playbooks for close work</p>
      {plays.map((v, i) => (
        <div key={v} className="dw-card" style={at(61 + i * 207.5, 413, 198, 81)}>
          <I d={P.folder} className="dw-i card" />
          {i < 2 && <I d={P.pin} className="dw-i pin" />}
          <span>{v}</span>
        </div>
      ))}
    </Win>
  );
}

/* For Owners: overdue invoices Starlane reviewed overnight. */
const ROWS: Array<[string, string, "prog" | "ready", string]> = [
  ["INV-2291 · Arlo Freight", "Halden UK", "prog", "Drafting reminder..."],
  ["INV-2310 · Meridian GmbH", "Halden GmbH", "prog", "Drafting reminder..."],
  ["INV-2288 · Kestrel Retail", "Halden UK", "prog", "Matching payment..."],
  ["INV-1042 · Gupta Traders", "Halden India", "ready", ""],
  ["INV-2302 · Sora Imports", "Halden UK", "ready", ""],
];

export function ReviewWindow() {
  return (
    <Win label="Receivables review in Starlane: invoices reviewed overnight, ready to approve, with status and a summary for each. Sample data.">
      <Rail />
      <p className="dw-t serif xl" style={at(60, 34)}>Receivables Review</p>
      <b className="dw-badge sm" style={at(63, 68)}>S</b>
      <p className="dw-t sm" style={at(80, 68)}><b>Starlane reviewed 14 overdue invoices for you</b> <span className="mute">since yesterday.</span> <span className="mute">⌃</span></p>
      {[["31", "Ready to approve"], ["8", "Assigned to you"], ["4", "Disputed, on hold"]].map(([n, l], i) => (
        <div key={l} className="dw-stat" style={at(60 + i * 224, 83, 214, 52)}>
          <b>{n}</b>
          <span>{l}</span>
        </div>
      ))}
      <span className="dw-tab on" style={at(60, 171, 66)}>My approvals (12)</span>
      <span className="dw-tab" style={at(139, 171)}>All (31)</span>
      <div className="dw-th" style={at(60, 191, 940, 22)} />
      {[["Invoice", 68], ["Status", 274], ["Starlane summary", 387], ["Last updated", 534]].map(([t, x]) => (
        <span key={t} className="dw-t xs mute" style={at(x as number, 202)}>{t}</span>
      ))}
      {ROWS.map(([n, s, st, sum], i) => {
        const y = 237 + i * 45.2;
        return (
          <div key={n}>
            <span className="dw-doc" style={at(70, y - 7)}><I d={P.doc} /></span>
            <p className="dw-t sm" style={at(80, y - 7)}>{n}</p>
            <p className="dw-t xs mute" style={at(80, y + 8)}>{s}</p>
            <span className={`dw-st ${st}`} style={at(274, y)}><i />{st === "prog" ? "In progress" : "Ready for review"}</span>
            {sum ? (
              <span className="dw-t xs mute dw-sum" style={at(387, y)}><b className="dw-badge xs">S</b>{sum}</span>
            ) : (
              <span className="dw-cnt" style={at(387, y)}><i className="g" />5<i className="o" />2<i className="r" />0</span>
            )}
            <span className="dw-t xs mute" style={at(534, y)}>Just now</span>
            {i < ROWS.length - 1 && <hr className="dw-hr" style={at(60, y + 22.6, 940)} />}
          </div>
        );
      })}
    </Win>
  );
}

/* Dry-brush painted backdrop for a duo card. */
export function DuoPaint({ id, base, dark, light }: { id: string; base: string; dark: string; light: string }) {
  return (
    <svg className="dw-paint" viewBox="0 0 680 688" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <filter id={`${id}-r`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency=".02 .035" numOctaves="3" seed="5" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="150" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="22" result="b" />
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="9" result="n" />
          <feComposite in="b" in2="n" operator="arithmetic" k2="1" k3="1.15" k4="-.72" result="c" />
          <feComponentTransfer in="c" result="a"><feFuncA type="linear" slope="5" intercept="-1.9" /></feComponentTransfer>
          <feFlood floodColor={dark} />
          <feComposite in2="a" operator="in" />
        </filter>
        <filter id={`${id}-s`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="1" seed="13" result="s" />
          <feColorMatrix in="s" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 4.4 -2.9`} />
        </filter>
        <radialGradient id={`${id}-g`} cx=".12" cy=".85" r=".9">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={base} />
        </radialGradient>
        <filter id={`${id}-w`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="21" result="s" />
          <feColorMatrix in="s" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 3.2 -1.9" />
        </filter>
      </defs>
      <rect width="680" height="688" fill={`url(#${id}-g)`} />
      <rect width="680" height="688" filter={`url(#${id}-s)`} opacity=".55" />
      <g filter={`url(#${id}-r)`}>
        <path d="M250 -40 H720 V420 C 640 380, 560 330, 470 300 C 380 270, 300 200, 270 120 C 255 70, 248 20, 250 -40Z" />
        <path d="M600 380 C 650 420, 700 460, 720 520 V720 H560 C 600 620, 590 500, 600 380Z" />
      </g>
      <rect width="680" height="688" filter={`url(#${id}-w)`} opacity=".09" />
    </svg>
  );
}

/* Accordion view for Agents: a run in progress, 688 x 517 unit grid. */
const STEPS: Array<[string[], "done" | "run" | "wait"]> = [
  [["Extract agreed terms from", "Customer_Terms_Tracker.xlsx"], "done"],
  [["Parse the bank statement and locate", "each receipt"], "done"],
  [["Compare each receipt against", "the open invoice"], "run"],
  [["Flag differences and build the", "match table"], "wait"],
  [["Generate 3 deliverables — overdue", "memo, exposure matrix, and", "match index"], "wait"],
];
const OUTS: Array<[string, string, "doc" | "xls"]> = [
  ["EU_Overdue_Review_Me…mo", ".docx", "doc"],
  ["Credit_Exposure_Matrix", ".xlsx", "xls"],
  ["Bank_Match_Index", ".docx", "doc"],
];

export function AgentRunView() {
  let y = 127;
  return (
    <div className="aw-host" role="img" aria-label="A Starlane agent run in progress: a summary of findings, files it produced, and a checklist of steps. Sample data.">
      <DuoPaint id="aw-p" base="#2C2B28" light="#3B3A36" dark="#191816" />
      <div className="aw">
        <div className="aw-win">
          <span className="aw-btn" style={at(193, 69, 66, 26)}><svg viewBox="0 0 16 16" className="dw-i" aria-hidden><path d="M6 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM1.5 13.5c.5-2.5 2.3-4 4.5-4s4 1.5 4.5 4M12.5 5v4M10.5 7h4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>Share</span>
          <span className="aw-btn sq" style={at(266, 69, 26, 26)}>···</span>
          <span className="aw-btn sq on" style={at(297, 69, 26, 26)}><i /></span>

          <div className="aw-chat" style={at(-340, 96, 592)}>
            <p className="fade">…where a customer is on both lists, flag both.</p>
            <p>On the credit side, Arlo Freight’s limit was cut from $2.6M to $2M, below the exposure the sales team agreed in the September review.</p>
            <p>Meridian GmbH moved from 30-day to 60-day terms in March, and the “subject to approval” note on its order was never cleared. Four invoices sit inside the agreed range but need a person to confirm, and two receipts landed in the wrong entity’s bank account, so they still show as open in the ledger. Each one below cites the ledger line and a suggested next step, ready to fold into your next round of reminders.</p>
            <p>I’ve prepared the EU Overdue Review Memo, the Credit Exposure Matrix and the Bank Match Index. They’ll appear in your Vault.</p>
          </div>
          <div className="aw-files" style={at(-340, 395, 604, 130)}>
            {["EU_Overdue_Review_Memo.docx", "Credit_Exposure_Matrix.xlsx", "Bank_Match_Index.docx"].map((f, i) => (
              <span key={f} style={at(334, 22 + i * 33)}>{f}</span>
            ))}
          </div>

          <div className="aw-side" style={at(336, 69, 283, 480)}>
            <span className="aw-h" style={at(20, 30)}>Progress <i>⌄</i></span>
            <i className="aw-rail" style={at(29.5, 66, 1, 196)} />
            {STEPS.map(([lines, st], i) => {
              const top = y - 69;
              y += lines.length * 16.5 + 14;
              return (
                <div key={i} className={`aw-step ${st}`} style={at(16, top - 8)}>
                  <b className="aw-ic" />
                  <span>{lines.map((l) => <span key={l}>{l}</span>)}</span>
                </div>
              );
            })}
            <span className="aw-h" style={at(20, 332)}>Outputs <i>⌄</i></span>
            {OUTS.map(([n, ext, k], i) => (
              <span key={n} className={`aw-out ${k}`} style={at(20, 359 + i * 28)}><b />{n}<em>{ext}</em></span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Accordion view frames: the real product window, zoomed, on dark paint. */
export function AccFrame({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  return (
    <div className={`aw-host acc-f ${className}`}>
      <DuoPaint id={id} base="#2C2B28" light="#3B3A36" dark="#191816" />
      {children}
    </div>
  );
}
