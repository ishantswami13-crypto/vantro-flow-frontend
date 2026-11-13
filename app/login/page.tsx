"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiArrowRight, FiCheck } from "react-icons/fi";
import { api, saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { takePendingInvite } from "@/lib/platform";
import { SignInOptions } from "@/components/auth/SignInOptions";
import { AuthShell, AuthHead, AuthError, Spinner } from "@/components/auth/AuthShell";

// /login?app=<state> is the desktop app asking to sign in through the browser.
const APP_STATE_RE = /^[A-Za-z0-9_-]{16,64}$/;

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [step, setStep]             = useState<"email"|"password">("email");
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm]             = useState({ email: "", password: "" });
  const [emailValid, setEmailValid] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);
  const [appState, setAppState]     = useState<string | null>(null);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [handedOff, setHandedOff]   = useState<string | null>(null);

  useEffect(() => {
    const st = new URLSearchParams(window.location.search).get("app");
    if (st && APP_STATE_RE.test(st)) {
      setAppState(st);
      try { const u = JSON.parse(localStorage.getItem("vantro_user") || "null"); if (u?.email) setSignedInAs(u.email); } catch { /* not signed in */ }
    }
  }, []);

  // Hand this browser sign-in to the desktop app: a 2-minute single-use code,
  // never the session token itself.
  const openApp = async () => {
    if (!appState) return;
    setError(""); setLoading(true);
    try {
      const { code } = await api.auth.desktopHandoff(appState);
      const link = `starlane://auth/${appState}/${code}`;
      setHandedOff(link);
      window.location.href = link;
    } catch (err: unknown) {
      setSignedInAs(null);
      setError(err instanceof Error ? err.message : "Could not reach the app. Sign in again.");
    } finally { setLoading(false); }
  };

  const finishSignIn = async (data: { token: string; csrf_token?: string | null; user: any }, remember = true) => {
    await saveAuth(data.token, data.user, remember, data.csrf_token);
    posthog.identify(data.user.id, { email: data.user.email, name: data.user.business_name, plan: data.user.plan });
    posthog.capture("user_logged_in");
    if (appState) { setSignedInAs(data.user.email); await openApp(); }
    else router.push(takePendingInvite() || "/bridge");
  };

  useEffect(() => {
    const saved = localStorage.getItem("vantro_saved_email");
    if (saved) { setForm(f => ({ ...f, email: saved })); setEmailValid(true); }
  }, []);
  useEffect(() => { if (step === "password") setTimeout(() => passRef.current?.focus(), 150); }, [step]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailNext = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateEmail(form.email)) { setError("Enter a valid email address"); return; }
    setError(""); setStep("password");
  };

  const handleLogin = async (ev: React.FormEvent) => {
    ev.preventDefault(); setError(""); setLoading(true);
    try {
      const data = await api.auth.login(form);
      if (rememberMe) { localStorage.setItem("vantro_saved_email", form.email); localStorage.setItem("vantro_remember", "1"); }
      else { localStorage.removeItem("vantro_saved_email"); localStorage.removeItem("vantro_remember"); }
      await finishSignIn(data, rememberMe);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally { setLoading(false); }
  };

  return (
    <AuthShell aside={<>No account? <Link href="/signup">Create one</Link></>}>
      <AuthHead
        title={appState ? "Sign in to the app" : "Welcome back"}
        lead={step === "email"
          ? (appState ? "Sign in here and Starlane on your computer opens signed in." : "Sign in to your Starlane workspace.")
          : "Enter your password to continue."}
      />

      {error && <AuthError>{error}</AuthError>}

      {handedOff && (
        <div className="sl-auth-note good">
          You are signed in. Starlane should open on your computer now. If it did not, open it again here.
          <a className="sl-btn" href={handedOff}>Open Starlane <FiArrowRight size={16}/></a>
        </div>
      )}

      {!handedOff && appState && signedInAs && (
        <div className="sl-auth-note">
          You are already signed in as {signedInAs}.
          <button type="button" className="sl-btn" onClick={openApp} disabled={loading}>Continue to the app <FiArrowRight size={16}/></button>
        </div>
      )}

      {!handedOff && step === "email" && (
        <SignInOptions disabled={loading} onSession={(d) => { setError(""); finishSignIn(d).catch((e) => setError(e instanceof Error ? e.message : "Sign-in failed.")); }} onError={setError} />
      )}

      {!handedOff && step === "email" && (
        <form className="sl-auth-form" onSubmit={handleEmailNext} noValidate>
          <div className="sl-field">
            <label htmlFor="email">Work email</label>
            <div className="sl-input-wrap">
              <input id="email" className="sl-input" type="email" autoFocus autoComplete="email" placeholder="you@company.com"
                value={form.email}
                onChange={e=>{setForm(f=>({...f,email:e.target.value}));setEmailValid(validateEmail(e.target.value));setError("");}}
              />
              {emailValid && <span className="sl-ok" aria-hidden><FiCheck size={15}/></span>}
            </div>
          </div>
          <button type="submit" className="sl-btn" disabled={!emailValid}>Continue <FiArrowRight size={16}/></button>
        </form>
      )}

      {!handedOff && step === "password" && (
        <form className="sl-auth-form" onSubmit={handleLogin}>
          <div className="sl-chip">
            <span>{form.email}</span>
            <button type="button" onClick={()=>{setStep("email");setForm(f=>({...f,password:""}));setError("");}}>Change</button>
          </div>
          <div className="sl-field">
            <div className="sl-field-row">
              <label htmlFor="password">Password</label>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>
            <div className="sl-input-wrap">
              <input ref={passRef} id="password" className="sl-input has-btn" type={showPass?"text":"password"} placeholder="Your password"
                value={form.password} onChange={e=>{setForm(f=>({...f,password:e.target.value}));setError("");}}
                autoComplete="current-password" required
              />
              <button type="button" className="sl-eye" onClick={()=>setShowPass(!showPass)} aria-label={showPass?"Hide password":"Show password"}>
                {showPass?<FiEyeOff size={15}/>:<FiEye size={15}/>}
              </button>
            </div>
          </div>
          <label className="sl-check">
            <input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)} />
            Stay signed in for 30 days
          </label>
          <button type="submit" className="sl-btn" disabled={loading||!form.password}>
            {loading ? <><Spinner/> Signing in…</> : <>Sign in <FiArrowRight size={16}/></>}
          </button>
        </form>
      )}

      <p className="sl-auth-legal">
        By signing in, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </AuthShell>
  );
}
