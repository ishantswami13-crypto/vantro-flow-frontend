"use client";

import { StatusChip } from "@/components/ui/Badge";
import c from "./control.module.css";

export { c as controlStyles };

// Org-wide fixed policy, identical for every business; no per-org override
// exists in the backend. L4 Execute always requires approval: the core
// trust mechanism of the product (see the note in app/control/page.tsx).
export const POLICY_LEVELS: { level: string; name: string; description: string; granted: boolean }[] = [
  { level: "L1", name: "Observe", description: "Read business data and surface findings.", granted: true },
  { level: "L2", name: "Prepare", description: "Draft actions and recommendations for review.", granted: true },
  { level: "L3", name: "Propose", description: "Put a specific action in front of you to decide on.", granted: true },
  { level: "L4", name: "Execute", description: "Carry out an action that changes business data.", granted: false },
];

/** The authority boundary as a ladder: L1–L3 Starlane may do on its own,
 *  then a hard ink rule, then L4, which only ever happens with you. */
export function AuthorityLadder() {
  return (
    <div className={c.ladderWrap}>
      <div className={c.spans} aria-hidden="true">
        <span className={c.span}>Starlane may do this on its own</span>
        <span className={c.spanGate}>Only with your approval</span>
      </div>
      <ol className={c.ladder} aria-label="Levels of autonomy">
        {POLICY_LEVELS.map((p) => (
          <li key={p.level} className={p.granted ? c.step : `${c.step} ${c.gate}`}>
            <span className={`num ${c.stepLevel}`}>{p.level}</span>
            <span className={c.stepName}>{p.name}</span>
            <p className={c.stepDesc}>{p.description}</p>
            <span className={c.stepState}>
              {p.granted
                ? <StatusChip tone="positive" className="chip-quiet">Allowed</StatusChip>
                : <span className={c.gateLabel}>Your approval, every time</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Permissions: the same policy as a table, with the approval boundary
 *  drawn as a labelled ink rule before L4. */
export function PolicyTable() {
  return (
    <div className={c.policy} role="table" aria-label="Organisation-wide policy">
      {POLICY_LEVELS.map((p) => (
        <div key={p.level} role="rowgroup">
          {!p.granted && <span className={`${c.policyGateLabel} ${c.policyGate}`} role="row"><span role="cell">Approval boundary</span></span>}
          <div role="row" className={c.policyRow}>
            <span role="cell" className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.level}</span>
            <span role="cell" className={c.policyName}>{p.name}</span>
            <span role="cell" className={c.policyDesc}>{p.description}</span>
            <span role="cell" className={c.policyState}>
              {p.granted
                ? <StatusChip tone="positive" className="chip-quiet">Allowed on its own</StatusChip>
                : <span className={c.gateLabel}>Your approval, every time</span>}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
