"use client";

// The security controls Starlane has, read from the backend (GET /api/trust,
// lib/platform/security/publicControls.js), grouped by area, followed by what
// is not done yet. The page never says more than that file. No badges: none
// are held.

import { useEffect, useState } from "react";
import { fetchTrust, type PublicControl } from "@/lib/platform";

const FALLBACK = "Starlane is designed around SOC 2 and ISO/IEC 27001 controls. It is not certified, and no independent auditor has assessed it yet.";

export function PublicControls() {
  const [data, setData] = useState<{ designedAround?: string; controls?: PublicControl[]; notYet?: string[] } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fetchTrust().then(setData).catch(() => setFailed(true)); }, []);
  const controls = data?.controls || [];
  const areas = Array.from(new Set(controls.map((c) => c.area)));
  return (
    <div>
      <p className="hx-b1" style={{ maxWidth: 760, marginBottom: 8, fontWeight: 500 }}>{data?.designedAround || FALLBACK}</p>
      <p className="hx-b1" style={{ maxWidth: 760, marginBottom: 28, opacity: 0.75 }}>Each control below is built and tested in the product. It is a description of our own work, not an auditor&apos;s finding.</p>
      {!data && !failed && <p className="hx-b1" style={{ opacity: 0.6 }}>Loading the current list…</p>}
      {failed && <p className="hx-b1" style={{ opacity: 0.75 }}>The current list could not be loaded. Try again shortly.</p>}
      {areas.map((area) => (
        <div key={area} style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, letterSpacing: "0.02em", textTransform: "uppercase", opacity: 0.7, margin: "0 0 12px" }}>{area}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
            {controls.filter((c) => c.area === area).map((c) => (
              <div key={c.name} style={{ border: "1px solid rgba(25,25,23,0.12)", borderRadius: 10, padding: "16px 18px", background: "rgba(255,255,255,0.6)" }}>
                <div style={{ fontSize: 17, fontWeight: 500 }}>{c.name}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 8 }}>{c.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      {!!data?.notYet?.length && (
        <div style={{ marginTop: 12, maxWidth: 760 }}>
          <h3 style={{ fontSize: 17, fontWeight: 500, margin: "0 0 8px" }}>Not done yet</h3>
          <ul style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 0 18px", listStyle: "disc" }}>
            {data.notYet.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
