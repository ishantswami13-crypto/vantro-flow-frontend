"use client";

/**
 * PaymentCelebration — fires a full-screen dopamine hit the moment
 * a Razorpay payment lands. Polls every 30s, compares against
 * previously-known paid invoices stored in a ref.
 *
 * Lives inside DashboardLayout so it works on every authenticated page.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { api, getUser } from "@/lib/api";

interface CelebrationData {
  name: string;
  amount: number;
}

function fmtAmt(n: number) {
  return n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : `₹${n.toLocaleString("en-IN")}`;
}

export default function PaymentCelebration() {
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [particles, setParticles]     = useState<{ x: number; y: number; color: string; size: number }[]>([]);
  const knownPaidRef   = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Generate confetti particles once on mount
  useEffect(() => {
    const colors = ["#10D98A", "#4F6EF7", "#FF6B35", "#F5A524", "#ffffff"];
    setParticles(
      Array.from({ length: 24 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 60,
        color: colors[i % colors.length],
        size: 6 + Math.random() * 8,
      }))
    );
  }, []);

  const checkForNewPayments = useCallback(async () => {
    const user = getUser();
    if (!user?.id) return;

    try {
      const data = await api.invoices.list(user.id);
      const paid = (data.invoices || []).filter(
        (inv) => inv.payment_status === "Paid"
      );

      if (!initializedRef.current) {
        // First load — seed known set, don't celebrate existing payments
        paid.forEach((inv) => knownPaidRef.current.add(inv.id));
        initializedRef.current = true;
        return;
      }

      // Detect newly paid invoice
      for (const inv of paid) {
        if (!knownPaidRef.current.has(inv.id)) {
          knownPaidRef.current.add(inv.id);
          setCelebration({
            name:   inv.customer_name,
            amount: inv.invoice_amount,
          });
          break; // one celebration at a time
        }
      }
    } catch {
      // silently fail — offline is fine
    }
  }, []);

  useEffect(() => {
    checkForNewPayments();
    const interval = setInterval(checkForNewPayments, 30_000);
    return () => clearInterval(interval);
  }, [checkForNewPayments]);

  // Auto-dismiss after 6s
  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setCelebration(null), 6000);
    return () => clearTimeout(t);
  }, [celebration]);

  if (!celebration) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center animate-fade-in"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)" }}
      onClick={() => setCelebration(null)}
    >
      {/* Confetti particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            left:   `${p.x}%`,
            top:    `${p.y}%`,
            width:  p.size,
            height: p.size,
            background:       p.color,
            opacity:          0.7,
            animationDelay:   `${i * 0.1}s`,
            animationDuration:`${2 + Math.random() * 2}s`,
          }}
        />
      ))}

      {/* Main card */}
      <div
        className="relative text-center px-8 py-10 rounded-3xl max-w-xs w-full mx-4 animate-fade-in-scale"
        style={{
          background: "linear-gradient(160deg, #1A1F2E 0%, #161A24 100%)",
          border:     "1px solid rgba(16,217,138,0.35)",
          boxShadow:  "0 0 80px rgba(16,217,138,0.25), 0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(16,217,138,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="text-5xl mb-3 animate-float">🎉</div>

        <p className="text-sm font-bold text-success mb-1 tracking-wide uppercase">
          Payment Aaya!
        </p>

        {/* THE BIG NUMBER */}
        <p
          className="font-black text-primary leading-none mb-2"
          style={{
            fontSize:   "clamp(2.5rem, 12vw, 3.5rem)",
            textShadow: "0 0 40px rgba(16,217,138,0.4)",
          }}
        >
          {fmtAmt(celebration.amount)}
        </p>

        <p className="text-sm text-secondary mb-1">
          <span className="font-bold text-primary">{celebration.name}</span>
        </p>
        <p className="text-xs text-muted mb-6">ne pay kar diya! 💰</p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "Payment received!",
                  text:  `${celebration.name} ne ${fmtAmt(celebration.amount)} pay kar diya! 🎉 #Vantro`,
                }).catch(() => {});
              }
            }}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #10D98A, #059669)",
              boxShadow:  "0 4px 16px rgba(16,217,138,0.35)",
            }}
          >
            Share 🎊
          </button>
          <button
            onClick={() => setCelebration(null)}
            className="flex-1 py-2.5 rounded-xl text-secondary text-sm font-medium transition-all active:scale-95"
            style={{ background: "#1F2538", border: "1px solid #2A3349" }}
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
