"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiUser, FiMail, FiArrowRight, FiLock,
  FiEye, FiEyeOff, FiPhone, FiRefreshCw, FiCheckCircle,
  FiZap, FiTrendingUp, FiMessageCircle, FiBarChart2, FiCheck,
} from "react-icons/fi";
import LogoMark from "@/components/LogoMark";
import { saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { INDUSTRY_OPTIONS } from "@/lib/businessTypes";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const businessTypes = [
  { value: "", label: "Select your industry" },
  ...INDUSTRY_OPTIONS,
];

// ─── OTP Verification Step ───────────────────────────────────────────────────
function OTPStep({
  preToken,
  userEmail,
  userPhone,
  onVerified,
}: {
  preToken: string;
  userEmail: string;
  userPhone: string;
  onVerified: (token: string, user: object) => void;
}) {
  const [otp, setOtp]           = useState(["", "", "", "", "", ""]);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]       = useState("");
  const [resent, setResent]     = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const maskedPhone = userPhone
    ? "+91 " + userPhone.replace(/\D/g, "").slice(-10).replace(/(\d{2})(\d{4})(\d{4})/, "$1XXXX$3")
    : "";
  const maskedEmail = userEmail
    ? userEmail.replace(/(.{2})(.*)(@.*)/, "$1****$3")
    : "";

  function handleDigit(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(d => d !== "")) handleVerify(next.join(""));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      handleVerify(pasted);
    }
  }

  async function handleVerify(code?: string) {
    const finalCode = code ?? otp.join("");
    if (finalCode.length < 6) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${preToken}` },
        body: JSON.stringify({ otp: finalCode }),
      });
      const d = await r.json();
      if (d.success) {
        onVerified(d.token, d.user);
      } else {
        setError(d.error || "Wrong OTP");
        setOtp(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true); setError(""); setResent(false);
    try {
      await fetch(`${BASE}/api/auth/resend-otp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${preToken}` },
      });
      setResent(true);
      setCountdown(30);
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch {
      setError("Could not resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(79,110,247,0.1)", border: "1px solid rgba(79,110,247,0.2)" }}>
          <FiPhone size={22} className="text-accent" />
        </div>
        <h1 className="text-2xl font-black text-primary tracking-tight">Verify your account</h1>
        <p className="text-sm text-secondary mt-2 leading-relaxed">
          6-digit code sent to
          {maskedPhone && <><br /><span className="font-semibold text-primary">{maskedPhone}</span> <span className="text-muted">(WhatsApp)</span></>}
          {maskedEmail && <><br /><span className="font-semibold text-primary">{maskedEmail}</span> <span className="text-muted">(Email)</span></>}
        </p>
      </div>

      {/* OTP input boxes */}
      <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            autoFocus={i === 0}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-11 h-14 text-center text-xl font-bold rounded-xl focus:outline-none transition-all"
            style={{
              background: digit ? "rgba(79,110,247,0.08)" : "#0D0F14",
              border: `1px solid ${digit ? "rgba(79,110,247,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: "#F2F4F7",
              opacity: loading ? 0.5 : 1,
              pointerEvents: loading ? "none" : "auto",
            }}
          />
        ))}
      </div>

      {error && (
        <div className="px-3.5 py-2.5 rounded-xl text-sm text-danger text-center"
          style={{ background: "rgba(245,66,77,0.08)", border: "1px solid rgba(245,66,77,0.25)" }}>
          {error}
        </div>
      )}

      {resent && (
        <div className="flex items-center justify-center gap-2 text-sm text-success">
          <FiCheckCircle size={14} />
          New OTP sent to your phone and email
        </div>
      )}

      <button
        disabled={loading || otp.join("").length < 6}
        onClick={() => handleVerify()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
        style={{ background: "#fff", color: "#000" }}
      >
        {loading
          ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Verifying…</>
          : <><FiArrowRight size={14} /> Verify & Enter Dashboard</>}
      </button>

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-xs text-muted">Resend OTP in {countdown}s</p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-xs text-accent hover:underline flex items-center gap-1.5 mx-auto disabled:opacity-50"
          >
            {resending
              ? <><FiRefreshCw size={12} className="animate-spin" /> Sending...</>
              : "Didn't get the code? Resend OTP"}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-muted">
        OTP expires in 10 minutes · Check WhatsApp &amp; spam folder
      </p>
    </div>
  );
}

// ─── Signup Form ─────────────────────────────────────────────────────────────
function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const referredBy  = params.get("ref") || "";

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const [otpStep, setOtpStep]   = useState(false);
  const [preToken, setPreToken] = useState("");
  const [verifiedUser, setVerifiedUser] = useState<{ email: string; phone: string } | null>(null);

  const [form, setForm] = useState({
    name:             "",
    phone:            "",
    email:            "",
    business_name:    "",
    business_type:    "",
    amount_stuck:     "",
    password:         "",
    confirm_password: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirm_password) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:         form.email,
          phone:         form.phone,
          business_name: form.business_name,
          password:      form.password,
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
        saveAuth(data.token, data.user); // defaults to rememberMe=true (30 days)
        posthog.identify(data.user.id, { email: data.user.email, plan: data.user.plan });
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerified = (token: string, user: any) => {
    saveAuth(token, user); // rememberMe=true by default — 30 days
    posthog.identify(user.id, {
      email:         user.email,
      name:          user.business_name,
      plan:          user.plan,
      phone:         user.phone,
      business_type: form.business_type,
      amount_stuck:  form.amount_stuck,
    });
    posthog.capture("user_signed_up", { business_type: form.business_type });
    router.push("/dashboard");
  };

  // ── Shared input style ──
  const inputCls = "w-full border rounded-xl text-sm text-primary py-3 px-3.5 focus:outline-none transition-colors placeholder:text-muted";
  const inputStyle = { background: "#0D0F14", borderColor: "rgba(255,255,255,0.1)" };

  if (otpStep && preToken && verifiedUser) {
    return (
      <OTPStep
        preToken={preToken}
        userEmail={verifiedUser.email}
        userPhone={verifiedUser.phone}
        onVerified={handleOTPVerified}
      />
    );
  }

  return (
    <>
      {referredBy && (
        <div className="mb-5 px-3.5 py-2.5 rounded-xl text-sm text-success flex items-center gap-2"
          style={{ background: "rgba(16,217,138,0.08)", border: "1px solid rgba(16,217,138,0.25)" }}>
          <span>🎉</span>
          <span>You were invited! Join free — your contact gets credit too.</span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-black text-primary tracking-tight">Start your free trial</h1>
        <p className="text-sm text-secondary mt-1">14 days free · No credit card required</p>
      </div>

      {error && (
        <div className="mb-5 px-3.5 py-2.5 rounded-xl text-sm text-danger"
          style={{ background: "rgba(245,66,77,0.08)", border: "1px solid rgba(245,66,77,0.25)" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name + Business */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">Full Name</label>
            <div className="relative">
              <FiUser size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" placeholder="Rajesh Kumar" value={form.name}
                onChange={set("name")} required
                className={inputCls + " pl-9"} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">Business Name</label>
            <input type="text" placeholder="Kumar Traders" value={form.business_name}
              onChange={set("business_name")} required
              className={inputCls} style={inputStyle} />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">Email</label>
          <div className="relative">
            <FiMail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type="email" placeholder="rajesh@kumartraders.com" value={form.email}
              onChange={set("email")} required autoComplete="email"
              className={inputCls + " pl-9"} style={inputStyle} />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">
            Phone <span className="normal-case font-normal text-muted">(WhatsApp — OTP sent here)</span>
          </label>
          <div className="flex">
            <span className="flex items-center px-3.5 rounded-l-xl text-secondary text-sm font-mono shrink-0"
              style={{ background: "#0D0F14", border: "1px solid rgba(255,255,255,0.1)", borderRight: "none" }}>+91</span>
            <input type="tel" placeholder="9876543210" value={form.phone}
              onChange={set("phone")} required maxLength={10} pattern="\d{10}"
              title="Enter 10-digit mobile number"
              className="flex-1 text-sm text-primary placeholder:text-muted py-3 px-3.5 focus:outline-none transition-colors"
              style={{ background: "#0D0F14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0 12px 12px 0" }} />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">Password</label>
          <div className="relative">
            <FiLock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type={showPassword ? "text" : "password"} placeholder="Min 8 characters"
              value={form.password} onChange={set("password")} required minLength={8}
              className={inputCls + " pl-9 pr-10"} style={inputStyle} />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
              {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
            </button>
          </div>
          {form.password.length > 0 && form.password.length < 8 && (
            <p className="text-xs text-danger mt-1">At least 8 characters</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">Confirm Password</label>
          <div className="relative">
            <FiLock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input type={showConfirm ? "text" : "password"} placeholder="Re-enter password"
              value={form.confirm_password} onChange={set("confirm_password")} required
              className={inputCls + " pl-9 pr-10"} style={inputStyle} />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
              {showConfirm ? <FiEyeOff size={14} /> : <FiEye size={14} />}
            </button>
          </div>
          {form.confirm_password.length > 0 && form.password !== form.confirm_password && (
            <p className="text-xs text-danger mt-1">Passwords do not match</p>
          )}
          {form.confirm_password.length > 0 && form.password === form.confirm_password && form.password.length >= 8 && (
            <p className="text-xs text-success mt-1">✓ Passwords match</p>
          )}
        </div>

        {/* Industry */}
        <div>
          <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">Industry / Business Type</label>
          <select value={form.business_type} onChange={set("business_type")} required
            className={inputCls} style={{ ...inputStyle, appearance: "none" as const }}>
            {businessTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">Amount Stuck in Receivables</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm font-mono">₹</span>
            <input type="number" placeholder="2500000" value={form.amount_stuck}
              onChange={set("amount_stuck")} required
              className={inputCls + " pl-7"} style={inputStyle} />
          </div>
          <p className="text-xs text-muted mt-1">Approximate outstanding from customers</p>
        </div>

        {/* OTP notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl"
          style={{ background: "rgba(79,110,247,0.05)", border: "1px solid rgba(79,110,247,0.15)" }}>
          <FiPhone size={13} className="text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-secondary leading-relaxed">
            We'll send a <span className="font-semibold text-primary">6-digit OTP</span> to your WhatsApp &amp; email to verify your account.
          </p>
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 mt-2"
          style={{ background: "#fff", color: "#000" }}>
          {loading
            ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Creating account…</>
            : <><FiZap size={14} /> Continue — Send OTP</>}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">No credit card required · Cancel anytime</p>

      <div className="mt-5 pt-5 border-t border-border text-center">
        <p className="text-sm text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline font-semibold">Sign in</Link>
        </p>
      </div>
    </>
  );
}

// Skeleton fallback
function SignupSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-48 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-4 w-64 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="h-10 w-full rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="h-10 w-full rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="h-10 w-full rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="h-12 w-full rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

// ─── Left panel benefit bullets ───────────────────────────────────────────────
const BENEFITS = [
  { icon: FiMessageCircle, label: "Hinglish WhatsApp reminders auto-sent", color: "#10D98A" },
  { icon: FiTrendingUp,    label: "AI scores which customers to call first", color: "#4F6EF7" },
  { icon: FiBarChart2,     label: "Cash flow forecast for next 30/60/90 days", color: "#FF6B35" },
  { icon: FiZap,           label: "Daily dunning runs at 9 AM — hands-free", color: "#F5CE3E" },
];

const TRUST_BADGES = ["14 days free", "No credit card", "Cancel anytime"];

// Page export
export default function SignupPage() {
  return (
    <div className="min-h-screen flex"
      style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
        backgroundSize: "54px 54px",
        backgroundColor: "#0D0F14",
      }}>

      {/* ── LEFT PANEL — desktop only ─────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] xl:w-[460px] shrink-0 p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #161A24 0%, #1A1F2E 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(16,217,138,0.08), transparent 70%)" }} />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <LogoMark size={28} />
          <span className="font-bold text-primary">Vantro</span>
        </Link>

        {/* Headline + benefits */}
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-primary tracking-tighter leading-tight mb-3">
            Join 200+ MSMEs<br />
            <span style={{ color: "#10D98A" }}>collecting smarter.</span>
          </h2>
          <p className="text-sm text-secondary leading-relaxed mb-8">
            Stop manually chasing payments. Vantro AutoPilot sends reminders, tracks promises, and forecasts your cash — automatically.
          </p>

          <div className="space-y-3 mb-8">
            {BENEFITS.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <span className="text-sm text-secondary">{label}</span>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2">
            {TRUST_BADGES.map(b => (
              <div key={b} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: "rgba(16,217,138,0.08)", border: "1px solid rgba(16,217,138,0.2)" }}>
                <FiCheck size={10} className="text-success" />
                <span className="text-xs text-success font-medium">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat */}
        <div className="relative z-10 p-4 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-sm text-secondary leading-relaxed mb-3 italic">
            &ldquo;₹22 lakh collected in 6 weeks that was stuck for 8 months. Setup took 10 minutes.&rdquo;
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(16,217,138,0.12)", border: "1px solid rgba(16,217,138,0.25)", color: "#10D98A" }}>VM</div>
            <div>
              <p className="text-xs font-bold text-primary">Vikram Mehta</p>
              <p className="text-[10px] text-muted">Mehta Fabrics, Surat</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ───────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <LogoMark size={32} />
            <span className="font-bold text-base text-primary tracking-tight">Vantro</span>
          </div>

          {/* Form card */}
          <div className="rounded-2xl p-7"
            style={{ background: "#161A24", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <Suspense fallback={<SignupSkeleton />}>
              <SignupForm />
            </Suspense>
          </div>

          <p className="mt-5 text-center text-xs text-muted">
            <Link href="/" className="hover:text-secondary transition-colors">← Back to Vantro</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
