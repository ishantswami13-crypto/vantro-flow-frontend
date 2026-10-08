// Labels for user-defined watch conditions (lib/routes/watches.js on the
// backend). Display only: the backend evaluates every condition.

import type { Watch, WatchConditionConfig } from "@/lib/api";
import type { StatusTone } from "@/components/ui/Badge";
import { inrWhole, formatCount } from "@/lib/format";

export const METRIC_OPTIONS: { value: Watch["metric_key"]; label: string; short: string; unit: "INR" | "days"; needsEntity?: boolean }[] = [
  { value: "receivables_overdue_amount", label: "Overdue receivables amount", short: "Overdue receivables", unit: "INR" },
  { value: "cash_forecast_runway_days", label: "Cash forecast runway (days)", short: "Cash runway", unit: "days" },
  { value: "customer_exposure_amount", label: "Customer exposure amount", short: "Exposure", unit: "INR", needsEntity: true },
];

export const OPERATOR_OPTIONS: { value: WatchConditionConfig["operator"]; label: string; short: string }[] = [
  { value: "gt", label: "is greater than", short: "above" },
  { value: "gte", label: "is at least", short: "at least" },
  { value: "lt", label: "is less than", short: "below" },
  { value: "lte", label: "is at most", short: "at most" },
  { value: "eq", label: "equals", short: "equal to" },
];

/** "Overdue receivables above ₹6,00,000" / "Cash runway below 45 days". */
export function conditionText(w: Watch): string {
  const m = METRIC_OPTIONS.find((x) => x.value === w.metric_key);
  const op = OPERATOR_OPTIONS.find((o) => o.value === w.condition_config?.operator)?.short || w.condition_config?.operator || "";
  const t = w.condition_config?.threshold;
  const value = typeof t === "number" ? (m?.unit === "days" ? `${formatCount(t)} days` : inrWhole(t)) : "—";
  const who = w.metric_key === "customer_exposure_amount" && w.condition_config?.entity_name ? ` for ${w.condition_config.entity_name}` : "";
  return `${m?.short || w.metric_key}${who} ${op} ${value}`;
}

/** Where the condition stands at its latest check. Never green before a check. */
export function watchStatus(w: Watch): { label: string; tone: StatusTone } {
  if (w.status === "paused") return { label: "Paused", tone: "neutral" };
  if (!w.last_evaluated_at) return { label: "Not checked yet", tone: "unknown" };
  if (w.last_triggered_at && w.last_triggered_at === w.last_evaluated_at) return { label: "Triggered", tone: "critical" };
  if (w.last_triggered_at) return { label: "Clear, triggered before", tone: "attention" };
  return { label: "Clear", tone: "positive" };
}
