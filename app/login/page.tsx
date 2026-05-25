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
      // Remember me — save email preference
      if (rememberMe) {
        localStorage.setItem("vantro_saved_email", form.email);
        localStorage.setItem("vantro_remember", "1");
      } else {
        localStorage.removeItem("vantro_saved_email");
        localStorage.removeItem("vantro_remember");
      }
      // saveAuth sets both localStorage AND the cookie with the right duration
      saveAuth(data.token, data.user, rememberMe);
      posthog.identify(data.user.id, { email: data.user.email, name: data.user.business_name, plan: data.user.plan });
      posthog.capture("user_logged_in");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Check email & password.");
    } finally {
      setLoading(false);
    }
  };

  const SIDE_STATS = [
    { v: "₹45Cr+",    l: "Receivables managed" },
    { v: "18 days",   l: "Avg DSO reduction" },
    { v: "200+ MSMEs", l: "Collecting smarter" },
  ];

  return (
    <div className="min-h-screen flex" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "54px 54px", backgroundColor: "#0D0F14" }}>

      {/* ── LEFT PANEL — desktop only ─────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] xl:w-[460px] shrink-0 p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #161A24 0%, #1A1F2E 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(79,110,247,0.12), transparent 70%)" }} />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 relative z-10">
          <LogoMark size={28} />
          <span className="font-bold text-primary">Vantro</span>
        </Link>

        {/* Headline */}
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-primary tracking-tighter leading-tight mb-4">
            Welcome back.<br />
            <span style={{ color: "#10D98A" }}>Your collections</span><br />
            are waiting.
          </h2>
          <p className="text-sm text-secondary leading-relaxed mb-8">
            Log in to see your outstanding invoices, AI priority list, and daily collections dashboard.
          </p>
          <div className="space-y-2.5">
            {SIDE_STATS.map(({ v, l }) => (
              <div key={l} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="font-black text-primary text-sm tracking-tight">{v}</span>
                <span className="w-px h-3 bg-border" />
                <span className="text-secondary text-xs">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-sm text-secondary leading-relaxed mb-3 italic">
            &ldquo;Collected ₹22L in 6 weeks that had been stuck for 8 months. The WhatsApp reminders in Hinglish changed everything.&rdquo;
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(79,110,247,0.15)", border: "1px solid rgba(79,110,247,0.25)", color: "#4F6EF7" }}>VM</div>
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
          <div className="rounded-2xl p-7" style={{ background: "#161A24", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <div className="mb-7">
              <h1 className="text-2xl font-black text-primary tracking-tight">
                {step === "email" ? "Sign in" : "Welcome back!"}
              </h1>
              <p className="text-sm text-secondary mt-1">
                {step === "email" ? "Enter your email to continue" : `Signing in as ${form.email}`}
              </p>
            </div>

            {error && (
              <div className="mb-5 px-3.5 py-2.5 rounded-xl text-sm text-danger" style={{ background: "rgba(245,66,77,0.08)", border: "1px solid rgba(245,66,77,0.25)" }}>
                {error}
              </div>
            )}

            {/* ── STEP 1: Email ── */}
            {step === "email" && (
              <form onSubmit={handleEmailNext} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">Email</label>
                  <div className="relative">
                    <FiMail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="email" autoFocus autoComplete="email" placeholder="rajesh@kumartraders.com"
                      value={form.email}
                      onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setEmailValid(validateEmail(e.target.value)); setError(""); }}
                      className="w-full border rounded-xl text-sm text-primary pl-9 pr-10 py-3 focus:outline-none transition-colors"
                      style={{ background: "#0D0F14", borderColor: "rgba(255,255,255,0.1)" }}
                    />
                    {emailValid && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(16,217,138,0.15)" }}>
                        <FiCheck size={11} className="text-success" />
                      </div>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={!emailValid}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                  style={{ background: "#fff", color: "#000" }}>
                  Continue <FiArrowRight size={14} />
                </button>
              </form>
            )}

            {/* ── STEP 2: Password ── */}
            {step === "password" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border"
                  style={{ background: "#0D0F14", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(79,110,247,0.15)" }}>
                      <FiMail size={11} className="text-accent" />
                    </div>
                    <span className="text-sm text-primary">{form.email}</span>
                  </div>
                  <button type="button" onClick={() => { setStep("email"); setForm(f => ({ ...f, password: "" })); setError(""); }}
                    className="text-xs text-accent hover:underline font-medium">Change</button>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-[0.12em] block mb-2">Password</label>
                  <div className="relative">
                    <FiLock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input ref={passRef} type={showPass ? "text" : "password"} placeholder="••••••••"
                      value={form.password}
                      onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(""); }}
                      autoComplete="current-password" required
                      className="w-full border rounded-xl text-sm text-primary pl-9 pr-10 py-3 focus:outline-none transition-colors"
                      style={{ background: "#0D0F14", borderColor: "rgba(255,255,255,0.1)" }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
                      {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setRememberMe(r => !r)}
                    className={`w-10 h-5 rounded-full relative shrink-0 transition-colors ${rememberMe ? "bg-accent" : "bg-surface-3 border border-border"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rememberMe ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-secondary">Remember me for 30 days</span>
                </label>

                <button type="submit" disabled={loading || !form.password}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                  style={{ background: "#fff", color: "#000" }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Signing in…</>
                    : <><FiZap size={14} /> Sign In</>}
                </button>

                <Link href="/forgot-password" className="block text-center text-xs text-muted hover:text-secondary transition-colors pt-1">
                  Forgot password?
                </Link>
              </form>
            )}

            <div className="mt-6 pt-5 border-t border-border text-center">
              <p className="text-sm text-secondary">
                Account nahi hai?{" "}
                <Link href="/signup" className="text-accent hover:underline font-semibold">Free trial shuru karo</Link>
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-muted">
            <Link href="/" className="hover:text-secondary transition-colors">← Back to Vantro</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
