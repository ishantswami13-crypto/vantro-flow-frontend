import { InView } from "@/components/marketing/home/InView";
import { RecordStrip } from "@/components/marketing/home/Record";
import { BANDS } from "@/components/marketing/home/Plates";
import { CHANGES } from "@/components/marketing/home/HeroStage";

// The homepage hero's product shot, choreographed for one point of attention
// at a time: the sources report in, the four material changes arrive, the
// first (the only red on the screen) is selected, its evidence fills in, and
// the moment a person approves is lit last. Under reduced motion, or without
// JavaScript, it is shown in its final state. Illustrative, fictional company.

const SOURCES = ["TallyPrime", "Bank statements", "Stock", "Promise log"];
const brightwater = BANDS.flatMap((b) => b.rows).find((r) => r.name === "Brightwater Retail")!.strip;
const TONE_LABEL: Record<string, string> = { risk: "Risk", warn: "Warning", info: "Change" };

export function HeroConsole() {
  return (
    <>
      <InView className="hc" threshold={0.01} aria-hidden>
        <div className="hc-glow" />
        <div className="hc-frame">
          <div className="hc-top">
            <p className="hc-where"><b>Halden Supply Co.</b><span>Today</span><span className="num">Tue 14 Oct · 07:42</span></p>
            <ul className="hc-srcs">
              {SOURCES.map((s, i) => (
                <li key={s} style={{ "--i": i } as React.CSSProperties}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="hc-body">
            <div className="hc-list">
              <p className="hc-h">Material changes since yesterday <span>4</span></p>
              <ol>
                {CHANGES.map((c, i) => (
                  <li key={c.what} className={i === 0 ? "is-sel" : undefined} style={{ "--i": i } as React.CSSProperties}>
                    <div>
                      <span className={`hc-cat t-${c.tone}`}>{c.cat}</span>
                      <b>{c.what}</b>
                      <span className="hc-who">{c.who}</span>
                    </div>
                    <span className="hc-amt num">{c.amt}</span>
                  </li>
                ))}
              </ol>
              <p className="hc-quiet">Everything else is unchanged.</p>
            </div>

            <div className="hc-detail">
              <p className="ui-kicker t-risk">Needs a decision</p>
              <p className="hc-title">Escalate Brightwater Retail</p>
              <div className="hc-fig">
                <p className="num">$184,200</p>
                <p>open · 3 invoices · 47 days overdue · 2 promises missed</p>
              </div>
              <div className="hc-strip">
                <RecordStrip strip={brightwater} weeks={12} />
                <p><span>12 weeks</span><span>now</span></p>
              </div>
              <ul className="hc-ev">
                <li><i className="tag tag-fact">Fact</i><span>3 open invoices</span><em>TallyPrime</em></li>
                <li><i className="tag tag-calc">Calculated</i><span>47 days overdue</span><em>Ledger</em></li>
                <li><i className="tag tag-asm">Assumption</i><span>Net 30 terms</span><em>Yours to change</em></li>
              </ul>
              <div className="hc-opts">
                <p className="hc-opt is-rec"><span><em>Recommended</em>Firm reminder and an owner call</span><b className="num">$96k–$151k</b></p>
                <p className="hc-opt"><span>Payment plan, three instalments</span><b className="num">$61k–$92k</b></p>
                <p className="hc-opt-k">Likely collected in 30 days <i className="tag tag-est">Estimate</i></p>
              </div>
              <div className="hc-act">
                <p>Awaiting approval · account owner</p>
                <span className="hc-btn hc-btn-q">Not now</span>
                <span className="hc-btn">Review and approve</span>
              </div>
            </div>
          </div>
        </div>
      </InView>
      <p className="sl-sr">
        Illustration on a fictional company, Halden Supply Co. Four systems are current and four material changes are raised:{" "}
        {CHANGES.map((c) => `${TONE_LABEL[c.tone]}: ${c.what}, ${c.who}, ${c.amt}.`).join(" ")}{" "}
        The first leads to a decision awaiting the account owner&apos;s approval: escalate Brightwater Retail, $184,200 open and 47 days overdue,
        with a recommended firm reminder and owner call estimated to collect $96k to $151k in 30 days.
      </p>
    </>
  );
}
