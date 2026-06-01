"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiArrowRight, FiCheck } from "react-icons/fi";
import { api, saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";

const GRAIN = "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E";

function AtlasMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path
        fill="white" fillRule="evenodd"
        className="atlas-mark-anim"
        d="M 50 8 L 4 92 L 96 92 Z M 50 78 L 38 92 L 62 92 Z M 26 59 L 74 59 L 74 68 L 26 68 Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [step, setStep]             = useState<"email" | "password">("email");
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm]             = useState({ email: "", password: "" });
  const [emailValid, setEmailValid] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vantro_saved_email");
    if (saved) { setForm(f => ({ ...f, email: saved })); setEmailValid(true); }
  }, []);

  useEffect(() => {
    if (step === "password") setTimeout(() => passRef.current?.focus(), 150);
  }, [step]);

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
      if (rememberMe) {
        localStorage.setItem("vantro_saved_email", form.email);
        localStorage.setItem("vantro_remember", "1");
      } else {
        localStorage.removeItem("vantro_saved_email");
        localStorage.removeItem("vantro_remember");
      }
      saveAuth(data.token, data.user, rememberMe, data.csrf_token);
      posthog.identify(data.user.id, { email: data.user.email, name: data.user.business_name, plan: data.user.plan });
      posthog.capture("user_logged_in");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally { setLoading(false); }
  };

  const inputBase: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "6px",
    padding: "13px 16px",
    fontSize: "15px",
    color: "#fff",
    outline: "none",
    width: "100%",
    fontFamily: "'Space Grotesk', system-ui",
    transition: "border-color .2s, background .2s",
  };
  const inputFocus: React.CSSProperties = {
    ...inputBase,
    border: "1px solid rgba(255,255,255,0.38)",
    background: "rgba(255,255,255,0.07)",
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#020202", color: "#fff", fontFamily: "'Space Grotesk', system-ui", position: "relative" }}
    >
      {/* Grain */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `url("${GRAIN}")`, opacity: 0.5 }} />

      {/* Top bar */}
      <header style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 40px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff" }}>
          <AtlasMark size={26} />
          <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: ".2em", textTransform: "uppercase" as const }}>Atlas</span>
        </Link>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,.32)" }}>
          No account?{" "}
          <Link href="/signup" style={{ color: "#fff", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,.2)", paddingBottom: "1px" }}>
            Start free
          </Link>
        </div>
      </header>

      {/* Center */}
      <main style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: "520px" }}>

          {/* Heading */}
          <div style={{ marginBottom: "44px" }}>
            <h1 style={{ fontWeight: 700, fontSize: "clamp(28px,3.5vw,40px)", letterSpacing: "-.042em", lineHeight: 1.05, marginBottom: "10px" }}>
              {step === "email" ? "Welcome back." : "Welcome back."}
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,.32)", lineHeight: 1.6 }}>
              {step === "email" ? "Sign in to your Atlas workspace." : form.email}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "6px", background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.2)", fontSize: "13px", color: "rgba(255,100,100,.9)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: ".04em" }}>
              {error}
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleEmailNext} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.18)" }}>
                  Work Email
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email" autoFocus autoComplete="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailValid(validateEmail(e.target.value)); setError(""); }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    style={emailFocused ? inputFocus : inputBase}
                  />
                  {emailValid && (
                    <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", borderRadius: "50%", background: "rgba(16,217,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <FiCheck size={11} style={{ color: "#10D98A" }} />
                    </div>
                  )}
                </div>
              </div>
              <button
                type="submit" disabled={!emailValid}
                style={{ marginTop: "8px", background: "#fff", color: "#000", border: "none", borderRadius: "6px", padding: "15px 24px", fontFamily: "'Space Grotesk', system-ui", fontWeight: 700, fontSize: "15px", cursor: emailValid ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", opacity: emailValid ? 1 : 0.4, transition: "opacity .2s" }}
              >
                Continue <FiArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Step 2: Password */}
          {step === "password" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Email pill */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "6px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,.7)" }}>{form.email}</span>
                <button type="button" onClick={() => { setStep("email"); setForm(f => ({ ...f, password: "" })); setError(""); }} style={{ fontSize: "12px", color: "rgba(255,255,255,.4)", background: "none", border: "none", cursor: "pointer" }}>
                  Change
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.18)" }}>Password</label>
                  <Link href="/forgot-password" style={{ fontSize: "12px", color: "rgba(255,255,255,.32)", textDecoration: "none" }}>Forgot password?</Link>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    ref={passRef}
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(""); }}
                    onFocus={() => setPassFocused(true)}
                    onBlur={() => setPassFocused(false)}
                    autoComplete="current-password" required
                    style={{ ...(passFocused ? inputFocus : inputBase), paddingRight: "44px" }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)" }}>
                    {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                <div onClick={() => setRememberMe(r => !r)} style={{ width: "36px", height: "20px", borderRadius: "10px", background: rememberMe ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.1)", position: "relative", transition: "background .2s", cursor: "pointer" }}>
                  <div style={{ position: "absolute", top: "2px", width: "16px", height: "16px", background: "#000", borderRadius: "50%", transition: "transform .2s", transform: rememberMe ? "translateX(18px)" : "translateX(2px)" }} />
                </div>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,.45)" }}>Stay signed in for 30 days</span>
              </label>

              <button
                type="submit" disabled={loading || !form.password}
                style={{ position: "relative", marginTop: "8px", background: "#fff", color: "#000", border: "none", borderRadius: "6px", padding: "15px 24px", fontFamily: "'Space Grotesk', system-ui", fontWeight: 700, fontSize: "15px", cursor: loading || !form.password ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", opacity: loading || !form.password ? 0.4 : 1, transition: "opacity .2s" }}
              >
                {loading
                  ? <><div style={{ width: "16px", height: "16px", border: "2px solid rgba(0,0,0,.2)", borderTop: "2px solid #000", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Signing in…</>
                  : <>Sign in <FiArrowRight size={16} /></>}
              </button>
            </form>
          )}

          <div style={{ marginTop: "36px", fontSize: "13px", color: "rgba(255,255,255,.3)", textAlign: "center" }}>
            By signing in, you agree to our{" "}
            <Link href="/terms" style={{ color: "rgba(255,255,255,.65)", textDecoration: "none", fontWeight: 500 }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "rgba(255,255,255,.65)", textDecoration: "none", fontWeight: 500 }}>Privacy Policy</Link>.
          </div>
        </div>
      </main>

      {/* Page footer */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,.08)", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", letterSpacing: ".1em", color: "rgba(255,255,255,.18)", textTransform: "uppercase" as const }}>
        <span>© 2026 Vantro Technologies</span>
        <div style={{ display: "flex", gap: "24px" }}>
          <Link href="/privacy" style={{ color: "rgba(255,255,255,.22)", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ color: "rgba(255,255,255,.22)", textDecoration: "none" }}>Terms</Link>
          <Link href="/security" style={{ color: "rgba(255,255,255,.22)", textDecoration: "none" }}>Security</Link>
        </div>
      </footer>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
