// ─────────────────────────────────────────────────────────────────────────────
// Atlas Civilization Pack System — Execution Guard (v0)
//
// The single chokepoint that decides whether a pack / agent / workflow may run.
// Everything is denied unless EVERY gate passes. The guard is pure and
// side-effect free — it returns a decision; it never executes anything itself.
//
// Decision shape:
//   { allowed: boolean, status, reasons: string[], satisfied: string[],
//     required_gates: string[] }
//
// Hard invariants (cannot be configured away):
//   • Only live_proven / live_limited are even candidates.
//   • Audit must be enabled — always.
//   • High/critical risk OR any dangerous action class ⇒ approval required.
//   • External / customer-facing send is OFF unless explicitly + safely enabled.
//   • Missing data sources / connectors / role / evidence ⇒ denied.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const M = require('./atlasProofModel');
const { EXECUTION_STATUS: ES } = M;

// A safe, fully-locked-down default context. Callers pass real values; anything
// omitted defaults to the SAFE (blocking) value — fail closed, never open.
function normalizeContext(ctx = {}) {
  return {
    userRole: ctx.userRole || 'guest',
    allowedRoles: ctx.allowedRoles || null,        // null ⇒ any authenticated role
    connectedDataSources: ctx.connectedDataSources || [],
    activeConnectors: ctx.activeConnectors || [],
    evidenceProvided: ctx.evidenceProvided === true,
    approvalGranted: ctx.approvalGranted === true,
    auditEnabled: ctx.auditEnabled === true,        // SAFE default = false ⇒ blocks
    externalSendEnabled: ctx.externalSendEnabled === true, // SAFE default = false
    partnerEnabled: ctx.partnerEnabled === true,
    customConfigured: ctx.customConfigured === true,
    flags: ctx.flags || {},
  };
}

// Core gate evaluation shared by all three entry points.
function evaluate(entity, ctx, opts) {
  const c = normalizeContext(ctx);
  const reasons = [];     // why it is blocked
  const satisfied = [];   // which gates passed
  const required_gates = [];

  const status = entity.execution_status;

  // ── Gate 0: status must be executable ──────────────────────────────────────
  required_gates.push('executable_status');
  if (!M.isExecutableStatus(status)) {
    reasons.push(M.blockedReasonForStatus(status) || `Status "${status}" is not executable.`);
    return { allowed: false, status, reasons, satisfied, required_gates };
  }
  satisfied.push('executable_status');

  // ── Gate 1: audit must be on ───────────────────────────────────────────────
  required_gates.push('audit_enabled');
  if (!c.auditEnabled) reasons.push('Audit logging is not enabled.');
  else satisfied.push('audit_enabled');

  // ── Gate 2: role must be allowed ───────────────────────────────────────────
  required_gates.push('role_allowed');
  const roleOk = !c.allowedRoles
    ? c.userRole !== 'guest'
    : c.allowedRoles.includes(c.userRole);
  const entityRoles = entity.required_permissions || opts.requiredPermissions;
  const entityRoleOk = !entityRoles || entityRoles.length === 0
    ? true
    : entityRoles.includes(c.userRole) || c.userRole === 'owner' || c.userRole === 'admin';
  if (!roleOk || !entityRoleOk) reasons.push(`Role "${c.userRole}" is not permitted to run this.`);
  else satisfied.push('role_allowed');

  // ── Gate 3: required data sources connected ────────────────────────────────
  const need = opts.requiredDataSources || [];
  if (need.length) {
    required_gates.push('data_sources_connected');
    const missing = need.filter((s) => !c.connectedDataSources.includes(s));
    if (missing.length) reasons.push(`Missing data sources: ${missing.join(', ')}.`);
    else satisfied.push('data_sources_connected');
  }

  // ── Gate 4: required connectors active ─────────────────────────────────────
  if (opts.connectorRequired) {
    required_gates.push('connectors_active');
    const needConn = opts.requiredConnectors && opts.requiredConnectors.length
      ? opts.requiredConnectors : ['__any_active_connector__'];
    const haveAll = needConn.every((cn) =>
      cn === '__any_active_connector__' ? c.activeConnectors.length > 0 : c.activeConnectors.includes(cn));
    if (!haveAll) reasons.push('A required connector is not active.');
    else satisfied.push('connectors_active');
  }

  // ── Gate 5: evidence ───────────────────────────────────────────────────────
  if (opts.evidenceRequired) {
    required_gates.push('evidence_present');
    if (!c.evidenceProvided) reasons.push('Evidence requirement not satisfied.');
    else satisfied.push('evidence_present');
  }

  // ── Gate 6: approval (forced for high/critical risk + dangerous actions) ────
  const dangerous = M.touchesDangerousAction(opts.actionsSupported || []);
  const approvalNeeded = Boolean(
    opts.approvalRequired || M.requiresApprovalByRisk(entity.risk_level) || dangerous,
  );
  if (approvalNeeded) {
    required_gates.push('approval_granted');
    if (!c.approvalGranted) reasons.push('Human approval is required and has not been granted.');
    else satisfied.push('approval_granted');
  }

  // ── Gate 7: external / customer-facing send must be explicitly enabled ──────
  if (dangerous) {
    required_gates.push('external_send_enabled');
    if (!c.externalSendEnabled) {
      reasons.push('External / customer-facing send is disabled by default and was not explicitly enabled.');
    } else if (!c.approvalGranted) {
      reasons.push('External send requires an approved action.');
    } else {
      satisfied.push('external_send_enabled');
    }
  }

  return { allowed: reasons.length === 0, status, reasons, satisfied, required_gates };
}

// ── Public API ────────────────────────────────────────────────────────────────
function canExecuteAgent(agent, context) {
  if (!agent) return { allowed: false, status: 'unknown', reasons: ['Agent not found.'], satisfied: [], required_gates: [] };
  return evaluate(agent, context, {
    requiredDataSources: agent.required_data_sources || inferAgentSources(agent),
    connectorRequired: agent.connector_required,
    requiredConnectors: agent.required_connectors,
    evidenceRequired: agent.evidence_required,
    approvalRequired: agent.approval_required,
    actionsSupported: agent.actions_supported,
    requiredPermissions: agent.required_permissions,
  });
}

function canExecutePack(pack, context) {
  if (!pack) return { allowed: false, status: 'unknown', reasons: ['Pack not found.'], satisfied: [], required_gates: [] };
  const connectorRequired = (pack.required_connectors || []).length > 0;
  return evaluate(pack, context, {
    requiredDataSources: pack.required_data_sources || [],
    connectorRequired,
    requiredConnectors: pack.required_connectors,
    evidenceRequired: pack.evidence_required,
    approvalRequired: pack.approval_required,
    actionsSupported: [], // pack-level danger is captured via approval_required
    requiredPermissions: pack.required_permissions,
  });
}

function canExecuteWorkflow(workflow, context) {
  if (!workflow) return { allowed: false, status: 'unknown', reasons: ['Workflow not found.'], satisfied: [], required_gates: [] };
  // A workflow that has approval points OR is high/critical needs approval.
  const approvalRequired = (workflow.approval_points || []).length > 0 || M.requiresApprovalByRisk(workflow.risk_level);
  // external_send_allowed must be true at the workflow level AND in context to send.
  const actions = workflow.external_send_allowed ? ['external_send'] : [];
  return evaluate(workflow, context, {
    requiredDataSources: workflow.required_data_sources || [],
    connectorRequired: false,
    evidenceRequired: (workflow.evidence_points || []).length > 0,
    approvalRequired,
    actionsSupported: actions,
  });
}

// Best-effort: map an agent's declared input_data string to known live sources.
function inferAgentSources(agent) {
  const text = String(agent.input_data || '').toLowerCase();
  return M.LIVE_DATA_SOURCES.filter((s) => text.includes(s.replace('_', ' ')) || text.includes(s));
}

// Convenience: a one-line human explanation for the UI.
function explain(decision) {
  if (decision.allowed) return 'Ready to run — all gates satisfied.';
  return `Blocked: ${decision.reasons.join(' ')}`;
}

module.exports = {
  canExecuteAgent,
  canExecutePack,
  canExecuteWorkflow,
  explain,
  normalizeContext,
};
