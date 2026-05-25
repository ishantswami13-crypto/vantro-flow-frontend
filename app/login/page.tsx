"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiCheck, FiZap } from "react-icons/fi";
import LogoMark from "@/components/LogoMark";
import { api, saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [step, setStep]             = useState<"email" | "password">("email");
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm]             = useState({ email: "", password: "" });
  const [emailValid, setEmailValid] = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  // Check for saved email (remember me)
  useEffect(() => {
    const saved = localStorage.getItem("vantro_saved_email");
    if (saved) { setForm(f => ({ ...f, email: saved })); setEmailValid(true); }
  }, []);

  // Auto-focus password when step changes
  useEffect(() => {
    if (step === "password") setTimeout(() => passRef.current?.focus(), 150);
  }, [step]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailNext = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateEmail(form.email)) { setError("Valid email daalo"); return; }
    setError("");
    setStep("password");
  };

  const handleLogin = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.auth.login(form);
      // Remember me — save email, token duration
      if (rememberMe) {
        localStorage.setItem("vantro_saved_email", form.email);
        localStorage.setItem("vantro_remember", "1");
        document.cookie = `vantro_token=${data.token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
      } else {
        localStorage.removeItem("vantro_saved_email");
        localStorage.removeItem("vantro_remember");
        document.cookie = `vantro_token=${data.token}; path=/; SameSite=Lax`; // session cookie
      }
      saveAuth(data.token, data.user);
      posthog.identify(data.user.id, { email: data.user.email, name: data.user.business_name, plan: data.user.plan });
      posthog.capture("user_logged_in");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Check email & password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <LogoMark size={36} />
          <div>
            <p className="font-bold text-base text-primary leading-none tracking-tight">Vantro</p>
            <p className="text-2xs text-muted">Business OS</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6 shadow-card">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-primary">
              {step === "email" ? "Sign in 👋" : "Welcome back!"}
            </h1>
            <p className="text-sm text-secondary mt-1">
              {step === "email" ? "Enter your email to continue" : `Signing in as ${form.email}`}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-danger/8 border border-danger/30 rounded-xl text-sm text-danger">
              {error}
            </div>
          )}

          {/* ── STEP 1: Email ── */}
          {step === "email" && (
            <form onSubmit={handleEmailNext} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">Email</label>
                <div className="relative">
                  <FiMail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="email" autoFocus autoComplete="email"
                    placeholder="rajesh@kumartraders.com"
                    value={form.email}
                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailValid(validateEmail(e.target.value)); setError(""); }}
                    className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary pl-9 pr-10 py-3 focus:outline-none focus:border-accent transition-colors"
                  />
                  {emailValid && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                      <FiCheck size={11} className="text-success" />
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" disabled={!emailValid}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-bold text-sm shadow-sm hover:bg-white/90 transition-all disabled:opacity-40">
                Continue <FiArrowRight size={14} />
              </button>
            </form>
          )}

          {/* ── STEP 2: Password ── */}
          {step === "password" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email (read-only chip) */}
              <div className="flex items-center justify-between px-3 py-2.5 bg-surface-2 border border-border rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <FiMail size={11} className="text-accent" />
                  </div>
                  <span className="text-sm text-primary">{form.email}</span>
                </div>
                <button type="button" onClick={() => { setStep("email"); setForm(f => ({ ...f, password: "" })); setError(""); }}
                  className="text-xs text-accent hover:underline font-medium">
                  Change
                </button>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">Password</label>
                <div className="relative">
                  <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    ref={passRef}
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(""); }}
                    autoComplete="current-password"
                    required
                    className="w-full bg-surface-2 border border-border rounded-xl text-sm text-primary pl-9 pr-10 py-3 focus:outline-none focus:border-accent transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
                    {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div onClick={() => setRememberMe(r => !r)}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${rememberMe ? "bg-accent" : "bg-surface-3 border border-border"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rememberMe ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-secondary group-hover:text-primary transition-colors">Remember me for 30 days</span>
              </label>

              <button type="submit" disabled={loading || !form.password}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-bold text-sm shadow-sm hover:bg-white/90 transition-all disabled:opacity-40">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Signing in…</>
                ) : (
                  <><FiZap size={14} /> Sign In</>
                )}
              </button>

              <Link href="/forgot-password" className="block text-center text-xs text-muted hover:text-secondary transition-colors">
                Forgot password?
              </Link>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-border text-center">
            <p className="text-sm text-secondary">
              Account nahi hai?{" "}
              <Link href="/signup" className="text-accent hover:underline font-semibold">
                Free trial shuru karo
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="hover:text-secondary transition-colors">Vantro Flow</Link>
          {" "}&mdash; Collections OS for Indian MSMEs
        </p>
      </div>
    </div>
  );
}
