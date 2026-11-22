"use client";

// The compliance frameworks and their honest status, read from the backend
// (GET /api/trust, lib/platform/security/frameworks.js). The page can never
// say more than that file. If the API cannot be reached, the fallback says
// the same thing in fewer words: no certification is held.

import { useEffect, useState } from "react";
import { fetchTrust, type PublicFramework } from "@/lib/platform";

const FALLBACK = "Starlane holds no security certification or audit report today: not SOC 2, ISO 27001, ISO 27701, ISO 42001, AIUC-1 or FedRAMP. For GDPR, CCPA and India's DPDP Act, the product is designed to align; that has not been independently assessed.";

export function TrustFrameworks() {
  const [data, setData] = useState<{ frameworks: PublicFramework[]; statement: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fetchTrust().then(setData).catch(() => setFailed(true)); }, []);
  return (
    <div>
      <p className="hx-b1" style={{ maxWidth: 760, marginBottom: 24 }}>{data?.statement || FALLBACK}</p>
      {!data && !failed && <p className="hx-b1" style={{ opacity: 0.6 }}>Loading the current status…</p>}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 16 }}>
          {data.frameworks.map((f) => (
            <details key={f.key} style={{ border: "1px solid rgba(25,25,23,0.12)", borderRadius: 10, padding: "16px 18px", background: "rgba(255,255,255,0.6)" }}>
              <summary style={{ cursor: "pointer", listStyle: "none" }}>
                <div style={{ fontSize: 17, fontWeight: 500 }}>{f.name}</div>
                <div style={{ fontSize: 13, marginTop: 6, color: "#6B5020" }}>{f.statusLabel}</div>
              </summary>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 10 }}>{f.what}</p>
              {f.grantedBy && <p style={{ fontSize: 13, lineHeight: 1.5, marginTop: 6, opacity: 0.75 }}>Granted by: {f.grantedBy}</p>}
              {f.stillNeeded.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 10 }}>Still needed</div>
                  <ul style={{ fontSize: 13, lineHeight: 1.55, margin: "4px 0 0 18px", listStyle: "disc" }}>
                    {f.stillNeeded.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
