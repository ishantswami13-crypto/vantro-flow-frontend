// ─────────────────────────────────────────────────────────────────────────────
// Atlas Civilization Pack System — Business Mode Selector (v0)
//
// A business is described along seven dimensions. Given that description, Atlas
// recommends the packs that fit — so a Trader/Small/India/Founder sees a very
// different starting surface than an Enterprise/Global/CFO.
//
//   business_type · business_size · industry · region · role
//   maturity_stage · automation_goal
//
// This is pure recommendation logic over the pack registry. It never executes
// anything — activation still goes through the execution guard.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const { ATLAS_PACKS, PACKS_BY_ID } = require('./atlasPackRegistry');

// ── Dimension option lists (for UI selectors) ────────────────────────────────
const DIMENSIONS = Object.freeze({
  business_type: ['trader', 'retailer', 'distributor', 'manufacturer', 'service', 'saas', 'agency',
    'consultant', 'marketplace', 'logistics', 'franchise', 'exim', 'real_estate', 'construction',
    'education', 'healthcare', 'professional', 'local', 'creator', 'd2c'],
  business_size: ['solo', 'startup', 'small_business', 'msme', 'mid_market', 'enterprise',
    'global_enterprise', 'multi_entity', 'holding'],
  industry: ['trading', 'retail', 'distribution', 'manufacturing', 'logistics', 'saas', 'services',
    'construction', 'healthcare', 'education', 'finance_ops', 'food_fmcg', 'automotive', 'robotics'],
  region: ['global', 'india', 'us', 'eu', 'gcc', 'sea', 'uk', 'latam'],
  role: ['founder', 'cfo', 'sales_head', 'ops_head', 'procurement_head', 'inventory_mgr',
    'collections_mgr', 'cs', 'support_lead', 'hr_admin', 'compliance_officer', 'advisor', 'board'],
  maturity_stage: ['idea', 'early', 'growth', 'scale', 'mature'],
  automation_goal: ['get_paid_faster', 'control_cash', 'control_inventory', 'grow_sales',
    'tighten_ops', 'governance_compliance', 'investor_ready'],
});

// ── Which workflow/swarm packs each business type leans on ────────────────────
const TYPE_WORKFLOW_PACKS = {
  trader: ['wf.cashops', 'wf.inventory_control', 'wf.supplier_operations', 'wf.collections_recovery'],
  retailer: ['wf.inventory_control', 'wf.cashops', 'wf.business_health'],
  distributor: ['wf.collections_recovery', 'wf.inventory_control', 'wf.supplier_operations'],
  manufacturer: ['wf.inventory_control', 'wf.procure_to_pay', 'wf.cashops'],
  service: ['wf.invoice_to_cash', 'wf.collections_recovery', 'wf.customer_lifecycle'],
  saas: ['wf.business_health', 'wf.customer_lifecycle', 'wf.cashops'],
  agency: ['wf.invoice_to_cash', 'wf.customer_lifecycle'],
  consultant: ['wf.invoice_to_cash', 'wf.cashops'],
  d2c: ['wf.inventory_control', 'wf.business_health', 'wf.cashops'],
  default: ['wf.cashops', 'wf.collections_recovery', 'wf.business_health'],
};

// ── Which packs an automation goal emphasises ─────────────────────────────────
const GOAL_PACKS = {
  get_paid_faster: ['wf.collections_recovery', 'wf.invoice_to_cash'],
  control_cash: ['wf.cashops', 'swarm.finance'],
  control_inventory: ['wf.inventory_control', 'swarm.inventory'],
  grow_sales: ['wf.sales_pipeline', 'swarm.sales'],
  tighten_ops: ['swarm.operations', 'wf.supplier_operations'],
  governance_compliance: ['ent.compliance_evidence', 'wf.audit_readiness', 'wf.approval_control'],
  investor_ready: ['ent.data_room', 'wf.business_health'],
};

// ── Scoring ───────────────────────────────────────────────────────────────────
// Each matched signal adds weight + a human reason. Higher score ⇒ ranked first.
function recommendPacks(selection = {}) {
  const scores = new Map(); // packId -> { score, reasons: Set }

  const add = (packId, weight, reason) => {
    if (!PACKS_BY_ID[packId]) return;
    const cur = scores.get(packId) || { score: 0, reasons: new Set() };
    cur.score += weight;
    cur.reasons.add(reason);
    scores.set(packId, cur);
  };

  const { business_type, business_size, industry, region, role, automation_goal } = selection;

  if (business_type) {
    add(`biz.${business_type}`, 10, `Built for a ${business_type} business`);
    (TYPE_WORKFLOW_PACKS[business_type] || TYPE_WORKFLOW_PACKS.default).forEach((p) =>
      add(p, 5, `Core workflow for a ${business_type}`));
  }
  if (business_size) add(`size.${business_size}`, 8, `Right-sized for ${business_size}`);
  if (role) add(`role.${role}`, 8, `Scoped to the ${role} role`);
  if (region) add(`region.${region}`, 6, `Region rules for ${region}`);
  if (industry) add(`ind.${industry}`, 6, `Industry pack for ${industry}`);

  if (automation_goal && GOAL_PACKS[automation_goal]) {
    GOAL_PACKS[automation_goal].forEach((p) => add(p, 7, `Matches your goal: ${automation_goal}`));
  }

  // Always offer the command cockpit as the spine.
  add('swarm.ceo_command', 3, 'The owner command cockpit (always recommended)');

  const ranked = Array.from(scores.entries())
    .map(([id, v]) => ({
      pack: PACKS_BY_ID[id],
      score: v.score,
      reasons: Array.from(v.reasons),
    }))
    .filter((r) => r.pack)
    .sort((a, b) => b.score - a.score);

  return {
    selection,
    recommended: ranked,
    live_recommended: ranked.filter((r) => ['live_proven', 'live_limited'].includes(r.pack.execution_status)),
    preview_recommended: ranked.filter((r) => !['live_proven', 'live_limited'].includes(r.pack.execution_status)),
  };
}

// Filter the whole catalogue by any subset of dimensions (for /packs browsing).
function filterPacks(filter = {}) {
  return ATLAS_PACKS.filter((p) => {
    if (filter.dimension && p.dimension !== filter.dimension) return false;
    if (filter.execution_status && p.execution_status !== filter.execution_status) return false;
    if (filter.region && !(p.region_fit || []).some((r) => r === filter.region || r === 'global')) return false;
    if (filter.industry && !(p.industry_fit || []).some((i) => i === filter.industry || i === 'any')) return false;
    if (filter.business_size && !(p.business_size_fit || []).some((s) => s === filter.business_size || s === 'any')) return false;
    return true;
  });
}

module.exports = { DIMENSIONS, recommendPacks, filterPacks, TYPE_WORKFLOW_PACKS, GOAL_PACKS };
