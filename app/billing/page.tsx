"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Card, Button, Label, EmptyLine, ErrorBanner, V } from "@/components/v32/ui";
import { IconCheck } from "@/components/v32/icons";
import { api, getUser, type BillingRecord } from "@/lib/api";

declare global { interface Window { Razorpay: any; } }

// Plans as the backend charges them (server.js PLANS). Each list says what
// the plan includes, not what it will earn: no outcome or customer claims.
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Know who to chase, every day.",
    price: 999,
    annual: 799,
    features: [
      "Who owes what, since when, ranked by who to call first",
      "Reminder drafts you review and send yourself",
      "Import from Excel, CSV or Tally",
      "30-day cash forecast",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Follow-ups that run on a schedule.",
    price: 2499,
    annual: 1999,
    features: [
      "Everything in Starter",
      "Follow-up rules by days overdue, each waiting for your approval",
      "Payment links in reminders",
      "Scheduled Tally sync",
      "3 team members and full analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For high volume and accountants.",
    price: 4999,
    annual: 3999,
    features: [
      "Everything in Growth",
      "Bulk reminders across customers",
      "10 team members and a multi-client view",
      "Reminder voice set to your own tone",
      "PDF invoices and Excel exports",
    ],
  },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes. There is no contract. You keep access until the end of the period you paid for." },
  { q: "Does Starlane message my customers on its own?", a: "No. Every reminder waits for your approval before it goes anywhere, on every plan." },
  { q: "How do I pay?", a: "Through Razorpay, by card, UPI or net banking. Prices are in rupees." },
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

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function BillingPage() {
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [successPlan, setSuccessPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    setCurrentPlan(u?.plan || "free");
    api.billing.history().then(({ history }) => setHistory(history)).catch(() => {});
  }, []);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    setError(null);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("The payment window could not load. Check your connection and try again.");
      const { order, key } = await api.billing.createOrder({ plan: planId, period });
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key, amount: order.amount, currency: order.currency, order_id: order.id,
          name: "Starlane",
          description: `${titleCase(planId)} plan, ${period}`,
          prefill: { email: user?.email || "", contact: user?.phone || "", name: user?.business_name || "" },
          theme: { color: "#191917" },
          handler: async (response: any) => {
            try {
              await api.billing.verify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId, period,
              });
              setSuccessPlan(planId);
              setCurrentPlan(planId);
              api.billing.history().then(({ history }) => setHistory(history)).catch(() => {});
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.open();
      });
    } catch (e: any) {
      if (e?.message !== "Payment cancelled") setError(e?.message || "The payment did not go through. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const isFree = currentPlan === "free";

  return (
    <DashboardLayout pageTitle="Billing">
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <PageHeader
          title="Billing"
          subtitle={isFree ? "You are on the free plan. Pick a plan when you are ready." : `You are on the ${titleCase(currentPlan)} plan.`}
          right={
            <div role="group" aria-label="Billing period" className="seg">
              {(["monthly", "annual"] as const).map((p) => (
                <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}
                  style={{ padding: "6px 12px", fontSize: 12.5, borderRadius: 4, border: `1px solid ${period === p ? V.ink : V.button}`, background: period === p ? V.ink : "transparent", color: period === p ? "#F7F7F4" : V.body, marginLeft: p === "annual" ? 6 : 0 }}>
                  {p === "monthly" ? "Monthly" : "Annual, 20% off"}
                </button>
              ))}
            </div>
          }
        />

        {successPlan && (
          <div role="status" style={{ fontSize: 13, color: V.positive, background: "rgba(71,112,84,0.08)", border: "1px solid rgba(71,112,84,0.2)", borderRadius: 6, padding: "10px 12px" }}>
            You are now on the {titleCase(successPlan)} plan.
          </div>
        )}
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <div className="grid md:grid-cols-3 gap-4 items-stretch">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const monthly = period === "annual" ? plan.annual : plan.price;
            return (
              <Card key={plan.id} style={{ padding: 24, display: "flex", flexDirection: "column", borderColor: isCurrent ? V.ink : undefined }}>
                <div className="flex items-center justify-between">
                  <Label>{plan.name}</Label>
                  {isCurrent && <span style={{ fontSize: 11, color: V.positive }}>Current plan</span>}
                </div>
                <div style={{ fontFamily: V.serif, fontSize: 20, color: V.ink, marginTop: 10, lineHeight: 1.25 }}>{plan.tagline}</div>
                <div className="flex items-baseline gap-1" style={{ marginTop: 18 }}>
                  <span style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.03em", color: V.ink, fontVariantNumeric: "tabular-nums" }}>{rupees(monthly)}</span>
                  <span style={{ fontSize: 13, color: V.secondary }}>/ month</span>
                </div>
                <div style={{ fontSize: 12, color: V.tertiary, marginTop: 4, minHeight: 18 }}>
                  {period === "annual" ? `${rupees(plan.annual * 12)} billed once a year` : "Billed monthly"}
                </div>
                <div style={{ height: 1, background: V.divider, margin: "18px 0" }} />
                <ul style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, margin: 0, padding: 0, listStyle: "none" }}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5" style={{ fontSize: 13, color: V.body, lineHeight: 1.5 }}>
                      <span style={{ color: V.positive, marginTop: 2 }}><IconCheck size={13} /></span>{f}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 22 }}>
                  <Button primary={!isCurrent} disabled={isCurrent || !!loading} onClick={() => handleUpgrade(plan.id)} className="w-full">
                    {loading === plan.id ? "Opening payment…" : isCurrent ? "Current plan" : `Choose ${plan.name}`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-start">
          <Card style={{ padding: "20px 24px" }}>
            <Label>Payments</Label>
            {history.length === 0 ? (
              <EmptyLine title="No payments yet" body="Receipts appear here after your first payment." />
            ) : (
              <div style={{ marginTop: 10 }}>
                {history.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between" style={{ padding: "10px 0", borderBottom: `1px solid ${V.divider}` }}>
                    <div>
                      <div style={{ fontSize: 13.5, color: V.ink }}>{titleCase(inv.plan)} plan</div>
                      <div style={{ fontSize: 12, color: V.tertiary }}>{fmtDate(inv.created_at)}</div>
                    </div>
                    <span style={{ fontSize: 12, color: inv.status === "paid" ? V.positive : V.secondary }}>{titleCase(inv.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card style={{ padding: "20px 24px" }}>
            <Label>Questions</Label>
            <div style={{ marginTop: 6 }}>
              {FAQS.map(({ q, a }) => (
                <details key={q} style={{ padding: "12px 0", borderBottom: `1px solid ${V.divider}` }}>
                  <summary style={{ fontSize: 13.5, color: V.ink, cursor: "pointer" }}>{q}</summary>
                  <p style={{ fontSize: 13, color: V.secondary, lineHeight: 1.6, marginTop: 8 }}>{a}</p>
                </details>
              ))}
              <p style={{ fontSize: 12.5, color: V.secondary, marginTop: 14 }}>
                Running Starlane for several companies? <a href="mailto:ishantswami13@gmail.com?subject=Starlane%20for%20several%20companies" className="underline">Write to us</a>.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
