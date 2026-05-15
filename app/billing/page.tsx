"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FiCheck, FiZap, FiStar, FiShield, FiArrowRight, FiCreditCard, FiCalendar } from "react-icons/fi";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 999,
    annual: 799,
    color: "#4A6080",
    badge: null,
    desc: "Perfect for small businesses just getting started",
    features: [
      "Up to 50 customers",
      "Collections dashboard",
      "AI priority call list",
      "WhatsApp message generator",
      "Cash flow forecast (30 days)",
      "CSV import",
      "Email support",
    ],
    limits: ["1 user only", "No WhatsApp send", "No Tally sync"],
  },
  {
    id: "growth",
    name: "Growth",
    price: 2499,
    annual: 1999,
    color: "#0066FF",
    badge: "Most Popular",
    desc: "For growing businesses that need automation",
    features: [
      "Unlimited customers",
      "Everything in Starter",
      "WhatsApp send (500 msgs/mo)",
      "UPI payment links",
      "Automated dunning sequences",
      "Tally auto-sync",
      "GST invoice scanner",
      "3 team members",
      "Analytics & reports",
      "Priority support",
    ],
    limits: [],
  },
  {
    id: "pro",
    name: "Pro",
    price: 4999,
    annual: 3999,
    color: "#10D98A",
    badge: "Best Value",
    desc: "For serious businesses and CA firms",
    features: [
      "Everything in Growth",
      "Unlimited WhatsApp messages",
      "10 team members",
      "CA multi-client dashboard",
      "API access",
      "Custom message templates",
      "Advanced AI insights",
      "Export PDF/Excel reports",
      "Dedicated account manager",
      "Custom integrations",
    ],
    limits: [],
  },
];

const CURRENT_USAGE = {
  plan: "growth",
  customers: 42,
  limit: "Unlimited",
  whatsapp: 287,
  whatsappLimit: 500,
  nextBilling: "15 Jun 2025",
  amount: 2499,
};

export default function BillingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    // Razorpay integration will go here
    await new Promise(r => setTimeout(r, 1500));
    alert(`Razorpay checkout coming soon! Plan: ${planId}`);
    setLoading(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 max-w-6xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-primary">Billing & Plans</h1>
          <p className="text-sm text-muted mt-0.5">Manage your subscription and usage</p>
        </div>

        {/* Current Plan Card */}
        <div className="card-premium p-5 border-accent/30 bg-accent-dim/20">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FiZap size={15} className="text-accent" />
                <p className="text-sm font-bold text-primary">Current Plan: <span className="text-accent">Growth</span></p>
                <Badge variant="accent">Active</Badge>
              </div>
              <p className="text-xs text-muted">Renews on {CURRENT_USAGE.nextBilling} · ₹{CURRENT_USAGE.amount.toLocaleString()}/month</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<FiCreditCard size={13}/>}>Manage Payment</Button>
              <Button variant="danger" size="sm">Cancel Plan</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
            {[
              { label: "Customers",        value: `${CURRENT_USAGE.customers}`,                   sub: CURRENT_USAGE.limit },
              { label: "WhatsApp Sent",    value: `${CURRENT_USAGE.whatsapp}`,                    sub: `of ${CURRENT_USAGE.whatsappLimit}/mo` },
              { label: "Next Billing",     value: CURRENT_USAGE.nextBilling,                       sub: "Auto-renews" },
              { label: "Team Members",     value: "2 / 3",                                         sub: "1 slot available" },
            ].map(s => (
              <div key={s.label}>
                <p className="section-label mb-1">{s.label}</p>
                <p className="text-sm font-bold text-primary">{s.value}</p>
                <p className="text-2xs text-muted">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* WhatsApp usage bar */}
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <p className="text-2xs text-muted">WhatsApp messages this month</p>
              <p className="text-2xs font-mono text-secondary">{CURRENT_USAGE.whatsapp}/{CURRENT_USAGE.whatsappLimit}</p>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${(CURRENT_USAGE.whatsapp / CURRENT_USAGE.whatsappLimit) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 p-1 bg-surface-2 rounded-xl border border-border">
            <button onClick={() => setBilling("monthly")}
              className={["px-5 py-2 rounded-lg text-sm font-semibold transition-all",
                billing === "monthly" ? "bg-accent text-white shadow-accent-sm" : "text-muted hover:text-primary",
              ].join(" ")}>Monthly</button>
            <button onClick={() => setBilling("annual")}
              className={["px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                billing === "annual" ? "bg-accent text-white shadow-accent-sm" : "text-muted hover:text-primary",
              ].join(" ")}>
              Annual
              <span className="text-2xs font-bold bg-success text-white px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
          {billing === "annual" && (
            <p className="text-xs text-success font-medium">Save up to ₹24,000/year on Pro plan</p>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => {
            const isCurrent = plan.id === CURRENT_USAGE.plan;
            const price = billing === "annual" ? plan.annual : plan.price;

            return (
              <div key={plan.id} className={[
                "card-premium p-6 flex flex-col relative transition-all duration-300",
                plan.badge ? "border-accent/40 shadow-glow-accent" : "",
                isCurrent ? "ring-1 ring-accent/30" : "",
              ].join(" ")}>

                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-2xs font-bold bg-accent text-white shadow-accent-sm flex items-center gap-1">
                      <FiStar size={10} /> {plan.badge}
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-4 right-4">
                    <Badge variant="accent">Current</Badge>
                  </div>
                )}

                <div className="mb-5">
                  <p className="text-sm font-bold text-primary mb-0.5">{plan.name}</p>
                  <p className="text-2xs text-muted mb-4">{plan.desc}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-primary">₹{price.toLocaleString()}</span>
                    <span className="text-xs text-muted mb-1">/mo</span>
                  </div>
                  {billing === "annual" && (
                    <p className="text-2xs text-muted mt-0.5">Billed ₹{(price * 12).toLocaleString()}/year</p>
                  )}
                </div>

                <div className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <FiCheck size={13} className="text-success shrink-0 mt-0.5" />
                      <span className="text-xs text-secondary">{f}</span>
                    </div>
                  ))}
                  {plan.limits.map(f => (
                    <div key={f} className="flex items-start gap-2 opacity-40">
                      <span className="text-muted shrink-0 mt-0.5 text-xs">✕</span>
                      <span className="text-xs text-muted">{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  fullWidth
                  variant={isCurrent ? "secondary" : "primary"}
                  loading={loading === plan.id}
                  disabled={isCurrent}
                  icon={isCurrent ? undefined : <FiArrowRight size={13}/>}
                  onClick={() => !isCurrent && handleUpgrade(plan.id)}
                >
                  {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Enterprise */}
        <div className="card-premium p-5 border-border-2 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center">
              <FiShield size={18} className="text-muted" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Enterprise / CA Firms</p>
              <p className="text-xs text-muted">Manage 50+ client businesses · White-label · Custom integrations · Dedicated support</p>
            </div>
          </div>
          <Button variant="secondary" icon={<FiArrowRight size={13}/>}>Contact Sales</Button>
        </div>

        {/* Invoice History */}
        <div className="card-premium overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-primary">Invoice History</p>
            <Button variant="ghost" size="sm" icon={<FiCalendar size={12}/>}>Download All</Button>
          </div>
          <div className="divide-y divide-border/50">
            {[
              { date: "15 May 2025", plan: "Growth", amount: 2499, status: "Paid" },
              { date: "15 Apr 2025", plan: "Growth", amount: 2499, status: "Paid" },
              { date: "15 Mar 2025", plan: "Starter", amount: 999,  status: "Paid" },
            ].map((inv, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-surface-2/50 transition-colors">
                <div>
                  <p className="text-sm text-primary font-medium">{inv.plan} Plan</p>
                  <p className="text-xs text-muted">{inv.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-mono text-primary">₹{inv.amount.toLocaleString()}</span>
                  <Badge variant="success">{inv.status}</Badge>
                  <Button variant="ghost" size="xs">PDF</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
