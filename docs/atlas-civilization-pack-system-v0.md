# Atlas Civilization Pack System — v0

> **AI Business Civilization Infrastructure.** A foundational **BusinessOS** where any
> business — any type, size, country, industry, role and operating model — can be
> structured, managed, automated, governed, financed, coordinated and scaled through
> **agents, workflows, memory, evidence, approvals and packs**.

This document explains the launch layer shipped in `lib/atlas/` and the UI surfaces under
`app/`. It is a **v0** — visible, multidimensional, and **safe to launch** because execution
is proof-gated by construction.

---

## 1. Why packs, not generic SaaS modules

A trader, a global manufacturer and a SaaS CFO do not need the same product. They need the
**same primitives** — agents, workflows, evidence, approvals — **re-composed** for their reality.

Atlas is therefore **not**:

- an ERP (it is not ledger-first),
- a CRM (it is not contact-first),
- a dashboard (it is not chart-first),
- an MSME tool (it scales solo → global enterprise).

A **pack** is a composition of agents + workflows + data requirements + gates, targeted at one
slice of the matrix. The same `Collections Recovery` agents appear in the Trader Pack, the
Distributor Pack, the Collections Manager role pack and the Collections Agent Swarm — composed
differently each time.

---

## 2. Pack dimensions

Eight dimensions (`PACK_DIMENSION` in `atlasProofModel.js`):

| Dimension | Examples | Count |
|---|---|---|
| **business_type** | Trader, Retailer, Distributor, Manufacturer, SaaS, Agency, D2C… | 20 |
| **business_size** | Solo, Startup, MSME, Mid-Market, Enterprise, Holding… | 9 |
| **role** | Founder/CEO, CFO, Sales Head, Collections Manager, Board… | 13 |
| **workflow** | CashOps, Collections Recovery, Invoice-to-Cash, Procure-to-Pay… | 16 |
| **region** | Global, India, US, EU, GCC, SEA, UK, LATAM | 8 |
| **industry** | Trading, Retail, Manufacturing, Logistics, Healthcare (preview)… | 14 |
| **enterprise_custom** | Governance, Custom Operating Model, Data Room, Private Mesh… | 12 |
| **agent_swarm** | Finance, Sales, Collections, CEO Command, Risk & Audit… | 11 |

**103 packs total** (registry: `lib/atlas/atlasPackRegistry.js`).

---

## 3. The pack schema

Every pack carries (enforced by the static check):

`id · name · category · dimension · description · target_customer · business_problem ·
primary_outcome · included_agent_ids · included_workflow_ids · required_data_sources ·
required_connectors · required_permissions · proof_level · execution_status · setup_complexity ·
automation_depth · risk_level · approval_required · evidence_required · audit_required ·
region_fit · industry_fit · business_size_fit · customizability · demo_route · activation_cta ·
blocked_reason · roadmap_note`

`included_agent_ids` / `included_workflow_ids` are **derived from the real registries**, so a pack
can never reference an agent or workflow that does not exist.

---

## 4. Agents — 360, organised by swarm

`lib/atlas/atlasAgentRegistry.js` generates **360 agents** deterministically from per-domain spec
tables (Command, Finance, Cashflow, Accounting, Invoice, Collections, Sales, Customer, Supplier,
Procurement, Inventory, Operations, HR/Admin, Compliance, Legal, Document, Communication,
Analytics, Data Quality, Approval, Risk/Audit, Industry, Region, Governance, Developer) **plus**
generated jurisdiction-compliance agents, business-type specialists, role cockpits, swarm
coordinators and workflow runners.

Each agent declares: `id · name · pack_ids · domain · role · description · job_to_be_done ·
input_data · output_decision_or_action · actions_supported · risk_level · execution_status ·
evidence_required · approval_required · audit_required · connector_required · live_route ·
proof_gate · blocked_reason`.

**Honesty rule (enforced at module load):** a `live_*` agent must trace to a real backend anchor
or read only live data sources, and any dangerous action forces `approval_required`. There are
**0 `live_proven`** agents (the safest stance) and **123 `live_limited`** insight/draft agents.

---

## 5. Workflows — 20 templates

`lib/atlas/atlasWorkflowRegistry.js` — Lead-to-Cash, Invoice-to-Cash, Collections Recovery,
Purchase-to-Pay, Supplier Follow-up, Inventory Reorder, Customer Escalation, Owner Briefing,
Daily Command Brief, Cash Risk Alert, Approval Request, Audit Evidence Capture, Data Quality
Repair, Customer/Supplier Communication Draft, Business Health Review, Board Update, Multi-Branch
Stock, Multi-Country Cash, Custom Blueprint.

Each declares steps, required agents (validated), data sources, **approval / evidence / audit
points**, a `proof_gate`, and — critically — **`external_send_allowed: false` by default**.

---

## 6. What is live vs preview vs custom_required

Execution status (`atlasProofModel.js`) is the master gate keyword:

| Status | Executable? | Meaning |
|---|---|---|
| `live_proven` | ✅ | Shipped, evidence-backed |
| `live_limited` | ✅ | Works under narrow, declared conditions (often flag-gated, read-only) |
| `preview` | ❌ | Designed & visible, not executable |
| `connector_required` | ❌ | Needs an external connector that is not active |
| `custom_required` | ❌ | Needs per-tenant configuration |
| `partner_required` | ❌ | Needs an enabled partner |
| `roadmap` | ❌ | Planned, not built |
| `disabled` | ❌ | Turned off |

**The genuinely-live anchors** (real endpoints in `vantro-flow-backend/server.js`, all behind
feature flags that **default OFF**): `core.owner_briefing`, `core.data_quality`,
`core.policy_guard`, `core.cost_router`, and the agent registry listing. Everything claiming
`live_limited` either is one of these or only **reads** live data surfaces (invoices, collections,
inventory, …) for insight/drafting — never autonomous outbound action.

---

## 7. Why launch is safe with hundreds of visible agents

1. **Only `live_*` can execute.** Preview/roadmap/custom/connector/partner/disabled are visible
   for evaluation and **cannot run**, verified by the guard even with a fully-permissive context.
2. **The guard fails closed.** `atlasExecutionGuard.js` denies unless *every* gate passes: audit
   on, role allowed, data sources connected, connectors active, evidence present, approval granted,
   and external send explicitly enabled.
3. **Audit is always on.** Every agent and pack has `audit_required: true`.
4. **No silent outbound.** External / customer-facing send is OFF by default everywhere; dangerous
   actions force approval **and** an explicit, safe external-send enable.
5. **No fake live claims.** A module-load assertion + the static check forbid unsupported
   `live_proven` claims and any non-executable entry carrying a live route.

So a customer can **see** the full civilization surface (the ambition) while only a small, proven
core can **act** (the safety).

---

## 8. The execution guard

`lib/atlas/atlasExecutionGuard.js` exposes:

```js
canExecuteAgent(agent, context)   // → { allowed, status, reasons[], satisfied[], required_gates[] }
canExecutePack(pack, context)
canExecuteWorkflow(workflow, context)
```

Context defaults to the **safe (blocking)** value for anything omitted — `auditEnabled`,
`approvalGranted`, `externalSendEnabled` all default `false`. The guard is **pure** and never
executes anything; it only returns a decision the UI renders.

---

## 9. Business mode selector

`lib/atlas/atlasBusinessMode.js` recommends packs from seven inputs — `business_type ·
business_size · industry · region · role · maturity_stage · automation_goal`:

- **Trader + Small Business + India + Founder + get_paid_faster** → Collections Recovery, Trader,
  Small Business, Founder/CEO, Invoice-to-Cash, India, CashOps.
- **Enterprise + Global + CFO + governance_compliance** → Enterprise, CFO/Finance Lead, Compliance
  Evidence, Audit Readiness, Approval Control, Global, CEO Command Swarm.

---

## 10. UI surfaces (`app/`)

`/command` · `/genesis` · `/agents` · `/agents/:id` · `/packs` · `/packs/:id` · `/flow` ·
`/business-graph` · `/evidence-vault` · `/actions` · `/approvals` · `/industry-packs` ·
`/region-packs` · `/enterprise-governance` · `/developer-platform` · `/partner-workspace` ·
`/workflow-builder`.

Every pack surface shows category, target business, status, proof level, required setup, included
agents & workflows, connected/missing data, risk level, the approval/evidence/audit gates, the
activation CTA, a preview-safe state, and (for enterprise/custom) a custom-deployment CTA.

---

## 11. Static proof check

`scripts/atlas-pack-registry-check.js` (`npm run atlas:check`) asserts: ≥50 packs, ≥300 agents,
full schema on every entry, valid cross-references, every high/critical agent requires approval,
every agent `audit_required`, the guard blocks every non-executable status, workflows never enable
external send, no unsupported `live_proven` claims, allowed route prefixes only, and **no secrets /
PII** in the registries. **All 25 checks pass.**

---

## 12. Partner / investor narrative

> Atlas is the operating layer for the agent era of business. Most tools digitise a *function*
> (accounting, CRM, inventory). Atlas composes a *business* — across type, size, role, geography
> and industry — out of agents, workflows, evidence and approvals, governed by an execution guard
> that makes autonomy **safe**. We launch with a visible civilization-scale surface (103 packs,
> 360 agents) and a small, **proven, evidence-gated** execution core, then promote capabilities
> from preview → live as each one earns its proof. The moat is the **proof-gated composition
> engine**, not any single agent.

---

## 13. Demo script idea

1. **Genesis** — "Not a SaaS module list. A BusinessOS." Show the 8 dimensions, the live vs
   blocked counts.
2. **Business Mode** on `/packs` — pick *Trader · Small · India · Founder · get paid faster*;
   watch the recommended packs appear, ordered by fit.
3. **Open the Trader Pack** — show included agents, workflows, the data-source connection state and
   the gate panel. Point out the green "ready" vs amber "blocked" states are computed live by the
   guard.
4. **Open Owner Briefing agent** — the proven, evidence-contract surface. "This one is live."
5. **Open a sender agent** (e.g. WhatsApp Sender) — "connector required, external send off by
   default — it is visible but it cannot fire." Show the guard's reasons.
6. **`/approvals` & `/evidence-vault`** — every risky action routes through approval; every claim
   cites evidence; everything is audited.
7. Close on **`/enterprise-governance`** — "and for an enterprise, this same engine becomes a
   custom operating layer." Hit *Request custom deployment*.
