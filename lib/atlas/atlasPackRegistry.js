// ─────────────────────────────────────────────────────────────────────────────
// Atlas Civilization Pack System — Pack Registry (v0)
//
// Atlas is NOT a list of SaaS modules. It is a multidimensional pack system: the
// SAME agents, workflows, evidence and approvals re-composed for a specific
// business type / size / role / workflow / region / industry / enterprise need /
// agent swarm. A pack is the unit a customer activates.
//
// Eight dimensions (PACK_DIMENSION):
//   A business_type   B business_size   C role        D workflow
//   E region          F industry        G enterprise_custom   H agent_swarm
//
// Every included_agent_id / included_workflow_id is derived from the real agent &
// workflow registries, so cross-references can never dangle. Pack-level
// approval / evidence / risk aggregate up from the agents a pack contains.
// Only live_proven / live_limited packs may execute, behind the guard's gates.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const M = require('./atlasProofModel');
const { EXECUTION_STATUS: ES, RISK_LEVEL: R, PACK_DIMENSION: D, SETUP_COMPLEXITY: SC, AUTOMATION_DEPTH: AD } = M;
const { ATLAS_AGENTS, AGENTS_BY_ID, SWARM_PACK_IDS: SWARM } = require('./atlasAgentRegistry');
const { WORKFLOWS_BY_ID } = require('./atlasWorkflowRegistry');

// ── Agent selectors (always return valid, existing ids) ───────────────────────
const A = ATLAS_AGENTS;
const bySwarm = (sid) => A.filter((x) => (x.pack_ids || []).includes(sid)).map((x) => x.id);
const byDomain = (label) => A.filter((x) => x.domain === label).map((x) => x.id);
const byIdPrefix = (p) => A.filter((x) => x.id.startsWith(p)).map((x) => x.id);
const pick = (...ids) => ids.filter((id) => AGENTS_BY_ID[id]);
const validWf = (...ids) => ids.filter((id) => WORKFLOWS_BY_ID[id]);

const RISK_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };

// ── Pack factory ──────────────────────────────────────────────────────────────
function pack(spec) {
  const agentIds = Array.from(new Set(spec.included_agent_ids || [])).filter((id) => AGENTS_BY_ID[id]);
  const wfIds = Array.from(new Set(spec.included_workflow_ids || [])).filter((id) => WORKFLOWS_BY_ID[id]);
  const agents = agentIds.map((id) => AGENTS_BY_ID[id]);

  const executable = M.isExecutableStatus(spec.execution_status);
  const anyLiveAgent = agents.some((a) => M.isExecutableStatus(a.execution_status));

  // Risk aggregates to the highest member risk (or declared, whichever higher).
  let risk = spec.risk_level || R.LOW;
  for (const a of agents) if (RISK_ORDER[a.risk_level] > RISK_ORDER[risk]) risk = a.risk_level;

  // Approval/evidence/audit aggregate up — if any member needs it, the pack does.
  const approval_required = Boolean(
    spec.approval_required ?? (agents.some((a) => a.approval_required) || M.requiresApprovalByRisk(risk)),
  );
  const evidence_required = Boolean(spec.evidence_required ?? (executable || agents.some((a) => a.evidence_required)));

  const blocked_reason = executable ? null : (spec.blocked_reason || M.blockedReasonForStatus(spec.execution_status));

  // required_connectors: union of connector-needing members + declared.
  const connectorMembers = agents.filter((a) => a.connector_required).length;
  const required_connectors = spec.required_connectors
    || (connectorMembers ? [`${connectorMembers} member connector(s)`] : []);

  return {
    id: spec.id,
    name: spec.name,
    category: spec.category,
    dimension: spec.dimension,
    description: spec.description,
    target_customer: spec.target_customer,
    business_problem: spec.business_problem,
    primary_outcome: spec.primary_outcome,
    included_agent_ids: agentIds,
    included_workflow_ids: wfIds,
    required_data_sources: spec.required_data_sources || [],
    required_connectors,
    required_permissions: spec.required_permissions || ['member'],
    proof_level: spec.proof_level || (executable ? M.PROOF_LEVEL.LIMITED : M.PROOF_LEVEL.DESIGN),
    execution_status: spec.execution_status,
    setup_complexity: spec.setup_complexity || SC.LOW,
    automation_depth: spec.automation_depth || AD.INSIGHT_ONLY,
    risk_level: risk,
    approval_required,
    evidence_required,
    audit_required: true, // SAFETY: always on.
    region_fit: spec.region_fit || ['global'],
    industry_fit: spec.industry_fit || ['any'],
    business_size_fit: spec.business_size_fit || ['any'],
    customizability: spec.customizability || (spec.dimension === D.ENTERPRISE_CUSTOM ? 'high' : 'medium'),
    demo_route: spec.demo_route || `/packs/${spec.id}`,
    activation_cta: spec.activation_cta || (executable ? 'Activate pack' : (anyLiveAgent ? 'Preview live agents' : 'Request access')),
    blocked_reason,
    roadmap_note: spec.roadmap_note || (executable ? 'Live, gated by evidence + approval + audit.' : 'Visible for evaluation; execution is gated until requirements are met.'),
  };
}

const PACKS = [];

// ─────────────────────────────────────────────────────────────────────────────
// H. AGENT SWARM PACKS (define first — other packs reference swarm agents)
// ─────────────────────────────────────────────────────────────────────────────
const SWARM_PACK_DEFS = [
  ['swarm.finance', 'Finance Agent Swarm', SWARM.finance, 'Read cash, P&L, receivables and payables and surface money decisions.', ES.LIVE_LIMITED, ['wf.cash_risk_alert', 'wf.invoice_to_cash']],
  ['swarm.sales', 'Sales Agent Swarm', SWARM.sales, 'Read the pipeline, score leads and prep the next sales move.', ES.LIVE_LIMITED, ['wf.lead_to_cash']],
  ['swarm.operations', 'Operations Agent Swarm', SWARM.operations, 'Track orders, fulfilment and operational SLAs.', ES.PREVIEW, []],
  ['swarm.supplier', 'Supplier Agent Swarm', SWARM.supplier, 'Track payables, supplier risk and follow-ups.', ES.LIVE_LIMITED, ['wf.supplier_followup']],
  ['swarm.inventory', 'Inventory Agent Swarm', SWARM.inventory, 'Track stock, predict stockouts and plan reorders.', ES.LIVE_LIMITED, ['wf.inventory_reorder']],
  ['swarm.collections', 'Collections Agent Swarm', SWARM.collections, 'Map receivables and run evidence-backed recovery.', ES.LIVE_LIMITED, ['wf.collections_recovery']],
  ['swarm.customer', 'Customer Agent Swarm', SWARM.customer, 'Build customer 360, flag churn and prep outreach.', ES.LIVE_LIMITED, ['wf.customer_escalation']],
  ['swarm.compliance', 'Compliance Agent Swarm', SWARM.compliance, 'Check policy, collect evidence and track obligations.', ES.LIVE_LIMITED, ['wf.audit_evidence']],
  ['swarm.ceo_command', 'CEO Command Swarm', SWARM.ceo, 'The owner cockpit — brief, decision queue, exceptions.', ES.LIVE_LIMITED, ['wf.owner_briefing', 'wf.daily_command']],
  ['swarm.growth', 'Growth Swarm', SWARM.growth, 'Read KPIs, find anomalies and explain what moved.', ES.LIVE_LIMITED, ['wf.business_health']],
  ['swarm.risk_audit', 'Risk & Audit Swarm', SWARM.risk, 'Score risk, route cost and keep the books audit-ready.', ES.LIVE_LIMITED, ['wf.audit_evidence', 'wf.data_repair']],
];
for (const [id, name, sid, problem, status, wfs] of SWARM_PACK_DEFS) {
  const memberIds = pick(...bySwarm(sid), `agent.swarmcoord.${id.replace('swarm.', '').replace('_audit', '').replace('ceo_command', 'ceo')}_coordinator`);
  PACKS.push(pack({
    id, name, category: 'Agent Swarm', dimension: D.AGENT_SWARM,
    description: `${name}: a coordinated set of agents that work one business domain end-to-end under evidence and approval gates.`,
    target_customer: 'Any business wanting an agent team for this domain.',
    business_problem: problem,
    primary_outcome: 'A domain run by agents, with humans approving the risky steps.',
    included_agent_ids: memberIds,
    included_workflow_ids: validWf(...wfs),
    required_data_sources: ['invoices', 'collections', 'metrics'],
    execution_status: status,
    setup_complexity: SC.MEDIUM, automation_depth: AD.ASSISTED,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// D. WORKFLOW PACKS
// ─────────────────────────────────────────────────────────────────────────────
const WORKFLOW_PACK_DEFS = [
  ['wf.cashops', 'CashOps Pack', 'Cashflow', 'Cash, forecast and shortfall control in one place.', ES.LIVE_LIMITED, byDomain('Cashflow').concat(byDomain('Finance')), ['wf.cash_risk_alert']],
  ['wf.collections_recovery', 'Collections Recovery Pack', 'Collections', 'Recover receivables with evidence-backed, approved outreach.', ES.LIVE_LIMITED, byDomain('Collections'), ['wf.collections_recovery']],
  ['wf.invoice_to_cash', 'Invoice-to-Cash Pack', 'Finance', 'From issued invoice to cash in the bank.', ES.LIVE_LIMITED, byDomain('Invoice').concat(byDomain('Collections')), ['wf.invoice_to_cash']],
  ['wf.order_to_cash', 'Order-to-Cash Pack', 'Revenue', 'Order → invoice → collection as one flow.', ES.PREVIEW, byDomain('Sales').concat(byDomain('Invoice')), ['wf.lead_to_cash', 'wf.invoice_to_cash']],
  ['wf.procure_to_pay', 'Procure-to-Pay Pack', 'Procurement', 'Reorder → PO → match → pay, with approvals.', ES.CONNECTOR_REQUIRED, byDomain('Procurement').concat(byDomain('Supplier')), ['wf.purchase_to_pay']],
  ['wf.inventory_control', 'Inventory Control Pack', 'Inventory', 'Stock visibility, stockout prevention and reorder.', ES.LIVE_LIMITED, byDomain('Inventory'), ['wf.inventory_reorder']],
  ['wf.supplier_operations', 'Supplier Operations Pack', 'Procurement', 'Supplier ledger, scoring, risk and follow-up.', ES.LIVE_LIMITED, byDomain('Supplier'), ['wf.supplier_followup']],
  ['wf.sales_pipeline', 'Sales Pipeline Pack', 'Sales', 'See the pipeline and prep the next move.', ES.LIVE_LIMITED, byDomain('Sales'), ['wf.lead_to_cash']],
  ['wf.customer_lifecycle', 'Customer Lifecycle Pack', 'Customer', 'Onboard, grow, retain and win back customers.', ES.LIVE_LIMITED, byDomain('Customer'), ['wf.customer_escalation']],
  ['wf.support_resolution', 'Support Resolution Pack', 'Support', 'Route, deflect and resolve support cases.', ES.PREVIEW, byDomain('Customer').concat(byDomain('Communication')), ['wf.customer_escalation']],
  ['wf.audit_readiness', 'Audit Readiness Pack', 'Risk', 'Stay audit-ready with captured evidence.', ES.LIVE_LIMITED, byDomain('Risk/Audit').concat(byDomain('Compliance')), ['wf.audit_evidence']],
  ['wf.decision_intelligence', 'Decision Intelligence Pack', 'Command', 'Turn signals into ranked, evidence-linked decisions.', ES.LIVE_LIMITED, byDomain('Command').concat(byDomain('Analytics')), ['wf.daily_command']],
  ['wf.business_health', 'Business Health Pack', 'Analytics', 'A live read on the health of the business.', ES.LIVE_LIMITED, byDomain('Analytics'), ['wf.business_health']],
  ['wf.approval_control', 'Approval Control Pack', 'Control', 'Route and audit every risky action through approval.', ES.LIVE_LIMITED, byDomain('Approval'), ['wf.approval_request']],
  ['wf.communication_control', 'Communication Control Pack', 'Comms', 'Draft, tone-check and approve every outbound message.', ES.PREVIEW, byDomain('Communication'), ['wf.customer_comm', 'wf.supplier_comm']],
  ['wf.data_intelligence', 'Document Intelligence Pack', 'Data', 'Extract, classify and repair business documents & data.', ES.LIVE_LIMITED, byDomain('Document').concat(byDomain('Data Quality')), ['wf.data_repair']],
];
for (const [id, name, cat, problem, status, agentIds, wfs] of WORKFLOW_PACK_DEFS) {
  PACKS.push(pack({
    id, name, category: cat, dimension: D.WORKFLOW,
    description: `${name}: a ready workflow built from Atlas agents, with approval and evidence gates at every risky step.`,
    target_customer: 'Any business that runs this workflow.',
    business_problem: problem,
    primary_outcome: 'A repeatable, evidence-backed workflow agents help run.',
    included_agent_ids: pick(...agentIds),
    included_workflow_ids: validWf(...wfs),
    required_data_sources: ['invoices', 'collections', 'inventory', 'metrics'],
    execution_status: status,
    setup_complexity: SC.MEDIUM, automation_depth: AD.ASSISTED,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// A. BUSINESS-TYPE PACKS
// ─────────────────────────────────────────────────────────────────────────────
const BIZ_PACK_DEFS = [
  // [slug, name, status, extraSwarms[], industry_fit, wfs[]]
  ['trader', 'Trader Pack', ES.LIVE_LIMITED, [SWARM.collections, SWARM.inventory, SWARM.supplier, SWARM.finance], ['trading'], ['wf.collections_recovery', 'wf.inventory_reorder']],
  ['retailer', 'Retailer Pack', ES.LIVE_LIMITED, [SWARM.inventory, SWARM.finance, SWARM.customer], ['retail'], ['wf.inventory_reorder']],
  ['distributor', 'Distributor Pack', ES.LIVE_LIMITED, [SWARM.collections, SWARM.inventory, SWARM.supplier], ['distribution'], ['wf.collections_recovery']],
  ['manufacturer', 'Manufacturer Pack', ES.PREVIEW, [SWARM.inventory, SWARM.supplier, SWARM.finance], ['manufacturing'], ['wf.inventory_reorder']],
  ['service', 'Service Business Pack', ES.LIVE_LIMITED, [SWARM.finance, SWARM.collections, SWARM.customer], ['services'], ['wf.invoice_to_cash']],
  ['saas', 'SaaS Business Pack', ES.PREVIEW, [SWARM.finance, SWARM.customer, SWARM.growth], ['saas'], ['wf.business_health']],
  ['agency', 'Agency Pack', ES.LIVE_LIMITED, [SWARM.finance, SWARM.customer], ['services'], ['wf.invoice_to_cash']],
  ['consultant', 'Consultant Pack', ES.LIVE_LIMITED, [SWARM.finance, SWARM.collections], ['services'], ['wf.invoice_to_cash']],
  ['marketplace', 'Marketplace Pack', ES.CONNECTOR_REQUIRED, [SWARM.finance, SWARM.operations], ['marketplace'], []],
  ['logistics', 'Logistics Business Pack', ES.PREVIEW, [SWARM.operations, SWARM.finance], ['logistics'], []],
  ['franchise', 'Franchise Pack', ES.CUSTOM_REQUIRED, [SWARM.finance, SWARM.operations], ['retail'], []],
  ['exim', 'Export/Import Pack', ES.CUSTOM_REQUIRED, [SWARM.finance, SWARM.compliance], ['trading'], []],
  ['real_estate', 'Real Estate Business Pack', ES.CUSTOM_REQUIRED, [SWARM.finance, SWARM.collections], ['real_estate'], []],
  ['construction', 'Construction Business Pack', ES.CUSTOM_REQUIRED, [SWARM.finance, SWARM.collections, SWARM.supplier], ['construction'], []],
  ['education', 'Education Business Pack', ES.PREVIEW, [SWARM.finance, SWARM.collections], ['education'], []],
  ['healthcare', 'Healthcare Preview Pack', ES.PREVIEW, [SWARM.finance, SWARM.compliance], ['healthcare'], []],
  ['professional', 'Professional Services Pack', ES.LIVE_LIMITED, [SWARM.finance, SWARM.collections], ['services'], ['wf.invoice_to_cash']],
  ['local', 'Local Business Pack', ES.LIVE_LIMITED, [SWARM.finance, SWARM.inventory], ['retail'], []],
  ['creator', 'Creator/Media Business Pack', ES.CONNECTOR_REQUIRED, [SWARM.finance, SWARM.growth], ['services'], []],
  ['d2c', 'D2C Brand Pack', ES.PREVIEW, [SWARM.finance, SWARM.inventory, SWARM.growth], ['retail'], ['wf.inventory_reorder']],
];
for (const [slug, name, status, swarms, industry, wfs] of BIZ_PACK_DEFS) {
  const specialist = `agent.biztype.${slug}_specialist`;
  const agentIds = pick(specialist, ...swarms.flatMap((s) => bySwarm(s)));
  PACKS.push(pack({
    id: `biz.${slug}`, name, category: 'Business Type', dimension: D.BUSINESS_TYPE,
    description: `${name}: Atlas configured for how a ${name.replace(' Pack', '').toLowerCase()} actually runs — the right agents, workflows and language.`,
    target_customer: name.replace(' Pack', ''),
    business_problem: `Generic tools do not match how a ${name.replace(' Pack', '').toLowerCase()} operates.`,
    primary_outcome: 'A BusinessOS tuned to this business model out of the box.',
    included_agent_ids: agentIds,
    included_workflow_ids: validWf(...wfs),
    required_data_sources: ['invoices', 'collections', 'inventory', 'business_profile'],
    execution_status: status,
    industry_fit: industry,
    setup_complexity: SC.MEDIUM, automation_depth: AD.ASSISTED,
    customizability: 'high',
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// B. BUSINESS-SIZE PACKS
// ─────────────────────────────────────────────────────────────────────────────
const SIZE_PACK_DEFS = [
  ['solo', 'Solo Founder Pack', ES.LIVE_LIMITED, ['micro'], [SWARM.ceo, SWARM.finance, SWARM.collections]],
  ['startup', 'Startup Pack', ES.LIVE_LIMITED, ['micro', 'small'], [SWARM.ceo, SWARM.finance, SWARM.growth]],
  ['small_business', 'Small Business Pack', ES.LIVE_LIMITED, ['small'], [SWARM.finance, SWARM.collections, SWARM.inventory]],
  ['msme', 'MSME Pack', ES.LIVE_LIMITED, ['small', 'medium'], [SWARM.finance, SWARM.collections, SWARM.supplier, SWARM.inventory]],
  ['mid_market', 'Mid-Market Pack', ES.PREVIEW, ['medium'], [SWARM.finance, SWARM.operations, SWARM.risk]],
  ['enterprise', 'Enterprise Pack', ES.CUSTOM_REQUIRED, ['large'], [SWARM.finance, SWARM.risk, SWARM.compliance]],
  ['global_enterprise', 'Global Enterprise Pack', ES.CUSTOM_REQUIRED, ['large'], [SWARM.finance, SWARM.risk, SWARM.compliance]],
  ['multi_entity', 'Multi-Entity Group Pack', ES.CUSTOM_REQUIRED, ['large'], [SWARM.finance, SWARM.risk]],
  ['holding', 'Holding Company Pack', ES.CUSTOM_REQUIRED, ['large'], [SWARM.finance, SWARM.risk]],
];
for (const [slug, name, status, sizeFit, swarms] of SIZE_PACK_DEFS) {
  PACKS.push(pack({
    id: `size.${slug}`, name, category: 'Business Size', dimension: D.BUSINESS_SIZE,
    description: `${name}: Atlas scoped to the team, controls and complexity of this size band.`,
    target_customer: name.replace(' Pack', ''),
    business_problem: 'A solo founder and a global group need very different defaults.',
    primary_outcome: 'Right-sized agents, approvals and governance for this scale.',
    included_agent_ids: pick(...swarms.flatMap((s) => bySwarm(s))),
    included_workflow_ids: validWf('wf.owner_briefing', 'wf.cash_risk_alert'),
    required_data_sources: ['invoices', 'collections', 'metrics'],
    execution_status: status,
    business_size_fit: sizeFit,
    setup_complexity: status === ES.CUSTOM_REQUIRED ? SC.ENTERPRISE : SC.LOW,
    automation_depth: AD.ASSISTED,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// C. ROLE PACKS
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_PACK_DEFS = [
  ['founder', 'Founder/CEO Pack', ES.LIVE_LIMITED, [SWARM.ceo, SWARM.finance], ['wf.owner_briefing', 'wf.daily_command']],
  ['cfo', 'CFO/Finance Lead Pack', ES.LIVE_LIMITED, [SWARM.finance, SWARM.risk], ['wf.cash_risk_alert']],
  ['sales_head', 'Sales Head Pack', ES.LIVE_LIMITED, [SWARM.sales], ['wf.lead_to_cash']],
  ['ops_head', 'Operations Head Pack', ES.PREVIEW, [SWARM.operations], []],
  ['procurement_head', 'Procurement Head Pack', ES.LIVE_LIMITED, [SWARM.supplier], ['wf.supplier_followup']],
  ['inventory_mgr', 'Inventory Manager Pack', ES.LIVE_LIMITED, [SWARM.inventory], ['wf.inventory_reorder']],
  ['collections_mgr', 'Collections Manager Pack', ES.LIVE_LIMITED, [SWARM.collections], ['wf.collections_recovery']],
  ['cs', 'Customer Success Pack', ES.LIVE_LIMITED, [SWARM.customer], ['wf.customer_escalation']],
  ['support_lead', 'Support Lead Pack', ES.PREVIEW, [SWARM.customer], []],
  ['hr_admin', 'HR/Admin Pack', ES.PREVIEW, [SWARM.operations], []],
  ['compliance_officer', 'Compliance Officer Pack', ES.LIVE_LIMITED, [SWARM.compliance, SWARM.risk], ['wf.audit_evidence']],
  ['advisor', 'Partner/Advisor Pack', ES.PARTNER_REQUIRED, [SWARM.finance, SWARM.risk], []],
  ['board', 'Board/Investor View Pack', ES.PREVIEW, [SWARM.finance, SWARM.growth], ['wf.board_update']],
];
for (const [slug, name, status, swarms, wfs] of ROLE_PACK_DEFS) {
  const cockpit = `agent.roleview.${slug}_cockpit`;
  PACKS.push(pack({
    id: `role.${slug}`, name, category: 'Role', dimension: D.ROLE,
    description: `${name}: a role-scoped cockpit — exactly the agents, reads and decisions this role owns.`,
    target_customer: name.replace(' Pack', ''),
    business_problem: 'Each role drowns in everything instead of seeing only what they own.',
    primary_outcome: 'A focused, role-scoped operating view.',
    included_agent_ids: pick(cockpit, ...swarms.flatMap((s) => bySwarm(s))),
    included_workflow_ids: validWf(...wfs),
    required_data_sources: ['metrics', 'invoices', 'collections'],
    execution_status: status,
    setup_complexity: SC.LOW, automation_depth: AD.INSIGHT_ONLY,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// E. REGION PACKS
// ─────────────────────────────────────────────────────────────────────────────
const REGION_PACK_DEFS = [
  ['global', 'Global Pack', ES.LIVE_LIMITED, ['global']],
  ['india', 'India Pack', ES.LIVE_LIMITED, ['india']],
  ['us', 'US Pack Preview', ES.PREVIEW, ['us']],
  ['eu', 'EU Pack Preview', ES.PREVIEW, ['eu']],
  ['gcc', 'GCC Pack Preview', ES.PREVIEW, ['gcc']],
  ['sea', 'SEA Pack Preview', ES.PREVIEW, ['sea']],
  ['uk', 'UK Pack Preview', ES.PREVIEW, ['uk']],
  ['latam', 'LATAM Pack Preview', ES.PREVIEW, ['latam']],
];
for (const [code, name, status, regionFit] of REGION_PACK_DEFS) {
  const regAgents = byIdPrefix(`agent.regcomp.${code}_`);
  const base = code === 'india' ? pick('agent.region.india_gst', 'agent.region.india_tds') : [];
  PACKS.push(pack({
    id: `region.${code}`, name, category: 'Region', dimension: D.REGION,
    description: `${name}: region-specific tax, compliance and language layered onto the core Atlas reads.`,
    target_customer: `Businesses operating in ${regionFit[0]}.`,
    business_problem: 'Tax and compliance rules differ by jurisdiction.',
    primary_outcome: 'Region-correct treatment of invoices, tax and filings.',
    included_agent_ids: pick(...regAgents, ...base),
    included_workflow_ids: [],
    required_data_sources: ['invoices', 'purchases', 'business_profile'],
    required_connectors: status === ES.LIVE_LIMITED && code === 'india' ? ['GST filing connector (for filing actions)'] : [],
    execution_status: status,
    region_fit: regionFit,
    setup_complexity: SC.MEDIUM, automation_depth: AD.INSIGHT_ONLY,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// F. INDUSTRY PACKS
// ─────────────────────────────────────────────────────────────────────────────
const INDUSTRY_PACK_DEFS = [
  ['trading', 'Trading Industry Pack', ES.LIVE_LIMITED, ['agent.industry.retail_basket']],
  ['retail', 'Retail Industry Pack', ES.LIVE_LIMITED, ['agent.industry.retail_basket']],
  ['distribution', 'Distribution Industry Pack', ES.PREVIEW, ['agent.industry.distribution_beat']],
  ['manufacturing', 'Manufacturing Industry Pack', ES.PREVIEW, ['agent.industry.manufacturing_bom']],
  ['logistics', 'Logistics Industry Pack', ES.CONNECTOR_REQUIRED, ['agent.industry.logistics_eta']],
  ['saas', 'SaaS Industry Pack', ES.CONNECTOR_REQUIRED, ['agent.industry.saas_mrr']],
  ['services', 'Services Industry Pack', ES.LIVE_LIMITED, ['agent.industry.agency_retainer']],
  ['construction', 'Construction Industry Pack', ES.CUSTOM_REQUIRED, ['agent.industry.construction_ra']],
  ['healthcare', 'Healthcare Preview Pack', ES.PREVIEW, ['agent.industry.healthcare_claims']],
  ['education', 'Education Preview Pack', ES.PREVIEW, ['agent.industry.education_fees']],
  ['finance_ops', 'Finance Operations Preview Pack', ES.PREVIEW, ['agent.finance.reconciliation']],
  ['food_fmcg', 'Food/FMCG Preview Pack', ES.PREVIEW, ['agent.industry.fmcg_secondary']],
  ['automotive', 'Automotive Preview Pack', ES.PREVIEW, ['agent.industry.automotive_service']],
  ['robotics', 'Robotics/Physical Ops Future Pack', ES.ROADMAP, ['agent.industry.robotics_ops']],
];
for (const [slug, name, status, extra] of INDUSTRY_PACK_DEFS) {
  PACKS.push(pack({
    id: `ind.${slug}`, name, category: 'Industry', dimension: D.INDUSTRY,
    description: `${name}: industry-specific agents and metrics layered on the core BusinessOS.`,
    target_customer: `${name.replace(' Industry Pack', '').replace(' Preview Pack', '').replace(' Future Pack', '')} businesses`,
    business_problem: 'Each industry has metrics and flows generic tools miss.',
    primary_outcome: 'Industry-native reads and playbooks.',
    included_agent_ids: pick(...extra, ...bySwarm(SWARM.finance).slice(0, 4)),
    included_workflow_ids: [],
    required_data_sources: ['invoices', 'inventory', 'metrics'],
    execution_status: status,
    industry_fit: [slug],
    setup_complexity: SC.MEDIUM, automation_depth: AD.INSIGHT_ONLY,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// G. ENTERPRISE / CUSTOM PACKS
// ─────────────────────────────────────────────────────────────────────────────
const ENT_PACK_DEFS = [
  ['governance', 'Enterprise Governance Pack', ES.CUSTOM_REQUIRED, byDomain('Enterprise Governance'), 'high'],
  ['custom_operating', 'Custom Operating Model Pack', ES.CUSTOM_REQUIRED, pick('agent.operations.workflow_orchestrator'), 'high'],
  ['custom_agent', 'Custom Agent Deployment Pack', ES.CUSTOM_REQUIRED, pick('agent.developer.mesh_orchestrator', 'agent.developer.sandbox_runner'), 'high'],
  ['custom_workflow', 'Custom Workflow Automation Pack', ES.CUSTOM_REQUIRED, pick('agent.operations.workflow_orchestrator', 'agent.developer.connector_builder'), 'high'],
  ['multi_branch', 'Multi-Branch Operations Pack', ES.CUSTOM_REQUIRED, pick('agent.inventory.multi_branch_stock'), 'high'],
  ['multi_country', 'Multi-Country Operations Pack', ES.CUSTOM_REQUIRED, pick('agent.governance.entity_consolidator', 'agent.finance.fx_exposure'), 'high'],
  ['data_room', 'Data Room / Investor Readiness Pack', ES.PREVIEW, pick('agent.governance.data_room', 'agent.finance.investor_metrics'), 'high'],
  ['compliance_evidence', 'Compliance Evidence Pack', ES.LIVE_LIMITED, byDomain('Compliance').concat(pick('agent.compliance.evidence_collector')), 'medium'],
  ['partner_cobuild', 'Partner Co-Build Pack', ES.PARTNER_REQUIRED, pick('agent.developer.connector_builder'), 'high'],
  ['white_label', 'White-Label / Embedded Atlas Pack Preview', ES.PARTNER_REQUIRED, pick('agent.developer.registry_browser'), 'high'],
  ['developer_platform', 'Developer/API Platform Pack', ES.PREVIEW, byDomain('Developer/API'), 'high'],
  ['private_mesh', 'Private Agent Mesh Pack', ES.CUSTOM_REQUIRED, pick('agent.developer.mesh_orchestrator'), 'high'],
];
for (const [slug, name, status, agentIds, custom] of ENT_PACK_DEFS) {
  PACKS.push(pack({
    id: `ent.${slug}`, name, category: 'Enterprise / Custom', dimension: D.ENTERPRISE_CUSTOM,
    description: `${name}: a custom operating layer co-built for an enterprise's specific structure and controls.`,
    target_customer: 'Enterprises, groups and partners.',
    business_problem: 'Large/complex businesses need a bespoke operating layer, not a fixed product.',
    primary_outcome: 'Atlas shaped to the enterprise — governed, evidenced, audited.',
    included_agent_ids: agentIds,
    included_workflow_ids: validWf('wf.multi_branch_stock', 'wf.multi_country_cash', 'wf.board_update', 'wf.custom_blueprint', 'wf.audit_evidence'),
    required_data_sources: ['metrics', 'evidence_vault', 'audit_log'],
    required_permissions: ['admin', 'owner'],
    execution_status: status,
    setup_complexity: SC.ENTERPRISE, automation_depth: AD.ASSISTED,
    customizability: custom,
    business_size_fit: ['large'],
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSEMBLE + indexes
// ─────────────────────────────────────────────────────────────────────────────
const ATLAS_PACKS = PACKS;
const PACKS_BY_ID = Object.freeze(ATLAS_PACKS.reduce((m, p) => { m[p.id] = p; return m; }, {}));

function getPack(id) { return PACKS_BY_ID[id] || null; }
function packsByDimension(dim) { return ATLAS_PACKS.filter((p) => p.dimension === dim); }
function livePacks() { return ATLAS_PACKS.filter((p) => M.isExecutableStatus(p.execution_status)); }

module.exports = {
  ATLAS_PACKS,
  PACKS_BY_ID,
  getPack,
  packsByDimension,
  livePacks,
  PACK_DIMENSIONS: D,
};
