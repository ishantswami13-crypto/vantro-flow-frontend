"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/marketing/PublicShell";
import { accessApi, TIER_TONE, type ApplicationInput, type CatalogConnector, type SubmitResult } from "@/lib/access";

// Request access — three short steps, then an immediate, explained result.
// The assessment shown is produced by the backend's deterministic rules
// (lib/access/eligibility.js) and says so; nothing here pretends to be an
// AI evaluation.

const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const COUNTRIES = ["IN", "AE", "SA", "SG", "MY", "ID", "BD", "LK", "NP", "KE", "NG", "ZA", "GB", "IE", "DE", "FR", "NL", "US", "CA", "AU", "NZ"];
const CATEGORY_LABEL: Record<string, string> = {
  accounting: "Accounting", spreadsheets: "Spreadsheets", banking: "Banking", crm: "CRM", ecommerce: "E-commerce",
  erp: "ERP", logistics: "Logistics", support: "Support", inventory: "Inventory", communication: "Communication",
};
const STEPS = ["Company", "Systems", "Goals"] as const;

const EMPTY: ApplicationInput = {
  name: "", email: "", company: "", website: "", role: "", companySize: "", industry: "", country: "IN",
  systems: [], otherSystems: "", willConnectSystems: null, problem: "", desiredOutcome: "", notes: "", companyFax: "",
};

// Client-side checks mirror the server's (lib/access/validation.js) for fast
// feedback; the server remains the authority and its field errors are shown.
function stepErrors(step: number, v: ApplicationInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (v.name.trim().length < 2) e.name = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "Enter a valid work email";
    if (v.company.trim().length < 2) e.company = "Company is required";
    if (v.role.trim().length < 2) e.role = "Role is required";
    if (!v.companySize) e.companySize = "Choose a company size";
    if (v.industry.trim().length < 2) e.industry = "Industry is required";
    if (!v.country) e.country = "Choose a country";
  }
  if (step === 1) {
    if (!v.systems.length && !v.otherSystems.trim()) e.systems = "Tell us at least one system your company uses";
    if (v.willConnectSystems === null) e.willConnectSystems = "Choose yes or no";
  }
  if (step === 2) {
    if (v.problem.trim().length < 20) e.problem = "A sentence or two, please (at least 20 characters)";
    if (v.desiredOutcome.trim().length < 10) e.desiredOutcome = "At least 10 characters";
  }
  return e;
}

export default function RequestAccessPage() {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<ApplicationInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<CatalogConnector[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    accessApi.catalog()
      .then(({ body }) => (body.success ? setCatalog(body.connectors) : setCatalogError(true)))
      .catch(() => setCatalogError(true));
  }, []);

  useEffect(() => { headingRef.current?.focus(); }, [step, result]);

  const grouped = useMemo(() => {
    const list = (catalog || []).filter((c) => c.authType !== "public_feed");
    const order = ["accounting", "spreadsheets", "banking", "erp", "crm", "ecommerce", "logistics", "support"];
    return order.map((cat) => ({ cat, items: list.filter((c) => c.category === cat) })).filter((g) => g.items.length);
  }, [catalog]);

  const regionNames = useMemo(() => {
    try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; }
  }, []);

  const set = <K extends keyof ApplicationInput>(k: K, val: ApplicationInput[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errors[k as string]) setErrors((p) => { const n = { ...p }; delete n[k as string]; return n; });
  };
  const toggleSystem = (id: string) =>
    set("systems", v.systems.includes(id) ? v.systems.filter((s) => s !== id) : [...v.systems, id]);

  const next = () => {
    const e = stepErrors(step, v);
    setErrors(e);
    if (Object.keys(e).length) { document.getElementById(`f-${Object.keys(e)[0]}`)?.focus(); return; }
    setStep((s) => s + 1);
  };

  const submit = async () => {
    const e = stepErrors(2, v);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const { status, body } = await accessApi.submit(v);
      if (status === 400 && body.fields) {
        setErrors(body.fields);
        setStep(Math.min(...Object.keys(body.fields).map(fieldStep)));
        setSubmitError(body.error || "Please correct the highlighted fields");
      } else if (status === 429) {
        setSubmitError(body.error || "Too many applications from this network. Please try again later.");
      } else if (!body.success) {
        setSubmitError(body.error || "Something went wrong. Please try again.");
      } else {
        setResult(body);
      }
    } catch {
      setSubmitError("Could not reach Starlane. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) return <PublicShell><Result result={result} headingRef={headingRef} /></PublicShell>;

  const err = (k: string) => errors[k] ? <span className="sl-err" id={`e-${k}`}>{errors[k]}</span> : null;
  const aria = (k: string) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `e-${k}` : undefined, id: `f-${k}` });

  return (
    <PublicShell>
      <div className="sl-form-wrap">
        <span className="sl-eyebrow">Request access</span>
        <h1 className="sl-h2" tabIndex={-1} ref={headingRef}>
          {step === 0 && "Tell us about your company."}
          {step === 1 && "What does your company run on?"}
          {step === 2 && "What should Starlane improve?"}
        </h1>
        <p className="sl-p" style={{ marginTop: 12 }}>
          {step === 0 && "Starlane is onboarding a small number of companies at a time. This takes about three minutes."}
          {step === 1 && "This decides what Starlane can connect to on day one. We tell you straight away if something isn't supported yet."}
          {step === 2 && "Be specific — the more concrete the problem, the better we can tell whether Starlane will help."}
        </p>

        <ol className="sl-steps" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? "on" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined}>
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        {submitError && <p className="sl-alert err" role="alert" style={{ marginBottom: 24 }}>{submitError}</p>}

        <form onSubmit={(e) => { e.preventDefault(); if (step < 2) next(); else submit(); }} noValidate>
          {/* Honeypot — hidden from people and assistive tech. */}
          <div className="sl-hp" aria-hidden="true">
            <label htmlFor="companyFax">Company fax</label>
            <input id="companyFax" tabIndex={-1} autoComplete="off" value={v.companyFax} onChange={(e) => set("companyFax", e.target.value)} />
          </div>

          {step === 0 && (
            <>
              <div className="sl-row2">
                <div className="sl-field"><label htmlFor="f-name">Your name</label><input className="sl-input" autoComplete="name" value={v.name} onChange={(e) => set("name", e.target.value)} {...aria("name")} />{err("name")}</div>
                <div className="sl-field"><label htmlFor="f-email">Work email</label><input className="sl-input" type="email" autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} {...aria("email")} />{err("email")}</div>
              </div>
              <div className="sl-row2">
                <div className="sl-field"><label htmlFor="f-company">Company</label><input className="sl-input" autoComplete="organization" value={v.company} onChange={(e) => set("company", e.target.value)} {...aria("company")} />{err("company")}</div>
                <div className="sl-field"><label htmlFor="f-website">Website <span className="sl-hint">(optional)</span></label><input className="sl-input" inputMode="url" autoComplete="url" placeholder="example.com" value={v.website} onChange={(e) => set("website", e.target.value)} {...aria("website")} />{err("website")}</div>
              </div>
              <div className="sl-row2">
                <div className="sl-field"><label htmlFor="f-role">Your role</label><input className="sl-input" autoComplete="organization-title" placeholder="Owner, CFO, Operations head…" value={v.role} onChange={(e) => set("role", e.target.value)} {...aria("role")} />{err("role")}</div>
                <div className="sl-field"><label htmlFor="f-industry">Industry</label><input className="sl-input" placeholder="Distribution, manufacturing, retail…" value={v.industry} onChange={(e) => set("industry", e.target.value)} {...aria("industry")} />{err("industry")}</div>
              </div>
              <div className="sl-row2">
                <div className="sl-field">
                  <label htmlFor="f-companySize">Company size</label>
                  <select className="sl-select" value={v.companySize} onChange={(e) => set("companySize", e.target.value)} {...aria("companySize")}>
                    <option value="">Choose…</option>
                    {SIZES.map((s) => <option key={s} value={s}>{s} people</option>)}
                  </select>{err("companySize")}
                </div>
                <div className="sl-field">
                  <label htmlFor="f-country">Country</label>
                  <select className="sl-select" value={v.country} onChange={(e) => set("country", e.target.value)} {...aria("country")}>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{regionNames?.of(c) || c}</option>)}
                  </select>{err("country")}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <fieldset className="sl-fieldset" aria-describedby={errors.systems ? "e-systems" : undefined}>
                <legend className="sl-field" style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 10 }}>Systems your company uses</legend>
                {catalog === null && !catalogError && (
                  <div className="sl-choices" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="sl-skeleton" style={{ height: 46 }} />)}</div>
                )}
                {catalogError && <p className="sl-alert" style={{ marginBottom: 12 }}>The systems list could not be loaded. Describe what you use below instead.</p>}
                {grouped.map((g) => (
                  <div key={g.cat} style={{ marginBottom: 16 }}>
                    <p className="sl-hint" style={{ fontSize: 12, marginBottom: 6, color: "var(--sl-ink-faint)" }}>{CATEGORY_LABEL[g.cat] || g.cat}</p>
                    <div className="sl-choices">
                      {g.items.map((c) => (
                        <label key={c.id} className="sl-choice">
                          <input type="checkbox" id={c.id === g.items[0].id && g.cat === grouped[0].cat ? "f-systems" : undefined}
                            checked={v.systems.includes(c.id)} onChange={() => toggleSystem(c.id)} />
                          <span>{c.name}<small>{c.availability === "available" ? "Connects today" : "Not connectable yet"}</small></span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {err("systems")}
              </fieldset>
              <div className="sl-field">
                <label htmlFor="f-otherSystems">Anything else? <span className="sl-hint">(optional)</span></label>
                <input className="sl-input" placeholder="e.g. Marg ERP, Busy, an in-house system" value={v.otherSystems} onChange={(e) => set("otherSystems", e.target.value)} {...aria("otherSystems")} />
                {err("otherSystems")}
              </div>
              <fieldset className="sl-fieldset">
                <legend style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>Are you ready to connect your real company systems?</legend>
                <p className="sl-hint" style={{ fontSize: 12.5, color: "var(--sl-ink-faint)", marginBottom: 10 }}>Starlane works from your actual books and records, not sample data. Access is read-only unless you approve an action.</p>
                <div className="sl-choices" id="f-willConnectSystems">
                  <label className="sl-choice"><input type="radio" name="willConnect" checked={v.willConnectSystems === true} onChange={() => set("willConnectSystems", true)} /><span>Yes, when onboarding starts</span></label>
                  <label className="sl-choice"><input type="radio" name="willConnect" checked={v.willConnectSystems === false} onChange={() => set("willConnectSystems", false)} /><span>Not yet</span></label>
                </div>
                {err("willConnectSystems")}
              </fieldset>
            </>
          )}

          {step === 2 && (
            <>
              <div className="sl-field">
                <label htmlFor="f-problem">What is the biggest operational or financial decision you struggle with today?</label>
                <textarea className="sl-textarea" placeholder="e.g. We don't know which customers will actually pay this month, so we can't plan supplier payments." value={v.problem} onChange={(e) => set("problem", e.target.value)} {...aria("problem")} />
                {err("problem")}
              </div>
              <div className="sl-field">
                <label htmlFor="f-desiredOutcome">What would a good outcome look like in 60 days?</label>
                <textarea className="sl-textarea" style={{ minHeight: 84 }} placeholder="e.g. Receivables older than 30 days cut in half without losing key customers." value={v.desiredOutcome} onChange={(e) => set("desiredOutcome", e.target.value)} {...aria("desiredOutcome")} />
                {err("desiredOutcome")}
              </div>
              <div className="sl-field">
                <label htmlFor="f-notes">Anything else we should know? <span className="sl-hint">(optional)</span></label>
                <textarea className="sl-textarea" style={{ minHeight: 70 }} value={v.notes} onChange={(e) => set("notes", e.target.value)} {...aria("notes")} />
                {err("notes")}
              </div>
              <p className="sl-hint" style={{ fontSize: 12.5, color: "var(--sl-ink-faint)" }}>
                We use this only to assess and onboard your application. See our <Link href="/privacy" style={{ textDecoration: "underline" }}>privacy policy</Link>.
              </p>
            </>
          )}

          <div className="sl-form-actions">
            {step > 0 ? <button type="button" className="sl-btn sl-btn-outline" onClick={() => { setErrors({}); setStep((s) => s - 1); }}>Back</button> : <Link href="/" className="sl-link-arrow" style={{ fontWeight: 500 }}>Back to Starlane</Link>}
            <button type="submit" className="sl-btn sl-btn-solid" disabled={submitting} aria-busy={submitting}>
              {step < 2 ? "Continue" : submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </form>
      </div>
    </PublicShell>
  );
}

function fieldStep(k: string): number {
  if (["name", "email", "company", "website", "role", "companySize", "industry", "country"].includes(k)) return 0;
  if (["systems", "otherSystems", "willConnectSystems"].includes(k)) return 1;
  return 2;
}

function Result({ result, headingRef }: { result: SubmitResult; headingRef: React.RefObject<HTMLHeadingElement> }) {
  const el = result.eligibility;
  const statusHref = result.statusToken ? `/access/status#token=${result.statusToken}` : null;
  return (
    <div className="sl-form-wrap">
      <span className="sl-eyebrow">Application received</span>
      <h1 className="sl-h2" tabIndex={-1} ref={headingRef}>
        {result.duplicate ? "We already have an application for this email." : "Thank you. Here is where you stand."}
      </h1>

      {el && (
        <div className="sl-panel" style={{ marginTop: 28 }}>
          <span className={`sl-badge ${TIER_TONE[el.tier]}`}>{el.label}</span>
          <ul className="sl-reasons">{el.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="sl-hint" style={{ fontSize: 12, marginTop: 16, color: "var(--sl-ink-faint)" }}>
            Assessed by fixed, published rules ({el.rules_version}) — not by an AI. {result.downloadToken ? "" : "A person reviews every application before access is granted."}
          </p>
        </div>
      )}

      {result.downloadToken ? (
        <div style={{ marginTop: 28 }}>
          <p className="sl-sub">You’re approved. Your private setup page is ready.</p>
          <div className="sl-hero-ctas"><Link className="sl-btn sl-btn-solid" href={`/download#token=${result.downloadToken}`}>Continue to setup</Link></div>
        </div>
      ) : null}

      {statusHref && (
        <div style={{ marginTop: 28 }}>
          <p className="sl-p">
            Keep this private link to check your status at any time{result.emailed ? " — we also emailed it to you." : ". We could not email it, so bookmark it now."}
          </p>
          <div className="sl-hero-ctas" style={{ marginTop: 16 }}>
            <Link className={`sl-btn ${result.downloadToken ? "sl-btn-outline" : "sl-btn-solid"}`} href={statusHref}>Open my status page</Link>
          </div>
        </div>
      )}

      {result.duplicate && (
        <p className="sl-p" style={{ marginTop: 20 }}>
          Your first application is still active — use the status link you received with it. For privacy, this page does not show another application’s status.
        </p>
      )}
    </div>
  );
}
