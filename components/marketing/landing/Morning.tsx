// "A day with Starlane": one illustrative day for a fictional company, told
// as a timeline whose spine fills as you scroll. Figures match the product
// screenshot and the rest of the page; the section caption says it is a demo.

const MOMENTS = [
  {
    t: "07:00",
    h: "Know what changed overnight.",
    b: "Every connected system synced before the day started. Four changes made the list, out of thousands of rows, and each one links to the records behind it.",
    ui: [["Systems synced", "06:58"], ["Changes worth your time", "4"], ["Needs a decision", "2"]],
  },
  {
    t: "08:15",
    h: "Approve one action, with the evidence in front of you.",
    b: "The escalation for Brightwater Retail is shown with its options, evidence and simulated range. The account owner approves it, and it runs once, through the channel you set up.",
    ui: [["Brightwater Retail", "$184,200"], ["Overdue", "47 days"], ["Simulated, 30 days", "$96k–$141k"]],
  },
  {
    t: "13:40",
    h: "A payment lands in your books, and Starlane notices.",
    b: "$60,000 from Harbor & Pine arrives in the accounting system. The next sync records it against the action you approved and moves the mission forward.",
    ui: [["Received", "$60,000"], ["Mission", "$60,000 of $120,000"], ["Outcome", "Partly paid"]],
  },
  {
    t: "18:00",
    h: "Tomorrow is already worked out.",
    b: "Prepared lines up the next 24 hours, 7 days and 30 days, so the next meeting starts from a short list instead of a spreadsheet.",
    ui: [["Next 24 hours", "2 to approve"], ["Next 7 days", "5 falling due"], ["Next 30 days", "$410k likely in"]],
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
