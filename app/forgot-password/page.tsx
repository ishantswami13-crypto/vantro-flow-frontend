"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiArrowRight, FiRefreshCw } from "react-icons/fi";
import { AuthShell, AuthHead, AuthError, Spinner } from "@/components/auth/AuthShell";
const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Step = "email" | "otp" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep]           = useState<Step>("email");
  const [email, setEmail]         = useState("");
  const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
  const [newPass, setNewPass]     = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]         = useState("");
  const [countdown, setCountdown] = useState(0);

  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Step 1: send OTP to email ──────────────────────────────────────────────
  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always advance — backend hides whether email exists (security)
      setStep("otp");
      setCountdown(30);
      setTimeout(() => inputs.current[0]?.focus(), 150);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Resend ─────────────────────────────────────────────────────────────────
  async function handleResend() {
    setResending(true); setError("");
    try {
      await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setOtp(["", "", "", "", "", ""]);
      setCountdown(30);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch {
      setError("Could not resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  // ── OTP digit handling ─────────────────────────────────────────────────────
  function handleDigit(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) setOtp(pasted.split(""));
  }

  // ── Step 2: verify OTP + set new password ─────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the 6-digit OTP"); return; }
    if (newPass.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (newPass !== confirm) { setError("Passwords do not match"); return; }

    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code, new_password: newPass }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Reset failed");
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP or it expired. Try again.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  }

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1****$3");

  return (
    <AuthShell aside={<>Remembered it? <Link href="/login">Sign in</Link></>}>
      {step === "done" && (
        <>
          <AuthHead title="Password reset" lead="Your password has been updated. Sign in with your new password." />
          <button type="button" className="sl-btn" onClick={() => router.push("/login")}>Go to sign in <FiArrowRight size={16} /></button>
        </>
      )}

      {step === "email" && (
        <>
          <AuthHead title="Reset your password" lead="Enter the email you sign in with and we'll send you a 6-digit code." />
          {error && <AuthError>{error}</AuthError>}
          <form onSubmit={handleSendOTP} className="sl-auth-form">
            <div className="sl-field">
              <label htmlFor="fp-email">Work email</label>
              <input id="fp-email" className="sl-input" type="email" autoFocus autoComplete="email"
                placeholder="you@company.com" value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }} required />
            </div>
            <button type="submit" className="sl-btn" disabled={loading || !email}>
              {loading ? <><Spinner /> Sending…</> : <>Send code <FiArrowRight size={16} /></>}
            </button>
          </form>
        </>
      )}

      {step === "otp" && (
        <>
          <AuthHead title="Choose a new password" lead={<>We sent a 6-digit code to <strong>{maskedEmail}</strong>. Check your inbox and spam folder.</>} />
          {error && <AuthError>{error}</AuthError>}
          <form onSubmit={handleReset} className="sl-auth-form">
            <div className="sl-field">
              <span className="sl-label">6-digit code</span>
              <div className="sl-otp" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input key={i} ref={el => { inputs.current[i] = el; }} aria-label={`Digit ${i + 1}`}
                    type="tel" inputMode="numeric" maxLength={1} value={digit} className={digit ? "filled" : ""}
                    onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} />
                ))}
              </div>
              <div className="sl-otp-meta">
                <span>Didn&apos;t get it?</span>
                {countdown > 0
                  ? <span>Resend in {countdown}s</span>
                  : <button type="button" className="sl-link-btn" onClick={handleResend} disabled={resending}>
                      {resending ? <><FiRefreshCw size={11} style={{ display: "inline", marginRight: 4 }} />Sending…</> : "Resend code"}
                    </button>}
              </div>
            </div>

            <div className="sl-field">
              <label htmlFor="fp-new">New password</label>
              <div className="sl-input-wrap">
                <input id="fp-new" className="sl-input has-btn" type={showPass ? "text" : "password"} placeholder="At least 8 characters"
                  value={newPass} onChange={e => { setNewPass(e.target.value); setError(""); }} required minLength={8} autoComplete="new-password" />
                <button type="button" className="sl-eye" onClick={() => setShowPass(v => !v)} aria-label={showPass ? "Hide password" : "Show password"}>
                  {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {newPass.length > 0 && newPass.length < 8 && <p className="sl-hint bad">At least 8 characters</p>}
            </div>

            <div className="sl-field">
              <label htmlFor="fp-conf">Confirm password</label>
              <div className="sl-input-wrap">
                <input id="fp-conf" className="sl-input has-btn" type={showConf ? "text" : "password"} placeholder="Type it again"
                  value={confirm} onChange={e => { setConfirm(e.target.value); setError(""); }} required autoComplete="new-password" />
                <button type="button" className="sl-eye" onClick={() => setShowConf(v => !v)} aria-label={showConf ? "Hide password" : "Show password"}>
                  {showConf ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {confirm.length > 0 && confirm !== newPass && <p className="sl-hint bad">Passwords do not match</p>}
              {confirm.length > 0 && confirm === newPass && newPass.length >= 8 && <p className="sl-hint good">Passwords match</p>}
            </div>

            <button type="submit" className="sl-btn"
              disabled={loading || otp.join("").length < 6 || newPass.length < 8 || newPass !== confirm}>
              {loading ? <><Spinner /> Resetting…</> : <>Reset password <FiArrowRight size={16} /></>}
            </button>
            <button type="button" className="sl-link-btn" style={{ alignSelf: "center" }}
              onClick={() => { setStep("email"); setError(""); setOtp(["", "", "", "", "", ""]); }}>
              Use a different email
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
