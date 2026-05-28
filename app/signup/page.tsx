"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiEye, FiEyeOff, FiRefreshCw, FiCheckCircle, FiArrowRight, FiZap,
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

// ── Shared input style ────────────────────────────────────────────────────────
const fieldCls = "w-full text-[13px] text-white placeholder:text-white/25 py-3 px-4 focus:outline-none transition-all duration-150 bg-transparent";
const fieldStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
};
const fieldFocusStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: "10px",
};

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block mb-1.5 text-[11px] font-medium tracking-wide"
        style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement> & { wrapClass?: string }) {
  const [focused, setFocused] = useState(false);
  const { wrapClass, style: _s, className: _c, ...rest } = props;
  return (
    <input
      {...rest}
      className={fieldCls + (props.className ? " " + props.className : "")}
      style={focused ? fieldFocusStyle : fieldStyle}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ── OTP Step ──────────────────────────────────────────────────────────────────
function OTPStep({
  preToken, userEmail, userPhone, onVerified,
}: {
  preToken: string; userEmail: string; userPhone: string;
  onVerified: (token: string, user: object, csrfToken?: string | null) => void;
}) {
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]     = useState("");
  const [resent, setResent]   = useState(false);
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
    <div className="space-y-7">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white tracking-tight mb-2">Check your phone</h2>
        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
          6-digit code sent to{" "}
          {maskedPhone && <span className="text-white">{maskedPhone}</span>}
          {maskedPhone && maskedEmail && " and "}
          {maskedEmail && <span className="text-white">{maskedEmail}</span>}
        </p>
      </div>

      <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            type="tel" inputMode="numeric" maxLength={1}
            value={digit} autoFocus={i === 0}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-11 h-13 text-center text-xl font-bold focus:outline-none transition-all"
            style={{
              height: "52px",
              background: digit ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${digit ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "10px",
              color: "#ffffff",
              opacity: loading ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-[12px] text-red-400">{error}</p>
      )}
      {resent && (
        <div className="flex items-center justify-center gap-1.5 text-[12px]" style={{ color: "#10D98A" }}>
          <FiCheckCircle size={13} /> New code sent
        </div>
      )}

      <button
        disabled={loading || otp.join("").length < 6}
        onClick={() => handleVerify()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30"
        style={{ background: "#ffffff", color: "#000000" }}
      >
        {loading
          ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Verifying…</>
          : <>Verify & continue <FiArrowRight size={13} /></>}
      </button>

      <div className="text-center">
        {countdown > 0
          ? <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>Resend in {countdown}s</p>
          : (
            <button onClick={handleResend} disabled={resending}
              className="text-[12px] transition-colors disabled:opacity-40"
              style={{ color: "rgba(255,255,255,0.45)" }}>
              {resending ? <><FiRefreshCw size={11} className="inline animate-spin mr-1" />Sending…</> : "Resend code"}
            </button>
          )}
      </div>
    </div>
  );
}

// ── Signup Form ───────────────────────────────────────────────────────────────
function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const referredBy = params.get("ref") || "";

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [otpStep, setOtpStep]   = useState(false);
  const [preToken, setPreToken] = useState("");
  const [verifiedUser, setVerifiedUser] = useState<{ email: string; phone: string } | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", business_name: "",
    business_type: "", amount_stuck: "", password: "", confirm_password: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
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
  };

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
    <div className="space-y-5">
      {referredBy && (
        <div className="px-4 py-3 rounded-xl text-[12px]"
          style={{ background: "rgba(16,217,138,0.08)", border: "1px solid rgba(16,217,138,0.2)", color: "#10D98A" }}>
          🎉 You were invited — join free
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl text-[12px]"
          style={{ background: "rgba(245,66,77,0.08)", border: "1px solid rgba(245,66,77,0.2)", color: "#F5424D" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name + Business */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name">
            <FocusInput type="text" placeholder="Rajesh Kumar" value={form.name} onChange={set("name")} required />
          </Field>
          <Field label="Business name">
            <FocusInput type="text" placeholder="Kumar Traders" value={form.business_name} onChange={set("business_name")} required />
          </Field>
        </div>

        {/* Email */}
        <Field label="Email">
          <FocusInput type="email" placeholder="rajesh@kumartraders.com" value={form.email} onChange={set("email")} required autoComplete="email" />
        </Field>

        {/* Phone */}
        <Field label="Phone (WhatsApp — OTP sent here)">
          <div className="flex">
            <span
              className="flex items-center px-3.5 text-[13px] font-mono shrink-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRight: "none",
                borderRadius: "10px 0 0 10px",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              +91
            </span>
            <input
              type="tel" placeholder="9876543210" value={form.phone}
              onChange={set("phone")} required maxLength={10} pattern="\d{10}"
              title="Enter 10-digit mobile number"
              className="flex-1 text-[13px] text-white placeholder:text-white/25 py-3 px-4 focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0 10px 10px 0",
              }}
            />
          </div>
        </Field>

        {/* Password */}
        <Field label="Password">
          <div className="relative">
            <FocusInput
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              value={form.password} onChange={set("password")} required minLength={8}
              className="pr-10"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              {showPassword ? <FiEyeOff size={14} /> : <FiEye size={14} />}
            </button>
          </div>
          {form.password.length > 0 && form.password.length < 8 && (
            <p className="text-[11px] mt-1" style={{ color: "#F5424D" }}>At least 8 characters</p>
          )}
        </Field>

        {/* Confirm Password */}
        <Field label="Confirm password">
          <div className="relative">
            <FocusInput
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter password"
              value={form.confirm_password} onChange={set("confirm_password")} required
              className="pr-10"
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              {showConfirm ? <FiEyeOff size={14} /> : <FiEye size={14} />}
            </button>
          </div>
          {form.confirm_password.length > 0 && form.password !== form.confirm_password && (
            <p className="text-[11px] mt-1" style={{ color: "#F5424D" }}>Passwords do not match</p>
          )}
          {form.confirm_password.length > 0 && form.password === form.confirm_password && form.password.length >= 8 && (
            <p className="text-[11px] mt-1" style={{ color: "#10D98A" }}>✓ Looks good</p>
          )}
        </Field>

        {/* Industry */}
        <Field label="Industry">
          <select
            value={form.business_type} onChange={set("business_type")} required
            className="w-full text-[13px] py-3 px-4 focus:outline-none transition-all"
            style={{ ...fieldStyle, color: form.business_type ? "#ffffff" : "rgba(255,255,255,0.25)", appearance: "none" }}
          >
            {businessTypes.map(o => (
              <option key={o.value} value={o.value} style={{ background: "#111111", color: "#ffffff" }}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Amount */}
        <Field label="Amount stuck in receivables (approx)">
          <div className="relative">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-mono"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              ₹
            </span>
            <FocusInput
              type="number" placeholder="2500000"
              value={form.amount_stuck} onChange={set("amount_stuck")} required
              className="pl-7"
            />
          </div>
          <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
            Approximate outstanding from customers
          </p>
        </Field>

        <button
          type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30 mt-1"
          style={{ background: "#ffffff", color: "#000000" }}
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Creating account…</>
            : <>Continue <FiArrowRight size={13} /></>}
        </button>
      </form>

      <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
        No credit card required · Cancel anytime
      </p>

      <div className="pt-4 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          Already have an account?{" "}
          <Link href="/login" className="text-white hover:opacity-70 transition-opacity font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function SignupSkeleton() {
  return (
    <div className="space-y-4">
      {[48, 40, 40, 40, 40, 48].map((h, i) => (
        <div key={i} className="rounded-xl animate-pulse" style={{ height: `${h}px`, background: "rgba(255,255,255,0.05)" }} />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SignupPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#080808" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <LogoMark size={36} />
        <span
          className="font-semibold tracking-tight"
          style={{ fontSize: "16px", color: "rgba(255,255,255,0.7)", letterSpacing: "-0.01em" }}
        >
          Vantro
        </span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: "#0e0e0e",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div className="mb-7">
          <h1
            className="font-semibold tracking-tight mb-1"
            style={{ fontSize: "22px", color: "#ffffff", letterSpacing: "-0.02em" }}
          >
            Create your account
          </h1>
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            14 days free · No credit card required
          </p>
        </div>

        <Suspense fallback={<SignupSkeleton />}>
          <SignupForm />
        </Suspense>
      </div>

      <Link
        href="/"
        className="mt-6 text-[12px] transition-colors"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        ← Back to Vantro
      </Link>
    </div>
  );
}
