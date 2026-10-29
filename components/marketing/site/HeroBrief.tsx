import { CHANGES } from "@/components/marketing/home/HeroStage";

// The homepage hero's product shot: this morning's brief for a fictional
// business, in rupees. The first change is open with its evidence and the
// recommended action waiting for the owner; the rest are listed beneath.
// Sample data, labelled so. The full room views follow further down the page.

const REST = CHANGES.slice(1);

export function HeroBrief() {
  const first = CHANGES[0];
  return (
    <figure className="hb">
      <div className="hb-panel" aria-hidden>
        <div className="hb-top">
          <p className="hb-where"><b>Morning brief</b><span className="num">Tue 14 Oct · 07:42</span></p>
          <p className="hb-count">4 changes</p>
        </div>

        <div className="hb-open">
          <p className={`hb-cat t-${first.tone}`}>{first.cat} · needs a decision</p>
          <p className="hb-what">{first.who}: second payment promise missed</p>
          <p className="hb-fig num">{first.amt}<span>3 invoices · 47 days overdue</span></p>
          <ul className="hb-ev">
            <li><i className="tag tag-fact">Fact</i>3 open invoices<em>TallyPrime</em></li>
            <li><i className="tag tag-calc">Calculated</i>47 days overdue<em>Ledger</em></li>
            <li><i className="tag tag-asm">Assumption</i>30-day terms<em>Yours to change</em></li>
          </ul>
          <div className="hb-rec">
            <p><span>Recommended</span>Firm WhatsApp reminder, then an owner call</p>
            <p className="hb-est num">₹9.6–15.1 lakh <i className="tag tag-est">Estimate</i></p>
          </div>
          <div className="hb-act">
            <p>Waiting for your approval</p>
            <span className="hb-btn hb-btn-q">Not now</span>
            <span className="hb-btn">Review and approve</span>
          </div>
        </div>

        <ol className="hb-rest">
          {REST.map((c) => (
            <li key={c.what}>
              <span className={`hb-cat t-${c.tone}`}>{c.cat}</span>
              <b>{c.what}</b>
              <span className="hb-amt num">{c.amt}</span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="hb-cap">
        <span>Sample data · Fictional business · Narmada Pipes &amp; Fittings</span>
        <span className="sl-sr">
          This morning&apos;s brief shows four changes. First, needing a decision: {first.who} missed a second payment promise,
          {" "}{first.amt} open across 3 invoices, 47 days overdue. Recommended: a firm WhatsApp reminder, then an owner call, estimated to
          collect ₹9.6 lakh to ₹15.1 lakh, waiting for your approval. Also: {REST.map((c) => `${c.what}, ${c.amt}`).join("; ")}.
        </span>
      </figcaption>
    </figure>
  );
}
