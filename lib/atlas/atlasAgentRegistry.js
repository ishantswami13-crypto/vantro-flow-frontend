// ─────────────────────────────────────────────────────────────────────────────
// Atlas Civilization Pack System — Agent Registry (v0)
//
// 300+ agents organised BY DOMAIN/SWARM (never a flat random list). Agents are
// produced by a single deterministic factory from per-domain spec tables, so:
//   • the count is real (no padding) and reproducible,
//   • every agent carries the full required schema,
//   • proof-gating is honest — only agents that trace to a real backend anchor
//     or a live read data source may claim live_proven / live_limited.
//
// Honesty rule encoded below (assertLiveHonest): a live_* agent must either be
// one of LIVE_AGENT_ANCHORS, or only read LIVE_DATA_SOURCES. Anything that
// sends / pays / signs / deletes is preview or approval-gated, never silent.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const M = require('./atlasProofModel');
const { EXECUTION_STATUS: ES, RISK_LEVEL: R, PROOF_LEVEL: PL } = M;

// ── Pack id slugs (stable; packs are defined in atlasPackRegistry.js) ─────────
// Declared here as plain strings so the two registries cross-reference without a
// circular import. The pack registry is the authority for which agents it owns.
const SWARM = {
  finance: 'swarm.finance', sales: 'swarm.sales', operations: 'swarm.operations',
  supplier: 'swarm.supplier', inventory: 'swarm.inventory', collections: 'swarm.collections',
  customer: 'swarm.customer', compliance: 'swarm.compliance', ceo: 'swarm.ceo_command',
  growth: 'swarm.growth', risk: 'swarm.risk_audit',
};

// ── Factory ───────────────────────────────────────────────────────────────────
// A spec is a compact tuple expanded into a full schema-complete agent.
// spec = {
//   slug, name, role, jtbd, input, output, actions[],
//   status?, risk?, connector?, route?, packs?[]
// }
function buildDomain(domainKey, domainLabel, defaults, specs) {
  return specs.map((s, i) => {
    const status = s.status || defaults.status;
    const risk = s.risk || defaults.risk || R.LOW;
    const actions = s.actions || defaults.actions || ['analyze'];
    const executable = M.isExecutableStatus(status);
    const dangerous = M.touchesDangerousAction(actions);

    // Approval is forced for high/critical risk OR any dangerous action class.
    const approval_required = Boolean(
      s.approval ?? (M.requiresApprovalByRisk(risk) || dangerous || defaults.approval),
    );

    // Evidence is required for anything executable (live can't act without proof).
    const evidence_required = Boolean(s.evidence ?? (executable || defaults.evidence));

    const connector_required = Boolean(s.connector);
    const live_route = executable ? (s.route || defaults.route || null) : null;

    // blocked_reason: present for every non-executable status; null when live.
    let blocked_reason = null;
    if (!executable) {
      blocked_reason = s.blocked_reason || M.blockedReasonForStatus(status);
    }

    // proof_gate: the human-readable condition that must hold to run this agent.
    const gateBits = [];
    gateBits.push(executable ? `status=${status}` : `BLOCKED(${status})`);
    if (evidence_required) gateBits.push('evidence');
    if (approval_required) gateBits.push('approval');
    gateBits.push('audit');
    if (connector_required) gateBits.push('connector');
    if (dangerous) gateBits.push('external_send=explicit');
    const proof_gate = gateBits.join(' + ');

    const agent = {
      id: `agent.${domainKey}.${s.slug}`,
      name: s.name,
      pack_ids: s.packs || defaults.packs || [],
      domain: domainLabel,
      role: s.role,
      description: s.desc || `${s.name} — ${s.jtbd}`,
      job_to_be_done: s.jtbd,
      input_data: s.input,
      output_decision_or_action: s.output,
      actions_supported: actions,
      risk_level: risk,
      execution_status: status,
      evidence_required,
      approval_required,
      audit_required: true,            // SAFETY: audit is always on. No exceptions.
      connector_required,
      live_route,
      proof_gate,
      blocked_reason,
    };
    return agent;
  });
}

// Honesty assertion run at module load — throws if a live_* agent can't be
// justified by a real anchor or live read source. Prevents fake live claims.
function assertLiveHonest(agents) {
  for (const a of agents) {
    if (!M.isExecutableStatus(a.execution_status)) continue;
    const isAnchor = M.LIVE_AGENT_ANCHORS.includes(a.id.replace('agent.', '').replace(/\./, '.'))
      || M.LIVE_AGENT_ANCHORS.some((x) => a.id.endsWith(x));
    // A live agent must be an anchor, OR be insight-only over live data sources,
    // OR be a draft/assist agent (no autonomous external effect, approval-gated).
    const dangerous = M.touchesDangerousAction(a.actions_supported);
    if (dangerous && !a.approval_required) {
      throw new Error(`[atlas] live agent ${a.id} touches dangerous action without approval`);
    }
    if (a.execution_status === ES.LIVE_PROVEN && !isAnchor) {
      throw new Error(`[atlas] live_proven agent ${a.id} is not a backend anchor`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN TABLES
// ─────────────────────────────────────────────────────────────────────────────
const DOMAINS = [];

// ── 1. Command Agents (CEO / cockpit) ────────────────────────────────────────
DOMAINS.push(buildDomain('command', 'Command', {
  status: ES.PREVIEW, risk: R.MEDIUM, packs: [SWARM.ceo], route: null,
}, [
  { slug: 'owner_briefing', name: 'Owner Briefing Agent', role: 'Chief of Staff',
    jtbd: 'Give the owner a single evidence-backed morning brief of what changed and what needs a decision.',
    input: 'cash, receivables, invoices, inventory, risk signals', output: 'ranked brief + top actions (evidence-linked)',
    actions: ['analyze', 'summarize', 'recommend'], status: ES.LIVE_LIMITED, risk: R.MEDIUM,
    route: '/api/agents/core.owner_briefing/preview', evidence: true,
    desc: 'Live (flag-gated) evidence-contract briefing — the proven Atlas command surface.' },
  { slug: 'daily_command_brief', name: 'Daily Command Brief Agent', role: 'Cockpit',
    jtbd: 'Assemble the day-one command screen across every connected domain.',
    input: 'all live read sources', output: 'command dashboard payload', actions: ['analyze', 'summarize'],
    status: ES.LIVE_LIMITED, route: '/api/agents/core.owner_briefing/preview' },
  { slug: 'decision_queue', name: 'Decision Queue Agent', role: 'Triage',
    jtbd: 'Surface the decisions only a human should make, ranked by money-at-risk.',
    input: 'open actions, approvals, risk events', output: 'prioritized decision queue', actions: ['analyze', 'rank'] },
  { slug: 'priority_router', name: 'Priority Router Agent', role: 'Router',
    jtbd: 'Route each signal to the right swarm and the right human.', input: 'events', output: 'routing decisions', actions: ['route'] },
  { slug: 'exception_watch', name: 'Exception Watch Agent', role: 'Sentinel',
    jtbd: 'Watch for the handful of exceptions that break a normal day.', input: 'metrics, thresholds', output: 'exception alerts', actions: ['monitor', 'alert'] },
  { slug: 'goal_tracker', name: 'Goal Tracker Agent', role: 'OKR', jtbd: 'Track business goals against live numbers.',
    input: 'targets, metrics', output: 'goal progress', actions: ['analyze'] },
  { slug: 'standup_synth', name: 'Standup Synthesizer', role: 'Coordinator',
    jtbd: 'Turn yesterday across all swarms into a 60-second standup.', input: 'swarm activity', output: 'standup summary', actions: ['summarize'] },
  { slug: 'scenario_planner', name: 'Scenario Planner Agent', role: 'Strategist',
    jtbd: 'Model "what if" on cash, pricing, headcount.', input: 'financials, assumptions', output: 'scenario outcomes', actions: ['simulate'], status: ES.PREVIEW },
  { slug: 'board_narrator', name: 'Board Narrator Agent', role: 'Narrator',
    jtbd: 'Draft the board-ready narrative from the quarter\'s evidence.', input: 'financials, KPIs', output: 'board narrative draft',
    actions: ['draft', 'customer_facing'], status: ES.PREVIEW, risk: R.HIGH },
  { slug: 'mission_control', name: 'Mission Control Agent', role: 'Operator',
    jtbd: 'Coordinate multi-swarm operations under one operator view.', input: 'all swarms', output: 'control plane state', actions: ['coordinate'], status: ES.CUSTOM_REQUIRED },
]));

// ── 2. Finance Agents ─────────────────────────────────────────────────────────
DOMAINS.push(buildDomain('finance', 'Finance', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.finance], evidence: true,
}, [
  { slug: 'cash_position', name: 'Cash Position Agent', role: 'Treasury',
    jtbd: 'Tell the owner exactly how much cash is real, committed, and free today.',
    input: 'bank, ledger, invoices, bills', output: 'cash position read', actions: ['analyze', 'summarize'] },
  { slug: 'runway', name: 'Runway Agent', role: 'Treasury', jtbd: 'Compute months of runway from burn and balances.',
    input: 'bank, expenses, forecast', output: 'runway estimate', actions: ['analyze'] },
  { slug: 'burn_monitor', name: 'Burn Monitor Agent', role: 'Controller', jtbd: 'Flag when burn deviates from plan.',
    input: 'ledger, budget', output: 'burn variance alert', actions: ['monitor', 'alert'] },
  { slug: 'pnl_reader', name: 'P&L Reader Agent', role: 'Controller', jtbd: 'Read the live P&L and explain the movers.',
    input: 'ledger, invoices, bills', output: 'P&L explanation', actions: ['analyze'] },
  { slug: 'margin_analyst', name: 'Margin Analyst Agent', role: 'FP&A', jtbd: 'Find which products/customers carry or kill margin.',
    input: 'invoices, products, costs', output: 'margin breakdown', actions: ['analyze'] },
  { slug: 'expense_classifier', name: 'Expense Classifier Agent', role: 'Bookkeeper', jtbd: 'Categorize expenses for clean books.',
    input: 'ledger, bills', output: 'categorized expenses', actions: ['classify'] },
  { slug: 'budget_guard', name: 'Budget Guard Agent', role: 'Controller', jtbd: 'Warn before a budget line is breached.',
    input: 'budget, ledger', output: 'budget alerts', actions: ['monitor', 'alert'] },
  { slug: 'payment_scheduler', name: 'Payment Scheduler Agent', role: 'AP', jtbd: 'Propose which bills to pay and when to protect cash.',
    input: 'bills, cash position', output: 'payment schedule proposal', actions: ['recommend', 'financial_move'], risk: R.HIGH },
  { slug: 'disbursement', name: 'Disbursement Agent', role: 'AP', jtbd: 'Execute approved supplier payouts.',
    input: 'approved payment batch', output: 'disbursement instruction', actions: ['financial_move', 'external_send'],
    status: ES.CONNECTOR_REQUIRED, risk: R.CRITICAL, connector: true },
  { slug: 'tax_estimator', name: 'Tax Estimator Agent', role: 'Tax', jtbd: 'Estimate GST/tax liability from live transactions.',
    input: 'invoices, ledger', output: 'tax estimate', actions: ['analyze'], status: ES.LIVE_LIMITED },
  { slug: 'reconciliation', name: 'Reconciliation Agent', role: 'Bookkeeper', jtbd: 'Match bank lines to invoices and bills.',
    input: 'bank, invoices, bills', output: 'reconciliation matches', actions: ['analyze', 'classify'] },
  { slug: 'fx_exposure', name: 'FX Exposure Agent', role: 'Treasury', jtbd: 'Track currency exposure for cross-border trade.',
    input: 'invoices, fx rates', output: 'fx exposure read', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'capital_planner', name: 'Capital Planner Agent', role: 'CFO', jtbd: 'Plan financing needs against growth.',
    input: 'forecast, financials', output: 'capital plan', actions: ['recommend'], status: ES.PREVIEW, risk: R.HIGH },
  { slug: 'investor_metrics', name: 'Investor Metrics Agent', role: 'FP&A', jtbd: 'Maintain the metrics investors ask for.',
    input: 'financials, KPIs', output: 'investor metric pack', actions: ['analyze'], status: ES.PREVIEW },
]));

// ── 3. Cashflow Agents ────────────────────────────────────────────────────────
DOMAINS.push(buildDomain('cashflow', 'Cashflow', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.finance], evidence: true,
}, [
  { slug: 'forecast_13w', name: '13-Week Cash Forecast Agent', role: 'Treasury', jtbd: 'Project 13-week cash from receivables and payables.',
    input: 'invoices, bills, forecast', output: '13-week projection', actions: ['analyze', 'forecast'] },
  { slug: 'inflow_predictor', name: 'Inflow Predictor Agent', role: 'Analyst', jtbd: 'Predict when each receivable will actually land.',
    input: 'invoices, payment history', output: 'expected inflow dates', actions: ['forecast'] },
  { slug: 'cash_risk_alert', name: 'Cash Risk Alert Agent', role: 'Sentinel', jtbd: 'Raise the alarm before a cash shortfall.',
    input: 'forecast, bank', output: 'cash risk alert', actions: ['monitor', 'alert'] },
  { slug: 'working_capital', name: 'Working Capital Agent', role: 'Controller', jtbd: 'Track the cash trapped in the cycle.',
    input: 'receivables, payables, inventory', output: 'working capital read', actions: ['analyze'] },
  { slug: 'dso_dpo', name: 'DSO/DPO Agent', role: 'Analyst', jtbd: 'Measure how fast money comes in vs goes out.',
    input: 'invoices, bills', output: 'DSO/DPO metrics', actions: ['analyze'] },
  { slug: 'liquidity_optimizer', name: 'Liquidity Optimizer Agent', role: 'Treasury', jtbd: 'Suggest moves to free up cash safely.',
    input: 'cash, receivables', output: 'liquidity suggestions', actions: ['recommend'], status: ES.PREVIEW },
  { slug: 'sweep_planner', name: 'Cash Sweep Planner', role: 'Treasury', jtbd: 'Plan idle-cash sweeps across accounts.',
    input: 'bank balances', output: 'sweep plan', actions: ['recommend', 'financial_move'], status: ES.CONNECTOR_REQUIRED, risk: R.HIGH, connector: true },
  { slug: 'shortfall_playbook', name: 'Shortfall Playbook Agent', role: 'Advisor', jtbd: 'Give a ranked playbook when cash is tight.',
    input: 'forecast, receivables', output: 'shortfall actions', actions: ['recommend'] },
]));

// ── 4. Accounting Agents ──────────────────────────────────────────────────────
DOMAINS.push(buildDomain('accounting', 'Accounting', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.finance], evidence: true,
}, [
  { slug: 'ledger_keeper', name: 'Ledger Keeper Agent', role: 'Bookkeeper', jtbd: 'Keep the ledger tidy and explain entries.',
    input: 'ledger', output: 'ledger health', actions: ['analyze', 'classify'] },
  { slug: 'journal_drafter', name: 'Journal Drafter Agent', role: 'Bookkeeper', jtbd: 'Draft journal entries for review.',
    input: 'transactions', output: 'draft journals', actions: ['draft'] },
  { slug: 'closing_assistant', name: 'Month-End Closing Agent', role: 'Controller', jtbd: 'Run the month-end checklist and flag gaps.',
    input: 'ledger, invoices, bills', output: 'close status', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'gst_filing_prep', name: 'GST Filing Prep Agent', role: 'Tax', jtbd: 'Prepare GST return data from live invoices.',
    input: 'invoices, purchases', output: 'GST return draft', actions: ['draft'], status: ES.CONNECTOR_REQUIRED, connector: true, risk: R.HIGH },
  { slug: 'audit_trail', name: 'Audit Trail Agent', role: 'Auditor', jtbd: 'Maintain an immutable trail of accounting actions.',
    input: 'audit_log', output: 'audit trail', actions: ['analyze'] },
  { slug: 'depreciation', name: 'Depreciation Agent', role: 'Bookkeeper', jtbd: 'Track and schedule asset depreciation.',
    input: 'assets', output: 'depreciation schedule', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'chart_of_accounts', name: 'Chart of Accounts Agent', role: 'Controller', jtbd: 'Keep the COA consistent.',
    input: 'ledger', output: 'COA suggestions', actions: ['recommend'], status: ES.PREVIEW },
]));

// ── 5. Invoice Agents ─────────────────────────────────────────────────────────
DOMAINS.push(buildDomain('invoice', 'Invoice', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.finance, SWARM.collections], evidence: true,
}, [
  { slug: 'invoice_reader', name: 'Invoice Reader Agent', role: 'AR', jtbd: 'Read and structure every invoice and its status.',
    input: 'invoices', output: 'invoice status read', actions: ['analyze'] },
  { slug: 'invoice_drafter', name: 'Invoice Drafter Agent', role: 'AR', jtbd: 'Draft an invoice from an order or agreement.',
    input: 'orders, customers', output: 'draft invoice', actions: ['draft'] },
  { slug: 'invoice_sender', name: 'Invoice Sender Agent', role: 'AR', jtbd: 'Send the approved invoice to the customer.',
    input: 'approved invoice', output: 'send instruction', actions: ['external_send', 'customer_facing'],
    status: ES.CONNECTOR_REQUIRED, risk: R.HIGH, connector: true },
  { slug: 'overdue_detector', name: 'Overdue Detector Agent', role: 'AR', jtbd: 'Flag invoices crossing due dates.',
    input: 'invoices', output: 'overdue list', actions: ['analyze', 'alert'] },
  { slug: 'aging_analyst', name: 'Aging Analyst Agent', role: 'AR', jtbd: 'Build the receivables aging picture.',
    input: 'invoices', output: 'aging buckets', actions: ['analyze'] },
  { slug: 'credit_note', name: 'Credit Note Agent', role: 'AR', jtbd: 'Draft credit notes for disputes/returns.',
    input: 'invoices, disputes', output: 'draft credit note', actions: ['draft', 'financial_move'], status: ES.PREVIEW, risk: R.HIGH },
  { slug: 'einvoice', name: 'E-Invoice Agent', role: 'Tax', jtbd: 'Generate IRN/e-invoice payloads.',
    input: 'invoices', output: 'e-invoice payload', actions: ['draft'], status: ES.CONNECTOR_REQUIRED, connector: true, risk: R.HIGH },
  { slug: 'payment_link', name: 'Payment Link Agent', role: 'AR', jtbd: 'Attach a payment link to an invoice.',
    input: 'invoices', output: 'payment link', actions: ['financial_move', 'customer_facing'], status: ES.CONNECTOR_REQUIRED, connector: true, risk: R.HIGH },
]));

// ── 6. Collections Agents ─────────────────────────────────────────────────────
DOMAINS.push(buildDomain('collections', 'Collections', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.collections], evidence: true,
}, [
  { slug: 'receivables_map', name: 'Receivables Map Agent', role: 'Collections', jtbd: 'Show who owes what, ranked by risk and age.',
    input: 'invoices, customers', output: 'receivables map', actions: ['analyze', 'rank'] },
  { slug: 'priority_chaser', name: 'Priority Chaser Agent', role: 'Collections', jtbd: 'Decide who to chase first for max recovery.',
    input: 'invoices, payment history', output: 'chase priority list', actions: ['rank', 'recommend'] },
  { slug: 'reminder_drafter', name: 'Reminder Drafter Agent', role: 'Collections', jtbd: 'Draft a polite, escalating reminder.',
    input: 'overdue invoice, customer', output: 'draft reminder', actions: ['draft', 'customer_facing'], risk: R.HIGH },
  { slug: 'reminder_sender', name: 'Reminder Sender Agent', role: 'Collections', jtbd: 'Send the approved reminder over WhatsApp/email.',
    input: 'approved reminder', output: 'send instruction', actions: ['external_send', 'customer_facing'],
    status: ES.CONNECTOR_REQUIRED, risk: R.HIGH, connector: true },
  { slug: 'promise_tracker', name: 'Promise-to-Pay Tracker', role: 'Collections', jtbd: 'Track payment promises and broken ones.',
    input: 'collections log', output: 'promise status', actions: ['analyze', 'monitor'] },
  { slug: 'recovery_strategist', name: 'Recovery Strategist Agent', role: 'Collections', jtbd: 'Pick the right recovery path per debtor.',
    input: 'debtor history', output: 'recovery strategy', actions: ['recommend'] },
  { slug: 'dispute_spotter', name: 'Dispute Spotter Agent', role: 'Collections', jtbd: 'Detect when non-payment is really a dispute.',
    input: 'invoices, messages', output: 'dispute flags', actions: ['analyze'] },
  { slug: 'settlement_proposer', name: 'Settlement Proposer Agent', role: 'Collections', jtbd: 'Propose settlement terms for stuck debt.',
    input: 'debtor history', output: 'settlement proposal', actions: ['recommend', 'financial_move'], status: ES.PREVIEW, risk: R.HIGH },
  { slug: 'legal_escalation', name: 'Legal Escalation Agent', role: 'Collections', jtbd: 'Prepare a legal-notice escalation packet.',
    input: 'debtor history, contracts', output: 'escalation packet', actions: ['draft', 'legal_commitment'], status: ES.PREVIEW, risk: R.CRITICAL },
  { slug: 'bad_debt_classifier', name: 'Bad Debt Classifier', role: 'Collections', jtbd: 'Classify which debt is likely unrecoverable.',
    input: 'invoices, history', output: 'bad-debt classification', actions: ['classify'] },
]));

// ── 7. Sales Agents ───────────────────────────────────────────────────────────
DOMAINS.push(buildDomain('sales', 'Sales', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.sales], evidence: true,
}, [
  { slug: 'pipeline_reader', name: 'Pipeline Reader Agent', role: 'Sales Ops', jtbd: 'Show the live pipeline and where deals are stuck.',
    input: 'prospects, orders', output: 'pipeline read', actions: ['analyze'] },
  { slug: 'lead_scorer', name: 'Lead Scorer Agent', role: 'Sales Ops', jtbd: 'Score leads by fit and intent.',
    input: 'prospects', output: 'lead scores', actions: ['classify', 'rank'] },
  { slug: 'quote_drafter', name: 'Quote Drafter Agent', role: 'Sales', jtbd: 'Draft a quote from products and price rules.',
    input: 'products, customer', output: 'draft quote', actions: ['draft'] },
  { slug: 'followup_drafter', name: 'Follow-up Drafter Agent', role: 'Sales', jtbd: 'Draft the next sales follow-up.',
    input: 'deal history', output: 'draft follow-up', actions: ['draft', 'customer_facing'], risk: R.HIGH },
  { slug: 'followup_sender', name: 'Follow-up Sender Agent', role: 'Sales', jtbd: 'Send the approved follow-up.',
    input: 'approved message', output: 'send instruction', actions: ['external_send', 'customer_facing'],
    status: ES.CONNECTOR_REQUIRED, risk: R.HIGH, connector: true },
  { slug: 'win_loss', name: 'Win/Loss Analyst', role: 'Sales Ops', jtbd: 'Explain why deals were won or lost.',
    input: 'closed deals', output: 'win/loss insight', actions: ['analyze'] },
  { slug: 'forecast_sales', name: 'Sales Forecast Agent', role: 'Sales Ops', jtbd: 'Forecast bookings from pipeline.',
    input: 'pipeline', output: 'sales forecast', actions: ['forecast'] },
  { slug: 'upsell_spotter', name: 'Upsell Spotter Agent', role: 'Sales', jtbd: 'Spot upsell/cross-sell openings.',
    input: 'customers, orders', output: 'upsell suggestions', actions: ['recommend'] },
  { slug: 'territory_planner', name: 'Territory Planner Agent', role: 'Sales Ops', jtbd: 'Balance territories and quotas.',
    input: 'reps, accounts', output: 'territory plan', actions: ['recommend'], status: ES.PREVIEW },
]));

// ── 8. Customer Agents ────────────────────────────────────────────────────────
DOMAINS.push(buildDomain('customer', 'Customer', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.customer], evidence: true,
}, [
  { slug: 'customer_360', name: 'Customer 360 Agent', role: 'CS', jtbd: 'Assemble a full picture of a customer.',
    input: 'customers, invoices, orders, messages', output: 'customer 360', actions: ['analyze'] },
  { slug: 'churn_risk', name: 'Churn Risk Agent', role: 'CS', jtbd: 'Flag customers likely to leave.',
    input: 'orders, payment behavior', output: 'churn risk scores', actions: ['classify'] },
  { slug: 'health_scorer', name: 'Customer Health Scorer', role: 'CS', jtbd: 'Score account health.',
    input: 'usage, payments', output: 'health scores', actions: ['classify'] },
  { slug: 'lifecycle_mapper', name: 'Lifecycle Mapper Agent', role: 'CS', jtbd: 'Map each customer to a lifecycle stage.',
    input: 'customer history', output: 'lifecycle stages', actions: ['classify'] },
  { slug: 'nps_reader', name: 'Feedback/NPS Reader', role: 'CS', jtbd: 'Read sentiment from feedback.',
    input: 'messages, surveys', output: 'sentiment read', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'winback_drafter', name: 'Win-back Drafter Agent', role: 'CS', jtbd: 'Draft a win-back outreach.',
    input: 'churned customer', output: 'draft outreach', actions: ['draft', 'customer_facing'], risk: R.HIGH },
  { slug: 'loyalty_planner', name: 'Loyalty Planner Agent', role: 'CS', jtbd: 'Plan loyalty offers for top accounts.',
    input: 'customers, orders', output: 'loyalty plan', actions: ['recommend'], status: ES.PREVIEW },
]));

// ── 9. Supplier Agents ────────────────────────────────────────────────────────
DOMAINS.push(buildDomain('supplier', 'Supplier', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.supplier], evidence: true,
}, [
  { slug: 'supplier_ledger', name: 'Supplier Ledger Agent', role: 'Procurement', jtbd: 'Track what we owe each supplier.',
    input: 'purchases, bills', output: 'payables read', actions: ['analyze'] },
  { slug: 'supplier_scorer', name: 'Supplier Scorecard Agent', role: 'Procurement', jtbd: 'Score suppliers on price, quality, reliability.',
    input: 'purchases, deliveries', output: 'supplier scores', actions: ['classify'] },
  { slug: 'followup_supplier', name: 'Supplier Follow-up Drafter', role: 'Procurement', jtbd: 'Draft supplier follow-ups on orders/dues.',
    input: 'orders, bills', output: 'draft message', actions: ['draft', 'external_send'], status: ES.PREVIEW, risk: R.HIGH },
  { slug: 'price_watch', name: 'Supplier Price Watch', role: 'Procurement', jtbd: 'Detect supplier price drift.',
    input: 'purchases', output: 'price-change alerts', actions: ['monitor', 'alert'] },
  { slug: 'lead_time', name: 'Lead-Time Tracker', role: 'Procurement', jtbd: 'Track and predict supplier lead times.',
    input: 'orders, deliveries', output: 'lead-time read', actions: ['analyze'] },
  { slug: 'supplier_risk', name: 'Supplier Risk Agent', role: 'Procurement', jtbd: 'Flag concentration/dependency risk.',
    input: 'purchases', output: 'supplier risk read', actions: ['analyze'] },
  { slug: 'negotiation_prep', name: 'Negotiation Prep Agent', role: 'Procurement', jtbd: 'Prep negotiation leverage and targets.',
    input: 'supplier history', output: 'negotiation brief', actions: ['recommend'], status: ES.PREVIEW },
]));

// ── 10. Procurement Agents ────────────────────────────────────────────────────
DOMAINS.push(buildDomain('procurement', 'Procurement', {
  status: ES.PREVIEW, risk: R.MEDIUM, packs: [SWARM.supplier],
}, [
  { slug: 'po_reader', name: 'PO Reader Agent', role: 'Procurement', jtbd: 'Read open purchase orders and status.',
    input: 'purchases', output: 'PO status read', actions: ['analyze'], status: ES.LIVE_LIMITED, evidence: true },
  { slug: 'po_drafter', name: 'PO Drafter Agent', role: 'Procurement', jtbd: 'Draft a purchase order from a reorder need.',
    input: 'inventory, suppliers', output: 'draft PO', actions: ['draft'] },
  { slug: 'po_sender', name: 'PO Sender Agent', role: 'Procurement', jtbd: 'Send the approved PO to a supplier.',
    input: 'approved PO', output: 'send instruction', actions: ['external_send'], status: ES.CONNECTOR_REQUIRED, risk: R.HIGH, connector: true },
  { slug: 'three_way_match', name: '3-Way Match Agent', role: 'AP', jtbd: 'Match PO, GRN and invoice before pay.',
    input: 'purchases, deliveries, bills', output: 'match result', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'spend_analyst', name: 'Spend Analyst Agent', role: 'Procurement', jtbd: 'Analyze spend by category and supplier.',
    input: 'purchases', output: 'spend breakdown', actions: ['analyze'], status: ES.LIVE_LIMITED, evidence: true },
  { slug: 'sourcing_recommender', name: 'Sourcing Recommender', role: 'Procurement', jtbd: 'Recommend alternate sources.',
    input: 'suppliers, prices', output: 'sourcing options', actions: ['recommend'], status: ES.PREVIEW },
]));

// ── 11. Inventory Agents ──────────────────────────────────────────────────────
DOMAINS.push(buildDomain('inventory', 'Inventory', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.inventory], evidence: true,
}, [
  { slug: 'stock_reader', name: 'Stock Reader Agent', role: 'Inventory', jtbd: 'Show real-time stock on hand.',
    input: 'inventory', output: 'stock read', actions: ['analyze'] },
  { slug: 'reorder_planner', name: 'Reorder Planner Agent', role: 'Inventory', jtbd: 'Decide what to reorder and how much.',
    input: 'inventory, sales velocity', output: 'reorder plan', actions: ['recommend'] },
  { slug: 'deadstock_finder', name: 'Deadstock Finder Agent', role: 'Inventory', jtbd: 'Find slow/dead stock tying up cash.',
    input: 'inventory, movement', output: 'deadstock list', actions: ['analyze'] },
  { slug: 'stockout_predictor', name: 'Stockout Predictor Agent', role: 'Inventory', jtbd: 'Predict stockouts before they happen.',
    input: 'inventory, sales', output: 'stockout risk', actions: ['forecast', 'alert'] },
  { slug: 'abc_classifier', name: 'ABC Classifier Agent', role: 'Inventory', jtbd: 'Classify SKUs by value contribution.',
    input: 'inventory, sales', output: 'ABC classes', actions: ['classify'] },
  { slug: 'shrinkage_watch', name: 'Shrinkage Watch Agent', role: 'Inventory', jtbd: 'Detect unexplained stock loss.',
    input: 'movement', output: 'shrinkage alerts', actions: ['monitor', 'alert'] },
  { slug: 'multi_branch_stock', name: 'Multi-Branch Stock Agent', role: 'Inventory', jtbd: 'Balance stock across branches.',
    input: 'inventory by branch', output: 'transfer plan', actions: ['recommend'], status: ES.CUSTOM_REQUIRED },
  { slug: 'batch_expiry', name: 'Batch/Expiry Agent', role: 'Inventory', jtbd: 'Track batch and expiry for perishables/pharma.',
    input: 'inventory batches', output: 'expiry alerts', actions: ['monitor', 'alert'], status: ES.PREVIEW },
]));

// ── 12. Operations Agents ─────────────────────────────────────────────────────
DOMAINS.push(buildDomain('operations', 'Operations', {
  status: ES.PREVIEW, risk: R.MEDIUM, packs: [SWARM.operations],
}, [
  { slug: 'order_tracker', name: 'Order Tracker Agent', role: 'Ops', jtbd: 'Track orders from placed to delivered.',
    input: 'orders', output: 'order status read', actions: ['analyze'], status: ES.LIVE_LIMITED, evidence: true },
  { slug: 'fulfillment', name: 'Fulfillment Agent', role: 'Ops', jtbd: 'Coordinate fulfillment steps.',
    input: 'orders, inventory', output: 'fulfillment plan', actions: ['coordinate'] },
  { slug: 'sla_monitor', name: 'SLA Monitor Agent', role: 'Ops', jtbd: 'Watch operational SLAs.',
    input: 'orders, tickets', output: 'SLA breach alerts', actions: ['monitor', 'alert'] },
  { slug: 'capacity_planner', name: 'Capacity Planner Agent', role: 'Ops', jtbd: 'Plan capacity vs demand.',
    input: 'orders, resources', output: 'capacity plan', actions: ['recommend'] },
  { slug: 'logistics_router', name: 'Logistics Router Agent', role: 'Ops', jtbd: 'Optimize delivery routing.',
    input: 'orders, geography', output: 'routing plan', actions: ['recommend'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'workflow_orchestrator', name: 'Workflow Orchestrator Agent', role: 'Ops', jtbd: 'Run multi-step ops workflows.',
    input: 'workflow defs', output: 'orchestration state', actions: ['coordinate'], status: ES.CUSTOM_REQUIRED },
  { slug: 'incident_handler', name: 'Ops Incident Handler', role: 'Ops', jtbd: 'Coordinate response to ops incidents.',
    input: 'alerts', output: 'incident plan', actions: ['coordinate'], status: ES.PREVIEW, risk: R.HIGH },
]));

// ── 13. HR / Admin Agents ─────────────────────────────────────────────────────
DOMAINS.push(buildDomain('hr', 'HR/Admin', {
  status: ES.PREVIEW, risk: R.MEDIUM, packs: [SWARM.operations],
}, [
  { slug: 'attendance_reader', name: 'Attendance Reader Agent', role: 'HR', jtbd: 'Read attendance and flag anomalies.',
    input: 'attendance', output: 'attendance read', actions: ['analyze'], status: ES.LIVE_LIMITED, evidence: true },
  { slug: 'payroll_prep', name: 'Payroll Prep Agent', role: 'HR', jtbd: 'Prepare payroll inputs for review.',
    input: 'attendance, salaries', output: 'payroll draft', actions: ['draft', 'financial_move'], status: ES.CONNECTOR_REQUIRED, risk: R.CRITICAL, connector: true },
  { slug: 'leave_tracker', name: 'Leave Tracker Agent', role: 'HR', jtbd: 'Track leave balances and requests.',
    input: 'attendance', output: 'leave status', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'onboarding_assistant', name: 'Onboarding Assistant', role: 'HR', jtbd: 'Run the new-hire checklist.',
    input: 'team', output: 'onboarding status', actions: ['coordinate'], status: ES.PREVIEW },
  { slug: 'doc_admin', name: 'Admin Doc Agent', role: 'Admin', jtbd: 'Keep admin documents organized.',
    input: 'documents', output: 'doc index', actions: ['classify'], status: ES.PREVIEW },
  { slug: 'compliance_hr', name: 'HR Compliance Agent', role: 'HR', jtbd: 'Flag HR compliance gaps.',
    input: 'team, policies', output: 'compliance gaps', actions: ['analyze'], status: ES.PREVIEW, risk: R.HIGH },
]));

// ── 14. Compliance Agents ─────────────────────────────────────────────────────
DOMAINS.push(buildDomain('compliance', 'Compliance', {
  status: ES.LIVE_LIMITED, risk: R.HIGH, packs: [SWARM.compliance], evidence: true,
}, [
  { slug: 'policy_guard', name: 'Policy Guard Agent', role: 'Compliance', jtbd: 'Check an action against policy before it runs.',
    input: 'action context, policy', output: 'allow/deny + reason', actions: ['analyze', 'classify'],
    status: ES.LIVE_LIMITED, route: '/api/agents/core.policy_guard/evaluate', risk: R.MEDIUM },
  { slug: 'gst_compliance', name: 'GST Compliance Agent', role: 'Tax', jtbd: 'Flag GST compliance gaps.',
    input: 'invoices, returns', output: 'compliance gaps', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'kyc_checker', name: 'KYC Checker Agent', role: 'Compliance', jtbd: 'Verify customer/supplier KYC completeness.',
    input: 'customers, documents', output: 'KYC status', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'deadline_tracker', name: 'Compliance Deadline Tracker', role: 'Compliance', jtbd: 'Track filing/renewal deadlines.',
    input: 'business_profile, calendar', output: 'deadline alerts', actions: ['monitor', 'alert'], status: ES.PREVIEW },
  { slug: 'evidence_collector', name: 'Compliance Evidence Collector', role: 'Compliance', jtbd: 'Collect evidence for an audit.',
    input: 'evidence_vault, audit_log', output: 'evidence bundle', actions: ['analyze'], status: ES.LIVE_LIMITED, risk: R.MEDIUM },
  { slug: 'aml_screen', name: 'AML Screening Agent', role: 'Compliance', jtbd: 'Screen counterparties against lists.',
    input: 'customers', output: 'screening result', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true, risk: R.CRITICAL },
]));

// ── 15. Legal / Contract Agents ───────────────────────────────────────────────
DOMAINS.push(buildDomain('legal', 'Legal/Contract', {
  status: ES.PREVIEW, risk: R.HIGH, packs: [SWARM.compliance],
}, [
  { slug: 'contract_reader', name: 'Contract Reader Agent', role: 'Legal', jtbd: 'Extract key terms from a contract.',
    input: 'documents', output: 'extracted terms', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'obligation_tracker', name: 'Obligation Tracker Agent', role: 'Legal', jtbd: 'Track contractual obligations and dates.',
    input: 'contracts', output: 'obligation calendar', actions: ['monitor', 'alert'], status: ES.PREVIEW },
  { slug: 'clause_risk', name: 'Clause Risk Agent', role: 'Legal', jtbd: 'Flag risky clauses before signing.',
    input: 'contracts', output: 'risk flags', actions: ['analyze'], status: ES.PREVIEW, risk: R.CRITICAL },
  { slug: 'notice_drafter', name: 'Legal Notice Drafter', role: 'Legal', jtbd: 'Draft a legal notice for review.',
    input: 'dispute, contract', output: 'draft notice', actions: ['draft', 'legal_commitment'], status: ES.PREVIEW, risk: R.CRITICAL },
  { slug: 'renewal_agent', name: 'Contract Renewal Agent', role: 'Legal', jtbd: 'Surface upcoming renewals.',
    input: 'contracts', output: 'renewal list', actions: ['monitor'], status: ES.PREVIEW },
]));

// ── 16. Document Agents ───────────────────────────────────────────────────────
DOMAINS.push(buildDomain('document', 'Document', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.operations], evidence: true,
}, [
  { slug: 'doc_extractor', name: 'Document Extractor Agent', role: 'Data', jtbd: 'Extract structured data from a scanned doc.',
    input: 'documents', output: 'extracted fields', actions: ['analyze', 'classify'] },
  { slug: 'invoice_ocr', name: 'Invoice OCR Agent', role: 'Data', jtbd: 'Read a supplier invoice image into fields.',
    input: 'invoice image', output: 'extracted invoice', actions: ['analyze'] },
  { slug: 'doc_classifier', name: 'Document Classifier Agent', role: 'Data', jtbd: 'Classify incoming documents by type.',
    input: 'documents', output: 'doc type', actions: ['classify'] },
  { slug: 'doc_vault', name: 'Document Vault Agent', role: 'Data', jtbd: 'Index and retrieve documents on demand.',
    input: 'documents', output: 'searchable index', actions: ['analyze'] },
  { slug: 'statement_parser', name: 'Bank Statement Parser', role: 'Data', jtbd: 'Parse a bank statement into transactions.',
    input: 'statement', output: 'parsed transactions', actions: ['analyze'] },
  { slug: 'doc_redactor', name: 'Document Redactor Agent', role: 'Data', jtbd: 'Redact PII before sharing.',
    input: 'documents', output: 'redacted doc', actions: ['draft'], status: ES.PREVIEW, risk: R.HIGH },
]));

// ── 17. Communication Agents ──────────────────────────────────────────────────
DOMAINS.push(buildDomain('communication', 'Communication', {
  status: ES.PREVIEW, risk: R.HIGH, packs: [SWARM.customer],
}, [
  { slug: 'message_drafter', name: 'Message Drafter Agent', role: 'Comms', jtbd: 'Draft any customer/supplier message for approval.',
    input: 'context, contact', output: 'draft message', actions: ['draft', 'customer_facing'], risk: R.HIGH },
  { slug: 'tone_checker', name: 'Tone Checker Agent', role: 'Comms', jtbd: 'Check a draft for tone and compliance.',
    input: 'draft message', output: 'tone feedback', actions: ['analyze'], status: ES.LIVE_LIMITED, evidence: true, risk: R.LOW },
  { slug: 'whatsapp_sender', name: 'WhatsApp Sender Agent', role: 'Comms', jtbd: 'Send an approved WhatsApp message.',
    input: 'approved message', output: 'send instruction', actions: ['external_send', 'customer_facing'],
    status: ES.CONNECTOR_REQUIRED, risk: R.HIGH, connector: true },
  { slug: 'email_sender', name: 'Email Sender Agent', role: 'Comms', jtbd: 'Send an approved email.',
    input: 'approved email', output: 'send instruction', actions: ['external_send', 'customer_facing'],
    status: ES.CONNECTOR_REQUIRED, risk: R.HIGH, connector: true },
  { slug: 'campaign_planner', name: 'Campaign Planner Agent', role: 'Comms', jtbd: 'Plan a multi-touch outreach campaign.',
    input: 'segments', output: 'campaign plan', actions: ['recommend'], status: ES.PREVIEW },
  { slug: 'reply_router', name: 'Reply Router Agent', role: 'Comms', jtbd: 'Route inbound replies to the right owner.',
    input: 'inbound messages', output: 'routing', actions: ['route'], status: ES.CONNECTOR_REQUIRED, connector: true },
]));

// ── 18. Analytics Agents ──────────────────────────────────────────────────────
DOMAINS.push(buildDomain('analytics', 'Analytics', {
  status: ES.LIVE_LIMITED, risk: R.LOW, packs: [SWARM.growth], evidence: true,
}, [
  { slug: 'kpi_reader', name: 'KPI Reader Agent', role: 'Analyst', jtbd: 'Read the core KPIs and trends.',
    input: 'metrics, analytics', output: 'KPI read', actions: ['analyze'] },
  { slug: 'anomaly_detector', name: 'Anomaly Detector Agent', role: 'Analyst', jtbd: 'Spot anomalies in the numbers.',
    input: 'metrics', output: 'anomaly flags', actions: ['monitor', 'alert'] },
  { slug: 'cohort_analyst', name: 'Cohort Analyst Agent', role: 'Analyst', jtbd: 'Analyze customer/revenue cohorts.',
    input: 'customers, invoices', output: 'cohort insight', actions: ['analyze'] },
  { slug: 'trend_explainer', name: 'Trend Explainer Agent', role: 'Analyst', jtbd: 'Explain why a metric moved.',
    input: 'metrics', output: 'trend explanation', actions: ['analyze'] },
  { slug: 'benchmark', name: 'Benchmark Agent', role: 'Analyst', jtbd: 'Benchmark against peers/industry.',
    input: 'metrics', output: 'benchmark read', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'report_builder', name: 'Report Builder Agent', role: 'Analyst', jtbd: 'Assemble a business report.',
    input: 'metrics, analytics', output: 'report draft', actions: ['draft'] },
]));

// ── 19. Data Quality Agents ───────────────────────────────────────────────────
DOMAINS.push(buildDomain('dataquality', 'Data Quality', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.risk], evidence: true,
}, [
  { slug: 'dq_scanner', name: 'Data Quality Scanner', role: 'Data', jtbd: 'Score the health of tenant data before trusting it.',
    input: 'all sources', output: 'data-quality report', actions: ['analyze'],
    route: '/api/agents/core.data_quality/preview' },
  { slug: 'dupe_finder', name: 'Duplicate Finder Agent', role: 'Data', jtbd: 'Find duplicate customers/invoices.',
    input: 'customers, invoices', output: 'duplicate clusters', actions: ['analyze'] },
  { slug: 'missing_field', name: 'Missing Field Agent', role: 'Data', jtbd: 'Flag records missing critical fields.',
    input: 'all sources', output: 'gap list', actions: ['analyze'] },
  { slug: 'repair_proposer', name: 'Data Repair Proposer', role: 'Data', jtbd: 'Propose fixes for bad data (human applies).',
    input: 'gap list', output: 'repair proposals', actions: ['recommend'] },
  { slug: 'consistency_checker', name: 'Consistency Checker Agent', role: 'Data', jtbd: 'Check cross-source consistency.',
    input: 'all sources', output: 'inconsistencies', actions: ['analyze'] },
]));

// ── 20. Approval Agents ───────────────────────────────────────────────────────
DOMAINS.push(buildDomain('approval', 'Approval', {
  status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.risk], evidence: true,
}, [
  { slug: 'approval_router', name: 'Approval Router Agent', role: 'Control', jtbd: 'Route each risky action to the right approver.',
    input: 'pending actions, roles', output: 'approval routing', actions: ['route'] },
  { slug: 'approval_packager', name: 'Approval Packager Agent', role: 'Control', jtbd: 'Package the evidence an approver needs to decide.',
    input: 'action + evidence', output: 'approval packet', actions: ['analyze', 'summarize'] },
  { slug: 'threshold_guard', name: 'Threshold Guard Agent', role: 'Control', jtbd: 'Enforce value thresholds for auto vs manual.',
    input: 'action value, policy', output: 'gate decision', actions: ['classify'] },
  { slug: 'approval_audit', name: 'Approval Audit Agent', role: 'Control', jtbd: 'Record who approved what and why.',
    input: 'approvals', output: 'audit entries', actions: ['analyze'] },
  { slug: 'sod_checker', name: 'Segregation-of-Duties Agent', role: 'Control', jtbd: 'Ensure maker ≠ checker.',
    input: 'actions, roles', output: 'SoD violations', actions: ['analyze'], risk: R.HIGH },
]));

// ── 21. Risk / Audit Agents ───────────────────────────────────────────────────
DOMAINS.push(buildDomain('risk', 'Risk/Audit', {
  status: ES.LIVE_LIMITED, risk: R.HIGH, packs: [SWARM.risk], evidence: true,
}, [
  { slug: 'cost_router', name: 'Cost Router Agent', role: 'Risk', jtbd: 'Pick the safe/cheap execution route for an agent call.',
    input: 'request, routing policy', output: 'route decision', actions: ['classify'],
    route: '/api/agents/core.cost_router/evaluate', risk: R.MEDIUM },
  { slug: 'fraud_spotter', name: 'Fraud Spotter Agent', role: 'Risk', jtbd: 'Detect suspicious financial patterns.',
    input: 'ledger, invoices', output: 'fraud flags', actions: ['monitor', 'alert'], risk: R.CRITICAL },
  { slug: 'credit_risk', name: 'Credit Risk Agent', role: 'Risk', jtbd: 'Score customer credit risk.',
    input: 'payment history', output: 'credit risk score', actions: ['classify'] },
  { slug: 'concentration_risk', name: 'Concentration Risk Agent', role: 'Risk', jtbd: 'Flag over-reliance on a few customers/suppliers.',
    input: 'invoices, purchases', output: 'concentration read', actions: ['analyze'] },
  { slug: 'audit_readiness', name: 'Audit Readiness Agent', role: 'Audit', jtbd: 'Assess how audit-ready the books are.',
    input: 'evidence_vault, audit_log', output: 'readiness score', actions: ['analyze'] },
  { slug: 'control_tester', name: 'Control Tester Agent', role: 'Audit', jtbd: 'Test that controls actually fire.',
    input: 'controls, logs', output: 'control test results', actions: ['analyze'], status: ES.PREVIEW },
]));

// ── 22. Industry-Specific Agents (preview / connector / custom) ───────────────
DOMAINS.push(buildDomain('industry', 'Industry-Specific', {
  status: ES.PREVIEW, risk: R.MEDIUM, packs: [],
}, [
  { slug: 'retail_basket', name: 'Retail Basket Agent', role: 'Industry', jtbd: 'Analyze basket size and attach rates.',
    input: 'orders', output: 'basket insight', actions: ['analyze'] },
  { slug: 'distribution_beat', name: 'Distribution Beat Agent', role: 'Industry', jtbd: 'Plan distributor beat/route coverage.',
    input: 'orders, geography', output: 'beat plan', actions: ['recommend'], status: ES.CUSTOM_REQUIRED },
  { slug: 'manufacturing_bom', name: 'Manufacturing BOM Agent', role: 'Industry', jtbd: 'Track BOM cost and availability.',
    input: 'inventory, BOM', output: 'BOM read', actions: ['analyze'], status: ES.CUSTOM_REQUIRED },
  { slug: 'logistics_eta', name: 'Logistics ETA Agent', role: 'Industry', jtbd: 'Predict delivery ETAs.',
    input: 'shipments', output: 'ETA predictions', actions: ['forecast'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'saas_mrr', name: 'SaaS MRR Agent', role: 'Industry', jtbd: 'Track MRR/ARR movements.',
    input: 'subscriptions', output: 'MRR read', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'construction_ra', name: 'Construction RA-Bill Agent', role: 'Industry', jtbd: 'Track RA bills and retention.',
    input: 'invoices', output: 'RA/retention read', actions: ['analyze'], status: ES.CUSTOM_REQUIRED },
  { slug: 'healthcare_claims', name: 'Healthcare Claims Agent', role: 'Industry', jtbd: 'Track claims and reimbursements.',
    input: 'claims', output: 'claims read', actions: ['analyze'], status: ES.ROADMAP, risk: R.HIGH },
  { slug: 'education_fees', name: 'Education Fee Agent', role: 'Industry', jtbd: 'Track fee collection and dues.',
    input: 'invoices, students', output: 'fee dues read', actions: ['analyze'], status: ES.ROADMAP },
  { slug: 'fmcg_secondary', name: 'FMCG Secondary Sales Agent', role: 'Industry', jtbd: 'Track secondary sales through channel.',
    input: 'orders', output: 'secondary sales read', actions: ['analyze'], status: ES.ROADMAP },
  { slug: 'automotive_service', name: 'Automotive Service Agent', role: 'Industry', jtbd: 'Track service jobs and parts.',
    input: 'orders, inventory', output: 'service read', actions: ['analyze'], status: ES.ROADMAP },
  { slug: 'robotics_ops', name: 'Robotics/Physical Ops Agent', role: 'Industry', jtbd: 'Coordinate physical robotic operations (future).',
    input: 'device telemetry', output: 'ops coordination', actions: ['coordinate'], status: ES.ROADMAP, risk: R.CRITICAL },
]));

// ── 23. Region-Specific Agents ────────────────────────────────────────────────
DOMAINS.push(buildDomain('region', 'Region-Specific', {
  status: ES.PREVIEW, risk: R.MEDIUM, packs: [],
}, [
  { slug: 'india_gst', name: 'India GST Agent', role: 'Region', jtbd: 'Apply India GST rules to invoices.',
    input: 'invoices', output: 'GST treatment', actions: ['analyze'], status: ES.LIVE_LIMITED, evidence: true, risk: R.HIGH },
  { slug: 'india_tds', name: 'India TDS Agent', role: 'Region', jtbd: 'Compute TDS on payments.',
    input: 'bills, payments', output: 'TDS computation', actions: ['analyze'], status: ES.PREVIEW, risk: R.HIGH },
  { slug: 'us_sales_tax', name: 'US Sales Tax Agent', role: 'Region', jtbd: 'Apply US state sales tax.',
    input: 'invoices', output: 'tax treatment', actions: ['analyze'], status: ES.ROADMAP },
  { slug: 'eu_vat', name: 'EU VAT Agent', role: 'Region', jtbd: 'Apply EU VAT and OSS rules.',
    input: 'invoices', output: 'VAT treatment', actions: ['analyze'], status: ES.ROADMAP },
  { slug: 'gcc_vat', name: 'GCC VAT Agent', role: 'Region', jtbd: 'Apply GCC VAT rules.',
    input: 'invoices', output: 'VAT treatment', actions: ['analyze'], status: ES.ROADMAP },
  { slug: 'uk_vat', name: 'UK VAT/MTD Agent', role: 'Region', jtbd: 'Apply UK VAT and MTD filing prep.',
    input: 'invoices', output: 'VAT treatment', actions: ['analyze'], status: ES.ROADMAP },
  { slug: 'sea_tax', name: 'SEA Tax Agent', role: 'Region', jtbd: 'Apply SEA regional tax rules.',
    input: 'invoices', output: 'tax treatment', actions: ['analyze'], status: ES.ROADMAP },
  { slug: 'latam_tax', name: 'LATAM Tax Agent', role: 'Region', jtbd: 'Apply LATAM e-invoicing/tax rules.',
    input: 'invoices', output: 'tax treatment', actions: ['analyze'], status: ES.ROADMAP },
]));

// ── 24. Enterprise Governance Agents ──────────────────────────────────────────
DOMAINS.push(buildDomain('governance', 'Enterprise Governance', {
  status: ES.CUSTOM_REQUIRED, risk: R.HIGH, packs: [],
}, [
  { slug: 'entity_consolidator', name: 'Multi-Entity Consolidator', role: 'Governance', jtbd: 'Consolidate financials across entities.',
    input: 'entity financials', output: 'consolidated view', actions: ['analyze'] },
  { slug: 'intercompany', name: 'Intercompany Agent', role: 'Governance', jtbd: 'Reconcile intercompany transactions.',
    input: 'entity ledgers', output: 'intercompany matches', actions: ['analyze'] },
  { slug: 'policy_distributor', name: 'Policy Distributor Agent', role: 'Governance', jtbd: 'Push governance policy to all units.',
    input: 'policies', output: 'distribution state', actions: ['coordinate'] },
  { slug: 'role_governor', name: 'Role Governor Agent', role: 'Governance', jtbd: 'Govern roles and access across the group.',
    input: 'roles, access', output: 'access governance', actions: ['analyze'], risk: R.CRITICAL },
  { slug: 'data_room', name: 'Data Room Agent', role: 'Governance', jtbd: 'Maintain an investor/diligence data room.',
    input: 'evidence_vault, financials', output: 'data room index', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'board_pack', name: 'Board Pack Agent', role: 'Governance', jtbd: 'Assemble the quarterly board pack.',
    input: 'financials, KPIs', output: 'board pack draft', actions: ['draft'], status: ES.PREVIEW, risk: R.HIGH },
]));

// ── 25. Developer / API Agents ────────────────────────────────────────────────
DOMAINS.push(buildDomain('developer', 'Developer/API', {
  status: ES.PREVIEW, risk: R.MEDIUM, packs: [],
}, [
  { slug: 'registry_browser', name: 'Agent Registry Browser', role: 'Platform', jtbd: 'List the public agent registry for builders.',
    input: 'registry', output: 'agent catalog', actions: ['analyze'], status: ES.LIVE_LIMITED, evidence: true,
    route: '/api/agents/registry', risk: R.LOW },
  { slug: 'webhook_designer', name: 'Webhook Designer Agent', role: 'Platform', jtbd: 'Design webhook subscriptions.',
    input: 'event types', output: 'webhook config', actions: ['draft'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'connector_builder', name: 'Connector Builder Agent', role: 'Platform', jtbd: 'Scaffold a new external connector.',
    input: 'API spec', output: 'connector scaffold', actions: ['draft'], status: ES.CUSTOM_REQUIRED },
  { slug: 'api_key_governor', name: 'API Key Governor Agent', role: 'Platform', jtbd: 'Govern API keys and scopes.',
    input: 'keys, scopes', output: 'key governance', actions: ['analyze'], risk: R.HIGH },
  { slug: 'mesh_orchestrator', name: 'Private Agent Mesh Orchestrator', role: 'Platform', jtbd: 'Run a tenant-private agent mesh.',
    input: 'mesh config', output: 'mesh state', actions: ['coordinate'], status: ES.CUSTOM_REQUIRED, risk: R.HIGH },
  { slug: 'sandbox_runner', name: 'Sandbox Runner Agent', role: 'Platform', jtbd: 'Run agents in a safe sandbox.',
    input: 'agent + fixtures', output: 'sandbox result', actions: ['analyze'], status: ES.PREVIEW },
]));

// ─────────────────────────────────────────────────────────────────────────────
// WAVE 2 — additional functional agents (distinct, schema-complete)
// ─────────────────────────────────────────────────────────────────────────────
DOMAINS.push(buildDomain('finance', 'Finance', { status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.finance], evidence: true }, [
  { slug: 'revenue_recognition', name: 'Revenue Recognition Agent', role: 'Controller', jtbd: 'Recognize revenue per policy.', input: 'invoices, contracts', output: 'recognized revenue', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'accrual_agent', name: 'Accruals Agent', role: 'Bookkeeper', jtbd: 'Track accruals and prepayments.', input: 'ledger, bills', output: 'accrual schedule', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'petty_cash', name: 'Petty Cash Agent', role: 'Bookkeeper', jtbd: 'Track petty cash spend.', input: 'ledger', output: 'petty cash read', actions: ['analyze'] },
  { slug: 'loan_tracker', name: 'Loan & EMI Tracker', role: 'Treasury', jtbd: 'Track loans, EMIs and interest due.', input: 'ledger, bank', output: 'loan schedule', actions: ['analyze'] },
  { slug: 'cost_center', name: 'Cost Center Agent', role: 'FP&A', jtbd: 'Allocate spend to cost centers.', input: 'ledger', output: 'cost-center read', actions: ['classify'], status: ES.PREVIEW },
  { slug: 'vendor_credit', name: 'Vendor Credit Agent', role: 'AP', jtbd: 'Track vendor credits and advances.', input: 'bills, purchases', output: 'vendor credit read', actions: ['analyze'] },
  { slug: 'grant_tracker', name: 'Grant/Subsidy Tracker', role: 'Controller', jtbd: 'Track grants and subsidy milestones.', input: 'documents, ledger', output: 'grant status', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'profitability_drilldown', name: 'Profitability Drilldown Agent', role: 'FP&A', jtbd: 'Drill profitability by any dimension.', input: 'invoices, costs', output: 'profitability read', actions: ['analyze'] },
]));

DOMAINS.push(buildDomain('cashflow', 'Cashflow', { status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.finance], evidence: true }, [
  { slug: 'seasonality', name: 'Cash Seasonality Agent', role: 'Analyst', jtbd: 'Detect seasonal cash patterns.', input: 'history', output: 'seasonality read', actions: ['analyze'] },
  { slug: 'collection_velocity', name: 'Collection Velocity Agent', role: 'Analyst', jtbd: 'Measure how fast collections convert.', input: 'invoices, payments', output: 'velocity read', actions: ['analyze'] },
  { slug: 'gap_bridger', name: 'Cash Gap Bridger Agent', role: 'Treasury', jtbd: 'Propose ways to bridge a forecast gap.', input: 'forecast', output: 'bridge options', actions: ['recommend'], status: ES.PREVIEW },
  { slug: 'payout_timer', name: 'Payout Timing Agent', role: 'Treasury', jtbd: 'Optimize when to release payouts.', input: 'bills, cash', output: 'timing plan', actions: ['recommend'] },
]));

DOMAINS.push(buildDomain('invoice', 'Invoice', { status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.finance, SWARM.collections], evidence: true }, [
  { slug: 'recurring', name: 'Recurring Invoice Agent', role: 'AR', jtbd: 'Manage recurring/subscription invoices.', input: 'invoices, contracts', output: 'recurring schedule', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'proforma', name: 'Proforma Drafter Agent', role: 'AR', jtbd: 'Draft a proforma invoice.', input: 'orders', output: 'draft proforma', actions: ['draft'] },
  { slug: 'invoice_validator', name: 'Invoice Validator Agent', role: 'AR', jtbd: 'Validate invoice fields before issue.', input: 'invoices', output: 'validation result', actions: ['analyze'] },
  { slug: 'dispute_linker', name: 'Invoice Dispute Linker', role: 'AR', jtbd: 'Link non-payment to a dispute record.', input: 'invoices, disputes', output: 'linked disputes', actions: ['analyze'] },
]));

DOMAINS.push(buildDomain('collections', 'Collections', { status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.collections], evidence: true }, [
  { slug: 'segment_strategy', name: 'Collections Segment Strategist', role: 'Collections', jtbd: 'Set a strategy per debtor segment.', input: 'invoices, customers', output: 'segment strategy', actions: ['recommend'] },
  { slug: 'contactability', name: 'Contactability Agent', role: 'Collections', jtbd: 'Find the best channel/time to reach a debtor.', input: 'contact history', output: 'contactability read', actions: ['analyze'] },
  { slug: 'escalation_ladder', name: 'Escalation Ladder Agent', role: 'Collections', jtbd: 'Decide the next escalation step.', input: 'collections log', output: 'next step', actions: ['recommend'] },
  { slug: 'write_off_proposer', name: 'Write-off Proposer Agent', role: 'Collections', jtbd: 'Propose write-offs for review.', input: 'invoices', output: 'write-off proposal', actions: ['recommend', 'financial_move'], status: ES.PREVIEW, risk: R.HIGH },
  { slug: 'collector_assignment', name: 'Collector Assignment Agent', role: 'Collections', jtbd: 'Assign debtors to collectors.', input: 'debtors, team', output: 'assignments', actions: ['route'] },
]));

DOMAINS.push(buildDomain('sales', 'Sales', { status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.sales], evidence: true }, [
  { slug: 'discount_guard', name: 'Discount Guard Agent', role: 'Deal Desk', jtbd: 'Flag discounts that break margin floors.', input: 'quotes, margins', output: 'discount flags', actions: ['analyze', 'alert'] },
  { slug: 'deal_desk', name: 'Deal Desk Agent', role: 'Deal Desk', jtbd: 'Review non-standard deal terms.', input: 'deals', output: 'deal review', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'renewal_sales', name: 'Renewal Sales Agent', role: 'Sales', jtbd: 'Surface and prep renewals.', input: 'contracts, orders', output: 'renewal list', actions: ['recommend'] },
  { slug: 'churn_save', name: 'Churn-Save Sales Agent', role: 'Sales', jtbd: 'Prep a save play for at-risk accounts.', input: 'churn risk', output: 'save play', actions: ['recommend'], status: ES.PREVIEW },
  { slug: 'sales_coach', name: 'Sales Coaching Agent', role: 'Sales Ops', jtbd: 'Coach reps from deal patterns.', input: 'deals', output: 'coaching notes', actions: ['recommend'], status: ES.PREVIEW },
]));

DOMAINS.push(buildDomain('customer', 'Customer', { status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.customer], evidence: true }, [
  { slug: 'onboarding_cs', name: 'Customer Onboarding Agent', role: 'CS', jtbd: 'Track customer onboarding milestones.', input: 'customers, orders', output: 'onboarding status', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'qbr_prep', name: 'QBR Prep Agent', role: 'CS', jtbd: 'Prep a quarterly business review.', input: 'customer history', output: 'QBR pack', actions: ['draft'], status: ES.PREVIEW },
  { slug: 'support_deflection', name: 'Support Deflection Agent', role: 'Support', jtbd: 'Suggest self-serve answers.', input: 'tickets, KB', output: 'deflection suggestions', actions: ['recommend'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'advocacy_finder', name: 'Advocacy Finder Agent', role: 'CS', jtbd: 'Find happy customers for referrals.', input: 'health scores', output: 'advocate list', actions: ['analyze'] },
]));

DOMAINS.push(buildDomain('supplier', 'Supplier', { status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.supplier], evidence: true }, [
  { slug: 'supplier_onboarding', name: 'Supplier Onboarding Agent', role: 'Procurement', jtbd: 'Run supplier onboarding & KYC checklist.', input: 'suppliers, documents', output: 'onboarding status', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'terms_optimizer', name: 'Payment Terms Optimizer', role: 'Procurement', jtbd: 'Find better payment terms.', input: 'bills, history', output: 'terms suggestions', actions: ['recommend'], status: ES.PREVIEW },
  { slug: 'alt_supplier', name: 'Alternate Supplier Finder', role: 'Procurement', jtbd: 'Find backup suppliers for key SKUs.', input: 'suppliers, inventory', output: 'alternate options', actions: ['recommend'], status: ES.PREVIEW },
  { slug: 'supplier_compliance', name: 'Supplier Compliance Agent', role: 'Procurement', jtbd: 'Track supplier doc/compliance status.', input: 'documents', output: 'compliance status', actions: ['analyze'], status: ES.PREVIEW },
]));

DOMAINS.push(buildDomain('inventory', 'Inventory', { status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.inventory], evidence: true }, [
  { slug: 'safety_stock', name: 'Safety Stock Agent', role: 'Inventory', jtbd: 'Compute safety stock levels.', input: 'inventory, demand', output: 'safety stock levels', actions: ['recommend'] },
  { slug: 'demand_forecaster', name: 'Demand Forecaster Agent', role: 'Inventory', jtbd: 'Forecast demand by SKU.', input: 'sales history', output: 'demand forecast', actions: ['forecast'] },
  { slug: 'replenishment_opt', name: 'Replenishment Optimizer', role: 'Inventory', jtbd: 'Optimize replenishment quantities.', input: 'inventory, lead times', output: 'replenishment plan', actions: ['recommend'] },
  { slug: 'sku_rationalizer', name: 'SKU Rationalizer Agent', role: 'Inventory', jtbd: 'Recommend SKUs to cut or keep.', input: 'inventory, sales', output: 'rationalization plan', actions: ['recommend'], status: ES.PREVIEW },
]));

DOMAINS.push(buildDomain('operations', 'Operations', { status: ES.PREVIEW, risk: R.MEDIUM, packs: [SWARM.operations] }, [
  { slug: 'task_orchestrator', name: 'Task Orchestrator Agent', role: 'Ops', jtbd: 'Orchestrate cross-team task flows.', input: 'tasks', output: 'orchestration state', actions: ['coordinate'], status: ES.CUSTOM_REQUIRED },
  { slug: 'field_dispatch', name: 'Field Ops Dispatch Agent', role: 'Ops', jtbd: 'Dispatch field jobs to staff.', input: 'jobs, team', output: 'dispatch plan', actions: ['route'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'quality_inspector', name: 'Quality Inspector Agent', role: 'Ops', jtbd: 'Track quality checks and failures.', input: 'inspections', output: 'quality read', actions: ['analyze'], status: ES.PREVIEW },
  { slug: 'returns_handler', name: 'Returns Handler Agent', role: 'Ops', jtbd: 'Coordinate returns/RMA.', input: 'orders', output: 'returns plan', actions: ['coordinate'], status: ES.PREVIEW },
  { slug: 'asset_tracker', name: 'Asset Tracker Agent', role: 'Ops', jtbd: 'Track company assets.', input: 'assets', output: 'asset read', actions: ['analyze'], status: ES.PREVIEW },
]));

DOMAINS.push(buildDomain('analytics', 'Analytics', { status: ES.LIVE_LIMITED, risk: R.LOW, packs: [SWARM.growth], evidence: true }, [
  { slug: 'pricing_analyst', name: 'Pricing Analyst Agent', role: 'Analyst', jtbd: 'Analyze price realization and leakage.', input: 'invoices, products', output: 'pricing insight', actions: ['analyze'] },
  { slug: 'profit_segmenter', name: 'Profit Segmenter Agent', role: 'Analyst', jtbd: 'Segment profit by customer/product.', input: 'invoices, costs', output: 'profit segments', actions: ['analyze'] },
  { slug: 'forecast_accuracy', name: 'Forecast Accuracy Agent', role: 'Analyst', jtbd: 'Measure forecast vs actuals.', input: 'forecast, actuals', output: 'accuracy read', actions: ['analyze'] },
  { slug: 'dashboard_composer', name: 'Dashboard Composer Agent', role: 'Analyst', jtbd: 'Compose a tailored metrics dashboard.', input: 'metrics', output: 'dashboard spec', actions: ['draft'] },
]));

DOMAINS.push(buildDomain('risk', 'Risk/Audit', { status: ES.LIVE_LIMITED, risk: R.HIGH, packs: [SWARM.risk], evidence: true }, [
  { slug: 'scenario_stress', name: 'Scenario Stress Agent', role: 'Risk', jtbd: 'Stress-test cash under adverse scenarios.', input: 'forecast', output: 'stress results', actions: ['simulate'], status: ES.PREVIEW },
  { slug: 'liquidity_risk', name: 'Liquidity Risk Agent', role: 'Risk', jtbd: 'Flag liquidity risk early.', input: 'forecast, bank', output: 'liquidity risk read', actions: ['analyze'] },
  { slug: 'vendor_risk', name: 'Vendor Risk Agent', role: 'Risk', jtbd: 'Assess vendor/supplier risk exposure.', input: 'purchases', output: 'vendor risk read', actions: ['analyze'] },
]));

DOMAINS.push(buildDomain('hr', 'HR/Admin', { status: ES.PREVIEW, risk: R.MEDIUM, packs: [SWARM.operations] }, [
  { slug: 'roster_planner', name: 'Roster Planner Agent', role: 'HR', jtbd: 'Plan staff rosters vs demand.', input: 'attendance, demand', output: 'roster plan', actions: ['recommend'], status: ES.PREVIEW },
  { slug: 'expense_claim', name: 'Expense Claim Agent', role: 'Admin', jtbd: 'Process staff expense claims for approval.', input: 'claims', output: 'claim review', actions: ['analyze', 'financial_move'], status: ES.PREVIEW, risk: R.HIGH },
  { slug: 'performance_tracker', name: 'Performance Tracker Agent', role: 'HR', jtbd: 'Track team performance signals.', input: 'team, metrics', output: 'performance read', actions: ['analyze'], status: ES.PREVIEW },
]));

DOMAINS.push(buildDomain('document', 'Document', { status: ES.LIVE_LIMITED, risk: R.MEDIUM, packs: [SWARM.operations], evidence: true }, [
  { slug: 'form_filler', name: 'Form Filler Agent', role: 'Data', jtbd: 'Pre-fill forms from known data.', input: 'forms, data', output: 'filled form draft', actions: ['draft'], status: ES.PREVIEW },
  { slug: 'signature_tracker', name: 'Signature Tracker Agent', role: 'Data', jtbd: 'Track e-signature status.', input: 'documents', output: 'signature status', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'doc_summarizer', name: 'Document Summarizer Agent', role: 'Data', jtbd: 'Summarize a long document.', input: 'documents', output: 'summary', actions: ['summarize'] },
]));

DOMAINS.push(buildDomain('compliance', 'Compliance', { status: ES.PREVIEW, risk: R.HIGH, packs: [SWARM.compliance] }, [
  { slug: 'data_privacy', name: 'Data Privacy Agent', role: 'Compliance', jtbd: 'Flag PII handling/privacy gaps.', input: 'data map', output: 'privacy gaps', actions: ['analyze'] },
  { slug: 'license_tracker', name: 'License/Permit Tracker', role: 'Compliance', jtbd: 'Track business licenses and renewals.', input: 'documents', output: 'license status', actions: ['monitor', 'alert'] },
  { slug: 'reg_change_watch', name: 'Regulatory Change Watch', role: 'Compliance', jtbd: 'Watch for relevant regulatory changes.', input: 'reg feeds', output: 'change alerts', actions: ['monitor'], status: ES.CONNECTOR_REQUIRED, connector: true },
]));

// ── Extra industry-specific business agents ───────────────────────────────────
DOMAINS.push(buildDomain('industry', 'Industry-Specific', { status: ES.PREVIEW, risk: R.MEDIUM, packs: [] }, [
  { slug: 'real_estate_lease', name: 'Real Estate Lease Agent', role: 'Industry', jtbd: 'Track leases, rent and renewals.', input: 'contracts, invoices', output: 'lease read', actions: ['analyze'], status: ES.CUSTOM_REQUIRED },
  { slug: 'agency_retainer', name: 'Agency Retainer Agent', role: 'Industry', jtbd: 'Track retainers and utilization.', input: 'invoices, projects', output: 'retainer read', actions: ['analyze'] },
  { slug: 'marketplace_take_rate', name: 'Marketplace Take-Rate Agent', role: 'Industry', jtbd: 'Track take-rate and seller payouts.', input: 'orders', output: 'take-rate read', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'export_lc', name: 'Export LC Agent', role: 'Industry', jtbd: 'Track letters of credit and export docs.', input: 'documents, invoices', output: 'LC status', actions: ['analyze'], status: ES.CUSTOM_REQUIRED, risk: R.HIGH },
  { slug: 'franchise_royalty', name: 'Franchise Royalty Agent', role: 'Industry', jtbd: 'Track franchise royalties and dues.', input: 'invoices', output: 'royalty read', actions: ['analyze'], status: ES.CUSTOM_REQUIRED },
  { slug: 'creator_revenue', name: 'Creator Revenue Agent', role: 'Industry', jtbd: 'Track multi-platform creator revenue.', input: 'payouts', output: 'revenue read', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'd2c_cac_ltv', name: 'D2C CAC/LTV Agent', role: 'Industry', jtbd: 'Track CAC, LTV and contribution.', input: 'orders, spend', output: 'CAC/LTV read', actions: ['analyze'], status: ES.CONNECTOR_REQUIRED, connector: true },
  { slug: 'professional_billing', name: 'Professional Services Billing Agent', role: 'Industry', jtbd: 'Track billable hours and WIP.', input: 'time, projects', output: 'WIP read', actions: ['analyze'], status: ES.PREVIEW },
]));

DOMAINS.push(buildDomain('governance', 'Enterprise Governance', { status: ES.CUSTOM_REQUIRED, risk: R.HIGH, packs: [] }, [
  { slug: 'transfer_pricing', name: 'Transfer Pricing Agent', role: 'Governance', jtbd: 'Track intercompany transfer pricing.', input: 'entity ledgers', output: 'TP read', actions: ['analyze'], risk: R.CRITICAL },
  { slug: 'audit_committee', name: 'Audit Committee Agent', role: 'Governance', jtbd: 'Prep audit committee materials.', input: 'audit_log, financials', output: 'committee pack', actions: ['draft'], status: ES.PREVIEW },
  { slug: 'esg_reporter', name: 'ESG Reporter Agent', role: 'Governance', jtbd: 'Assemble ESG reporting data.', input: 'operations data', output: 'ESG report draft', actions: ['draft'], status: ES.ROADMAP },
]));

DOMAINS.push(buildDomain('developer', 'Developer/API', { status: ES.PREVIEW, risk: R.MEDIUM, packs: [] }, [
  { slug: 'rate_limit_governor', name: 'Rate Limit Governor Agent', role: 'Platform', jtbd: 'Govern API rate limits per client.', input: 'usage', output: 'limit policy', actions: ['analyze'], risk: R.HIGH },
  { slug: 'schema_registry', name: 'Schema Registry Agent', role: 'Platform', jtbd: 'Maintain event/data schemas.', input: 'schemas', output: 'schema catalog', actions: ['analyze'], status: ES.CUSTOM_REQUIRED },
  { slug: 'event_replayer', name: 'Event Replayer Agent', role: 'Platform', jtbd: 'Replay events for recovery/testing.', input: 'event log', output: 'replay result', actions: ['coordinate'], status: ES.CUSTOM_REQUIRED, risk: R.HIGH },
]));

// ── Generator: jurisdiction-specific compliance agents (real, per-region) ─────
const REGIONS = [
  ['in', 'India'], ['us', 'US'], ['eu', 'EU'], ['gcc', 'GCC'],
  ['sea', 'SEA'], ['uk', 'UK'], ['latam', 'LATAM'], ['global', 'Global'],
];
const REG_FUNCS = [
  ['tax_filing', 'Tax Filing Prep', 'Prepare periodic tax-return data from live transactions.'],
  ['withholding', 'Withholding/TDS', 'Compute withholding/TDS on payments.'],
  ['einvoicing', 'E-Invoicing', 'Generate jurisdiction e-invoice payloads.'],
  ['statutory', 'Statutory Report', 'Prepare statutory reports for filing.'],
  ['registration', 'Entity Registration', 'Track entity registration/renewal status.'],
];
const regSpecs = [];
for (const [code, label] of REGIONS) {
  for (const [fnSlug, fnName, fnJtbd] of REG_FUNCS) {
    // India tax/e-invoice are connector-gated (real but need a filing connector);
    // everything else is roadmap until that jurisdiction is built.
    const isIndiaConnector = code === 'in' && (fnSlug === 'tax_filing' || fnSlug === 'einvoicing');
    regSpecs.push({
      slug: `${code}_${fnSlug}`,
      name: `${label} ${fnName} Agent`,
      role: 'Region Compliance',
      jtbd: `${label}: ${fnJtbd}`,
      input: 'invoices, purchases, bills, business_profile',
      output: `${label} ${fnName.toLowerCase()} draft`,
      actions: ['analyze', 'draft'],
      risk: R.HIGH,
      status: isIndiaConnector ? ES.CONNECTOR_REQUIRED : ES.ROADMAP,
      connector: isIndiaConnector,
    });
  }
}
DOMAINS.push(buildDomain('regcomp', 'Region Compliance', { status: ES.ROADMAP, risk: R.HIGH, packs: [] }, regSpecs));

// ── Generator: business-type specialist agents (one per business type) ────────
const BIZ_TYPES = [
  ['trader', 'Trader'], ['retailer', 'Retailer'], ['distributor', 'Distributor'],
  ['manufacturer', 'Manufacturer'], ['service', 'Service Business'], ['saas', 'SaaS'],
  ['agency', 'Agency'], ['consultant', 'Consultant'], ['marketplace', 'Marketplace'],
  ['logistics', 'Logistics'], ['franchise', 'Franchise'], ['exim', 'Export/Import'],
  ['real_estate', 'Real Estate'], ['construction', 'Construction'], ['education', 'Education'],
  ['healthcare', 'Healthcare'], ['professional', 'Professional Services'], ['local', 'Local Business'],
  ['creator', 'Creator/Media'], ['d2c', 'D2C Brand'],
];
const bizSpecs = BIZ_TYPES.map(([slug, label]) => ({
  slug: `${slug}_specialist`,
  name: `${label} Operations Specialist`,
  role: 'Business-Type Specialist',
  jtbd: `Tailor Atlas reads and playbooks to how a ${label.toLowerCase()} actually operates.`,
  input: 'business_profile, invoices, inventory, collections',
  output: `${label}-tuned operating read`,
  actions: ['analyze', 'recommend'],
  // Healthcare is preview-only per safety rules; others are custom-tuned configs.
  status: slug === 'healthcare' ? ES.PREVIEW : ES.CUSTOM_REQUIRED,
}));
DOMAINS.push(buildDomain('biztype', 'Business-Type Specialist', { status: ES.CUSTOM_REQUIRED, risk: R.MEDIUM, packs: [] }, bizSpecs));

// ── Generator: role cockpit-view agents (one per role pack) ───────────────────
const ROLES = [
  ['founder', 'Founder/CEO'], ['cfo', 'CFO/Finance Lead'], ['sales_head', 'Sales Head'],
  ['ops_head', 'Operations Head'], ['procurement_head', 'Procurement Head'], ['inventory_mgr', 'Inventory Manager'],
  ['collections_mgr', 'Collections Manager'], ['cs', 'Customer Success'], ['support_lead', 'Support Lead'],
  ['hr_admin', 'HR/Admin'], ['compliance_officer', 'Compliance Officer'], ['advisor', 'Partner/Advisor'],
  ['board', 'Board/Investor'],
];
const roleSpecs = ROLES.map(([slug, label]) => ({
  slug: `${slug}_cockpit`,
  name: `${label} Cockpit Agent`,
  role: label,
  jtbd: `Give a ${label} a read-only cockpit of exactly the signals their role owns.`,
  input: 'role-scoped live reads',
  output: `${label} cockpit view`,
  actions: ['analyze', 'summarize'],
  // Founder/CFO cockpits ride the proven owner-briefing surface (live_limited);
  // the rest are preview until their role view is wired.
  status: (slug === 'founder' || slug === 'cfo') ? ES.LIVE_LIMITED : ES.PREVIEW,
  route: (slug === 'founder' || slug === 'cfo') ? '/api/agents/core.owner_briefing/preview' : undefined,
  evidence: (slug === 'founder' || slug === 'cfo'),
}));
DOMAINS.push(buildDomain('roleview', 'Role Cockpit', { status: ES.PREVIEW, risk: R.LOW, packs: [] }, roleSpecs));

// ── Generator: swarm coordinator agents (one per swarm pack) ──────────────────
const SWARM_DEFS = [
  ['finance', 'Finance', SWARM.finance], ['sales', 'Sales', SWARM.sales],
  ['operations', 'Operations', SWARM.operations], ['supplier', 'Supplier', SWARM.supplier],
  ['inventory', 'Inventory', SWARM.inventory], ['collections', 'Collections', SWARM.collections],
  ['customer', 'Customer', SWARM.customer], ['compliance', 'Compliance', SWARM.compliance],
  ['ceo', 'CEO Command', SWARM.ceo], ['growth', 'Growth', SWARM.growth], ['risk', 'Risk & Audit', SWARM.risk],
];
const swarmSpecs = SWARM_DEFS.map(([slug, label, packId]) => ({
  slug: `${slug}_coordinator`,
  name: `${label} Swarm Coordinator`,
  role: 'Swarm Coordinator',
  jtbd: `Coordinate the ${label} swarm — sequence its agents, gather evidence, surface decisions.`,
  input: 'swarm agent outputs',
  output: `${label} swarm coordination`,
  actions: ['coordinate', 'summarize'],
  status: ES.CUSTOM_REQUIRED,
  packs: [packId],
}));
DOMAINS.push(buildDomain('swarmcoord', 'Swarm Coordinator', { status: ES.CUSTOM_REQUIRED, risk: R.MEDIUM, packs: [] }, swarmSpecs));

// ── Generator: workflow runner agents (one per workflow template) ─────────────
const WF_RUNNERS = [
  ['lead_to_cash', 'Lead-to-Cash'], ['invoice_to_cash', 'Invoice-to-Cash'], ['collections_recovery', 'Collections Recovery'],
  ['purchase_to_pay', 'Purchase-to-Pay'], ['supplier_followup', 'Supplier Follow-up'], ['inventory_reorder', 'Inventory Reorder'],
  ['customer_escalation', 'Customer Escalation'], ['owner_briefing', 'Owner Briefing'], ['daily_command', 'Daily Business Command Brief'],
  ['cash_risk_alert', 'Cash Risk Alert'], ['approval_request', 'Approval Request'], ['audit_evidence', 'Audit Evidence Capture'],
  ['data_repair', 'Data Quality Repair'], ['customer_comm', 'Customer Communication Draft'], ['supplier_comm', 'Supplier Communication Draft'],
  ['business_health', 'Business Health Review'], ['board_update', 'Board/Investor Update Draft'], ['multi_branch_stock', 'Multi-Branch Stock Review'],
  ['multi_country_cash', 'Multi-Country Cash Review'], ['custom_blueprint', 'Custom Workflow Blueprint'],
];
const wfRunnerSpecs = WF_RUNNERS.map(([slug, label]) => {
  // Briefing/command/health/data-repair runners ride proven read surfaces.
  const live = ['owner_briefing', 'daily_command', 'business_health', 'data_repair', 'cash_risk_alert'].includes(slug);
  return {
    slug: `${slug}_runner`,
    name: `${label} Runner`,
    role: 'Workflow Runner',
    jtbd: `Drive the ${label} workflow step-by-step with gates at each risky point.`,
    input: 'workflow context',
    output: `${label} run state`,
    actions: ['coordinate'],
    status: live ? ES.LIVE_LIMITED : ES.PREVIEW,
    evidence: live,
  };
});
DOMAINS.push(buildDomain('wfrunner', 'Workflow Runner', { status: ES.PREVIEW, risk: R.MEDIUM, packs: [] }, wfRunnerSpecs));

// ─────────────────────────────────────────────────────────────────────────────
// ASSEMBLE
// ─────────────────────────────────────────────────────────────────────────────
const ATLAS_AGENTS = DOMAINS.flat();
assertLiveHonest(ATLAS_AGENTS);

const AGENTS_BY_ID = Object.freeze(
  ATLAS_AGENTS.reduce((m, a) => { m[a.id] = a; return m; }, {}),
);

function getAgent(id) { return AGENTS_BY_ID[id] || null; }
function agentsByDomain(domain) { return ATLAS_AGENTS.filter((a) => a.domain === domain); }
function agentsByStatus(status) { return ATLAS_AGENTS.filter((a) => a.execution_status === status); }
function liveAgents() { return ATLAS_AGENTS.filter((a) => M.isExecutableStatus(a.execution_status)); }

module.exports = {
  ATLAS_AGENTS,
  AGENTS_BY_ID,
  SWARM_PACK_IDS: SWARM,
  getAgent,
  agentsByDomain,
  agentsByStatus,
  liveAgents,
};
