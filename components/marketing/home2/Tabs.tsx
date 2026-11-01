"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Texture, type TextureTone } from "./Texture";
import { CHANGES } from "@/components/marketing/home/HeroStage";

// Four things Starlane does, one tab at a time: a short claim on the left, the
// product doing it on a painted panel on the right. Sample data, labelled.

type Tab = { k: string; h: string; p: string; href: string; link: string; tone: TextureTone; seed: number; ui: React.ReactNode };

const Brief = () => (
  <div className="hp-ui">
    <p className="hp-ui-top"><b>Morning brief</b><span>Tue 14 Oct · 07:42</span></p>
    <ol className="hp-ui-list">
      {CHANGES.map((c) => (
        <li key={c.what}><span className={`hp-ui-sq t-${c.tone}`} /><div><em>{c.cat}</em><b>{c.what}</b></div><span className="num">{c.amt}</span></li>
      ))}
    </ol>
  </div>
);

const Evidence = () => (
  <div className="hp-ui">
    <p className="hp-ui-top"><b>Gupta Traders</b><span>Needs a decision</span></p>
    <p className="hp-ui-big num">₹18,42,000</p>
    <p className="hp-ui-meta">3 invoices · 47 days overdue · 2 promises missed</p>
    <ul className="hp-ui-ev">
      <li><i className="tag tag-fact">Fact</i>3 open invoices<em>TallyPrime</em></li>
      <li><i className="tag tag-calc">Calculated</i>47 days overdue<em>Ledger</em></li>
      <li><i className="tag tag-asm">Assumption</i>30-day terms<em>Yours to change</em></li>
      <li><i className="tag tag-est">Estimate</i>₹9.6–15.1 L in 30 days<em>Simulation</em></li>
    </ul>
  </div>
);

const Approve = () => (
  <div className="hp-ui">
    <p className="hp-ui-top"><b>Approvals</b><span>1 waiting</span></p>
    <p className="hp-ui-k">Draft WhatsApp reminder · Gupta Traders</p>
    <p className="hp-ui-msg">Namaste Guptaji, three invoices totalling ₹18,42,000 are now overdue, the oldest by 47 days. Please confirm a date for the transfer today.</p>
    <p className="hp-ui-btns"><span className="is-go">Approve and send</span><span>Edit</span><span>Skip</span></p>
    <p className="hp-ui-note">Nothing is sent until you approve. Sent once, as written.</p>
  </div>
);

const Collect = () => (
  <div className="hp-ui">
    <p className="hp-ui-top"><b>Collections</b><span>Checked against the books</span></p>
    <p className="hp-ui-k">8 days later</p>
    <p className="hp-ui-paid num">₹6,00,000</p>
    <p className="hp-ui-meta">Received against INV-1042 · confirmed in TallyPrime</p>
    <ol className="hp-ui-trail">{["Raised", "Shown", "Proposed", "Approved", "Checked"].map((s) => <li key={s}><i />{s}</li>)}</ol>
  </div>
);

const TABS: Tab[] = [
  { k: "Brief", h: "The few changes worth your attention, every morning.", p: "Starlane reads TallyPrime, bank statements and stock overnight and raises only what moved: a missed promise, a bill that got dearer, stock running short. Everything else stays quiet.", href: "/platform#watch", link: "How the brief works", tone: "moss", seed: 3, ui: <Brief /> },
  { k: "Evidence", h: "Every figure shows where it came from.", p: "Each number is labelled fact, calculation, assumption or estimate, with the record behind it. No language model produces the figures.", href: "/platform#decide", link: "How figures are sourced", tone: "slate", seed: 11, ui: <Evidence /> },
  { k: "Approvals", h: "Nothing reaches a customer until you approve it.", p: "Starlane drafts the reminder from your own template. You approve, edit or skip it from your phone, and it is sent once, exactly as written.", href: "/security", link: "Security and control", tone: "clay", seed: 21, ui: <Approve /> },
  { k: "Collections", h: "Checked against the books, not assumed.", p: "When money arrives, Starlane confirms it in TallyPrime before it calls anything done, so the brief tomorrow starts from what really happened.", href: "/platform#verify", link: "How results are checked", tone: "ink", seed: 5, ui: <Collect /> },
];

export function HomeTabs() {
  const [i, setI] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const key = (e: React.KeyboardEvent, n: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (n + d + TABS.length) % TABS.length;
    setI(next);
    refs.current[next]?.focus();
  };
  const t = TABS[i];
  return (
    <div className="hp-tabs">
      <div role="tablist" aria-label="What Starlane does" className="hp-tablist">
        {TABS.map((x, n) => (
          <button key={x.k} ref={(el) => { refs.current[n] = el; }} role="tab" id={`hp-tab-${n}`} aria-selected={n === i} aria-controls="hp-tabpanel"
            tabIndex={n === i ? 0 : -1} onClick={() => setI(n)} onKeyDown={(e) => key(e, n)} type="button">
            {x.k}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="hp-tabpanel" aria-labelledby={`hp-tab-${i}`} className="hp-tabpanel" key={i}>
        <div className="hp-tab-copy">
          <h3>{t.h}</h3>
          <p>{t.p}</p>
          <Link href={t.href} className="hp-link">{t.link}<span aria-hidden>→</span></Link>
        </div>
        <div className="hp-tab-art">
          <Texture id={`hp-tx-${i}`} tone={t.tone} seed={t.seed} />
          <div className="hp-tab-ui" aria-hidden>{t.ui}</div>
          <p className="hp-tab-cap">Sample data · Fictional business</p>
        </div>
      </div>
    </div>
  );
}
