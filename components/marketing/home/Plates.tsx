import { InView } from "./InView";
import { RecordStrip, RecordAxis, type Strip } from "./Record";

/* ── Frame 02 · Fragmented systems ─────────────────────────────── */

const SYSTEMS = [
  { k: "Accounting", has: "TallyPrime · accounting files", via: "Read-only bridge", live: true },
  { k: "Banking", has: "CSV or XLSX statements", via: "Statement import", live: true },
  { k: "Inventory", has: "Stock levels and movements", via: "Read-only · exports", live: true },
  { k: "Spreadsheets", has: "Sheets exports · Excel · CSV", via: "File import", live: true },
  { k: "Promises", has: "Payment promises your team logs", via: "Promise log", live: true },
  { k: "External data", has: "Exchange rates · public events", via: "Public feeds · opt-in", live: true },
  { k: "ERP", has: "SAP · Odoo · NetSuite · Dynamics", via: "Planned or custom", live: false },
  { k: "CRM and commerce", has: "Salesforce · HubSpot · Shopify", via: "Planned", live: false },
];

const MODEL = [
  ["Customers", "214"], ["Suppliers", "38"], ["Products", "1,260"], ["Open invoices", "1,904"],
  ["Payments, 90 days", "3,412"], ["Orders", "2,087"], ["Promises", "146"], ["People", "12"],
];

export function SystemsPlate() {
  const rowY = (i: number) => i * 64 + 26;
  return (
    <InView className="sp2">
      <svg className="sp2-svg" viewBox="0 0 820 516" role="img" aria-labelledby="sp2-t" focusable="false">
        <title id="sp2-t">Eight kinds of business system, each holding part of the picture, feeding one model in Starlane. ERP connections are planned or built for a pilot as custom work; CRM and commerce connections are planned. External feeds are switched on per pilot.</title>
        {SYSTEMS.map((s, i) => {
          const y = rowY(i);
          const d = `M262 ${y}H440V258H486`;
          return (
            <g key={s.k} className={s.live ? "sp2-live" : "sp2-plan"}>
              <rect x="0.5" y={y - 25.5} width="261" height="51" className="sp2-box" />
              <text x="14" y={y - 6} className="sp2-k">{s.k.toUpperCase()}</text>
              <text x="14" y={y + 13} className="sp2-has">{s.has}</text>
              <path d={d} className="sp2-line" />
              {s.live && <rect width="5" height="5" x="-2.5" y="-2.5" className="sp2-pkt" style={{ offsetPath: `path("${d}")`, animationDelay: `${(i * 0.53) % 3}s` } as React.CSSProperties} />}
              <rect x="300" y={y - 8} width={s.via.length * 6.1 + 12} height="16" className="sp2-knock" />
              <text x="306" y={y + 3.5} className="sp2-via">{s.via.toUpperCase()}</text>
            </g>
          );
        })}
        <rect x="486" y="0" width="58" height="516" className="sp2-bar" />
        <text className="sp2-bar-t" transform="translate(520 258) rotate(-90)" textAnchor="middle">STARLANE · ONE MODEL</text>
        <text x="580" y="20" className="sp2-k">HALDEN SUPPLY CO. · ILLUSTRATIVE</text>
        {MODEL.map(([k, v], i) => {
          const y = 66 + i * 58;
          return (
            <g key={k}>
              <path d={`M544 ${y}H566`} className="sp2-tick" />
              <text x="580" y={y + 4} className="sp2-mk">{k}</text>
              <text x="818" y={y + 4} className="sp2-mv" textAnchor="end">{v}</text>
              <path d={`M580 ${y + 18}H818`} className="sp2-rule" />
            </g>
          );
        })}
      </svg>

      <div className="sp2-m">
        <ol>
          {SYSTEMS.map((s) => (
            <li key={s.k} className={s.live ? "sp2-live" : "sp2-plan"}>
              <span className="sp2-m-k">{s.k}</span>
              <span className="sp2-m-has">{s.has}</span>
              <span className="sp2-m-via">{s.via}</span>
            </li>
          ))}
        </ol>
        <div className="sp2-m-bar">Starlane · one model</div>
        <dl>
          {MODEL.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </div>
    </InView>
  );
}

/* ── Frame 03 · The business, as a record ──────────────────────── */

const WEEKS = ["28 Jul", "4 Aug", "11 Aug", "18 Aug", "25 Aug", "1 Sep", "8 Sep", "15 Sep", "22 Sep", "29 Sep", "6 Oct", "13 Oct"];

type Row = { name: string; sub: string; strip: Strip; note?: string };
type Band = { k: string; rows: Row[] };

export const BANDS: Band[] = [
  { k: "External", rows: [
    { name: "ECB · EUR/USD", sub: "Public feed", note: "+2.1%", strip: { series: { v: [1.072, 1.070, 1.073, 1.071, 1.069, 1.072, 1.070, 1.071, 1.073, 1.071, 1.069, 1.091], min: 1.06, max: 1.095, tone: "warn" }, marks: [{ w: 12, t: "ext", tone: "warn" }] } },
  ] },
  { k: "Customers", rows: [
    { name: "Brightwater Retail", sub: "Owner A. Okafor · 3 open invoices", note: "2 promises missed", strip: { marks: [{ w: 1, t: "ord", dx: -12 }, { w: 1, t: "inv" }, { w: 2, t: "pay", tone: "ok" }, { w: 4, t: "ord", dx: -12 }, { w: 4, t: "inv" }, { w: 6, t: "ord", dx: -12 }, { w: 6, t: "inv" }, { w: 10, t: "miss" }, { w: 11, t: "miss" }], bracket: { from: 10, to: 12, tone: "risk" } } },
    { name: "Lumen Health Group", sub: "Pays within terms", strip: { marks: [{ w: 2, t: "inv" }, { w: 2, t: "ord", dx: -12 }, { w: 4, t: "pay", tone: "ok" }, { w: 6, t: "inv" }, { w: 6, t: "ord", dx: -12 }, { w: 8, t: "pay", tone: "ok" }, { w: 10, t: "inv" }, { w: 10, t: "ord", dx: -12 }, { w: 12, t: "pay", tone: "ok" }] } },
    { name: "Northfield Labs", sub: "Limit $250,000", note: "Exposure $268,400", strip: { marks: [{ w: 3, t: "ord" }, { w: 5, t: "ord" }, { w: 5, t: "inv", dx: 10 }, { w: 7, t: "ord" }, { w: 8, t: "pay", tone: "ok" }, { w: 9, t: "ord" }, { w: 9, t: "inv", dx: 10 }, { w: 10, t: "ord" }, { w: 11, t: "ord" }, { w: 11, t: "inv", dx: 10 }, { w: 12, t: "ord" }], bracket: { from: 11, to: 12, tone: "info" } } },
  ] },
  { k: "Suppliers", rows: [
    { name: "Meridian Components", sub: "Supplies VA-200 · bills in EUR", note: "€412,000 open", strip: { marks: [{ w: 3, t: "inv" }, { w: 5, t: "pay", tone: "ok" }, { w: 8, t: "inv" }, { w: 9, t: "inv" }, { w: 11, t: "inv" }], bracket: { from: 11, to: 12, tone: "warn" } } },
  ] },
  { k: "Stock", rows: [
    { name: "VA-200 valve assembly", sub: "2 open orders · reorder at 12 days", note: "9 days cover", strip: { series: { v: [31, 29, 30, 27, 25, 24, 21, 20, 17, 15, 12, 9], min: 5, max: 34, threshold: 12, tone: "warn" }, bracket: { from: 11, to: 12, tone: "warn" } } },
  ] },
  { k: "People", rows: [
    { name: "A. Okafor", sub: "Account owner, Brightwater", strip: { marks: [{ w: 9, t: "act" }, { w: 11, t: "act" }] } },
    { name: "R. Lindqvist", sub: "Finance lead · approvals", strip: { marks: [{ w: 4, t: "act" }, { w: 8, t: "act" }] } },
  ] },
];

export function StatePlate() {
  return (
    <InView className="st3">
      <div className="st3-head" aria-hidden>
        <p className="st3-co">Halden Supply Co. · Illustrative</p>
        <div className="st3-axis"><RecordAxis labels={WEEKS} /><RecordAxis labels={WEEKS} weeks={6} /></div>
      </div>
      <div className="st3-body">
        <div className="st3-spine" aria-hidden><span>Your business</span></div>
        <div className="st3-bands">
          {BANDS.map((b) => (
            <div key={b.k} className="st3-band" role="group" aria-label={b.k}>
              <p className="st3-band-k">{b.k}</p>
              {b.rows.map((r) => (
                <div key={r.name} className={`st3-row${r.strip.bracket ? ` has-${r.strip.bracket.tone}` : ""}`}>
                  <p className="st3-name"><b>{r.name}</b><span>{r.sub}</span></p>
                  <div className="st3-strip">
                    <RecordStrip strip={r.strip} />
                    <RecordStrip strip={r.strip} weeks={6} />
                  </div>
                  <p className="st3-note">{r.note ?? ""}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <ul className="st3-legend" aria-label="Legend">
        <li><svg viewBox="0 0 12 12" aria-hidden><rect x="2" y="2" width="8" height="8" className="rs-inv" /></svg>Open invoice or bill</li>
        <li><svg viewBox="0 0 12 12" aria-hidden><rect x="2" y="2" width="8" height="8" className="rs-pay t-ok" /></svg>Payment, matched</li>
        <li><svg viewBox="0 0 12 12" aria-hidden><rect x="4" y="4" width="4" height="4" className="rs-ord" /></svg>Order</li>
        <li><svg viewBox="0 0 12 16" aria-hidden><g className="rs-miss"><line x1="6" x2="6" y1="1" y2="15" /><line x1="2" x2="10" y1="13" y2="3" className="t-risk" /></g></svg>Promise missed</li>
        <li><svg viewBox="0 0 12 12" aria-hidden><path d="M6 1l5 5-5 5-5-5z" className="rs-act" /></svg>Action by a person</li>
        <li><svg viewBox="0 0 16 12" aria-hidden><path d="M2 2H0V10H2M14 2H16V10H14" className="rs-bracket t-risk" /></svg>Change detected</li>
        <li><svg viewBox="0 0 4 16" aria-hidden><line x1="2" x2="2" y1="0" y2="16" className="rs-nowl" /></svg>Now, Tue 14 Oct 07:42</li>
      </ul>
    </InView>
  );
}

/* ── Frame 05 · Evidence, exploded ─────────────────────────────── */

const LAYERS = [
  { k: "Observed", v: "3 open invoices, $184,200", tag: "Fact", cls: "fact", src: "INV-1042 · 1051 · 1066 · TallyPrime" },
  { k: "Calculated", v: "Oldest invoice 47 days overdue", tag: "Calculated", cls: "calc", src: "Due date and today" },
  { k: "Assumed", v: "Payment terms Net 30", tag: "Assumption", cls: "asm", src: "No terms on record" },
  { k: "External", v: "EUR/USD +2.1% this week", tag: "Fact", cls: "fact", src: "ECB · 13 Oct" },
  { k: "Simulated", v: "$96k–$151k collected in 30 days", tag: "Estimate", cls: "est", src: "Ranges from 12 months of history" },
  { k: "Proposed", v: "Firm reminder and an owner call", tag: "Proposal", cls: "prop", src: "Ranked by your collection rules" },
  { k: "Approval", v: "Waiting for the account owner", tag: "Pending", cls: "pend", src: "Runs once after approval" },
  { k: "Verification", v: "Check the books after the action", tag: "Scheduled", cls: "pend", src: "Payment matched against INV-1042" },
];

export function EvidenceStack() {
  return (
    <InView className="ev5">
      <div className="ev5-cap" aria-hidden>
        <p className="ui-kicker t-risk">Decision</p>
        <p className="ev5-cap-t">Escalate Brightwater Retail</p>
      </div>
      <ol className="ev5-plates">
        {LAYERS.map((l, i) => (
          <li key={l.k} style={{ "--i": i } as React.CSSProperties}>
            <span className="ev5-n">{String(i + 1).padStart(2, "0")}</span>
            <span className="ev5-k">{l.k}</span>
            <span className="ev5-v">{l.v}<small>{l.src}</small></span>
            <i className={`tag tag-${l.cls}`}>{l.tag}</i>
          </li>
        ))}
      </ol>
    </InView>
  );
}
