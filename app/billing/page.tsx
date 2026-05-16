"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FiCheck, FiZap, FiStar, FiShield, FiArrowRight, FiCreditCard, FiCalendar } from "react-icons/fi";
import { api, getUser, type BillingRecord } from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

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

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function BillingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [successPlan, setSuccessPlan] = useState<string | null>(null);
  const user = getUser();
  const currentPlan = user?.plan || "free";

  useEffect(() => {
    api.billing.history().then(({ history }) => setHistory(history)).catch(() => {});
  }, []);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Failed to load payment gateway. Check your connection.");

      const { order, key } = await api.billing.createOrder({
        plan: planId,
        period: billing,
      });

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key,
          amount: order.amount,
          currency: order.currency,
          order_id: order.id,
          name: "Vantro Flow",
          description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan — ${billing}`,
          prefill: {
            email: user?.email || "",
            contact: user?.phone || "",
            name: user?.business_name || "",
          },
          theme: { color: "#0066FF" },
          handler: async (response: any) => {
            try {
              await api.billing.verify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                plan: planId,
                period: billing,
              });
              setSuccessPlan(planId);
              api.billing.history().then(({ history }) => setHistory(history)).catch(() => {});
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.open();
      });
    } catch (e: any) {
      if (e?.message !== "Payment cancelled") {
        alert(e?.message || "Payment failed. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-8 max-w-6xl mx-auto">

        {/* Success banner */}
        {successPlan && (
          <div className="px-4 py-3 bg-success-dim border border-success/30 rounded-lg text-sm text-success font-medium flex items-center gap-2">
            <FiCheck size={15} />
            Payment successful! You are now on the {successPlan.charAt(0).toUpperCase() + successPlan.slice(1)} plan.
          </div>
        )}

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
                <p className="text-sm font-bold text-primary">
                  Current Plan: <span className="text-accent capitalize">{currentPlan}</span>
                </p>
                <Badge variant={currentPlan === "free" ? "muted" : "accent"}>
                  {currentPlan === "free" ? "Free Trial" : "Active"}
                </Badge>
              </div>
              <p className="text-xs text-muted">
                {currentPlan === "free"
                  ? "Upgrade to unlock WhatsApp sending, dunning automation, and more."
                  : "Your subscription is active. Thank you for supporting Vantro Flow!"}
              </p>
            </div>
            {currentPlan !== "free" && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<FiCreditCard size={13} />}>Manage Payment</Button>
              </div>
            )}
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
            const isCurrent = plan.id === currentPlan;
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
                  disabled={isCurrent || !!loading}
                  icon={isCurrent ? undefined : <FiArrowRight size={13} />}
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
          <Button variant="secondary" icon={<FiArrowRight size={13} />}
            onClick={() => window.open("mailto:ishantswami13@gmail.com?subject=Vantro Enterprise Enquiry", "_blank")}>
            Contact Sales
          </Button>
        </div>

        {/* Invoice History */}
        <div className="card-premium overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-primary">Invoice History</p>
            <Button variant="ghost" size="sm" icon={<FiCalendar size={12} />}>Download All</Button>
          </div>
          <div className="divide-y divide-border/50">
            {history.length === 0 && (
              <div className="px-4 py-8 text-sm text-muted text-center">
                No billing history yet. Upgrade to see your invoices here.
              </div>
            )}
            {history.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-surface-2/50 transition-colors">
                <div>
                  <p className="text-sm text-primary font-medium capitalize">{inv.plan} Plan</p>
                  <p className="text-xs text-muted">{fmtDate(inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={inv.status === "paid" ? "success" : "muted"}>{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
