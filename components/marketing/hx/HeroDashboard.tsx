import { Fragment } from "react";

// The homepage hero: the Starlane Command Center on a painted panel, laid out
// on the reference's grid. Every position is in units of 1/2000 of the panel
// width (--u), so the window, its type, its hairlines and its gaps keep the
// same proportions at every size. Sample data on a fictional business.

const N = 132; // hairlines per area chart

// Collected on time: flat start, a lift through spring, steep finish.
function rampA(i: number) {
  const t = i / (N - 1);
  const base = 2 + 34 * Math.pow(t, 1.6);
  const step = t > 0.42 ? 18 * (1 - Math.exp(-(t - 0.42) * 14)) : 0;
  const surge = t > 0.8 ? 95 * Math.pow((t - 0.8) / 0.2, 1.7) : 0;
  return Math.min(158, base + step + surge);
}
// Collected this quarter: an S-curve with a plateau, then a second rise.
function rampB(i: number) {
  const t = i / (N - 1);
  const s1 = 150 / (1 + Math.exp(-(t - 0.28) * 16));
  const s2 = 60 / (1 + Math.exp(-(t - 0.62) * 14));
  return Math.max(2, s1 + s2 - 8);
}

const GROUPS: Array<[string, number, number, boolean]> = [
  ["Distributors", 70, 86, false],
  ["Retail", 59, 39, false],
  ["Exporters", 48, 40, false],
  ["Wholesale", 48, 52, false],
  ["Projects", 32, 28, false],
  ["Online", 23, 46, true],
  ["Other", 15, 27, true],
];

const OVERDUE: Array<[string, number, string]> = [
  ["Arlo Freight", 535, "41 days"],
  ["Meridian GmbH", 488, "37 days"],
  ["Kestrel Retail", 341, "26 days"],
  ["Sora Imports", 291, "22 days"],
  ["Gupta Traders", 253, "19 days"],
  ["Nolan & Daughters", 225, "17 days"],
];

const NAV = ["New Run", "Agents", "Vault", "Command Center", "More"];
const RECENTS = ["Overdue review, EU", "Supplier run, Q4", "Promise check, Arlo"];
const SPACES: Array<[string, string, string]> = [["U", "Halden UK", "#4E6A63"], ["G", "Halden GmbH", "#5B5670"], ["I", "Halden India", "#596B54"]];

function Chev() {
  return <svg className="hd-chev" viewBox="0 0 10 10" aria-hidden><path d="M2.5 4 5 6.5 7.5 4" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Drop({ x, w, label }: { x: number; w: number; label: string }) {
  return <span className="hd-drop" style={{ "--x": x, "--w": w } as React.CSSProperties}>{label}<Chev /></span>;
}
function Icon({ d }: { d: string }) {
  return <svg className="hd-ic" viewBox="0 0 16 16" aria-hidden><path d={d} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
const IC: Record<string, string> = {
  "New Run": "M8 3v10M3 8h10",
  Agents: "M3.5 5.5h9v6.5h-9zM6 8.2v.6M10 8.2v.6M8 3.5v2",
  Vault: "M2.5 4.5h4l1.2 1.5h5.8v6.5h-11zM10.8 10.3a1.3 1.3 0 1 0 0-.01",
  "Command Center": "M3 3v10h10M5.5 10.5l2.5-3 2 1.8 3-4",
  More: "M3.5 8h.01M8 8h.01M12.5 8h.01",
  Apps: "M6.3 9.7a2.8 2.8 0 1 1 3.4-3.4M9.7 6.3a2.8 2.8 0 1 1-3.4 3.4",
  History: "M8 2.8a5.2 5.2 0 1 1 0 10.4A5.2 5.2 0 0 1 8 2.8zM8 5.2V8l2 1.3",
  Spaces: "M3 6.5h10M4 4.3h8M3 6.5v5.7h10V6.5",
  Bell: "M4.5 11V7.5a3.5 3.5 0 0 1 7 0V11l1 1h-9zM6.8 13.4a1.4 1.4 0 0 0 2.4 0",
  Search: "M7.2 2.8a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8zM10.4 10.4l2.8 2.8",
  Filter: "M3 4.5h10M5 8h6M7 11.5h2",
  Down: "M8 3v7M5 7.5 8 10.5l3-3M4 13h8",
};

/** A chart of hairlines rising from a baseline, as in the reference. */
function Hairlines({ x0, x1, base, fn, id }: { x0: number; x1: number; base: number; fn: (i: number) => number; id: string }) {
  const step = (x1 - x0) / (N - 1);
  return (
    <g className="hd-hair" data-id={id}>
      {Array.from({ length: N }, (_, i) => {
        const h = fn(i);
        const x = x0 + i * step;
        return <line key={i} x1={x} x2={x} y1={base} y2={base - h} style={{ "--i": i } as React.CSSProperties} />;
      })}
    </g>
  );
}

export function HeroDashboard() {
  // Card 2 bar geometry: baseline at 275, 100% = 170.
  const cx = [105, 197, 289, 381, 473, 565, 657];
  return (
    <div className="hd" aria-hidden>
      <svg className="hd-defs" width="0" height="0">
        <defs>
          <filter id="hd-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 2.6 -1.35" result="speck" />
            <feComposite in="speck" in2="SourceAlpha" operator="in" result="speckIn" />
            <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="speckIn" /></feMerge>
          </filter>
          <filter id="hd-rough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="3" seed="7" result="t" />
            <feDisplacementMap in="SourceGraphic" in2="t" scale="120" xChannelSelector="R" yChannelSelector="G" result="d" />
            <feGaussianBlur in="d" stdDeviation="38" result="b" />
            <feTurbulence type="fractalNoise" baseFrequency=".62" numOctaves="2" seed="3" result="n" />
            <feComposite in="b" in2="n" operator="arithmetic" k2="1" k3=".95" k4="-.62" result="c" />
            <feComponentTransfer in="c" result="a"><feFuncA type="linear" slope="9" intercept="-3.4" /></feComponentTransfer>
            <feFlood floodColor="#404B4C" />
            <feComposite in2="a" operator="in" />
          </filter>
          <filter id="hd-spray" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="1" seed="11" result="s" />
            <feColorMatrix in="s" type="matrix" values="0 0 0 0 .25  0 0 0 0 .3  0 0 0 0 .3  0 0 0 5 -3.55" />
          </filter>
          <pattern id="hd-dots" width="3.2" height="3.2" patternUnits="userSpaceOnUse">
            <rect width="3.2" height="3.2" fill="#E2E3E6" />
            <circle cx="1.1" cy="1.1" r=".55" fill="#B9BCC2" />
            <circle cx="2.7" cy="2.7" r=".45" fill="#C7C9CE" />
          </pattern>
        </defs>
      </svg>
      <svg className="hd-paint" viewBox="0 0 2000 1090" preserveAspectRatio="none">
        <rect width="2000" height="1090" fill="#CDD8D9" />
        <rect width="2000" height="1090" filter="url(#hd-spray)" opacity=".8" />
        <g fill="#404B4C" filter="url(#hd-rough)">
          <path d="M-60 -60 H420 C 380 120, 300 220, 250 380 C 190 600, 230 860, 330 1150 H-60Z" />
          <path d="M-60 900 C 300 930, 520 960, 700 1010 C 820 1050, 900 1090, 960 1160 H-60Z" />
          <path d="M1560 -60 H2060 V1160 H1450 C 1640 1030, 1860 920, 1890 760 C 1930 520, 1820 300, 1720 120 C 1680 60, 1620 0, 1560 -60Z" />
          <path d="M1180 1160 C 1300 1060, 1420 1000, 1560 990 C 1640 1050, 1660 1100, 1680 1160Z" />
        </g>
      </svg>
      <div className="hd-win">
        {/* Sidebar */}
        <aside className="hd-side">
          <p className="hd-logo">Starlane</p>
          <span className="hd-tool" style={{ "--x": 218 } as React.CSSProperties}><Icon d={IC.Bell} /></span>
          <span className="hd-tool" style={{ "--x": 255 } as React.CSSProperties}><Icon d={IC.Search} /></span>
          {NAV.map((n, i) => (
            <span key={n} className={`hd-nav${n === "Command Center" ? " on" : ""}`} style={{ "--y": 108 + i * 37 } as React.CSSProperties}><Icon d={IC[n]} />{n}</span>
          ))}
          <span className="hd-h" style={{ "--y": 315 } as React.CSSProperties}>Apps</span>
          <span className="hd-nav" style={{ "--y": 353 } as React.CSSProperties}><Icon d={IC.Apps} />Collections Intelligence</span>
          <span className="hd-h" style={{ "--y": 412 } as React.CSSProperties}>Recents</span>
          {RECENTS.map((r, i) => <span key={r} className="hd-nav hd-rec" style={{ "--y": 450 + i * 37 } as React.CSSProperties}><i />{r}</span>)}
          <span className="hd-nav" style={{ "--y": 561 } as React.CSSProperties}><Icon d={IC.History} />View History</span>
          <span className="hd-h" style={{ "--y": 620 } as React.CSSProperties}>Spaces</span>
          {SPACES.map(([l, n, c], i) => <span key={n} className="hd-nav hd-space" style={{ "--y": 658 + i * 37 } as React.CSSProperties}><b style={{ background: c }}>{l}</b>{n}</span>)}
          <span className="hd-nav hd-mute" style={{ "--y": 769 } as React.CSSProperties}><Icon d={IC.Spaces} />View Spaces</span>
          <span className="hd-nav hd-user" style={{ "--y": 856 } as React.CSSProperties}><b>R</b>Riya Mehta</span>
        </aside>

        {/* Title bar */}
        <p className="hd-title">Halden Trading’s Command Center</p>
        <span className="hd-toggle"><i />Plan</span>
        <span className="hd-btn" style={{ "--x": 1375, "--w": 122 } as React.CSSProperties}>View all reports</span>
        <span className="hd-btn dark" style={{ "--x": 1507, "--w": 110 } as React.CSSProperties}><b>S</b>Ask Starlane</span>

        <p className="hd-notice"><b>S</b>There are 12 prepared actions waiting for your approval</p>

        {/* Card 1: collected on time */}
        <section className="hd-card" style={{ "--x": 347, "--y": 182, "--w": 519, "--h": 396 } as React.CSSProperties}>
          <p className="hd-big">92.4%<span>↑ 3%</span></p>
          <p className="hd-lbl">Collected on time</p>
          <Drop x={326} w={95} label="6 months" />
          <Drop x={425} w={71} label="2026" />
          <svg className="hd-plot" viewBox="0 0 519 396" preserveAspectRatio="none">
            <Hairlines x0={24} x1={495} base={281} fn={rampA} id="a" />
            <path className="hd-peer" d="M33 251 C 95 222, 160 205, 250 201 S 360 206, 400 196 S 470 160, 496 147" />
            <line className="hd-sep" x1="0" x2="519" y1="326" y2="326" />
          </svg>
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => <span key={m} className="hd-x" style={{ "--x": 30 + i * 91.4, "--y": 296 } as React.CSSProperties}>{m}</span>)}
          <span className="hd-leg" style={{ "--x": 23, "--y": 361 } as React.CSSProperties}><i className="hatch" />Your business</span>
          <span className="hd-leg" style={{ "--x": 137, "--y": 361 } as React.CSSProperties}><i className="dot light" /><u>Plan</u></span>
          <span className="hd-act" style={{ "--x": 452, "--y": 361 } as React.CSSProperties}><Icon d={IC.Filter} /></span>
          <span className="hd-act" style={{ "--x": 480, "--y": 361 } as React.CSSProperties}><Icon d={IC.Down} /></span>
        </section>

        {/* Card 2: collections by customer group */}
        <section className="hd-card" style={{ "--x": 890, "--y": 182, "--w": 727, "--h": 396 } as React.CSSProperties}>
          <p className="hd-ct">Collections by customer group</p>
          <p className="hd-cs">Based on share of each group’s invoices paid on time</p>
          <Drop x={604} w={99} label="This week" />
          <svg className="hd-plot" viewBox="0 0 727 396" preserveAspectRatio="none">
            {[0, 1, 2, 3, 4].map((k) => <line key={k} className="hd-grid" x1="58" x2="703" y1={105 + k * 42.5} y2={105 + k * 42.5} />)}
            {GROUPS.map(([, a, b, warn], i) => (
              <Fragment key={i}>
                <rect className="hd-bar" x={cx[i] - 16} width="11" y={275 - a * 1.7} height={a * 1.7} rx="1.6" fill={warn ? "#766161" : "#4D5462"} filter="url(#hd-grain)" style={{ "--i": i } as React.CSSProperties} />
                <rect className="hd-bar" x={cx[i] + 2} width="11" y={275 - b * 1.7} height={b * 1.7} rx="1.6" fill="url(#hd-dots)" style={{ "--i": i + 0.5 } as React.CSSProperties} />
              </Fragment>
            ))}
            <line className="hd-sep" x1="0" x2="727" y1="326" y2="326" />
          </svg>
          {["100%", "75%", "50%", "25%", "0%"].map((t, k) => <span key={t} className="hd-y" style={{ "--x": 30, "--y": 105 + k * 42.5 } as React.CSSProperties}>{t}</span>)}
          {GROUPS.map(([g], i) => <span key={g} className="hd-x c" style={{ "--x": cx[i], "--y": 296 } as React.CSSProperties}>{g}</span>)}
          <span className="hd-leg" style={{ "--x": 23, "--y": 360 } as React.CSSProperties}><i className="dot" />Your business</span>
          <span className="hd-leg" style={{ "--x": 137, "--y": 360 } as React.CSSProperties}><i className="dot light" /><u>Plan</u></span>
          <span className="hd-leg" style={{ "--x": 191, "--y": 360 } as React.CSSProperties}><i className="dot warn" />Needs attention</span>
          <span className="hd-act" style={{ "--x": 665, "--y": 360 } as React.CSSProperties}><Icon d={IC.Filter} /></span>
          <span className="hd-act" style={{ "--x": 692, "--y": 360 } as React.CSSProperties}><Icon d={IC.Down} /></span>
        </section>

        {/* Card 3: collected this quarter */}
        <section className="hd-card" style={{ "--x": 347, "--y": 603, "--w": 519, "--h": 420 } as React.CSSProperties}>
          <p className="hd-big">$1.28M<span>↑ 10%</span></p>
          <p className="hd-lbl">Collected this quarter</p>
          <Drop x={311} w={97} label="Weekly" />
          <Drop x={413} w={83} label="This week" />
          <svg className="hd-plot" viewBox="0 0 519 420" preserveAspectRatio="none">
            <Hairlines x0={33} x1={495} base={300} fn={rampB} id="b" />
          </svg>
        </section>

        {/* Card 4: largest overdue */}
        <section className="hd-card" style={{ "--x": 890, "--y": 603, "--w": 727, "--h": 420 } as React.CSSProperties}>
          <p className="hd-ct">Largest overdue</p>
          <p className="hd-cs">Based on days past the due date</p>
          <Drop x={596} w={107} label="Past month" />
          <svg className="hd-plot" viewBox="0 0 727 420" preserveAspectRatio="none">
            {OVERDUE.map(([, w], i) => <rect key={i} className="hd-hbar" x="127" y={100 + i * 34.4} width={w} height="11" rx="1.6" fill="#626978" filter="url(#hd-grain)" style={{ "--i": i } as React.CSSProperties} />)}
          </svg>
          {OVERDUE.map(([n, w, d], i) => (
            <Fragment key={n}>
              <span className="hd-name" style={{ "--x": 23, "--y": 106 + i * 34.4 } as React.CSSProperties}>{n}</span>
              <span className="hd-days" style={{ "--x": 127 + w + 8, "--y": 106 + i * 34.4 } as React.CSSProperties}>{d}</span>
            </Fragment>
          ))}
        </section>
      </div>
    </div>
  );
}
