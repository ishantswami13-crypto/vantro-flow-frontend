"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PublicShell } from "@/components/marketing/PublicShell";
import { accessApi, tokenFromHash, TIER_TONE, type ApplicationStatus } from "@/lib/access";

// Application status, via the private link from submission (#token=...).
// The token lives in the URL fragment, so it is never sent in a request line
// or Referer; the page sends it in a header.

const STATUS_COPY: Record<ApplicationStatus["status"], { label: string; tone: "ok" | "warn" | "bad" | ""; body: string }> = {
  submitted: { label: "Submitted", tone: "", body: "Your application is in the queue. A person reviews each one." },
  reviewing: { label: "In review", tone: "warn", body: "We are reviewing your application and may contact you about onboarding." },
  approved: { label: "Approved", tone: "ok", body: "You’re approved. Your private setup page has the download and next steps; its link comes to you by email or directly from our team." },
  waitlisted: { label: "Waitlisted", tone: "warn", body: "We can’t onboard your company yet. We’ll contact you when that changes." },
  rejected: { label: "Not a fit right now", tone: "bad", body: "Starlane isn’t the right fit for your company at this stage." },
  expired: { label: "Expired", tone: "", body: "Your access link expired. Contact us if you would still like to proceed." },
};

export default function AccessStatusPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<{ loading: boolean; app?: ApplicationStatus; error?: string }>({ loading: true });

  const load = useCallback(async (t: string) => {
    setState({ loading: true });
    try {
      const { status, body } = await accessApi.status(t);
      if (status === 200 && body.application) setState({ loading: false, app: body.application });
      else setState({ loading: false, error: status === 404 ? "This status link isn’t valid. Use the exact link from your application." : body.error || "Could not load your status." });
    } catch {
      setState({ loading: false, error: "Could not reach Starlane. Check your connection and try again." });
    }
  }, []);

  useEffect(() => {
    const t = tokenFromHash();
    setToken(t);
    if (t) load(t); else setState({ loading: false });
  }, [load]);

  return (
    <PublicShell>
      <div className="sl-form-wrap" aria-live="polite">
        <span className="sl-eyebrow">Application status</span>

        {state.loading && (
          <div aria-busy="true">
            <div className="sl-skeleton" style={{ height: 44, width: "70%", marginBottom: 20 }} />
            <div className="sl-skeleton" style={{ height: 140 }} />
          </div>
        )}

        {!state.loading && !token && (
          <>
            <h1 className="sl-h2">Open the link from your application.</h1>
            <p className="sl-p" style={{ marginTop: 14, maxWidth: 560 }}>
              Your status page is private: it opens from the link shown when you applied (and emailed to you, where email is set up).
              For privacy there is no lookup by email address.
            </p>
            <div className="sl-hero-ctas"><Link className="sl-btn sl-btn-solid" href="/access">Request access</Link></div>
          </>
        )}

        {!state.loading && state.error && (
          <>
            <h1 className="sl-h2">We couldn’t load this application.</h1>
            <p className="sl-alert err" role="alert" style={{ marginTop: 20 }}>{state.error}</p>
            {token && <div className="sl-hero-ctas"><button className="sl-btn sl-btn-outline" onClick={() => load(token)}>Try again</button></div>}
          </>
        )}

        {!state.loading && state.app && (() => {
          const a = state.app;
          const c = STATUS_COPY[a.status];
          return (
            <>
              <h1 className="sl-h2">{a.company}</h1>
              <p className="sl-p" style={{ marginTop: 6 }}>Applied as {a.email} on {new Date(a.submittedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>
              <div className="sl-panel" style={{ marginTop: 28 }}>
                <span className={`sl-badge ${c.tone}`}>{c.label}</span>
                <p className="sl-sub" style={{ marginTop: 14 }}>{c.body}</p>
                {a.reviewNote && <p className="sl-p" style={{ marginTop: 12, borderLeft: "2px solid var(--sl-line-2)", paddingLeft: 14 }}>{a.reviewNote}</p>}
                {a.status === "approved" && !a.downloadReady && (
                  <p className="sl-alert" style={{ marginTop: 16 }}>Your setup link has expired or was replaced. Ask us for a new one.</p>
                )}
              </div>
              <div className="sl-panel" style={{ marginTop: 16 }}>
                <p className="sl-h3" style={{ fontSize: 16 }}>Compatibility assessment</p>
                <span className={`sl-badge ${TIER_TONE[a.eligibility.tier]}`} style={{ marginTop: 12 }}>{a.eligibility.label}</span>
                <ul className="sl-reasons">{a.eligibility.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                <p style={{ fontSize: 12, marginTop: 14, color: "var(--sl-ink-faint)" }}>Assessed by fixed rules ({a.eligibility.rules_version}) when you applied.</p>
              </div>
            </>
          );
        })()}
      </div>
    </PublicShell>
  );
}
