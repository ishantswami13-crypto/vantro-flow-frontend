"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/v32/ui";
import { StatusChip } from "@/components/ui/Badge";
import { TallyPairing } from "@/components/connectors/TallyPairing";
import type { Connector } from "@/lib/api";

// Sources > Connect Tally. The real pairing flow: download the bridge, pair
// it with a one-time code, wait for its first real sync. Every step's state
// comes from the backend (see components/connectors/TallyPairing.tsx).

const FACTS: { title: string; body: string }[] = [
  { title: "Read only", body: "The bridge never creates, edits or deletes anything in Tally." },
  { title: "Its own credential", body: "It signs in with a device key, never your Starlane password, and you can revoke it from Sources." },
  { title: "What it reads", body: "Sales, purchases, receipts, payments and stock items, through Tally's local XML port." },
  { title: "Using another system?", body: "A CSV or Excel export works today. Upload it from Collections." },
];

export default function SourcesConnectPage() {
  const [connected, setConnected] = useState<Connector | null>(null);

  return (
    <DashboardLayout pageTitle="Connect Tally">
      <style>{`
        .connect-grid { display: grid; gap: 32px; grid-template-columns: minmax(0, 1fr); align-items: start; }
        @media (min-width: 1000px) { .connect-grid { grid-template-columns: minmax(0, 680px) minmax(0, 280px); gap: 56px; } }
      `}</style>
      <div className="page-stack" style={{ maxWidth: 1180 }}>
        <PageHeader title="Connect TallyPrime" subtitle="Three steps on the computer where Tally runs. About five minutes." />

        <div className="connect-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div className="ui-panel" style={{ padding: "22px 24px" }}>
              <TallyPairing onConnected={setConnected} />
            </div>

            {connected && (
              <div role="status" className="flex items-center justify-between flex-wrap" style={{ gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
                <p className="flex items-center flex-wrap" style={{ margin: 0, gap: 10, fontSize: 13.5, color: "var(--ink)" }}>
                  <StatusChip tone="positive">Connected</StatusChip>
                  Starlane is building your business state from the vouchers it received.
                </p>
                <Link href="/bridge" className="ui-btn ui-btn-primary ui-btn-sm">Open the Bridge</Link>
              </div>
            )}
          </div>

          <aside aria-labelledby="about-bridge-h">
            <h2 id="about-bridge-h" className="section-label">About the bridge</h2>
            <dl style={{ margin: 0, borderTop: "1px solid var(--line)" }}>
              {FACTS.map((f) => (
                <div key={f.title} style={{ padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
                  <dt style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{f.title}</dt>
                  <dd style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{f.body}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
