"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiZap, FiMail, FiLock, FiEye, FiEyeOff,
  FiArrowRight, FiCheckCircle, FiRefreshCw,
} from "react-icons/fi";

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
    <div className="min-h-screen bg-bg bg-grid-pattern flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <FiZap size={17} className="text-black" />
          </div>
          <div>
            <p className="font-bold text-base text-primary leading-none tracking-tight">Vantro</p>
            <p className="text-2xs text-muted">Business OS</p>
          </div>
        </div>

        <div className="card-premium p-6">

          {/* ── Done ── */}
          {step === "done" && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
                <FiCheckCircle size={28} className="text-success" />
              </div>
              <h1 className="text-xl font-bold text-primary">Password reset!</h1>
              <p className="text-sm text-secondary leading-relaxed">
                Your password has been updated. Sign in with your new password.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-bold text-sm shadow-button-accent hover:bg-accent/90 transition-all"
              >
                Go to Sign In <FiArrowRight size={14} />
              </button>
            </div>
          )}

          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-primary">Forgot password?</h1>
                <p className="text-sm text-secondary mt-1">
                  Enter your email — we&apos;ll send a reset OTP.
                </p>
              </div>

              {error && (
                <div className="mb-4 px-3 py-2.5 bg-danger-dim border border-danger/30 rounded-xl text-sm text-danger">
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">Email</label>
                  <div className="relative">
                    <FiMail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="email" autoFocus
                      placeholder="rajesh@kumartraders.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      required
                      className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary pl-9 pr-4 py-3 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-bold text-sm shadow-button-accent hover:bg-accent/90 transition-all disabled:opacity-40">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
                    : <>Send OTP <FiArrowRight size={14} /></>}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: OTP + New Password ── */}
          {step === "otp" && (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-primary">Reset password</h1>
                <p className="text-sm text-secondary mt-1">
                  We sent a 6-digit OTP to{" "}
                  <span className="font-semibold text-primary">{maskedEmail}</span>.
                  Check your inbox and spam folder.
                </p>
              </div>

              {error && (
                <div className="mb-4 px-3 py-2.5 bg-danger-dim border border-danger/30 rounded-xl text-sm text-danger">
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-5">
                {/* OTP boxes */}
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-3">6-Digit OTP</label>
                  <div className="flex justify-between gap-2" onPaste={handlePaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => { inputs.current[i] = el; }}
                        type="tel" inputMode="numeric" maxLength={1}
                        value={digit}
                        onChange={e => handleDigit(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        className={[
                          "w-11 h-14 text-center text-xl font-bold rounded-xl border transition-all",
                          "bg-surface-2 text-primary focus:outline-none",
                          digit ? "border-accent bg-accent-dim" : "border-border focus:border-accent",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                  <div className="mt-2 text-right">
                    {countdown > 0 ? (
                      <p className="text-xs text-muted">Resend in {countdown}s</p>
                    ) : (
                      <button type="button" onClick={handleResend} disabled={resending}
                        className="text-xs text-accent hover:underline flex items-center gap-1 ml-auto disabled:opacity-50">
                        {resending
                          ? <><FiRefreshCw size={11} className="animate-spin" /> Sending…</>
                          : "Resend OTP"}
                      </button>
                    )}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">New Password</label>
                  <div className="relative">
                    <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={newPass}
                      onChange={e => { setNewPass(e.target.value); setError(""); }}
                      required minLength={8}
                      className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary pl-9 pr-10 py-3 focus:outline-none focus:border-accent transition-colors"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
                      {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  </div>
                  {newPass.length > 0 && newPass.length < 8 && (
                    <p className="text-2xs text-danger mt-1">At least 8 characters</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type={showConf ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError(""); }}
                      required
                      className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary pl-9 pr-10 py-3 focus:outline-none focus:border-accent transition-colors"
                    />
                    <button type="button" onClick={() => setShowConf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
                      {showConf ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  </div>
                  {confirm.length > 0 && confirm !== newPass && (
                    <p className="text-2xs text-danger mt-1">Passwords do not match</p>
                  )}
                  {confirm.length > 0 && confirm === newPass && newPass.length >= 8 && (
                    <p className="text-2xs text-success mt-1">✓ Passwords match</p>
                  )}
                </div>

                <button type="submit"
                  disabled={loading || otp.join("").length < 6 || newPass.length < 8 || newPass !== confirm}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-bold text-sm shadow-button-accent hover:bg-accent/90 transition-all disabled:opacity-40">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Resetting…</>
                    : <>Reset Password <FiArrowRight size={14} /></>}
                </button>

                <button type="button"
                  onClick={() => { setStep("email"); setError(""); setOtp(["","","","","",""]); }}
                  className="w-full text-center text-xs text-muted hover:text-secondary transition-colors">
                  ← Use a different email
                </button>
              </form>
            </>
          )}

          {step !== "done" && (
            <div className="mt-5 pt-4 border-t border-border text-center">
              <p className="text-sm text-secondary">
                Remembered it?{" "}
                <Link href="/login" className="text-accent hover:underline font-semibold">Sign in</Link>
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="hover:text-secondary transition-colors">Vantro Flow</Link>
          {" "}— Collections OS for Indian MSMEs
        </p>
      </div>
    </div>
  );
}
