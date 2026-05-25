"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiMessageSquare, FiFileText, FiZap,
  FiArrowRight, FiCheck, FiX, FiChevronRight,
} from "react-icons/fi";
import { api } from "@/lib/api";

interface Step {
  id: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  action: string;
  href?: string;
  color: string;
}

const STEPS: Step[] = [
  {
    id: "whatsapp",
    icon: FiMessageSquare,
    title: "Connect WhatsApp",
    desc: "Link Interakt or WATI so reminders auto-send to customers",
    action: "Connect Now",
    href: "/settings?tab=integrations",
    color: "#25D366",
  },
  {
    id: "invoice",
    icon: FiFileText,
    title: "Create your first invoice",
    desc: "Add a customer and raise an invoice — WhatsApp fires automatically",
    action: "Create Invoice",
    href: "/invoice/new",
    color: "#4F8EF7",
  },
  {
    id: "automation",
    icon: FiZap,
    title: "Turn on automation",
    desc: "Daily dunning, payment reminders, and auto-calls — all hands-free",
    action: "Enable",
    href: "/settings?tab=automation",
    color: "#F5A524",
  },
];

interface Props {
  waConnected: boolean;
  hasInvoices: boolean;
  autoEnabled: boolean;
  onDismiss: () => void;
}

export default function WelcomeGuide({ waConnected, hasInvoices, autoEnabled, onDismiss }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const completedCount = [waConnected, hasInvoices, autoEnabled].filter(Boolean).length;
  const allDone = completedCount === 3;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("vantro_guide_dismissed", "1");
    onDismiss();
  };

  if (dismissed) return null;

  const stepStatus = [waConnected, hasInvoices, autoEnabled];

  return (
    <div className="card p-5 mb-5 border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-primary">
            {allDone ? "You're all set! 🎉" : `Setup guide — ${completedCount}/3 done`}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {allDone
              ? "Automation is running. Money will start moving."
              : "Complete these steps to activate full automation"}
          </p>
        </div>
        <button onClick={handleDismiss} className="text-muted hover:text-primary transition-colors ml-3 mt-0.5 shrink-0">
          <FiX size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-border rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-700"
          style={{ width: `${(completedCount / 3) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2.5">
        {STEPS.map((step, i) => {
          const done = stepStatus[i];
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={[
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                done
                  ? "border-success/20 bg-success/5"
                  : "border-border bg-surface-2 hover:border-accent/30 cursor-pointer group"
              ].join(" ")}
              onClick={() => !done && step.href && router.push(step.href)}
            >
              {/* Icon / check */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                style={{ background: done ? "rgba(16,217,138,0.12)" : `${step.color}18`, border: `1px solid ${done ? "rgba(16,217,138,0.3)" : `${step.color}30`}` }}
              >
                {done
                  ? <FiCheck size={14} className="text-success" />
                  : <Icon size={14} style={{ color: step.color }} />
                }
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${done ? "text-success" : "text-primary"} leading-none mb-0.5`}>
                  {step.title}
                  {done && <span className="ml-1.5 text-success/70 font-normal">✓ Done</span>}
                </p>
                <p className="text-2xs text-muted leading-snug">{step.desc}</p>
              </div>

              {/* CTA */}
              {!done && (
                <div className="flex items-center gap-1 text-2xs font-bold text-accent shrink-0 group-hover:gap-2 transition-all">
                  {step.action}
                  <FiChevronRight size={11} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <button
          onClick={handleDismiss}
          className="w-full mt-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-sm">
          Got it — dismiss guide <FiArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
