"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiZap, FiUser, FiMail, FiArrowRight } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

const businessTypes = [
  { value: "", label: "Select business type" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "trading", label: "Trading / Distribution" },
  { value: "services", label: "Services" },
  { value: "retail", label: "Retail" },
  { value: "construction", label: "Construction" },
  { value: "other", label: "Other" },
];

export default function SignupPage() {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Registration failed");
      }
      const data = await res.json();
      localStorage.setItem("vantro_token", data.token || "demo");
      localStorage.setItem("vantro_user", JSON.stringify(data.user || { ...form }));
      router.push("/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center">
            <FiZap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Vantro Flow</span>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <h1 className="text-xl font-bold text-primary mb-1">Start your free trial</h1>
          <p className="text-sm text-secondary mb-6">14 days free. No credit card required.</p>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-danger-dim border border-danger/30 rounded text-sm text-danger">
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
              <label className="text-xs font-medium text-secondary uppercase tracking-wider">Phone</label>
              <div className="flex">
                <span className="flex items-center px-3 bg-surface-2 border border-r-0 border-border rounded-l-md text-secondary text-sm font-mono">+91</span>
                <input type="tel" placeholder="9876543210" value={form.phone}
                  onChange={set("phone")} required maxLength={10}
                  className="flex-1 bg-surface-2 border border-border rounded-r-md text-sm text-primary placeholder-muted px-3 py-2.5 focus:outline-none focus:border-accent transition-colors" />
              </div>
            </div>

            <Select label="Business Type" options={businessTypes}
              value={form.business_type} onChange={set("business_type")} required />

            <Input label="Amount Stuck in Receivables (INR)" type="number" prefix="₹"
              placeholder="2500000" value={form.amount_stuck} onChange={set("amount_stuck")} required
              hint="Approximate total outstanding from customers" />

            {/* Plan selection */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-secondary uppercase tracking-wider">Preferred Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "saas",   label: "Model A — SaaS",   sub: "₹1,999/mo flat" },
                  { value: "hybrid", label: "Model B — Hybrid",  sub: "₹999/mo + 1%" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, plan: p.value }))}
                    className={[
                      "text-left p-3 rounded-md border transition-colors",
                      form.plan === p.value
                        ? "border-accent bg-accent-dim"
                        : "border-border bg-surface-2 hover:border-border/60",
                    ].join(" ")}
                  >
                    <p className={["text-xs font-semibold", form.plan === p.value ? "text-accent" : "text-primary"].join(" ")}>
                      {p.label}
                    </p>
                    <p className="text-2xs text-secondary mt-0.5">{p.sub}</p>
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
      </div>
    </div>
  );
}
