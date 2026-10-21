import { InView } from "./InView";

// Frame 01. One composed product shot, read in depth order: the sources behind
// (evidence sheet), the business in front of them (Today), and the decision it
// leads to, brought forward. Everything is illustrative, on a fictional company.

export const CHANGES = [
  { tone: "risk", cat: "Receivables", what: "Second payment promise missed", who: "Brightwater Retail", amt: "$184,200", src: "Promise log · Ledger" },
  { tone: "warn", cat: "Payables · FX", what: "EUR up 2.1% on 3 open supplier invoices", who: "Meridian Components", amt: "€412,000", src: "ECB · Payables" },
  { tone: "warn", cat: "Stock", what: "VA-200 below reorder level, 9 days cover", who: "2 open orders depend on it", amt: "$58,300", src: "Stock · Orders" },
  { tone: "info", cat: "Exposure", what: "Exposure above your $250,000 limit", who: "Northfield Labs", amt: "$268,400", src: "Ledger · Watch rule" },
] as const;

const TONE_LABEL: Record<string, string> = { risk: "Risk", warn: "Warning", info: "Change", ok: "Verified" };

const SOURCES = [
  ["INV-1042", "Brightwater Retail", "TallyPrime · 29 Jul", "$62,400"],
  ["INV-1051", "Brightwater Retail", "TallyPrime · 18 Aug", "$71,900"],
  ["INV-1066", "Brightwater Retail", "TallyPrime · 05 Sep", "$49,900"],
  ["PROMISE", "“Paying by Friday”", "Promise log · 29 Sep", "missed"],
  ["PROMISE", "“Transfer Monday”", "Promise log · 06 Oct", "missed"],
  ["EUR/USD", "+2.1% since 07 Oct", "ECB · 13 Oct", "1.0912"],
  ["BILL-2210", "Meridian Components", "TallyPrime · 24 Sep", "€138,000"],
];

export function HeroStage() {
  return (
    <>
    <InView className="hs" role="img" aria-label="Illustration of Starlane on a fictional company: the Today view lists four material changes, and the first, a missed payment promise from Brightwater Retail, leads to a decision awaiting approval.">
      <div className="hs-ghost" aria-hidden>
        <p className="hs-ghost-h">Source records</p>
        <table>
          <tbody>
            {SOURCES.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hs-today" aria-hidden>
        <div className="ui-bar">
          <p className="ui-title">Today <span>Tue 14 Oct · 07:42</span></p>
          <p className="ui-status"><i className="sq t-ok" />4 systems current</p>
        </div>
        <dl className="ui-kpis">
          <div><dt>Open receivables</dt><dd>$1,426,900</dd></div>
          <div><dt>Over 30 days</dt><dd>$412,600</dd></div>
          <div><dt>Cash in, next 30 days</dt><dd>$340k–$470k</dd><i className="tag tag-est">Estimate</i></div>
        </dl>
        <p className="ui-h">Material changes since yesterday <span>4</span></p>
        <table className="ui-table">
          <tbody>
            {CHANGES.map((c) => (
              <tr key={c.what}>
                <td className="ui-sq"><i className={`sq t-${c.tone}`} /></td>
                <td><span className="ui-cat">{c.cat}</span><b>{c.what}</b><span className="ui-who">{c.who}</span></td>
                <td className="num">{c.amt}</td>
                <td className="ui-src">{c.src}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <svg className="hs-link" viewBox="0 0 120 400" aria-hidden focusable="false">
        <path d="M84 4H20V380" />
        <rect x="16" y="376" width="8" height="8" />
      </svg>

      <div className="hs-card" aria-hidden>
        <p className="ui-kicker"><i className="sq t-risk" />Needs a decision</p>
        <p className="hs-card-t">Escalate Brightwater Retail</p>
        <p className="hs-card-m"><b>$184,200</b> open · 3 invoices · 47 days overdue · 2 promises missed</p>
        <ul className="hs-ev">
          <li><i className="tag tag-fact">Fact</i>3 open invoices</li>
          <li><i className="tag tag-calc">Calculated</i>47 days overdue</li>
          <li><i className="tag tag-asm">Assumption</i>Net 30 terms</li>
        </ul>
        <div className="hs-rec">
          <p><span>Recommended</span>Firm reminder and an owner call</p>
          <p className="num">$96k–$151k <i className="tag tag-est">Estimate</i></p>
        </div>
        <div className="hs-foot">
          <p><i className="sq t-warn" />Awaiting approval · account owner</p>
          <span className="ui-btn">Review</span>
        </div>
      </div>
    </InView>
    <p className="sl-sr">{CHANGES.map((c) => `${TONE_LABEL[c.tone]}: ${c.what}, ${c.who}, ${c.amt}.`).join(" ")}</p>
    </>
  );
}
