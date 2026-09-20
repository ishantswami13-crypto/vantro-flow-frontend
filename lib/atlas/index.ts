// ─────────────────────────────────────────────────────────────────────────────
// Atlas Civilization Pack System — typed UI entry point
//
// The registries are authored as CommonJS .js so a plain-node static check can
// load them too. This module re-exports them with TypeScript types so the
// Next.js UI gets full type-safety from a single import: `@/lib/atlas`.
// ─────────────────────────────────────────────────────────────────────────────
import * as agentReg from "./atlasAgentRegistry.js";
import * as packReg from "./atlasPackRegistry.js";
import * as wfReg from "./atlasWorkflowRegistry.js";
import * as guardMod from "./atlasExecutionGuard.js";
import * as modeMod from "./atlasBusinessMode.js";

export type ExecutionStatus =
  | "live_proven" | "live_limited" | "preview" | "connector_required"
  | "custom_required" | "partner_required" | "roadmap" | "disabled";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type PackDimension =
  | "business_type" | "business_size" | "role" | "workflow"
  | "region" | "industry" | "enterprise_custom" | "agent_swarm";

export interface AtlasAgent {
  id: string;
  name: string;
  pack_ids: string[];
  domain: string;
  role: string;
  description: string;
  job_to_be_done: string;
  input_data: string;
  output_decision_or_action: string;
  actions_supported: string[];
  risk_level: RiskLevel;
  execution_status: ExecutionStatus;
  evidence_required: boolean;
  approval_required: boolean;
  audit_required: boolean;
  connector_required: boolean;
  live_route: string | null;
  proof_gate: string;
  blocked_reason: string | null;
}

export interface AtlasPack {
  id: string;
  name: string;
  category: string;
  dimension: PackDimension;
  description: string;
  target_customer: string;
  business_problem: string;
  primary_outcome: string;
  included_agent_ids: string[];
  included_workflow_ids: string[];
  required_data_sources: string[];
  required_connectors: string[];
  required_permissions: string[];
  proof_level: string;
  execution_status: ExecutionStatus;
  setup_complexity: string;
  automation_depth: string;
  risk_level: RiskLevel;
  approval_required: boolean;
  evidence_required: boolean;
  audit_required: boolean;
  region_fit: string[];
  industry_fit: string[];
  business_size_fit: string[];
  customizability: string;
  demo_route: string;
  activation_cta: string;
  blocked_reason: string | null;
  roadmap_note: string;
}

export interface AtlasWorkflow {
  id: string;
  name: string;
  pack_ids: string[];
  steps: string[];
  required_agents: string[];
  required_data_sources: string[];
  risk_level: RiskLevel;
  execution_status: ExecutionStatus;
  approval_points: string[];
  evidence_points: string[];
  audit_points: string[];
  external_send_allowed: boolean;
  proof_gate: string;
  blocked_reason: string | null;
}

export interface GuardDecision {
  allowed: boolean;
  status: string;
  reasons: string[];
  satisfied: string[];
  required_gates: string[];
}

export interface AtlasContext {
  userRole?: string;
  allowedRoles?: string[] | null;
  connectedDataSources?: string[];
  activeConnectors?: string[];
  evidenceProvided?: boolean;
  approvalGranted?: boolean;
  auditEnabled?: boolean;
  externalSendEnabled?: boolean;
  partnerEnabled?: boolean;
  customConfigured?: boolean;
}

// ── Typed exports ─────────────────────────────────────────────────────────────
export const ATLAS_AGENTS = (agentReg as any).ATLAS_AGENTS as AtlasAgent[];
export const AGENTS_BY_ID = (agentReg as any).AGENTS_BY_ID as Record<string, AtlasAgent>;
export const ATLAS_PACKS = (packReg as any).ATLAS_PACKS as AtlasPack[];
export const PACKS_BY_ID = (packReg as any).PACKS_BY_ID as Record<string, AtlasPack>;
export const ATLAS_WORKFLOWS = (wfReg as any).ATLAS_WORKFLOWS as AtlasWorkflow[];
export const WORKFLOWS_BY_ID = (wfReg as any).WORKFLOWS_BY_ID as Record<string, AtlasWorkflow>;

export const getAgent = (id: string): AtlasAgent | null => (agentReg as any).getAgent(id);
export const getPack = (id: string): AtlasPack | null => (packReg as any).getPack(id);
export const getWorkflow = (id: string): AtlasWorkflow | null => (wfReg as any).getWorkflow(id);
export const packsByDimension = (d: PackDimension): AtlasPack[] => (packReg as any).packsByDimension(d);

export const canExecuteAgent = (a: AtlasAgent, ctx: AtlasContext): GuardDecision => (guardMod as any).canExecuteAgent(a, ctx);
export const canExecutePack = (p: AtlasPack, ctx: AtlasContext): GuardDecision => (guardMod as any).canExecutePack(p, ctx);
export const canExecuteWorkflow = (w: AtlasWorkflow, ctx: AtlasContext): GuardDecision => (guardMod as any).canExecuteWorkflow(w, ctx);
export const explainDecision = (d: GuardDecision): string => (guardMod as any).explain(d);

export const recommendPacks = (sel: Record<string, string>) => (modeMod as any).recommendPacks(sel);
export const filterPacks = (f: Record<string, string>): AtlasPack[] => (modeMod as any).filterPacks(f);
export const DIMENSIONS = (modeMod as any).DIMENSIONS as Record<string, string[]>;

// ── Display helpers shared across UI surfaces ─────────────────────────────────
export const EXECUTABLE = (s: ExecutionStatus): boolean => s === "live_proven" || s === "live_limited";

export const STATUS_META: Record<ExecutionStatus, { label: string; color: string; executable: boolean }> = {
  live_proven:        { label: "Live · Proven",       color: "#22C55E", executable: true },
  live_limited:       { label: "Live · Limited",      color: "#52B788", executable: true },
  preview:            { label: "Preview",             color: "#8B6CF0", executable: false },
  connector_required: { label: "Connector required",  color: "#4F9FD4", executable: false },
  custom_required:    { label: "Custom required",     color: "#F5A623", executable: false },
  partner_required:   { label: "Partner required",    color: "#E07B39", executable: false },
  roadmap:            { label: "Roadmap",             color: "#6B7280", executable: false },
  disabled:           { label: "Disabled",            color: "#F5424D", executable: false },
};

export const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  low:      { label: "Low",      color: "#6B7280" },
  medium:   { label: "Medium",   color: "#4F6EF7" },
  high:     { label: "High",     color: "#F5A524" },
  critical: { label: "Critical", color: "#F5424D" },
};

export const DIMENSION_LABEL: Record<PackDimension, string> = {
  business_type: "Business Type",
  business_size: "Business Size",
  role: "Role",
  workflow: "Workflow",
  region: "Region",
  industry: "Industry",
  enterprise_custom: "Enterprise / Custom",
  agent_swarm: "Agent Swarm",
};
