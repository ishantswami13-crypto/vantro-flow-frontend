import StarlaneMark from "@/components/brand/StarlaneMark";

// Product views drawn in HTML for the public site, so they stay sharp at any
// size and animate in with the page. Everything shown is sample data on a
// fictional business, Halden Trading Co.

const BIZ = "Halden Trading Co.";

function Side({ on = "Command Center" }: { on?: string }) {
  const items = ["New run", "Agents", "Vault", "Command Center", "Decisions", "Memory"];
  return (
    <div className="m-side">
      <div className="m-brand">Starlane <StarlaneMark variant="glyph" size={12} /></div>
      {items.map((i) => <span key={i} className={i === on ? "on" : ""}>{i}</span>)}
      <em>Sources</em>
      <span>TallyPrime</span><span>Bank statements</span><span>Stock</span>
      <em>Recent</em>
      <span>Overdue review, EU</span><span>Supplier run, Q4</span><span>Promise check</span>
    </div>
  );
}

const BARS = [62, 48, 70, 44, 52, 36, 58, 30, 40, 22, 34, 18];

/** The Command Center: cash, collections and agent activity at a glance. */
export function CommandCenterMock({ className = "" }: { className?: string }) {
  return (
    <div className={`hx-mock lg ${className}`} aria-hidden>
      <div className="m-app">
        <Side />
        <div className="m-main">
          <div className="m-top">
            <p className="m-title">{BIZ} Command Center</p>
            <div style={{ display: "flex", gap: 6 }}><span className="m-chip">All entities</span><span className="m-chip solid">Ask Starlane</span></div>
          </div>
          <p className="m-note"><b>S</b>Agents prepared 6 actions overnight. Each one waits for your approval.</p>
          <div className="m-grid">
            <div className="m-card">
              <div className="m-top"><small>Cash at risk, next 30 days</small><span className="m-chip">USD</span></div>
              <p className="m-big">$412,800<sup>−8.2%</sup></p>
              <svg className="m-line" viewBox="0 0 300 70" preserveAspectRatio="none">
                <defs><linearGradient id="hxgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8F8B85" /><stop offset="1" stopColor="#fff" /></linearGradient></defs>
                <path className="fill" d="M0 60 C40 58 60 50 90 46 S150 40 180 30 S250 12 300 6 L300 70 L0 70Z" />
                <path d="M0 60 C40 58 60 50 90 46 S150 40 180 30 S250 12 300 6" />
              </svg>
            </div>
            <div className="m-card">
              <div className="m-top"><small>Collected vs expected, by week</small><span className="m-chip">This quarter</span></div>
              <div className="m-bars">{BARS.map((h, i) => <i key={i} style={{ "--h": `${h}px`, "--i": i } as React.CSSProperties} />)}</div>
            </div>
            <div className="m-card">
              <small>Open receivables</small>
              <p className="m-big">1,284</p>
              <div className="m-bars" style={{ height: 40 }}>{[20, 26, 22, 30, 34, 28, 36, 38].map((h, i) => <i key={i} style={{ "--h": `${h}px`, "--i": i } as React.CSSProperties} />)}</div>
            </div>
            <div className="m-card">
              <small>Largest overdue, by customer</small>
              <div className="m-meter">
                {[["Arlo Freight", 92, "41d"], ["Meridian GmbH", 74, "33d"], ["Kestrel Retail", 58, "27d"], ["Gupta Traders", 46, "19d"]].map(([n, w, d], i) => (
                  <div key={n as string}><span>{n}</span><i style={{ "--w": `${w}%`, "--i": i } as React.CSSProperties} /><span>{d}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** An agent run: the request, the plan as it progresses, and its outputs. */
export function AgentRunMock({ className = "" }: { className?: string }) {
  return (
    <div className={`hx-mock ${className}`} aria-hidden>
      <div className="m-split">
        <div className="m-main">
          <div className="m-top"><span className="m-chip">Overdue review · EU entities</span><span className="m-chip">Share</span></div>
          <div className="m-chat">
            <p className="m-msg me">Review everything overdue more than 30 days in the EU entities, check each against bank receipts, and draft the reminders I need to approve.</p>
            <p className="m-msg ai">I found 42 invoices across 3 entities. 7 were paid but not yet matched; I have linked each to its bank statement line. 35 remain overdue, worth €286,400.</p>
            <p className="m-msg ai">Drafts are ready for 12 customers, ranked by what they put at risk. Nothing is sent until you approve it.</p>
          </div>
          <div className="m-ask"><span>Ask Starlane anything…</span><i>↑</i></div>
        </div>
        <div>
          <p className="m-h">Progress · 4 of 5</p>
          <div className="m-steps">
            <div className="done">Read ledgers from TallyPrime and ERP export</div>
            <div className="done">Match receipts in bank statements</div>
            <div className="done">Rank customers by cash at risk</div>
            <div className="run">Draft reminders in each customer’s language</div>
            <div>Queue for approval</div>
          </div>
          <p className="m-h">Outputs</p>
          <span className="m-file">Overdue_EU_ranked.xlsx</span>
          <span className="m-file">Unmatched_receipts.csv</span>
          <span className="m-file">Reminder_drafts (12)</span>
          <p className="m-h">Properties</p>
          <span className="m-file" style={{ color: "inherit" }}>Policy · Read-only, approval required</span>
        </div>
      </div>
    </div>
  );
}

/** Agents working in parallel, each with its state. */
export function QueueMock({ className = "" }: { className?: string }) {
  const rows: Array<[string, string, string, string]> = [
    ["Reconcile March bank statement…", "Awaiting approval", "warn", "Bank"],
    ["Rank overdue, APAC entities…", "Awaiting approval", "warn", "Ledger"],
    ["Check supplier bills due…", "In progress", "", "Payables"],
    ["Draft reminders, Meridian…", "Ready for review", "info", "Drafts"],
  ];
  return (
    <div className={`hx-mock float ${className}`} aria-hidden>
      <div className="m-q">
        {rows.map(([t, s, tone, src]) => (
          <div key={t}><span>{t}</span><span className={`m-chip ${tone}`}>{s}</span><span className="m-chip">{src}</span></div>
        ))}
      </div>
    </div>
  );
}

/** The plan an agent will follow, shown before it runs. */
export function PlanMock({ className = "", steps }: { className?: string; steps?: string[] }) {
  const s = steps ?? ["Read the receivables ledger", "Match receipts to invoices", "Flag broken payment promises", "Compare with last quarter’s pattern", "Prepare the collections brief"];
  return (
    <div className={`hx-mock float ${className}`} aria-hidden>
      <div className="m-plan">
        <h4>Agent plan</h4>
        {s.map((t, i) => <div key={t} className={i < 3 ? "done" : "run"}>{t}</div>)}
      </div>
    </div>
  );
}

/** Ledger rows with the evidence state of each figure. */
export function LedgerMock({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const rows: Array<[string, string, string, string, string]> = [
    ["Arlo Freight · INV-2291", "Broken promise", "risk", "$84,200", "41d"],
    ["Meridian GmbH · INV-2310", "Promise due Fri", "warn", "€61,900", "33d"],
    ["Kestrel Retail · INV-2288", "Paid, unmatched", "info", "$22,450", "27d"],
    ["Gupta Traders · INV-1042", "Approved reminder", "ok", "₹6,00,000", "19d"],
    ["Sora Imports · INV-2302", "On track", "", "¥3.1M", "8d"],
  ];
  return (
    <div className={`hx-mock${dark ? " dark" : ""} ${className}`} aria-hidden>
      <div className="m-main">
        <div className="m-top"><p className="m-title">Receivables</p><div style={{ display: "flex", gap: 6 }}><span className="m-chip">My reviews (12)</span><span className="m-chip">All</span></div></div>
        <div className="m-rows">
          <div><span>Customer · invoice</span><span>Status</span><span className="num">Amount</span><span className="num">Overdue</span></div>
          {rows.map(([n, s, t, a, d]) => (
            <div key={n}><b>{n}</b><span><span className={`m-chip ${t}`}>{s}</span></span><span className="num">{a}</span><span className="num">{d}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The vault: every source and document, grouped. */
export function VaultMock({ className = "" }: { className?: string }) {
  const groups: Array<[string, string[]]> = [
    ["Sources", ["TallyPrime ledgers", "Bank statements · 4 accounts", "Stock exports"]],
    ["Vaults", ["Customer contracts", "Supplier agreements", "Credit notes"]],
    ["Library", ["Month-end close", "Collections playbook", "Credit policy"]],
  ];
  return (
    <div className={`hx-mock ${className}`} aria-hidden>
      <div className="m-app">
        <Side on="Vault" />
        <div className="m-main">
          <div className="m-top"><p className="m-title">Vault</p><span className="m-chip solid">Add source</span></div>
          {groups.map(([h, items]) => (
            <div key={h}>
              <p className="m-h">{h}</p>
              <div className="m-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 6 }}>
                {items.map((i) => <div key={i} className="m-card" style={{ background: "var(--m-soft)", minHeight: 54 }}><small>▢</small><span>{i}</span></div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A decision with its evidence, each figure marked by kind. */
export function DecisionMock({ className = "" }: { className?: string }) {
  return (
    <div className={`hx-mock ${className}`} aria-hidden>
      <div className="m-main" style={{ gap: 10 }}>
        <div className="m-top"><span className="m-chip risk">Needs a decision</span><span className="m-chip">Evidence · 6 records</span></div>
        <p className="m-title" style={{ fontSize: "1.5em" }}>Arlo Freight missed a second promise</p>
        <p style={{ color: "var(--m-2)" }}><mark style={{ background: "#DCEBE6", padding: "0 2px" }}>Bottom line:</mark> $84,200 is 41 days overdue across three invoices. Two payment dates were promised and missed.</p>
        <div className="m-grid">
          <div className="m-card"><small>Fact · ledger</small><b>$84,200 open</b></div>
          <div className="m-card"><small>Calculation</small><b>41 days, avg 18</b></div>
          <div className="m-card"><small>Assumption · yours</small><b>Pays in 14 days if called</b></div>
          <div className="m-card"><small>Estimate</small><b>$52k–$71k this month</b></div>
        </div>
        <div className="m-top"><span className="m-chip">Firm reminder, then owner call</span><span className="m-chip solid">Approve</span></div>
      </div>
    </div>
  );
}

/** What Starlane remembers about how a business gets paid. */
export function MemoryMock({ className = "" }: { className?: string }) {
  const notes = [
    "Meridian GmbH pays on the last Friday of the month, after a reminder in German.",
    "Arlo Freight answers calls from the owner, not emails from staff.",
    "Credit notes for Kestrel are issued in the following month.",
  ];
  return (
    <div className={`hx-mock ${className}`} aria-hidden style={{ background: "transparent", boxShadow: "none" }}>
      <div style={{ display: "grid", gap: 10 }}>
        {notes.map((n, i) => (
          <div key={i} className="hx-mock float" style={{ padding: "12px 14px", width: i % 2 ? "88%" : "92%", justifySelf: i % 2 ? "end" : "start", fontSize: "1.1em" }}>
            <span className="m-chip info" style={{ marginBottom: 6 }}>Learned · you can edit</span>
            <p style={{ color: "var(--m-2)", marginTop: 6 }}>{n}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sources with their real status. */
export function SourcesMock({ className = "", items }: { className?: string; items?: Array<[string, string]> }) {
  const rows = items ?? [["TallyPrime", "Live"], ["QuickBooks, Xero, Zoho exports", "Live"], ["Bank statements", "Live"], ["Excel, CSV, Google Sheets", "Live"], ["Live bank feeds", "Planned"], ["Xero direct", "Planned"], ["NetSuite", "Custom"]];
  return (
    <div className={`hx-mock float ${className}`} aria-hidden>
      <div className="m-q">
        {rows.map(([n, s]) => (
          <div key={n} style={{ gridTemplateColumns: "1fr auto" }}><span>{n}</span><span className={`m-chip ${s === "Live" ? "ok" : s === "Custom" ? "info" : ""}`}>{s}</span></div>
        ))}
      </div>
    </div>
  );
}

/** An approval, as it arrives on a phone. */
export function PhoneMock({ className = "" }: { className?: string }) {
  return (
    <div className={`hx-mock ${className}`} aria-hidden style={{ background: "transparent", boxShadow: "none" }}>
      <div className="m-phone">
        <div className="hx-mock" style={{ height: "100%", borderRadius: 14, boxShadow: "none" }}>
          <div className="m-main" style={{ padding: 12, gap: 8 }}>
            <small style={{ color: "var(--m-3)" }}>07:42 · Morning brief</small>
            <p className="m-title" style={{ fontSize: "1.4em" }}>3 things need you</p>
            <div className="m-card"><span className="m-chip risk">Risk</span><b>Arlo Freight, $84,200</b><small>Second promise missed</small></div>
            <div className="m-card"><span className="m-chip warn">Due</span><b>Supplier run, Friday</b><small>Leaves $38k headroom</small></div>
            <div className="m-card"><span className="m-chip ok">Ready</span><b>12 reminders drafted</b><small>Approve each, sent once</small></div>
            <span className="m-chip solid" style={{ justifyContent: "center", padding: 8 }}>Review and approve</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A prompt box choosing a business entity, as in a scoped request. */
export function ScopeMock({ className = "" }: { className?: string }) {
  return (
    <div className={`hx-mock float ${className}`} aria-hidden style={{ overflow: "visible" }}>
      <div style={{ padding: "8px 12px", background: "var(--m-soft)", borderBottom: "1px solid var(--m-line)" }}><span className="m-chip">Select an entity ⌃</span></div>
      <div style={{ padding: "14px 14px 12px 46%", minHeight: 96, color: "var(--m-2)", fontSize: "1.1em" }}>Show me everything due from customers in Germany before the quarter closes, and what it does to cash.<span style={{ borderRight: "1px solid var(--m-ink)", marginLeft: 1 }} /></div>
      <div className="hx-mock float" style={{ position: "absolute", left: 12, top: 30, width: "40%", padding: 8 }}>
        <div className="m-ask" style={{ marginTop: 0, boxShadow: "none", padding: "6px 8px" }}>Search entities</div>
        {[["HTC-UK", "Halden UK Ltd"], ["HTC-DE", "Halden GmbH"], ["HTC-IN", "Halden India Pvt"]].map(([a, b], i) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "6px 6px", borderRadius: 4, background: i === 1 ? "var(--m-soft)" : "none", color: "var(--m-2)" }}><span>{a}</span><span>{b}</span></div>
        ))}
      </div>
    </div>
  );
}
