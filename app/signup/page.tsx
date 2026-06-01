"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff, FiArrowRight, FiRefreshCw, FiCheckCircle } from "react-icons/fi";
import { saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { INDUSTRY_OPTIONS } from "@/lib/businessTypes";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";
const GRAIN = "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E";

const businessTypes = [
  { value: "", label: "Select your industry" },
  ...INDUSTRY_OPTIONS,
];

function AtlasMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path fill="white" fillRule="evenodd" className="atlas-mark-anim"
        d="M 50 8 L 4 92 L 96 92 Z M 50 78 L 38 92 L 62 92 Z M 26 59 L 74 59 L 74 68 L 26 68 Z" />
    </svg>
  );
}

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
const inputFocus: React.CSSProperties = { ...inputBase, border: "1px solid rgba(255,255,255,0.38)", background: "rgba(255,255,255,0.07)" };

function FInput(props: React.InputHTMLAttributes<HTMLInputElement> & { extraStyle?: React.CSSProperties }) {
  const [focused, setFocused] = useState(false);
  const { extraStyle, ...rest } = props;
  return (
    <input {...rest}
      style={{ ...(focused ? inputFocus : inputBase), ...extraStyle }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "7px", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.18)" }}>
      {children}
    </label>
  );
}

// ── OTP Step ──────────────────────────────────────────────────────────────────
function OTPStep({ preToken, userEmail, userPhone, onVerified }: {
  preToken: string; userEmail: string; userPhone: string;
  onVerified: (token: string, user: object, csrfToken?: string | null) => void;
}) {
  const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]         = useState("");
  const [resent, setResent]       = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const maskedPhone = userPhone ? "+91 " + userPhone.replace(/\D/g, "").slice(-10).replace(/(\d{2})(\d{4})(\d{4})/, "$1XXXX$3") : "";
  const maskedEmail = userEmail ? userEmail.replace(/(.{2})(.*)(@.*)/, "$1****$3") : "";

  function handleDigit(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(d => d !== "")) handleVerify(next.join(""));
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  }
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split("")); handleVerify(pasted); }
  }

  async function handleVerify(code?: string) {
    const finalCode = code ?? otp.join("");
    if (finalCode.length < 6) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${preToken}` },
        credentials: "include",
        body: JSON.stringify({ otp: finalCode }),
      });
      const d = await r.json();
      if (d.success) { onVerified(d.token, d.user, d.csrf_token); }
      else { setError(d.error || "Wrong OTP"); setOtp(["", "", "", "", "", ""]); inputs.current[0]?.focus(); }
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleResend() {
    setResending(true); setError(""); setResent(false);
    try {
      await fetch(`${BASE}/api/auth/resend-otp`, { method: "POST", headers: { Authorization: `Bearer ${preToken}` } });
      setResent(true); setCountdown(30); setOtp(["", "", "", "", "", ""]); inputs.current[0]?.focus();
    } catch { setError("Could not resend."); }
    finally { setResending(false); }
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.22)", marginBottom: "14px" }}>Step 3 of 3</div>
        <h2 style={{ fontWeight: 700, fontSize: "clamp(26px,3.2vw,36px)", letterSpacing: "-.042em", lineHeight: 1.06, marginBottom: "10px" }}>Check your phone</h2>
        <p style={{ fontSize: "14.5px", color: "rgba(255,255,255,.32)", lineHeight: 1.65 }}>
          6-digit code sent to{" "}
          {maskedPhone && <span style={{ color: "#fff" }}>{maskedPhone}</span>}
          {maskedPhone && maskedEmail && " and "}
          {maskedEmail && <span style={{ color: "#fff" }}>{maskedEmail}</span>}
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "24px" }} onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input key={i} ref={el => { inputs.current[i] = el; }}
            type="tel" inputMode="numeric" maxLength={1}
            value={digit} autoFocus={i === 0}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            style={{ width: "44px", height: "52px", textAlign: "center", fontSize: "20px", fontWeight: 700, outline: "none", background: digit ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)", border: `1px solid ${digit ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.1)"}`, borderRadius: "6px", color: "#fff", opacity: loading ? 0.5 : 1, fontFamily: "'Space Grotesk', system-ui" }}
          />
        ))}
      </div>

      {error && <p style={{ textAlign: "center", fontSize: "12px", color: "#f87171", marginBottom: "16px" }}>{error}</p>}
      {resent && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", color: "#10D98A", marginBottom: "16px" }}>
          <FiCheckCircle size={13} /> New code sent
        </div>
      )}

      <button disabled={loading || otp.join("").length < 6} onClick={() => handleVerify()}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "#fff", color: "#000", border: "none", borderRadius: "6px", padding: "15px 24px", fontFamily: "'Space Grotesk', system-ui", fontWeight: 700, fontSize: "15px", cursor: loading || otp.join("").length < 6 ? "not-allowed" : "pointer", opacity: loading || otp.join("").length < 6 ? 0.4 : 1, transition: "opacity .2s" }}>
        {loading ? <><div style={{ width: "16px", height: "16px", border: "2px solid rgba(0,0,0,.2)", borderTop: "2px solid #000", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Verifying…</> : <>Verify &amp; continue <FiArrowRight size={16} /></>}
      </button>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        {countdown > 0
          ? <p style={{ fontSize: "11px", color: "rgba(255,255,255,.25)" }}>Resend in {countdown}s</p>
          : <button onClick={handleResend} disabled={resending} style={{ fontSize: "12px", color: "rgba(255,255,255,.45)", background: "none", border: "none", cursor: "pointer" }}>
              {resending ? <><FiRefreshCw size={11} style={{ display: "inline", marginRight: "4px", animation: "spin .7s linear infinite" }} />Sending…</> : "Resend code"}
            </button>}
      </div>
    </div>
  );
}

// ── Signup Form ───────────────────────────────────────────────────────────────
function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const referredBy = params.get("ref") || "";

  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [otpStep, setOtpStep]     = useState(false);
  const [preToken, setPreToken]   = useState("");
  const [verifiedUser, setVerifiedUser] = useState<{ email: string; phone: string } | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", business_name: "",
    business_type: "", amount_stuck: "", password: "", confirm_password: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.business_name.trim()) { setError("Please fill all fields"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Enter a valid email"); return; }
    setError(""); setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirm_password) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email, phone: form.phone,
          business_name: form.business_name, password: form.password,
          ...(referredBy ? { referred_by: referredBy } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Signup failed");
      if (data.needs_otp) {
        setPreToken(data.pre_token);
        setVerifiedUser({ email: data.user.email, phone: data.user.phone });
        setOtpStep(true);
      } else {
        saveAuth(data.token, data.user, true, data.csrf_token);
        posthog.identify(data.user.id, { email: data.user.email, plan: data.user.plan });
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally { setLoading(false); }
  }

  const handleOTPVerified = (token: string, user: any, csrfToken?: string | null) => {
    saveAuth(token, user, true, csrfToken);
    posthog.identify(user.id, { email: user.email, name: user.business_name, plan: user.plan });
    posthog.capture("user_signed_up", { business_type: form.business_type });
    router.push("/dashboard");
  };

  if (otpStep && preToken && verifiedUser) {
    return <OTPStep preToken={preToken} userEmail={verifiedUser.email} userPhone={verifiedUser.phone} onVerified={handleOTPVerified} />;
  }

  return (
    <div>
      {/* Progress dots */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
        {[1, 2].map(n => (
          <>
            <div key={`dot-${n}`} style={{ width: "6px", height: "6px", borderRadius: "50%", background: step >= n ? "#fff" : "rgba(255,255,255,.2)", transform: step === n ? "scale(1.3)" : "scale(1)", transition: "all .35s" }} />
            {n < 2 && <div key={`line-${n}`} style={{ flex: 1, height: "1px", background: "rgba(255,255,255,.08)", maxWidth: "32px" }} />}
          </>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "6px", background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.2)", fontSize: "13px", color: "rgba(255,100,100,.9)", fontFamily: "'JetBrains Mono', monospace" }}>
          {error}
        </div>
      )}
      {referredBy && step === 1 && (
        <div style={{ marginBottom: "16px", padding: "12px 16px", borderRadius: "6px", background: "rgba(16,217,138,0.08)", border: "1px solid rgba(16,217,138,0.2)", fontSize: "12px", color: "#10D98A" }}>
          🎉 You were invited — join free
        </div>
      )}

      {/* Step 1: Account */}
      {step === 1 && (
        <form onSubmit={goToStep2} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ marginBottom: "36px" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.22)", marginBottom: "14px" }}>Step 1 of 2</div>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(26px,3.2vw,36px)", letterSpacing: "-.042em", lineHeight: 1.06, marginBottom: "10px" }}>Create your<br />free account.</h2>
            <p style={{ fontSize: "14.5px", color: "rgba(255,255,255,.32)", lineHeight: 1.65 }}>No credit card required. Up and running in 8 minutes.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <FieldLabel>Full name</FieldLabel>
              <FInput type="text" placeholder="Rahul Mehra" value={form.name} onChange={set("name")} required />
            </div>
            <div>
              <FieldLabel>Business name</FieldLabel>
              <FInput type="text" placeholder="Mehra Traders" value={form.business_name} onChange={set("business_name")} required />
            </div>
          </div>

          <div>
            <FieldLabel>Work email</FieldLabel>
            <FInput type="email" placeholder="you@company.com" value={form.email} onChange={set("email")} required autoComplete="email" />
          </div>

          <div>
            <FieldLabel>Industry</FieldLabel>
            <select value={form.business_type} onChange={set("business_type")}
              style={{ ...inputBase, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: "38px", cursor: "pointer", color: form.business_type ? "#fff" : "rgba(255,255,255,.3)" }}>
              {businessTypes.map(o => (
                <option key={o.value} value={o.value} style={{ background: "#111", color: "#fff" }}>{o.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" style={{ marginTop: "10px", background: "#fff", color: "#000", border: "none", borderRadius: "6px", padding: "15px 24px", fontFamily: "'Space Grotesk', system-ui", fontWeight: 700, fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            Continue <FiArrowRight size={16} />
          </button>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "32px", paddingTop: "28px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
            {["Free forever plan", "No credit card", "Cancel anytime"].map(t => (
              <div key={t} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", letterSpacing: ".1em", color: "rgba(255,255,255,.22)", textTransform: "uppercase" as const, display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "rgba(255,255,255,.35)" }}>✓</span> {t}
              </div>
            ))}
          </div>

          <div style={{ marginTop: "16px", fontSize: "13px", color: "rgba(255,255,255,.3)", textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "rgba(255,255,255,.65)", textDecoration: "none", fontWeight: 500 }}>Log in</Link>
          </div>
        </form>
      )}

      {/* Step 2: Business + Password */}
      {step === 2 && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ marginBottom: "36px" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: ".22em", textTransform: "uppercase" as const, color: "rgba(255,255,255,.22)", marginBottom: "14px" }}>Step 2 of 2</div>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(26px,3.2vw,36px)", letterSpacing: "-.042em", lineHeight: 1.06, marginBottom: "10px" }}>Set your password<br />&amp; go live.</h2>
            <p style={{ fontSize: "14.5px", color: "rgba(255,255,255,.32)", lineHeight: 1.65 }}>Atlas adapts to your business from day one.</p>
          </div>

          {/* Phone */}
          <div>
            <FieldLabel>Phone (WhatsApp — OTP sent here)</FieldLabel>
            <div style={{ display: "flex" }}>
              <span style={{ display: "flex", alignItems: "center", padding: "0 14px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRight: "none", borderRadius: "6px 0 0 6px", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,.45)", flexShrink: 0 }}>+91</span>
              <input type="tel" placeholder="9876543210" value={form.phone} onChange={set("phone")} required maxLength={10} pattern="\d{10}"
                style={{ ...inputBase, borderRadius: "0 6px 6px 0" }} />
            </div>
          </div>

          {/* Amount */}
          <div>
            <FieldLabel>Amount stuck in receivables (approx)</FieldLabel>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(255,255,255,.35)" }}>₹</span>
              <FInput type="number" placeholder="2500000" value={form.amount_stuck} onChange={set("amount_stuck")} required extraStyle={{ paddingLeft: "28px" }} />
            </div>
          </div>

          {/* Password */}
          <div>
            <FieldLabel>Password</FieldLabel>
            <div style={{ position: "relative" }}>
              <FInput type={showPassword ? "text" : "password"} placeholder="Min 8 characters" value={form.password} onChange={set("password")} required minLength={8} extraStyle={{ paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)" }}>
                {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
            {form.password.length > 0 && form.password.length < 8 && (
              <p style={{ fontSize: "10px", marginTop: "4px", color: "rgba(255,80,80,.8)", fontFamily: "'JetBrains Mono', monospace" }}>At least 8 characters</p>
            )}
          </div>

          {/* Confirm */}
          <div>
            <FieldLabel>Confirm password</FieldLabel>
            <div style={{ position: "relative" }}>
              <FInput type={showConfirm ? "text" : "password"} placeholder="Re-enter password" value={form.confirm_password} onChange={set("confirm_password")} required extraStyle={{ paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)" }}>
                {showConfirm ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
            {form.confirm_password.length > 0 && form.password !== form.confirm_password && (
              <p style={{ fontSize: "10px", marginTop: "4px", color: "rgba(255,80,80,.8)", fontFamily: "'JetBrains Mono', monospace" }}>Passwords do not match</p>
            )}
            {form.confirm_password.length > 0 && form.password === form.confirm_password && form.password.length >= 8 && (
              <p style={{ fontSize: "10px", marginTop: "4px", color: "#10D98A", fontFamily: "'JetBrains Mono', monospace" }}>✓ Looks good</p>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button type="button" onClick={() => { setStep(1); setError(""); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", padding: "13px 20px", fontFamily: "'Space Grotesk', system-ui", fontWeight: 500, fontSize: "14px", color: "rgba(255,255,255,.55)", cursor: "pointer", transition: "background .2s" }}>
              Back
            </button>
            <button type="submit" disabled={loading} style={{ flex: 1, background: "#fff", color: "#000", border: "none", borderRadius: "6px", padding: "15px 24px", fontFamily: "'Space Grotesk', system-ui", fontWeight: 700, fontSize: "15px", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", opacity: loading ? 0.6 : 1, position: "relative", transition: "opacity .2s" }}>
              {loading
                ? <><div style={{ width: "16px", height: "16px", border: "2px solid rgba(0,0,0,.2)", borderTop: "2px solid #000", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Creating account…</>
                : <>Create free account <FiArrowRight size={16} /></>}
            </button>
          </div>

          <p style={{ marginTop: "8px", fontSize: "12px", color: "rgba(255,255,255,.28)", textAlign: "center", lineHeight: 1.6 }}>
            By creating an account you agree to our{" "}
            <Link href="/terms" style={{ color: "rgba(255,255,255,.55)", textDecoration: "none" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "rgba(255,255,255,.55)", textDecoration: "none" }}>Privacy Policy</Link>.
          </p>
        </form>
      )}
    </div>
  );
}

// ── Page Shell ────────────────────────────────────────────────────────────────
export default function SignupPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#020202", color: "#fff", fontFamily: "'Space Grotesk', system-ui", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: `url("${GRAIN}")`, opacity: 0.5 }} />

      {/* Top bar */}
      <header style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 40px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff" }}>
          <AtlasMark size={26} />
          <span style={{ fontWeight: 700, fontSize: "14px", letterSpacing: ".2em", textTransform: "uppercase" as const }}>Atlas</span>
        </Link>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,.32)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#fff", fontWeight: 600, textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,.2)", paddingBottom: "1px" }}>Log in</Link>
        </div>
      </header>

      {/* Center */}
      <main style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: "520px" }}>
          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
