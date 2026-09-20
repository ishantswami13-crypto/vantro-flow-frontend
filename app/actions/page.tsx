"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ATLAS_AGENTS } from "@/lib/atlas";
import { AtlasShell, SafetyNote } from "@/components/atlas/AtlasUI";

const DANGEROUS = ["external_send", "customer_facing", "financial_move", "legal_commitment", "destructive", "data_export"];

export default function ActionsPage() {
  const byAction = useMemo(() => {
    const m: Record<string, { count: number; dangerous: boolean; approvalAll: boolean }> = {};
    for (const a of ATLAS_AGENTS) {
      for (const act of a.actions_supported) {
        const e = m[act] || { count: 0, dangerous: DANGEROUS.includes(act) || /send|pay|delete|sign|transfer|disburse|export/i.test(act), approvalAll: true };
        e.count++;
        if (!a.approval_required) e.approvalAll = false;
        m[act] = e;
      }
    }
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count);
  }, []);

  return (
    <AtlasShell
      title="Actions"
      subtitle="Every action class an agent can take — and how it is gated. Risky / customer-facing / financial / legal / destructive actions always require approval and are never auto-executed."
      active="/actions"
    >
      <SafetyNote />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {byAction.map(([act, e]) => (
          <div key={act} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
            border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px",
          }}>
            <div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{act}</span>
              {e.dangerous && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--c-rust)", fontFamily: "var(--font-mono)" }}>· requires approval + explicit external-send</span>}
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--faint)" }}>
              <span>{e.count} agents</span>
              <span style={{ color: e.dangerous ? "var(--c-safe)" : "var(--c-node)" }}>{e.dangerous ? "gated" : "insight"}</span>
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 16 }}>
        <Link href="/approvals" style={{ color: "var(--c-node)", fontFamily: "var(--font-mono)", fontSize: 13 }}>→ See the approval control surface</Link>
      </p>
    </AtlasShell>
  );
}
