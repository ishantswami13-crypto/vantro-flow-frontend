#!/usr/bin/env node
'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Atlas Civilization Pack System — Static Proof Check
//
// Read-only. Loads the registries + guard and asserts the launch-safety
// invariants. Prints counts and booleans only — never secrets or PII. Exits 1
// on any failure so it can gate CI / pre-commit.
//
//   node scripts/atlas-pack-registry-check.js
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const ROOT = path.join(__dirname, '..');
const M = require(path.join(ROOT, 'lib/atlas/atlasProofModel.js'));
const { ATLAS_AGENTS, AGENTS_BY_ID } = require(path.join(ROOT, 'lib/atlas/atlasAgentRegistry.js'));
const { ATLAS_PACKS, PACKS_BY_ID } = require(path.join(ROOT, 'lib/atlas/atlasPackRegistry.js'));
const { ATLAS_WORKFLOWS, WORKFLOWS_BY_ID, WORKFLOW_BROKEN_AGENT_REFS } = require(path.join(ROOT, 'lib/atlas/atlasWorkflowRegistry.js'));
const guard = require(path.join(ROOT, 'lib/atlas/atlasExecutionGuard.js'));

let pass = 0; let fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; failures.push(name + (detail ? ` — ${detail}` : '')); console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
}

// Known UI routes (PART 6) — used to validate any internal route references.
const UI_ROUTES = [
  '/command', '/genesis', '/agents', '/agents/:id', '/packs', '/packs/:id', '/flow',
  '/business-graph', '/evidence-vault', '/actions', '/approvals', '/industry-packs',
  '/region-packs', '/enterprise-governance', '/developer-platform', '/partner-workspace',
  '/workflow-builder',
];
const ALLOWED_API_PREFIXES = ['/api/agents/'];

console.log('\n── Atlas Pack Registry — Static Proof Check ─────────────────────────\n');

// ── Counts ────────────────────────────────────────────────────────────────────
console.log('Counts:');
check(`packs ≥ 50 (have ${ATLAS_PACKS.length})`, ATLAS_PACKS.length >= 50);
check(`agents ≥ 300 (have ${ATLAS_AGENTS.length})`, ATLAS_AGENTS.length >= 300);
check(`workflows present (have ${ATLAS_WORKFLOWS.length})`, ATLAS_WORKFLOWS.length >= 1);

// ── Schema completeness ─────────────────────────────────────────────────────
console.log('\nSchema completeness:');
{
  let missing = [];
  for (const p of ATLAS_PACKS) {
    for (const f of M.PACK_REQUIRED_FIELDS) if (!(f in p)) missing.push(`${p.id}.${f}`);
  }
  check('every pack has all required fields', missing.length === 0, missing.slice(0, 5).join(', '));

  missing = [];
  for (const a of ATLAS_AGENTS) {
    for (const f of M.AGENT_REQUIRED_FIELDS) if (!(f in a)) missing.push(`${a.id}.${f}`);
  }
  check('every agent has all required fields', missing.length === 0, missing.slice(0, 5).join(', '));

  missing = [];
  for (const w of ATLAS_WORKFLOWS) {
    for (const f of M.WORKFLOW_REQUIRED_FIELDS) if (!(f in w)) missing.push(`${w.id}.${f}`);
  }
  check('every workflow has all required fields', missing.length === 0, missing.slice(0, 5).join(', '));
}

// ── Unique ids ────────────────────────────────────────────────────────────────
console.log('\nUnique ids:');
check('agent ids unique', new Set(ATLAS_AGENTS.map((a) => a.id)).size === ATLAS_AGENTS.length);
check('pack ids unique', new Set(ATLAS_PACKS.map((p) => p.id)).size === ATLAS_PACKS.length);
check('workflow ids unique', new Set(ATLAS_WORKFLOWS.map((w) => w.id)).size === ATLAS_WORKFLOWS.length);

// ── Cross-references resolve ──────────────────────────────────────────────────
console.log('\nCross-references:');
{
  const badPackAgentRefs = [];
  const emptyPacks = [];
  for (const p of ATLAS_PACKS) {
    if (!p.included_agent_ids.length) emptyPacks.push(p.id);
    for (const id of p.included_agent_ids) if (!AGENTS_BY_ID[id]) badPackAgentRefs.push(`${p.id}->${id}`);
    for (const id of p.included_workflow_ids) if (!WORKFLOWS_BY_ID[id]) badPackAgentRefs.push(`${p.id}->wf:${id}`);
  }
  check('every pack references valid agent IDs', badPackAgentRefs.length === 0, badPackAgentRefs.slice(0, 5).join(', '));
  check('no pack is empty', emptyPacks.length === 0, emptyPacks.slice(0, 5).join(', '));
  check('every workflow references valid agents', WORKFLOW_BROKEN_AGENT_REFS.length === 0, JSON.stringify(WORKFLOW_BROKEN_AGENT_REFS.slice(0, 5)));
}

// ── Safety invariants ─────────────────────────────────────────────────────────
console.log('\nSafety invariants:');
{
  // every high/critical agent requires approval
  const riskyNoApproval = ATLAS_AGENTS.filter(
    (a) => M.requiresApprovalByRisk(a.risk_level) && !a.approval_required,
  );
  check('every high/critical agent requires approval', riskyNoApproval.length === 0,
    riskyNoApproval.slice(0, 5).map((a) => a.id).join(', '));

  // every agent audit_required = true
  const noAudit = ATLAS_AGENTS.filter((a) => a.audit_required !== true);
  check('every agent has audit_required = true', noAudit.length === 0, noAudit.slice(0, 5).map((a) => a.id).join(', '));

  // every pack audit_required = true
  const packNoAudit = ATLAS_PACKS.filter((p) => p.audit_required !== true);
  check('every pack has audit_required = true', packNoAudit.length === 0, packNoAudit.slice(0, 5).map((p) => p.id).join(', '));

  // dangerous-action agents must require approval
  const dangerousNoApproval = ATLAS_AGENTS.filter(
    (a) => M.touchesDangerousAction(a.actions_supported) && !a.approval_required,
  );
  check('every dangerous-action agent requires approval', dangerousNoApproval.length === 0,
    dangerousNoApproval.slice(0, 5).map((a) => a.id).join(', '));

  // workflows: external_send_allowed must be false by default
  const sendOn = ATLAS_WORKFLOWS.filter((w) => w.external_send_allowed !== false);
  check('every workflow has external_send_allowed = false', sendOn.length === 0, sendOn.map((w) => w.id).join(', '));

  // no unsupported live_proven claims (live_proven must be a backend anchor)
  const badLiveProven = ATLAS_AGENTS.filter(
    (a) => a.execution_status === M.EXECUTION_STATUS.LIVE_PROVEN
      && !M.LIVE_AGENT_ANCHORS.some((x) => a.id.endsWith(x)),
  );
  check('no unsupported live_proven claims', badLiveProven.length === 0, badLiveProven.map((a) => a.id).join(', '));

  // live agents must declare a live_route OR be insight-only; non-live must NOT have a live_route
  const liveNoRouteOk = ATLAS_AGENTS.filter((a) => !M.isExecutableStatus(a.execution_status) && a.live_route);
  check('non-executable agents carry no live_route', liveNoRouteOk.length === 0, liveNoRouteOk.slice(0, 5).map((a) => a.id).join(', '));
}

// ── Guard blocks every non-executable status ──────────────────────────────────
console.log('\nExecution guard (fail-closed):');
{
  const fullCtx = {
    userRole: 'owner',
    connectedDataSources: M.LIVE_DATA_SOURCES.slice(),
    activeConnectors: ['__test__'],
    evidenceProvided: true, approvalGranted: true, auditEnabled: true, externalSendEnabled: true,
    partnerEnabled: true, customConfigured: true,
  };
  const blockedStatuses = ['preview', 'roadmap', 'custom_required', 'connector_required', 'partner_required', 'disabled'];
  let leaked = [];
  for (const a of ATLAS_AGENTS) {
    if (blockedStatuses.includes(a.execution_status)) {
      if (guard.canExecuteAgent(a, fullCtx).allowed) leaked.push(a.id);
    }
  }
  check('no non-executable AGENT can be executed even with full context', leaked.length === 0, leaked.slice(0, 5).join(', '));

  leaked = [];
  for (const p of ATLAS_PACKS) {
    if (blockedStatuses.includes(p.execution_status) && guard.canExecutePack(p, fullCtx).allowed) leaked.push(p.id);
  }
  check('no non-executable PACK can be executed even with full context', leaked.length === 0, leaked.slice(0, 5).join(', '));

  // Audit-off must block everything, including live agents.
  const noAuditCtx = { ...fullCtx, auditEnabled: false };
  const liveLeak = ATLAS_AGENTS.filter((a) => M.isExecutableStatus(a.execution_status) && guard.canExecuteAgent(a, noAuditCtx).allowed);
  check('audit-disabled blocks all execution', liveLeak.length === 0, liveLeak.slice(0, 3).map((a) => a.id).join(', '));
}

// ── Route references ──────────────────────────────────────────────────────────
console.log('\nRoutes:');
{
  const badRoutes = ATLAS_AGENTS
    .filter((a) => a.live_route)
    .filter((a) => !ALLOWED_API_PREFIXES.some((p) => a.live_route.startsWith(p)))
    .map((a) => `${a.id}:${a.live_route}`);
  check('every agent live_route targets an allowed API prefix', badRoutes.length === 0, badRoutes.slice(0, 5).join(', '));

  const badDemo = ATLAS_PACKS
    .filter((p) => p.demo_route && !p.demo_route.startsWith('/packs/'))
    .map((p) => `${p.id}:${p.demo_route}`);
  check('every pack demo_route is a /packs/ route', badDemo.length === 0, badDemo.slice(0, 5).join(', '));
  console.log(`     (UI route surface: ${UI_ROUTES.length} routes declared)`);
}

// ── Secret / PII scan ─────────────────────────────────────────────────────────
console.log('\nSecret / PII scan:');
{
  const blob = JSON.stringify({ ATLAS_AGENTS, ATLAS_PACKS, ATLAS_WORKFLOWS });
  const patterns = [
    [/sk-[A-Za-z0-9]{16,}/, 'OpenAI-style key'],
    [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
    [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
    [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./, 'JWT'],
    [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'email address'],
    [/\b(?:\+?\d[ -]?){10,13}\b/, 'phone number'],
    [/password\s*[:=]\s*['"][^'"]+['"]/i, 'inline password'],
    [/postgres(?:ql)?:\/\/\S+/, 'database URL'],
  ];
  const hits = patterns.filter(([re]) => re.test(blob)).map(([, label]) => label);
  check('no secrets / PII patterns in registries', hits.length === 0, hits.join(', '));
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n── Summary ──────────────────────────────────────────────────────────');
const liveAgents = ATLAS_AGENTS.filter((a) => M.isExecutableStatus(a.execution_status)).length;
const livePacks = ATLAS_PACKS.filter((p) => M.isExecutableStatus(p.execution_status)).length;
console.log(`  packs: ${ATLAS_PACKS.length}  |  agents: ${ATLAS_AGENTS.length}  |  workflows: ${ATLAS_WORKFLOWS.length}`);
console.log(`  executable: ${livePacks} packs, ${liveAgents} agents (rest are visible-but-blocked)`);
console.log(`  live_proven agents: ${ATLAS_AGENTS.filter((a) => a.execution_status === 'live_proven').length}`);
console.log(`  checks passed: ${pass}  |  failed: ${fail}`);
if (fail) {
  console.log('\n  FAILURES:');
  failures.forEach((f) => console.log(`   - ${f}`));
  console.log('\n❌ Atlas pack registry check FAILED\n');
  process.exit(1);
}
console.log('\n✅ Atlas pack registry check PASSED\n');
