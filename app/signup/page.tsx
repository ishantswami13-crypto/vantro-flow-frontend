"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiZap, FiUser, FiMail, FiArrowRight } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { api, saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";

const businessTypes = [
  { value: "", label: "Select business type" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "trading", label: "Trading / Distribution" },
  { value: "services", label: "Services" },
  { value: "retail", label: "Retail" },
  { value: "construction", label: "Construction" },
  { value: "other", label: "Other" },
];

// Inner component — uses useSearchParams, must be inside <Suspense>
function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultPlan = params.get("plan") === "hybrid" ? "hybrid" : "saas";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    business_name: "",
    business_type: "",
    amount_stuck: "",
    plan: defaultPlan,
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.auth.signup({
        email: form.email,
        phone: form.phone,
        business_name: form.business_name,
        password: form.password || form.phone, // fallback to phone as temp password
      });
      saveAuth(data.token, data.user);
      document.cookie = `vantro_token=${data.token}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`;
      posthog.identify(data.user.id, {
        email:         data.user.email,
        name:          data.user.business_name,
        plan:          data.user.plan,
        phone:         data.user.phone,
        business_type: form.business_type,
        amount_stuck:  form.amount_stuck,
      });
      posthog.capture("user_signed_up", {
        plan:          form.plan,
        business_type: form.business_type,
      });
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-premium p-6">
      <h1 className="text-xl font-bold text-primary mb-1">Start your free trial</h1>
      <p className="text-sm text-secondary mb-6">14 days free. No credit card required.</p>

      {error && (
        <div className="mb-4 px-3 py-2.5 bg-danger-dim border border-danger/30 rounded-lg text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Full Name" type="text" icon={<FiUser size={15} />} placeholder="Rajesh Kumar"
            value={form.name} onChange={set("name")} required />
          <Input label="Business Name" type="text" placeholder="Kumar Traders"
            value={form.business_name} onChange={set("business_name")} required />
        </div>

        <Input label="Email" type="email" icon={<FiMail size={15} />} placeholder="rajesh@kumartraders.com"
          value={form.email} onChange={set("email")} required />

        <div className="flex flex-col gap-1.5">
          <label className="section-label">Phone</label>
          <div className="flex">
            <span className="flex items-center px-3 bg-surface-2 border border-r-0 border-border rounded-l-xl text-secondary text-sm font-mono">+91</span>
            <input
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={set("phone")}
              required
              maxLength={10}
              className="flex-1 bg-surface-2 border border-border rounded-r-xl text-sm text-primary placeholder-muted px-3 py-2.5 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <Select label="Business Type" options={businessTypes}
          value={form.business_type} onChange={set("business_type")} required />

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
              { value: "saas",   label: "Model A — SaaS",  sub: "₹1,999/mo flat" },
              { value: "hybrid", label: "Model B — Hybrid", sub: "₹999/mo + 1%" },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, plan: p.value }))}
                className={[
                  "text-left p-3 rounded-xl border transition-all",
                  form.plan === p.value
                    ? "border-accent bg-accent-dim shadow-accent-sm"
                    : "border-border bg-surface-2 hover:border-border-2",
                ].join(" ")}
              >
                <p className={["text-xs font-semibold", form.plan === p.value ? "text-accent" : "text-primary"].join(" ")}>
                  {p.label}
                </p>
                <p className="text-2xs text-muted mt-0.5">{p.sub}</p>
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" fullWidth loading={loading} icon={<FiArrowRight size={15} />} className="mt-2">
          Start 14-Day Free Trial
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

// Fallback shown while Suspense loads
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

// Page export — wraps form in Suspense so useSearchParams works during SSG
export default function SignupPage() {
  return (
    <div className="min-h-screen bg-bg bg-grid-pattern flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-accent flex items-center justify-center shadow-button-accent">
            <FiZap size={17} className="text-white" />
          </div>
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
