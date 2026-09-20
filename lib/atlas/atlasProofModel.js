// ─────────────────────────────────────────────────────────────────────────────
// Atlas Civilization Pack System — Proof & Safety Model (v0)
//
// This is the single source of truth for the vocabulary the whole pack system
// speaks: execution statuses, proof levels, risk, gates. The registries, the
// execution guard, the UI surfaces, and the static proof-check script ALL
// import from here so nothing can drift.
//
// SAFETY TRUTH (non-negotiable):
//   • Only `live_proven` and `live_limited` may ever execute.
//   • Execution is additionally gated by evidence / approval / audit / role /
//     connector / external-send checks (see atlasExecutionGuard.js).
//   • preview / connector_required / custom_required / partner_required /
//     roadmap / disabled are VISIBLE but NEVER executable.
//   • External / customer-facing / financial / legal / destructive actions
//     ALWAYS require explicit human approval and are never auto-executed.
//
// Authored as CommonJS so it is consumable by both the Next.js UI
// (tsconfig allowJs + @/* paths) and the plain-node static check script.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// ── Execution status — the master gate keyword ───────────────────────────────
// The ONLY two statuses that may execute are LIVE_PROVEN and LIVE_LIMITED.
const EXECUTION_STATUS = Object.freeze({
  LIVE_PROVEN: 'live_proven',           // Shipped, evidence-backed, exercised in prod-equivalent paths
  LIVE_LIMITED: 'live_limited',         // Works under narrow, declared conditions (often flag-gated, read-only)
  PREVIEW: 'preview',                   // Designed & visible, NOT executable
  CONNECTOR_REQUIRED: 'connector_required', // Needs an external connector that is not yet active
  CUSTOM_REQUIRED: 'custom_required',   // Needs a per-tenant custom build / configuration
  PARTNER_REQUIRED: 'partner_required', // Needs a partner to be enabled / co-build
  ROADMAP: 'roadmap',                   // Planned, not built
  DISABLED: 'disabled',                 // Explicitly turned off
});

// The closed set of statuses that are even *candidates* for execution.
const EXECUTABLE_STATUSES = Object.freeze([
  EXECUTION_STATUS.LIVE_PROVEN,
  EXECUTION_STATUS.LIVE_LIMITED,
]);

// Statuses that are visible-but-blocked, with a canonical human reason.
const BLOCKED_STATUS_REASON = Object.freeze({
  [EXECUTION_STATUS.PREVIEW]: 'Preview only — visible for evaluation, not executable.',
  [EXECUTION_STATUS.CONNECTOR_REQUIRED]: 'A required connector is not active yet.',
  [EXECUTION_STATUS.CUSTOM_REQUIRED]: 'Requires a custom operating-model configuration for your business.',
  [EXECUTION_STATUS.PARTNER_REQUIRED]: 'Requires an enabled Atlas partner to co-deliver.',
  [EXECUTION_STATUS.ROADMAP]: 'On the roadmap — not built yet.',
  [EXECUTION_STATUS.DISABLED]: 'Disabled.',
});

// ── Proof level — descriptive evidence maturity (independent of the gate) ─────
const PROOF_LEVEL = Object.freeze({
  PROVEN: 'proven',             // Real data path + evidence contract + audit
  LIMITED: 'limited',           // Real but narrow / flag-gated / read-only
  EXPERIMENTAL: 'experimental', // Built behind a flag, not validated
  DESIGN: 'design',             // Designed (schema/spec) only
  CONCEPT: 'concept',           // Idea / narrative only
});

// ── Risk level ────────────────────────────────────────────────────────────────
const RISK_LEVEL = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

// Risk levels that MUST require human approval before any execution.
const APPROVAL_MANDATORY_RISK = Object.freeze([RISK_LEVEL.HIGH, RISK_LEVEL.CRITICAL]);

// ── Setup complexity & automation depth (descriptive) ─────────────────────────
const SETUP_COMPLEXITY = Object.freeze({
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  ENTERPRISE: 'enterprise',
});

const AUTOMATION_DEPTH = Object.freeze({
  INSIGHT_ONLY: 'insight_only',   // Reads + explains; never acts
  ASSISTED: 'assisted',           // Drafts / proposes; human acts
  SEMI_AUTO: 'semi_auto',         // Acts on low-risk steps; approval on the rest
  FULL_AUTO: 'full_auto',         // End-to-end (always still gated; never silent on risk)
});

// ── Pack dimensions ───────────────────────────────────────────────────────────
const PACK_DIMENSION = Object.freeze({
  BUSINESS_TYPE: 'business_type',
  BUSINESS_SIZE: 'business_size',
  ROLE: 'role',
  WORKFLOW: 'workflow',
  REGION: 'region',
  INDUSTRY: 'industry',
  ENTERPRISE_CUSTOM: 'enterprise_custom',
  AGENT_SWARM: 'agent_swarm',
});

// ── Action classes that are intrinsically dangerous and ALWAYS need approval ──
// Used by the guard to force approval regardless of how an entry is configured.
const DANGEROUS_ACTION_CLASSES = Object.freeze([
  'external_send',        // WhatsApp / email / SMS to a third party
  'customer_facing',      // anything a customer would see
  'financial_move',       // initiating / scheduling money movement
  'legal_commitment',     // contracts, notices, filings
  'destructive',          // delete / overwrite / irreversible
  'data_export',          // bulk export of tenant data
]);

// ── Known live data sources (read surfaces that genuinely exist today) ────────
// An agent/pack may only claim live_* if every required_data_source is in here
// (or is itself satisfiable). This is what keeps "live" claims honest.
const LIVE_DATA_SOURCES = Object.freeze([
  'invoices', 'collections', 'customers', 'suppliers', 'inventory', 'orders',
  'purchases', 'ledger', 'bank', 'khata', 'forecast', 'analytics', 'metrics',
  'dunning_rules', 'business_profile', 'evidence_vault', 'audit_log',
]);

// ── Genuinely-live agent anchors (backend reality, flag-gated, default OFF) ───
// These map to real endpoints in vantro-flow-backend/server.js. Everything that
// claims live_* must trace back to one of these or to a LIVE_DATA_SOURCE read.
const LIVE_AGENT_ANCHORS = Object.freeze([
  'core.owner_briefing',  // GET /api/agents/core.owner_briefing/preview (evidence contract)
  'core.data_quality',    // GET /api/agents/core.data_quality/preview
  'core.policy_guard',    // POST /api/agents/core.policy_guard/evaluate
  'core.cost_router',     // POST /api/agents/core.cost_router/evaluate
  'core.agent_registry',  // GET /api/agents/registry
]);

// ── Required schema fields (the static check enforces presence of these) ──────
const PACK_REQUIRED_FIELDS = Object.freeze([
  'id', 'name', 'category', 'dimension', 'description', 'target_customer',
  'business_problem', 'primary_outcome', 'included_agent_ids',
  'included_workflow_ids', 'required_data_sources', 'required_connectors',
  'required_permissions', 'proof_level', 'execution_status', 'setup_complexity',
  'automation_depth', 'risk_level', 'approval_required', 'evidence_required',
  'audit_required', 'region_fit', 'industry_fit', 'business_size_fit',
  'customizability', 'demo_route', 'activation_cta', 'blocked_reason',
  'roadmap_note',
]);

const AGENT_REQUIRED_FIELDS = Object.freeze([
  'id', 'name', 'pack_ids', 'domain', 'role', 'description', 'job_to_be_done',
  'input_data', 'output_decision_or_action', 'actions_supported', 'risk_level',
  'execution_status', 'evidence_required', 'approval_required', 'audit_required',
  'connector_required', 'live_route', 'proof_gate', 'blocked_reason',
]);

const WORKFLOW_REQUIRED_FIELDS = Object.freeze([
  'id', 'name', 'pack_ids', 'steps', 'required_agents', 'required_data_sources',
  'risk_level', 'execution_status', 'approval_points', 'evidence_points',
  'audit_points', 'external_send_allowed', 'proof_gate',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isExecutableStatus(status) {
  return EXECUTABLE_STATUSES.includes(status);
}

function requiresApprovalByRisk(risk) {
  return APPROVAL_MANDATORY_RISK.includes(risk);
}

function blockedReasonForStatus(status) {
  return BLOCKED_STATUS_REASON[status] || null;
}

// Does this entry touch any intrinsically-dangerous action class?
function touchesDangerousAction(actionsSupported) {
  if (!Array.isArray(actionsSupported)) return false;
  return actionsSupported.some((a) =>
    DANGEROUS_ACTION_CLASSES.includes(a) ||
    /send|email|whatsapp|sms|call|delete|overwrite|pay|disburse|transfer|export|sign|file_/i.test(String(a)),
  );
}

module.exports = {
  EXECUTION_STATUS,
  EXECUTABLE_STATUSES,
  BLOCKED_STATUS_REASON,
  PROOF_LEVEL,
  RISK_LEVEL,
  APPROVAL_MANDATORY_RISK,
  SETUP_COMPLEXITY,
  AUTOMATION_DEPTH,
  PACK_DIMENSION,
  DANGEROUS_ACTION_CLASSES,
  LIVE_DATA_SOURCES,
  LIVE_AGENT_ANCHORS,
  PACK_REQUIRED_FIELDS,
  AGENT_REQUIRED_FIELDS,
  WORKFLOW_REQUIRED_FIELDS,
  isExecutableStatus,
  requiresApprovalByRisk,
  blockedReasonForStatus,
  touchesDangerousAction,
};
