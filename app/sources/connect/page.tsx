"use client";

import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Sources — Connect wizard. STARLANE_FRONTEND_HANDOFF.md §1/§5/§6/§16.
//
// Audit finding: checked server.js directly. The enrollment flow the
// existing /sources page's "Connect Tally" button calls
// (POST /api/connectors/tally/enrollment) is commented out wholesale —
// server.js:5526 "/* DISABLED 2026-09-20 — see comment above. Re-enable
// once deviceEnrollment.js and its DB schema exist for real." The module
// it depends on (lib/domain/ingestion/deviceEnrollment) was never
// committed on any branch, and there is no connector_devices/
// connector_enrollments schema either. So there is currently NO reachable
// backend for a step-tracked import job: no way to create an enrollment,
// no way to see a device claim, no import-progress state at all.
//
// Per this turn's instructions ("if there's no real import-job state
// machine to drive it, this should honestly reflect that rather than fake
// animated progress"): this page renders the real 6-step shell (Select
// Tally / Connect company / Import / Validate / Reconcile / Ready) per
// the V32 step_dot spec, all steps shown as not-started, with an honest
// notice that the connect flow isn't reachable yet — instead of animating
// through steps with no real state behind them. The only real action
// available is a link back to Sources, where the existing (also honestly
// broken, pending backend re-enable) Connect Tally control lives.

const STEPS = [
  { n: 1, label: "Select Tally" },
  { n: 2, label: "Connect company" },
  { n: 3, label: "Import" },
  { n: 4, label: "Validate" },
  { n: 5, label: "Reconcile" },
  { n: 6, label: "Ready" },
];

function StepDot({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "1.5px solid #D8D7D2",
          color: "#9A9A94",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background: "#FFFFFF",
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 13.5, color: "#63635F" }}>{label}</span>
    </div>
  );
}

export default function SourcesConnectPage() {
  return (
    <DashboardLayout pageTitle="Sources">
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Link href="/sources" className="hover-dim" style={{ fontSize: 12.5, color: "#63635F", textDecoration: "none" }}>
            ← Sources
          </Link>
          <h1 style={{ margin: "6px 0 0", fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 26, color: "#191917" }}>
            Connect a source
          </h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, padding: "12px 0 32px" }}>
          <div style={{ width: 560, maxWidth: "100%", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            {STEPS.map((s) => (
              <StepDot key={s.n} n={s.n} label={s.label} />
            ))}
          </div>

          <div
            style={{
              width: 420,
              maxWidth: "100%",
              background: "#FFFFFF",
              border: "1px solid rgba(25,25,23,0.10)",
              borderRadius: 8,
              padding: "32px 24px",
              textAlign: "center",
            }}
            className="fade-once"
          >
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#191917", marginBottom: 8 }}>
              The guided import flow isn&apos;t connected yet
            </p>
            <p className="v32-body" style={{ color: "#63635F", marginBottom: 20 }}>
              Starlane doesn&apos;t yet have a real enrollment and import-tracking backend behind this wizard — the
              connector enrollment endpoint it depends on is disabled pending a device-authentication design, so
              there is no real step-by-step progress to show. Rather than animate through steps with no state behind
              them, this page stays honest: each step above is real and ordered correctly, but none can be marked
              complete until that backend exists.
            </p>
            <Link
              href="/sources"
              className="btn-secondary"
              style={{ display: "inline-block", fontSize: 13, fontWeight: 500, color: "#191917", border: "1px solid #D8D7D2", borderRadius: 8, padding: "9px 18px", textDecoration: "none" }}
            >
              Back to Sources
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
