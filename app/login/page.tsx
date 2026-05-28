"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiArrowRight, FiCheck } from "react-icons/fi";
import LogoMark from "@/components/LogoMark";
import { api, saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";

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
    if (!validateEmail(form.email)) { setError("Enter a valid email"); return; }
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
        className="w-full max-w-sm rounded-2xl p-8"
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
            {step === "email" ? "Sign in" : "Welcome back"}
          </h1>
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            {step === "email" ? "Enter your email to continue" : form.email}
          </p>
        </div>

        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-[12px]"
            style={{ background: "rgba(245,66,77,0.08)", border: "1px solid rgba(245,66,77,0.2)", color: "#F5424D" }}
          >
            {error}
          </div>
        )}

        {/* Step 1: Email */}
        {step === "email" && (
          <form onSubmit={handleEmailNext} className="space-y-4">
            <div>
              <label
                className="block mb-1.5 text-[11px] font-medium tracking-wide"
                style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                Email
              </label>
              <div className="relative">
                <input
                  type="email" autoFocus autoComplete="email"
                  placeholder="rajesh@kumartraders.com"
                  value={form.email}
                  onChange={e => {
                    setForm(f => ({ ...f, email: e.target.value }));
                    setEmailValid(validateEmail(e.target.value));
                    setError("");
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="w-full text-[13px] text-white placeholder:text-white/25 py-3 px-4 pr-10 focus:outline-none transition-all"
                  style={emailFocused ? fieldFocusStyle : fieldStyle}
                />
                {emailValid && (
                  <div
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(16,217,138,0.15)" }}
                  >
                    <FiCheck size={11} style={{ color: "#10D98A" }} />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit" disabled={!emailValid}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30"
              style={{ background: "#ffffff", color: "#000000" }}
            >
              Continue <FiArrowRight size={13} />
            </button>
          </form>
        )}

        {/* Step 2: Password */}
        {step === "password" && (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email pill — editable */}
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{form.email}</span>
              <button
                type="button"
                onClick={() => { setStep("email"); setForm(f => ({ ...f, password: "" })); setError(""); }}
                className="text-[12px] transition-colors"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#ffffff")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)")}
              >
                Change
              </button>
            </div>

            <div>
              <label
                className="block mb-1.5 text-[11px] font-medium tracking-wide"
                style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  ref={passRef}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(""); }}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  autoComplete="current-password" required
                  className="w-full text-[13px] text-white placeholder:text-white/25 py-3 px-4 pr-10 focus:outline-none transition-all"
                  style={passFocused ? fieldFocusStyle : fieldStyle}
                />
                <button
                  type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setRememberMe(r => !r)}
                className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
                style={{ background: rememberMe ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.1)" }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 bg-black rounded-full shadow transition-transform"
                  style={{ transform: rememberMe ? "translateX(16px)" : "translateX(2px)" }}
                />
              </div>
              <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Stay signed in for 30 days
              </span>
            </label>

            <button
              type="submit" disabled={loading || !form.password}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30"
              style={{ background: "#ffffff", color: "#000000" }}
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Signing in…</>
                : <>Sign in <FiArrowRight size={13} /></>}
            </button>

            <Link
              href="/forgot-password"
              className="block text-center text-[12px] transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Forgot password?
            </Link>
          </form>
        )}

        <div className="mt-6 pt-5 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            No account?{" "}
            <Link href="/signup" className="text-white hover:opacity-70 transition-opacity font-medium">
              Start free trial
            </Link>
          </p>
        </div>
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
