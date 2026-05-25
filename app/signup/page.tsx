"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FiUser, FiMail, FiArrowRight, FiLock,
  FiEye, FiEyeOff, FiPhone, FiRefreshCw, FiCheckCircle,
} from "react-icons/fi";
import LogoMark from "@/components/LogoMark";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
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

  // Countdown for resend
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
    <div className="card-premium p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
          <FiPhone size={22} className="text-accent" />
        </div>
        <h1 className="text-xl font-bold text-primary">Verify your account</h1>
        <p className="text-sm text-secondary mt-1.5 leading-relaxed">
          We sent a 6-digit code to
          {maskedPhone && <><br /><span className="font-semibold text-primary">{maskedPhone}</span> (WhatsApp)</>}
          {maskedEmail && <><br /><span className="font-semibold text-primary">{maskedEmail}</span> (Email)</>}
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
            className={[
              "w-11 h-14 text-center text-xl font-bold rounded-xl border transition-all",
              "bg-surface-2 text-primary focus:outline-none",
              digit ? "border-accent bg-accent-dim" : "border-border focus:border-accent",
              loading ? "opacity-50 pointer-events-none" : "",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2.5 bg-danger-dim border border-danger/30 rounded-lg text-sm text-danger text-center">
          {error}
        </div>
      )}

      {/* Resent confirmation */}
      {resent && (
        <div className="flex items-center justify-center gap-2 text-sm text-success">
          <FiCheckCircle size={14} />
          New OTP sent to your phone and email
        </div>
      )}

      {/* Verify button */}
      <Button
        fullWidth
        loading={loading}
        disabled={otp.join("").length < 6}
        onClick={() => handleVerify()}
        icon={<FiArrowRight size={15} />}
      >
        Verify & Enter Dashboard
      </Button>

      {/* Resend */}
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

      <p className="text-center text-2xs text-muted">
        OTP expires in 10 minutes · Check WhatsApp & spam folder
      </p>
    </div>
  );
}

// ─── Signup Form ─────────────────────────────────────────────────────────────
function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultPlan = params.get("plan") === "hybrid" ? "hybrid" : "saas";
  const referredBy  = params.get("ref") || "";

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  // OTP step state
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
    plan:             defaultPlan,
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
        // Store pre-token and go to OTP step
        setPreToken(data.pre_token);
        setVerifiedUser({ email: data.user.email, phone: data.user.phone });
        setOtpStep(true);
      } else {
        // Fallback: direct login (OTP skipped)
        saveAuth(data.token, data.user);
        document.cookie = `vantro_token=${data.token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
        posthog.identify(data.user.id, { email: data.user.email, plan: data.user.plan });
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerified = (token: string, user: any) => {
    saveAuth(token, user);
    document.cookie = `vantro_token=${token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
    posthog.identify(user.id, {
      email:         user.email,
      name:          user.business_name,
      plan:          user.plan,
      phone:         user.phone,
      business_type: form.business_type,
      amount_stuck:  form.amount_stuck,
    });
    posthog.capture("user_signed_up", { plan: form.plan, business_type: form.business_type });
    router.push("/onboarding");
  };

  // Show OTP step
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

  // ── Signup form ──
  return (
    <div className="card-premium p-6">
      {referredBy && (
        <div className="mb-4 px-3 py-2.5 bg-success-dim border border-success/30 rounded-lg text-sm text-success flex items-center gap-2">
          <span>🎉</span>
          <span>You were invited! Join free — your contact gets credit too.</span>
        </div>
      )}
      <h1 className="text-xl font-bold text-primary mb-1">Start your free trial</h1>
      <p className="text-sm text-secondary mb-6">14 days free · No credit card required.</p>

      {error && (
        <div className="mb-4 px-3 py-2.5 bg-danger-dim border border-danger/30 rounded-lg text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name + Business */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Full Name" type="text" icon={<FiUser size={15} />}
            placeholder="Rajesh Kumar"
            value={form.name} onChange={set("name")} required />
          <Input label="Business Name" type="text" placeholder="Kumar Traders"
            value={form.business_name} onChange={set("business_name")} required />
        </div>

        {/* Email */}
        <Input label="Email" type="email" icon={<FiMail size={15} />}
          placeholder="rajesh@kumartraders.com"
          value={form.email} onChange={set("email")} required />

        {/* Phone */}
        <div className="flex flex-col gap-1.5">
          <label className="section-label">Phone (WhatsApp — OTP will be sent here)</label>
          <div className="flex">
            <span className="flex items-center px-3 bg-surface-2 border border-r-0 border-border rounded-l-xl text-secondary text-sm font-mono">+91</span>
            <input
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={set("phone")}
              required
              maxLength={10}
              pattern="\d{10}"
              title="Enter 10-digit mobile number"
              className="flex-1 bg-surface-2 border border-border rounded-r-xl text-sm text-primary placeholder-muted px-3 py-2.5 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="section-label">Password</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><FiLock size={15} /></span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              value={form.password}
              onChange={set("password")}
              required
              minLength={8}
              className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted pl-9 pr-10 py-2.5 focus:outline-none focus:border-accent transition-colors"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors">
              {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            </button>
          </div>
          {form.password.length > 0 && form.password.length < 8 && (
            <p className="text-2xs text-danger">Password must be at least 8 characters</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label className="section-label">Confirm Password</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><FiLock size={15} /></span>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter password"
              value={form.confirm_password}
              onChange={set("confirm_password")}
              required
              className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary placeholder-muted pl-9 pr-10 py-2.5 focus:outline-none focus:border-accent transition-colors"
            />
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors">
              {showConfirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
            </button>
          </div>
          {form.confirm_password.length > 0 && form.password !== form.confirm_password && (
            <p className="text-2xs text-danger">Passwords do not match</p>
          )}
          {form.confirm_password.length > 0 && form.password === form.confirm_password && form.password.length >= 8 && (
            <p className="text-2xs text-success">✓ Passwords match</p>
          )}
        </div>

        {/* Industry */}
        <Select label="Industry / Business Type" options={businessTypes}
          value={form.business_type} onChange={set("business_type")} required />

        {/* Amount */}
        <Input
          label="Amount Stuck in Receivables (INR)"
          type="number"
          prefix="₹"
          placeholder="2500000"
          value={form.amount_stuck}
          onChange={set("amount_stuck")}
          required
          hint="Approximate total outstanding from customers"
        />

        {/* Plan selection */}
        <div className="flex flex-col gap-2">
          <label className="section-label">Preferred Plan</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "saas",   label: "Model A — SaaS",   sub: "₹1,999/mo flat" },
              { value: "hybrid", label: "Model B — Hybrid",  sub: "₹999/mo + 1%" },
            ].map(p => (
              <button key={p.value} type="button"
                onClick={() => setForm(f => ({ ...f, plan: p.value }))}
                className={[
                  "text-left p-3 rounded-xl border transition-all",
                  form.plan === p.value
                    ? "border-accent bg-accent-dim shadow-accent-sm"
                    : "border-border bg-surface-2 hover:border-border-2",
                ].join(" ")}>
                <p className={["text-xs font-semibold", form.plan === p.value ? "text-accent" : "text-primary"].join(" ")}>
                  {p.label}
                </p>
                <p className="text-2xs text-muted mt-0.5">{p.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* OTP notice */}
        <div className="flex items-start gap-2.5 p-3 bg-accent/5 border border-accent/20 rounded-xl">
          <FiPhone size={14} className="text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-secondary leading-relaxed">
            After signup, we'll send a <span className="font-semibold text-primary">6-digit OTP</span> to your WhatsApp and email to verify your account.
          </p>
        </div>

        <Button type="submit" fullWidth loading={loading} icon={<FiArrowRight size={15} />} className="mt-2">
          Continue — Send OTP
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">
        No credit card required. Cancel anytime.
      </p>

      <div className="mt-4 pt-4 border-t border-border text-center">
        <p className="text-sm text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

// Skeleton fallback
function SignupSkeleton() {
  return (
    <div className="card-premium p-6 space-y-4">
      <div className="skeleton h-7 w-48" />
      <div className="skeleton h-4 w-64" />
      <div className="skeleton h-10 w-full" />
      <div className="skeleton h-10 w-full" />
      <div className="skeleton h-10 w-full" />
      <div className="skeleton h-12 w-full" />
    </div>
  );
}

// Page export
export default function SignupPage() {
  return (
    <div className="min-h-screen bg-bg bg-grid-pattern flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <LogoMark size={36} />
          <span className="font-bold text-lg tracking-tight">Vantro Flow</span>
        </div>

        <Suspense fallback={<SignupSkeleton />}>
          <SignupForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="hover:text-secondary transition-colors">Vantro Flow</Link>
          {" "}— Collections OS for Indian MSMEs
        </p>
      </div>
    </div>
  );
}
