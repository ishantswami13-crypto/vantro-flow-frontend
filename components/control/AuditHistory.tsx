"use client";

// The audit trail as a history table (Control, Audit and the Control
// overview's Recent activity): the action first, then who, the record it
// touched, through what, the result and when. Rows from decision_events
// open their decision; ledger rows (audit_logs) carry no actor or result and
// show an honest dash.
import React from "react";
import { StatusText, type HistoryColumn, type HistoryRow } from "@/components/hv/Pieces";
import { Lettermark } from "@/components/v32/ui";
import { formatDateTime } from "@/lib/locale";
import type { AuditEvent } from "@/lib/api";

export function humanizeAction(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/^./, c => c.toUpperCase());
}

function formatTime(iso: string): string {
  return formatDateTime(iso);
}

// Harvey's history table: the action first (what happened), then who, the
// record it touched, through what, and the result. Phones fold each row.
export function auditRows(events: AuditEvent[]): HistoryRow[] {
  return events.map((event) => ({
    key: event.id,
    href: event.source === "decision" && event.entity_id ? `/decisions/${event.entity_id}` : undefined,
    title: event.title || undefined,
    cells: [
      <span key="a" className="min-w-0" style={{ display: "block" }}>
        <span className="block truncate">{humanizeAction(event.action)}</span>
        {event.title && <span className="block truncate" style={{ fontSize: 12, color: "#6E6A63" }}>{event.title}</span>}
      </span>,
      <span key="w" className="ag-who">{event.actor ? <><Lettermark letter={event.actor} size={20} />{event.actor}</> : "—"}</span>,
      <span key="o">{event.source === "decision" ? "Decision" : event.entity_type || "—"}</span>,
      <span key="s">{event.source === "decision" ? (event.model || "Starlane") : "Ledger"}</span>,
      event.result ? <StatusText key="r" label={humanizeAction(event.result)} tone={/fail|reject|error/i.test(event.result) ? "critical" : /complet|approv|success|shadow/i.test(event.result) ? "positive" : "neutral"} /> : <span key="r" style={{ color: "#8F8A81" }}>—</span>,
      <span key="t" style={{ color: "#6E6E69" }}>{formatTime(event.created_at)}</span>,
    ],
  }));
}

export const AUDIT_COLUMNS: HistoryColumn[] = [{ label: "Action" }, { label: "Who" }, { label: "Record" }, { label: "Through" }, { label: "Result" }, { label: "When", align: "right" }];
export const AUDIT_TEMPLATE = "minmax(0, 2.4fr) minmax(0, 1.3fr) 96px minmax(0, 1.1fr) 120px 150px";

