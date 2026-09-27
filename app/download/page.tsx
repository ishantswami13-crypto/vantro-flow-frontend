"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/marketing/PublicShell";
import { accessApi, tokenFromHash, type Artifact } from "@/lib/access";

// Private setup page for approved applicants (#token=<entitlement>).
// Shows only what genuinely exists: the Tally bridge is a real file with a
// published checksum; desktop builds say "not published yet" until a signed
// build is configured on the server. Every download is recorded server-side.

type Loaded = { company?: string; name?: string; expiresAt?: string; artifacts: Artifact[] };

export default function DownloadPage() {
  const [token, setToken] = useState("");
  const [state, setState] = useState<{ loading: boolean; data?: Loaded; error?: string }>({ loading: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [dlError, setDlError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const t = tokenFromHash();
    setToken(t);
    if (!t) { setState({ loading: false, error: "Open this page from the link in your approval email or status page." }); return; }
    accessApi.downloads(t)
      .then(({ status, body }) => {
        if (status === 200 && body.artifacts) setState({ loading: false, data: { company: body.company, name: body.name, expiresAt: body.expiresAt, artifacts: body.artifacts } });
        else setState({ loading: false, error: body.error || "This link is not valid." });
      })
      .catch(() => setState({ loading: false, error: "Could not reach Starlane. Check your connection and try again." }));
  }, []);

  const download = async (a: Artifact) => {
    setBusy(a.id); setDlError(null);
    try {
      const r = await accessApi.download(token, a.id);
      if (!r.ok) { setDlError(r.error); return; }
      if (r.url) { window.location.assign(r.url); return; }
      if (r.blob) {
        const href = URL.createObjectURL(r.blob);
        const link = document.createElement("a");
        link.href = href; link.download = r.filename || a.filename || a.id;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
        setDone(a.id);
      }
    } catch {
      setDlError("Download failed. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const bridge = state.data?.artifacts.find((a) => a.id === "tally-bridge");
  const desktop = state.data?.artifacts.filter((a) => a.kind === "desktop") || [];

  return (
    <PublicShell>
      <div className="sl-form-wrap" style={{ maxWidth: 860 }}>
        <span className="sl-eyebrow">Setup</span>
        {state.loading && <div aria-busy="true"><div className="sl-skeleton" style={{ height: 44, width: "60%", marginBottom: 20 }} /><div className="sl-skeleton" style={{ height: 200 }} /></div>}

        {!state.loading && state.error && (
          <>
            <h1 className="sl-h2">This setup link can’t be used.</h1>
            <p className="sl-alert err" role="alert" style={{ marginTop: 20 }}>{state.error}</p>
            <p className="sl-p" style={{ marginTop: 16 }}>Links expire and are replaced when a new one is issued. <Link href="/access/status" style={{ textDecoration: "underline" }}>Check your application</Link> or ask us for a new link.</p>
          </>
        )}

        {!state.loading && state.data && (
          <>
            <h1 className="sl-h2">Welcome{state.data.name ? `, ${state.data.name.split(" ")[0]}` : ""}. Let’s connect {state.data.company}.</h1>
            <p className="sl-p" style={{ marginTop: 12 }}>
              This page is private to you{state.data.expiresAt ? ` and works until ${new Date(state.data.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "long" })}` : ""}.
            </p>
            {dlError && <p className="sl-alert err" role="alert" style={{ marginTop: 20 }}>{dlError}</p>}

            <ol style={{ listStyle: "none", padding: 0, margin: "36px 0 0", display: "grid", gap: 16 }}>
              <li className="sl-panel">
                <span className="sl-eyebrow" style={{ marginBottom: 10 }}>Step 1</span>
                <p className="sl-h3">Create your Starlane account</p>
                <p className="sl-p" style={{ marginTop: 8 }}>Use the same email address you applied with. Starlane runs in your browser.</p>
                <div className="sl-hero-ctas" style={{ marginTop: 16 }}><Link className="sl-btn sl-btn-solid" href="/signup">Create account</Link><Link className="sl-link-arrow" href="/login">I already have one</Link></div>
              </li>

              {bridge && (
                <li className="sl-panel">
                  <span className="sl-eyebrow" style={{ marginBottom: 10 }}>Step 2 · if you use TallyPrime</span>
                  <p className="sl-h3">Install the Starlane Tally bridge</p>
                  <p className="sl-p" style={{ marginTop: 8 }}>
                    A small, read-only program for the computer that runs Tally. It reads vouchers and stock from Tally’s local export port and sends them to Starlane. {bridge.requirements}
                  </p>
                  <div className="sl-hero-ctas" style={{ marginTop: 16 }}>
                    <button className="sl-btn sl-btn-solid" onClick={() => download(bridge)} disabled={busy === bridge.id} aria-busy={busy === bridge.id}>
                      {busy === bridge.id ? "Preparing…" : `Download ${bridge.filename}`}
                    </button>
                    {done === bridge.id && <span className="sl-badge ok" role="status">Downloaded</span>}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--sl-ink-faint)", marginTop: 14, wordBreak: "break-all" }}>
                    SHA-256 <span className="sl-num">{bridge.sha256}</span>{bridge.bytes ? ` · ${(bridge.bytes / 1024).toFixed(0)} KB` : ""}
                  </p>
                  <details style={{ marginTop: 16 }}>
                    <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>How pairing works</summary>
                    <ol className="sl-reasons" style={{ marginTop: 12 }}>
                      <li>In TallyPrime, enable the XML server: F1 › Settings › Connectivity, port 9000.</li>
                      <li>In Starlane, open Sources › Tally › Connect. You get a one-time pairing code that expires in 10 minutes, with the exact command to run.</li>
                      <li>Run that command in the folder where you saved the bridge. It pairs this computer with its own revocable credential — your password never leaves Starlane.</li>
                      <li>Leave <span className="sl-num">node tally-sync.mjs --watch</span> running to sync every 30 minutes.</li>
                    </ol>
                  </details>
                </li>
              )}

              <li className="sl-panel">
                <span className="sl-eyebrow" style={{ marginBottom: 10 }}>Step 2 · any other system</span>
                <p className="sl-h3">Upload an export</p>
                <p className="sl-p" style={{ marginTop: 8 }}>Export invoices from your system as CSV or Excel and upload them from Sources after signing in. Identical files are never imported twice.</p>
              </li>

              {desktop.length > 0 && (
                <li className="sl-panel">
                  <span className="sl-eyebrow" style={{ marginBottom: 10 }}>Desktop app</span>
                  <p className="sl-h3">Starlane for desktop</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 10 }}>
                    {desktop.map((a) => (
                      <li key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="sl-p" style={{ color: "var(--sl-ink)" }}>{a.name}</span>
                        {a.available
                          ? <button className="sl-btn sl-btn-outline" onClick={() => download(a)} disabled={busy === a.id}>Download</button>
                          : <span className="sl-badge">Not published yet</span>}
                      </li>
                    ))}
                  </ul>
                  {desktop.every((a) => !a.available) && <p className="sl-p" style={{ marginTop: 12, fontSize: 14 }}>{desktop[0].note}</p>}
                </li>
              )}
            </ol>
          </>
        )}
      </div>
    </PublicShell>
  );
}
