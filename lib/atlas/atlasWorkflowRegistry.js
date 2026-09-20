// ─────────────────────────────────────────────────────────────────────────────
// Atlas Civilization Pack System — Workflow Registry (v0)
//
// Workflow templates wire agents into multi-step business flows. Every workflow:
//   • declares its steps, the agents it needs, and the data it reads,
//   • marks approval / evidence / audit points explicitly,
//   • sets external_send_allowed = false BY DEFAULT (no silent outbound),
//   • carries a proof_gate describing what must hold before it can run.
//
// A workflow is only executable if its execution_status is live_*. The execution
// guard re-checks every gate at run time regardless of what is declared here.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const M = require('./atlasProofModel');
const { EXECUTION_STATUS: ES, RISK_LEVEL: R } = M;
const { AGENTS_BY_ID } = require('./atlasAgentRegistry');

function wf(spec) {
  const executable = M.isExecutableStatus(spec.execution_status);
  const gate = [
    executable ? `status=${spec.execution_status}` : `BLOCKED(${spec.execution_status})`,
    'audit',
    spec.approval_points && spec.approval_points.length ? 'approval@steps' : 'no-approval-steps',
    'external_send=false',
  ].join(' + ');
  return {
    id: spec.id,
    name: spec.name,
    pack_ids: spec.pack_ids || [],
    steps: spec.steps,
    required_agents: spec.required_agents,
    required_data_sources: spec.required_data_sources || [],
    risk_level: spec.risk_level || R.MEDIUM,
    execution_status: spec.execution_status,
    approval_points: spec.approval_points || [],
    evidence_points: spec.evidence_points || [],
    audit_points: spec.audit_points || ['workflow_start', 'workflow_end'],
    external_send_allowed: false, // SAFETY: never true by default.
    proof_gate: gate,
    blocked_reason: executable ? null : M.blockedReasonForStatus(spec.execution_status),
  };
}

const ATLAS_WORKFLOWS = [
  wf({
    id: 'wf.lead_to_cash', name: 'Lead-to-Cash', pack_ids: ['swarm.sales', 'biz.trader'],
    steps: ['capture lead', 'score lead', 'draft quote', 'convert to order', 'draft invoice', 'collect payment'],
    required_agents: ['agent.sales.lead_scorer', 'agent.sales.quote_drafter', 'agent.invoice.invoice_drafter', 'agent.collections.receivables_map'],
    required_data_sources: ['customers', 'orders', 'invoices', 'collections'],
    risk_level: R.HIGH, execution_status: ES.PREVIEW,
    approval_points: ['send_quote', 'send_invoice'], evidence_points: ['quote_basis', 'invoice_basis'],
  }),
  wf({
    id: 'wf.invoice_to_cash', name: 'Invoice-to-Cash', pack_ids: ['wf.invoice_to_cash', 'swarm.finance'],
    steps: ['read open invoices', 'age receivables', 'prioritize', 'draft reminder', 'await approval', 'reconcile payment'],
    required_agents: ['agent.invoice.invoice_reader', 'agent.invoice.aging_analyst', 'agent.collections.priority_chaser', 'agent.collections.reminder_drafter', 'agent.finance.reconciliation'],
    required_data_sources: ['invoices', 'collections', 'bank'],
    risk_level: R.HIGH, execution_status: ES.LIVE_LIMITED,
    approval_points: ['send_reminder'], evidence_points: ['aging_evidence', 'reminder_basis'],
  }),
  wf({
    id: 'wf.collections_recovery', name: 'Collections Recovery', pack_ids: ['swarm.collections', 'wf.collections_recovery'],
    steps: ['map receivables', 'segment debtors', 'pick strategy', 'draft outreach', 'await approval', 'track promise'],
    required_agents: ['agent.collections.receivables_map', 'agent.collections.segment_strategy', 'agent.collections.recovery_strategist', 'agent.collections.reminder_drafter', 'agent.collections.promise_tracker'],
    required_data_sources: ['invoices', 'collections', 'customers'],
    risk_level: R.HIGH, execution_status: ES.LIVE_LIMITED,
    approval_points: ['send_outreach', 'settlement_offer'], evidence_points: ['debt_evidence', 'contact_history'],
  }),
  wf({
    id: 'wf.purchase_to_pay', name: 'Purchase-to-Pay', pack_ids: ['swarm.supplier'],
    steps: ['detect reorder need', 'draft PO', 'await approval', 'send PO', '3-way match', 'schedule payment'],
    required_agents: ['agent.inventory.reorder_planner', 'agent.procurement.po_drafter', 'agent.procurement.three_way_match', 'agent.finance.payment_scheduler'],
    required_data_sources: ['inventory', 'purchases', 'bills'],
    risk_level: R.CRITICAL, execution_status: ES.CONNECTOR_REQUIRED,
    approval_points: ['approve_po', 'approve_payment'], evidence_points: ['reorder_basis', 'match_evidence'],
  }),
  wf({
    id: 'wf.supplier_followup', name: 'Supplier Follow-up', pack_ids: ['swarm.supplier'],
    steps: ['read open POs/dues', 'detect delays', 'draft follow-up', 'await approval'],
    required_agents: ['agent.procurement.po_reader', 'agent.supplier.lead_time', 'agent.supplier.followup_supplier'],
    required_data_sources: ['purchases', 'orders', 'bills'],
    risk_level: R.HIGH, execution_status: ES.PREVIEW,
    approval_points: ['send_followup'], evidence_points: ['delay_evidence'],
  }),
  wf({
    id: 'wf.inventory_reorder', name: 'Inventory Reorder', pack_ids: ['swarm.inventory', 'wf.inventory_control'],
    steps: ['read stock', 'forecast demand', 'compute reorder', 'draft PO proposal', 'await approval'],
    required_agents: ['agent.inventory.stock_reader', 'agent.inventory.demand_forecaster', 'agent.inventory.reorder_planner'],
    required_data_sources: ['inventory', 'orders'],
    risk_level: R.MEDIUM, execution_status: ES.LIVE_LIMITED,
    approval_points: ['approve_reorder'], evidence_points: ['stock_evidence', 'demand_basis'],
  }),
  wf({
    id: 'wf.customer_escalation', name: 'Customer Escalation', pack_ids: ['swarm.customer'],
    steps: ['detect escalation', 'assemble 360', 'classify severity', 'route to owner', 'draft response'],
    required_agents: ['agent.customer.customer_360', 'agent.customer.churn_risk', 'agent.communication.message_drafter'],
    required_data_sources: ['customers', 'orders'],
    risk_level: R.HIGH, execution_status: ES.PREVIEW,
    approval_points: ['send_response'], evidence_points: ['case_evidence'],
  }),
  wf({
    id: 'wf.owner_briefing', name: 'Owner Briefing', pack_ids: ['swarm.ceo', 'role.founder'],
    steps: ['gather live reads', 'detect risks', 'rank actions', 'attach evidence', 'present brief'],
    required_agents: ['agent.command.owner_briefing', 'agent.cashflow.cash_risk_alert', 'agent.collections.receivables_map'],
    required_data_sources: ['invoices', 'collections', 'bank', 'metrics', 'evidence_vault'],
    risk_level: R.MEDIUM, execution_status: ES.LIVE_LIMITED,
    approval_points: [], evidence_points: ['briefing_evidence_contract'],
    audit_points: ['briefing_generated'],
  }),
  wf({
    id: 'wf.daily_command', name: 'Daily Business Command Brief', pack_ids: ['swarm.ceo'],
    steps: ['assemble command screen', 'highlight exceptions', 'build decision queue'],
    required_agents: ['agent.command.daily_command_brief', 'agent.command.decision_queue', 'agent.command.exception_watch'],
    required_data_sources: ['metrics', 'invoices', 'collections', 'inventory'],
    risk_level: R.MEDIUM, execution_status: ES.LIVE_LIMITED,
    evidence_points: ['command_evidence'],
  }),
  wf({
    id: 'wf.cash_risk_alert', name: 'Cash Risk Alert', pack_ids: ['swarm.finance', 'wf.cashops'],
    steps: ['forecast cash', 'detect shortfall', 'rank actions', 'alert owner'],
    required_agents: ['agent.cashflow.forecast_13w', 'agent.cashflow.cash_risk_alert', 'agent.cashflow.shortfall_playbook'],
    required_data_sources: ['bank', 'invoices', 'bills', 'forecast'],
    risk_level: R.HIGH, execution_status: ES.LIVE_LIMITED,
    evidence_points: ['forecast_evidence'],
  }),
  wf({
    id: 'wf.approval_request', name: 'Approval Request Flow', pack_ids: ['wf.approval_control'],
    steps: ['package action + evidence', 'route to approver', 'capture decision', 'audit'],
    required_agents: ['agent.approval.approval_packager', 'agent.approval.approval_router', 'agent.approval.approval_audit'],
    required_data_sources: ['audit_log', 'evidence_vault'],
    risk_level: R.MEDIUM, execution_status: ES.LIVE_LIMITED,
    approval_points: ['human_decision'], evidence_points: ['action_evidence'],
  }),
  wf({
    id: 'wf.audit_evidence', name: 'Audit Evidence Capture', pack_ids: ['wf.audit_readiness', 'swarm.risk'],
    steps: ['identify required evidence', 'collect from sources', 'bundle', 'lock to audit trail'],
    required_agents: ['agent.compliance.evidence_collector', 'agent.risk.audit_readiness', 'agent.approval.approval_audit'],
    required_data_sources: ['evidence_vault', 'audit_log'],
    risk_level: R.MEDIUM, execution_status: ES.LIVE_LIMITED,
    evidence_points: ['evidence_bundle'],
  }),
  wf({
    id: 'wf.data_repair', name: 'Data Quality Repair', pack_ids: ['swarm.risk', 'wf.data_intelligence'],
    steps: ['scan data', 'find gaps/dupes', 'propose repairs', 'await approval'],
    required_agents: ['agent.dataquality.dq_scanner', 'agent.dataquality.dupe_finder', 'agent.dataquality.repair_proposer'],
    required_data_sources: ['customers', 'invoices', 'suppliers'],
    risk_level: R.MEDIUM, execution_status: ES.LIVE_LIMITED,
    approval_points: ['apply_repair'], evidence_points: ['quality_report'],
  }),
  wf({
    id: 'wf.customer_comm', name: 'Customer Communication Draft', pack_ids: ['wf.communication_control', 'swarm.customer'],
    steps: ['gather context', 'draft message', 'tone check', 'await approval'],
    required_agents: ['agent.communication.message_drafter', 'agent.communication.tone_checker'],
    required_data_sources: ['customers'],
    risk_level: R.HIGH, execution_status: ES.PREVIEW,
    approval_points: ['send_message'], evidence_points: ['context_evidence'],
  }),
  wf({
    id: 'wf.supplier_comm', name: 'Supplier Communication Draft', pack_ids: ['wf.communication_control', 'swarm.supplier'],
    steps: ['gather context', 'draft message', 'tone check', 'await approval'],
    required_agents: ['agent.supplier.followup_supplier', 'agent.communication.tone_checker'],
    required_data_sources: ['suppliers', 'purchases'],
    risk_level: R.HIGH, execution_status: ES.PREVIEW,
    approval_points: ['send_message'], evidence_points: ['context_evidence'],
  }),
  wf({
    id: 'wf.business_health', name: 'Business Health Review', pack_ids: ['wf.business_health', 'swarm.growth'],
    steps: ['read KPIs', 'detect anomalies', 'explain trends', 'compose review'],
    required_agents: ['agent.analytics.kpi_reader', 'agent.analytics.anomaly_detector', 'agent.analytics.trend_explainer'],
    required_data_sources: ['metrics', 'analytics', 'invoices'],
    risk_level: R.LOW, execution_status: ES.LIVE_LIMITED,
    evidence_points: ['kpi_evidence'],
  }),
  wf({
    id: 'wf.board_update', name: 'Board/Investor Update Draft', pack_ids: ['ent.data_room', 'role.board'],
    steps: ['gather financials & KPIs', 'draft narrative', 'attach evidence', 'await approval'],
    required_agents: ['agent.governance.board_pack', 'agent.command.board_narrator', 'agent.finance.investor_metrics'],
    required_data_sources: ['metrics', 'analytics', 'evidence_vault'],
    risk_level: R.HIGH, execution_status: ES.PREVIEW,
    approval_points: ['publish_update'], evidence_points: ['metric_evidence'],
  }),
  wf({
    id: 'wf.multi_branch_stock', name: 'Multi-Branch Stock Review', pack_ids: ['ent.multi_branch', 'swarm.inventory'],
    steps: ['read stock by branch', 'detect imbalance', 'propose transfers', 'await approval'],
    required_agents: ['agent.inventory.multi_branch_stock', 'agent.inventory.stock_reader'],
    required_data_sources: ['inventory'],
    risk_level: R.MEDIUM, execution_status: ES.CUSTOM_REQUIRED,
    approval_points: ['approve_transfer'], evidence_points: ['branch_stock_evidence'],
  }),
  wf({
    id: 'wf.multi_country_cash', name: 'Multi-Country Cash Review', pack_ids: ['ent.multi_country', 'swarm.finance'],
    steps: ['consolidate cash by entity', 'normalize FX', 'detect exposure', 'present'],
    required_agents: ['agent.governance.entity_consolidator', 'agent.finance.fx_exposure', 'agent.finance.cash_position'],
    required_data_sources: ['bank', 'ledger', 'invoices'],
    risk_level: R.HIGH, execution_status: ES.CUSTOM_REQUIRED,
    evidence_points: ['entity_cash_evidence'],
  }),
  wf({
    id: 'wf.custom_blueprint', name: 'Custom Workflow Blueprint', pack_ids: ['ent.custom_workflow'],
    steps: ['capture requirement', 'map to agents', 'define gates', 'configure per tenant'],
    required_agents: ['agent.operations.workflow_orchestrator', 'agent.developer.connector_builder'],
    required_data_sources: [],
    risk_level: R.HIGH, execution_status: ES.CUSTOM_REQUIRED,
    approval_points: ['approve_blueprint'], evidence_points: ['requirement_evidence'],
  }),
];

// Drop any agent ref that doesn't resolve, but record it so the static check
// can fail loudly rather than silently shipping a broken workflow.
const WORKFLOW_BROKEN_AGENT_REFS = [];
for (const w of ATLAS_WORKFLOWS) {
  for (const aid of w.required_agents) {
    if (!AGENTS_BY_ID[aid]) WORKFLOW_BROKEN_AGENT_REFS.push({ workflow: w.id, agent: aid });
  }
}

const WORKFLOWS_BY_ID = Object.freeze(
  ATLAS_WORKFLOWS.reduce((m, w) => { m[w.id] = w; return m; }, {}),
);

module.exports = {
  ATLAS_WORKFLOWS,
  WORKFLOWS_BY_ID,
  WORKFLOW_BROKEN_AGENT_REFS,
  getWorkflow: (id) => WORKFLOWS_BY_ID[id] || null,
};
