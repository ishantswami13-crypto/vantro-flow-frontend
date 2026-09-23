"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowRight, FiCheck, FiLoader } from "react-icons/fi";
import { api } from "@/lib/api";

// ── Onboarding V2 — Business / Priorities / Connect / First value ──────────
//
// Rebuilt from scratch. The previous version of this page (receivables /
// collections scoring, "Call These First Today", debtor tiers, tel: calling)
// is gone — this flow is a general first-run setup, not a receivables tool.
// Visual language: reuses .atlas-page.auth-page (V32 dark tokens, same file
// as /login and /signup — app/atlas.css) rather than inventing a new style.
//
// Progress persistence: sessionStorage only (not server-persisted per-field
// while typing). Chosen over full server persistence because every stage's
// data is only durably saved on that stage's own "Continue" (a real API
// call to /api/onboarding/business or /priorities), so a refresh loses at
// most the fields on the stage currently being typed, never a completed
// stage — sessionStorage's job is just to restore which stage + fields the
// user was on, not to be the system of record.

const SS_KEY = "vantro_onboarding_draft";

type Role = "Founder/CEO" | "Finance" | "Operations" | "Sales" | "Procurement" | "Technology" | "Other";
const ROLES: Role[] = ["Founder/CEO", "Finance", "Operations", "Sales", "Procurement", "Technology", "Other"];

const COUNTRIES = ["India", "United States", "United Kingdom", "United Arab Emirates", "Singapore", "Other"];

const PRIORITIES = [
  { key: "cash", label: "Cash & liquidity" },
  { key: "receivables", label: "Customers & receivables" },
  { key: "revenue", label: "Sales & revenue" },
  { key: "inventory", label: "Inventory" },
  { key: "suppliers", label: "Suppliers & procurement" },
  { key: "risk", label: "Operational risk" },
  { key: "world", label: "External / world risk" },
  { key: "forecasting", label: "Forecasting" },
];

const iBase: React.CSSProperties = { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 7, padding: "13px 16px", fontFamily: "'Plus Jakarta Sans',system-ui", fontSize: 15, color: "#F5F4F0", outline: "none", width: "100%", transition: "border-color .2s,background .2s" };
const iFocus: React.CSSProperties = { ...iBase, borderColor: "rgba(255,255,255,.34)", background: "rgba(255,255,255,.08)" };

function FocusInput(p: React.InputHTMLAttributes<HTMLInputElement>) {
  const [f, setF] = useState(false);
  return <input {...p} onFocus={(e) => { setF(true); p.onFocus?.(e); }} onBlur={(e) => { setF(false); p.onBlur?.(e); }} style={{ ...(f ? iFocus : iBase), ...(p.style || {}) }} />;
}

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-dim"
      style={{
        textAlign: "left", padding: "13px 16px", borderRadius: 7, cursor: "pointer",
        border: `1px solid ${selected ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.12)"}`,
        background: selected ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.03)",
        color: "#F5F4F0", fontSize: 14, fontFamily: "'Plus Jakarta Sans',system-ui",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        transition: "border-color .15s, background .15s", width: "100%",
      }}
    >
      <span>{children}</span>
      {selected && <FiCheck size={15} style={{ color: "#10D98A", flexShrink: 0 }} />}
    </button>
  );
}

type Stage = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<Stage>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Stage 1 — Business
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [country, setCountry] = useState("India");
  const [role, setRole] = useState<Role | "">("");

  // Stage 2 — Priorities
  const [priorities, setPriorities] = useState<string[]>([]);

  // Stage 3 — Connect
  const [enrollment, setEnrollment] = useState<{ code: string; expiresAt: string } | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stage 4 — First value
  const [businessState, setBusinessState] = useState<any>(null);
  const [stateLoading, setStateLoading] = useState(false);

  // ── Load existing state + resume draft on mount ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.onboarding.state();
        if (res.onboarding_done || res.hasBusinessData) {
          // Already onboarded, or an existing account with real data
          // (e.g. Kumar Traders) — never force this flow on them.
          router.replace("/dashboard");
          return;
        }
        if (res.profile.company_name) setCompanyName(res.profile.company_name);
        if (res.profile.company_website) setCompanyWebsite(res.profile.company_website);
        if (res.profile.country) setCountry(res.profile.country);
        if (res.profile.role) setRole(res.profile.role as Role);
        if (res.priority_areas?.length) setPriorities(res.priority_areas);

        try {
          const raw = sessionStorage.getItem(SS_KEY);
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft.stage) setStage(draft.stage);
            if (draft.companyName) setCompanyName(draft.companyName);
            if (draft.companyWebsite) setCompanyWebsite(draft.companyWebsite);
            if (draft.country) setCountry(draft.country);
            if (draft.role) setRole(draft.role);
            if (draft.priorities) setPriorities(draft.priorities);
          }
        } catch { /* sessionStorage unavailable — fine, just no resume */ }
      } catch {
        // If the state check itself fails, fail open into the flow rather
        // than blocking a new user from ever reaching onboarding.
      } finally {
        setReady(true);
      }
    })();
  }, [router]);

  // Persist a lightweight draft as the user progresses (see note at top).
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ stage, companyName, companyWebsite, country, role, priorities }));
    } catch { /* ignore */ }
  }, [ready, stage, companyName, companyWebsite, country, role, priorities]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const togglePriority = (key: string) => {
    setPriorities((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  };

  async function submitStage1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!companyName.trim()) { setError("Company name is required"); return; }
    if (!country.trim()) { setError("Country is required"); return; }
    setLoading(true);
    try {
      await api.onboarding.saveBusiness({ company_name: companyName.trim(), company_website: companyWebsite.trim() || undefined, country, job_role: role || undefined });
      setStage(2);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Could not save — try again"); }
    finally { setLoading(false); }
  }

  async function submitStage2(letDecide: boolean) {
    setError(""); setLoading(true);
    try {
      await api.onboarding.savePriorities(letDecide ? [] : priorities);
      setStage(3);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Could not save — try again"); }
    finally { setLoading(false); }
  }

  async function startTallyEnrollment() {
    setError(""); setEnrolling(true);
    try {
      const res = await api.connections.enrollTally();
      setEnrollment({ code: res.enrollmentCode, expiresAt: res.expiresAt });
      // Poll the real devices list — the only honest signal that the
      // separate local Tally connector actually claimed this enrollment.
      // No fabricated progress steps: just an indeterminate spinner until
      // a real device row shows up, then a real checkmark.
      pollRef.current = setInterval(async () => {
        try {
          const d = await api.connections.tallyDevices();
          if (d.devices?.some((dev) => !dev.revoked_at)) {
            setDeviceConnected(true);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch { /* keep polling silently */ }
      }, 4000);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Could not start enrollment"); }
    finally { setEnrolling(false); }
  }

  async function finishOnboarding() {
    setLoading(true);
    try {
      await api.onboarding.complete();
      try { sessionStorage.removeItem(SS_KEY); } catch { /* ignore */ }
      setStage(4);
      setStateLoading(true);
      try {
        const res = await api.businessState();
        setBusinessState(res.businessState);
      } catch { setBusinessState(null); }
      finally { setStateLoading(false); }
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Could not finish — try again"); }
    finally { setLoading(false); }
  }

  const goToWorkspace = () => router.push("/dashboard");

  if (!ready) {
    return (
      <div className="atlas-page auth-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <FiLoader className="spin" size={22} style={{ color: "rgba(255,255,255,.4)" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin .8s linear infinite}`}</style>
      </div>
    );
  }

  const rankedActions: any[] = Array.isArray(businessState?.rankedActions) ? businessState.rankedActions : [];
  const topItems = rankedActions.slice(0, 3);

  return (
    <div className="atlas-page auth-page">
      <header className="topbar">
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#fff" }}>
          <span className="brand-wm">Starlane</span>
        </Link>
        <div className="topbar-right">
          {stage < 4 && <button onClick={goToWorkspace} className="hover-dim" style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>I&apos;ll do this later</button>}
        </div>
      </header>

      <main className="center fade-once" style={{ maxWidth: stage === 4 ? 640 : 480, margin: "0 auto", width: "100%" }}>
        {/* Stage progress */}
        <div className="progress" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ height: 3, flex: 1, borderRadius: 2, background: stage >= n ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.12)", transition: "background .3s" }} />
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 6, background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.2)", fontSize: 13, color: "rgba(255,100,100,.9)" }}>
            {error}
          </div>
        )}

        {/* ── Stage 1: Business ─────────────────────────────────────────── */}
        {stage === 1 && (
          <form onSubmit={submitStage1}>
            <div className="auth-head">
              <h1>Let Starlane understand your business.</h1>
              <p>Start with the basics. We&apos;ll learn the rest from your data.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field"><label>Company name</label><FocusInput type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required autoFocus /></div>
              <div className="field"><label>Company website (optional)</label><FocusInput type="url" placeholder="https://" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} /></div>
              <div className="field">
                <label>Country</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...iBase, cursor: "pointer" }} required>
                  {COUNTRIES.map((c) => <option key={c} value={c} style={{ background: "#1B1B18" }}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Your role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ ...iBase, cursor: "pointer", color: role ? "#fff" : "rgba(255,255,255,.35)" }}>
                  <option value="" style={{ background: "#1B1B18" }}>Select role</option>
                  {ROLES.map((r) => <option key={r} value={r} style={{ background: "#1B1B18" }}>{r}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-main" disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
                <span className="btn-txt">{loading ? "Saving…" : "Continue"}</span>
                {!loading && <FiArrowRight size={16} />}
              </button>
            </div>
          </form>
        )}

        {/* ── Stage 2: Priorities ───────────────────────────────────────── */}
        {stage === 2 && (
          <div>
            <div className="auth-head">
              <h1>What should Starlane understand first?</h1>
              <p>Choose what matters right now. You can change this later.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              {PRIORITIES.map((p) => (
                <OptionCard key={p.key} selected={priorities.includes(p.key)} onClick={() => togglePriority(p.key)}>{p.label}</OptionCard>
              ))}
            </div>
            <div className="btn-row" style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn-back" onClick={() => setStage(1)}>Back</button>
              <button type="button" className="btn-main" disabled={loading} onClick={() => submitStage2(false)} style={{ opacity: loading ? 0.6 : 1, flex: 1 }}>
                <span className="btn-txt">Continue</span><FiArrowRight size={16} />
              </button>
            </div>
            <button type="button" onClick={() => submitStage2(true)} disabled={loading} className="hover-dim" style={{ marginTop: 14, width: "100%", background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textAlign: "center" }}>
              Let Starlane decide
            </button>
          </div>
        )}

        {/* ── Stage 3: Connect ──────────────────────────────────────────── */}
        {stage === 3 && (
          <div>
            <div className="auth-head">
              <h1>Where does your business already live?</h1>
              <p>Connect a source and let Starlane build the picture.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {/* Tally — real, wired to the actual device-enrollment flow */}
              <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: enrollment ? 14 : 0 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Tally</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Connect your Tally install via the local connector</div>
                  </div>
                  {!enrollment && (
                    <button type="button" className="btn-back" disabled={enrolling} onClick={startTallyEnrollment} style={{ whiteSpace: "nowrap" }}>
                      {enrolling ? "Starting…" : "Connect"}
                    </button>
                  )}
                </div>
                {enrollment && (
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, letterSpacing: "0.08em", padding: "10px 14px", background: "rgba(255,255,255,.05)", borderRadius: 6, textAlign: "center", marginBottom: 10 }}>
                      {enrollment.code}
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 10 }}>
                      Enter this code in the Starlane Tally connector on your machine. Expires {new Date(enrollment.expiresAt).toLocaleTimeString()}.
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      {deviceConnected ? (
                        <><FiCheck size={14} style={{ color: "#10D98A" }} /> <span style={{ color: "#10D98A" }}>Enrollment complete</span></>
                      ) : (
                        <><FiLoader size={13} className="spin" style={{ color: "rgba(255,255,255,.4)" }} /> <span style={{ color: "rgba(255,255,255,.4)" }}>Waiting for the connector to claim this code…</span></>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CSV / Excel import — real, wired to /api/import/excel */}
              <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>File import (CSV / Excel)</div>
                  <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Import customers, sales or purchase records from a spreadsheet</div>
                </div>
                <Link href="/settings?import=1" className="btn-back" style={{ whiteSpace: "nowrap", textDecoration: "none", display: "inline-block" }}>Import</Link>
              </div>
            </div>

            <div className="btn-row" style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn-back" onClick={() => setStage(2)}>Back</button>
              <button type="button" className="btn-main" disabled={loading} onClick={finishOnboarding} style={{ opacity: loading ? 0.6 : 1, flex: 1 }}>
                <span className="btn-txt">{loading ? "Finishing…" : "Continue"}</span>{!loading && <FiArrowRight size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* ── Stage 4: First value moment ───────────────────────────────── */}
        {stage === 4 && (
          <div>
            <div className="auth-head">
              <h1>{stateLoading ? "Your business is coming into focus." : "Here's what deserves your attention."}</h1>
              <p>{stateLoading ? "Reading what we know so far." : "Ranked from real data in your account — nothing here is a guess."}</p>
            </div>

            {stateLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "24px 0", color: "rgba(255,255,255,.4)", fontSize: 13 }}>
                <FiLoader className="spin" size={16} /> Loading business state…
              </div>
            )}

            {!stateLoading && topItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {topItems.map((item: any, i: number) => (
                  <div key={item.id || i} style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.title || item.summary || item.description || item.related_entity_name || "Action needed"}</div>
                      {(item.priority || item.severity) && <span style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: "rgba(255,255,255,.4)" }}>{item.priority || item.severity}</span>}
                    </div>
                    {item.reason && <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)", marginTop: 6 }}>{item.reason}</div>}
                    {(item.amount || item.due_date || item.related_entity_name) && (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 8, display: "flex", gap: 14 }}>
                        {item.amount && <span>₹{Number(item.amount).toLocaleString("en-IN")}</span>}
                        {item.due_date && <span>{new Date(item.due_date).toLocaleDateString()}</span>}
                        {item.related_entity_name && <span>{item.related_entity_name}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!stateLoading && topItems.length === 0 && (
              <div style={{ padding: "20px 0 24px", color: "rgba(255,255,255,.55)", fontSize: 14.5, lineHeight: 1.6 }}>
                We need a little more business history before Starlane can rank what matters.
              </div>
            )}

            <div className="btn-row" style={{ display: "flex", gap: 10 }}>
              {topItems.length === 0 && !stateLoading && (
                <button type="button" className="btn-back" onClick={() => setStage(3)}>Connect another source</button>
              )}
              <button type="button" className="btn-main" onClick={goToWorkspace} style={{ flex: 1 }}>
                <span className="btn-txt">Continue to workspace</span><FiArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="page-foot">
        <span>&copy; 2026 Starlane</span>
      </footer>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .spin{animation:spin .8s linear infinite}`}</style>
    </div>
  );
}
