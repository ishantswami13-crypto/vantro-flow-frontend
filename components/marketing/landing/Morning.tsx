// "A morning with Starlane": one illustrative day for the demo company, told
// as a timeline whose spine fills as you scroll. Figures match the product
// screenshot and the rest of the page; the section caption says it is a demo.

const MOMENTS = [
  {
    t: "08:00",
    h: "The Bridge opens on what changed overnight.",
    b: "TallyPrime synced before you sat down. Two reminders are waiting for you, and Joshi Tiles has slipped past 90 days.",
    ui: [["Synced from TallyPrime", "07:52"], ["Waiting for you", "2"], ["New in Watch", "7"]],
  },
  {
    t: "08:04",
    h: "You approve one reminder, word for word.",
    b: "The firm reminder to Mehta Hardware is shown in full, with the evidence behind it. You approve it, and it runs once, only where WhatsApp is set up.",
    ui: [["Mehta Hardware", "₹1,28,500"], ["Overdue", "45 days"], ["Tone", "Firm"]],
  },
  {
    t: "11:40",
    h: "A payment lands in your books, and Starlane notices.",
    b: "₹40,000 from Mehta Hardware arrives in Tally. The next sync picks it up, records it against the reminder you approved, and moves the mission forward.",
    ui: [["Received", "₹40,000"], ["Mission", "₹40,000 of ₹1,20,000"], ["Outcome", "Partly paid"]],
  },
  {
    t: "18:30",
    h: "Tomorrow is already worked out.",
    b: "Prepared lines up the next 24 hours, 7 days and 30 days, so tomorrow starts with a short list instead of a spreadsheet.",
    ui: [["Next 24 hours", "2 to approve"], ["Next 7 days", "5 falling due"], ["Next 30 days", "₹2.1L likely in"]],
  },
];

export function Morning() {
  return (
    <ol className="slm">
      {MOMENTS.map((m) => (
        <li key={m.t} className="slm-item" data-reveal>
          <span className="slm-time sl-num">{m.t}</span>
          <div className="slm-copy">
            <h3 className="slm-h">{m.h}</h3>
            <p className="sl-p">{m.b}</p>
          </div>
          <dl className="slm-ui" aria-label={`At ${m.t}`}>
            {m.ui.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="sl-num">{v}</dd></div>)}
          </dl>
        </li>
      ))}
    </ol>
  );
}
