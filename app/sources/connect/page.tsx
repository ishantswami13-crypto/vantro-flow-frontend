"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { TallyPairing } from "@/components/connectors/TallyPairing";
import type { Connector } from "@/lib/api";

// Sources › Connect Tally. The real pairing flow: download the bridge, pair
// it with a one-time code, wait for its first real sync. Every step's state
// comes from the backend (see components/connectors/TallyPairing.tsx).
export default function SourcesConnectPage() {
  const [connected, setConnected] = useState<Connector | null>(null);

  return (
    <DashboardLayout pageTitle="Connect Tally">
      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 18 }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          <Link href="/sources" className="hover-dim" style={{ color: "var(--text-secondary)" }}>Sources</Link> <span aria-hidden>›</span> Connect Tally
        </nav>
        <h1 style={{ margin: 0, fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 20, color: "var(--text-primary)" , letterSpacing: "-0.015em"}}>Connect TallyPrime</h1>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          Starlane reads Tally through a small bridge on the computer where Tally runs. It is read-only — it never creates,
          edits or deletes anything in Tally — and it uses its own device credential, which you can revoke from Sources at any time.
        </p>

        <div style={{ background: "var(--bg-elevated)", border: "1px solid rgb(var(--c-ink) / 0.10)", borderRadius: 8, padding: "4px 20px 8px" }}>
          <TallyPairing onConnected={setConnected} />
        </div>

        {connected && (
          <div role="status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", border: "1px solid rgba(71,112,84,0.35)", background: "var(--bg-elevated)", borderRadius: 8, padding: "14px 16px" }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-primary)" }}>Tally is connected. Starlane is building your business state from the vouchers it received.</p>
            <Link href="/bridge" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Open The Bridge →</Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
