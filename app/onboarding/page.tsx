"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiZap, FiArrowRight, FiCheck, FiDatabase, FiEdit3 } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";

const STEPS = ["Welcome", "Import Customers", "Preferences", "Done"];

const industryOptions = [
  { value: "manufacturing", label: "Manufacturing" },
  { value: "trading",       label: "Trading / Distribution" },
  { value: "services",      label: "Services" },
  { value: "retail",        label: "Retail" },
  { value: "construction",  label: "Construction" },
  { value: "other",         label: "Other" },
];

const languageOptions = [
  { value: "hinglish", label: "Hinglish (Hindi + English)" },
  { value: "english",  label: "English" },
  { value: "hindi",    label: "Hindi" },
];

const contactTimeOptions = [
  { value: "morning",   label: "Morning (9am – 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm – 5pm)" },
  { value: "evening",   label: "Evening (5pm – 7pm)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [prefs, setPrefs] = useState({
    industry: "trading",
    language: "hinglish",
    contact_time: "morning",
  });

  const setPref = (key: string) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setPrefs((p) => ({ ...p, [key]: e.target.value }));

  const handleTallyImport = () => {
    setImporting(true);
    setTimeout(() => { setImporting(false); setImportDone(true); }, 2000);
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center">
            <FiZap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Vantro Flow</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors",
                i < step  ? "bg-success text-white" :
                i === step ? "bg-accent text-white" :
                "bg-surface-2 text-muted border border-border",
              ].join(" ")}>
                {i < step ? <FiCheck size={12} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={["flex-1 h-px mx-2 transition-colors", i < step ? "bg-success" : "bg-border"].join(" ")} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-accent-dim border border-accent/20 rounded-xl flex items-center justify-center mx-auto mb-5">
                <FiZap size={28} className="text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-3">Welcome to Vantro Flow</h2>
              <p className="text-secondary text-sm leading-relaxed mb-6 max-w-sm mx-auto">
                We will help you set up your collections dashboard in 3 quick steps. It takes less than 5 minutes.
              </p>
              <div className="text-left space-y-3 mb-8 bg-surface-2 rounded-lg p-4">
                {["Import your existing customers from Tally", "Set your collection preferences", "Start seeing who to call today"].map((t, i) => (
                  <div key={t} className="flex items-center gap-3 text-sm text-secondary">
                    <span className="w-5 h-5 rounded-full bg-accent-dim border border-accent/30 flex items-center justify-center text-2xs text-accent font-semibold shrink-0">{i + 1}</span>
                    {t}
                  </div>
                ))}
              </div>
              <Button fullWidth onClick={() => setStep(1)} icon={<FiArrowRight size={15} />}>
                Get Started
              </Button>
            </div>
          )}

          {/* Step 1: Import */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-primary mb-1">Import Customers</h2>
              <p className="text-secondary text-sm mb-6">Connect Tally to automatically import outstanding invoices.</p>

              <div
                onClick={!importing && !importDone ? handleTallyImport : undefined}
                className={[
                  "border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors",
                  importDone ? "border-success/40 bg-success-dim" :
                  importing  ? "border-accent/40 bg-accent-dim cursor-wait" :
                  "border-border hover:border-accent/50 cursor-pointer",
                ].join(" ")}
              >
                {importDone ? (
                  <>
                    <FiCheck size={28} className="text-success mx-auto mb-3" />
                    <p className="font-semibold text-success">Import Complete</p>
                    <p className="text-xs text-secondary mt-1">42 customers and 87 invoices imported</p>
                  </>
                ) : importing ? (
                  <>
                    <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="font-semibold text-accent">Connecting to Tally...</p>
                    <p className="text-xs text-secondary mt-1">Reading your ledger data</p>
                  </>
                ) : (
                  <>
                    <FiDatabase size={28} className="text-secondary mx-auto mb-3" />
                    <p className="font-semibold text-primary">Import from Tally ERP 9</p>
                    <p className="text-xs text-secondary mt-1">Click to connect and import customers automatically</p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-md text-sm text-secondary hover:text-primary hover:border-accent/40 transition-colors mb-6">
                <FiEdit3 size={15} />
                Enter Customers Manually
              </button>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button fullWidth onClick={() => setStep(2)} icon={<FiArrowRight size={15} />}>
                  {importDone ? "Continue" : "Skip for Now"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-primary mb-1">Collection Preferences</h2>
              <p className="text-secondary text-sm mb-6">Customize how Vantro Flow works for your business.</p>

              <div className="space-y-4 mb-6">
                <Select label="Industry Type" options={industryOptions} value={prefs.industry} onChange={setPref("industry")} />
                <Select label="Message Language" options={languageOptions} value={prefs.language} onChange={setPref("language")} />
                <Select label="Preferred Contact Time" options={contactTimeOptions} value={prefs.contact_time} onChange={setPref("contact_time")} />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-secondary uppercase tracking-wider">Working Hours</label>
                  <div className="flex items-center gap-2">
                    <input type="time" defaultValue="09:00" className="flex-1 bg-surface-2 border border-border rounded-md text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent" />
                    <span className="text-secondary text-xs">to</span>
                    <input type="time" defaultValue="18:00" className="flex-1 bg-surface-2 border border-border rounded-md text-sm text-primary px-3 py-2.5 focus:outline-none focus:border-accent" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button fullWidth onClick={() => setStep(3)} icon={<FiArrowRight size={15} />}>
                  Save Preferences
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-success-dim border border-success/20 rounded-xl flex items-center justify-center mx-auto mb-5">
                <FiCheck size={28} className="text-success" />
              </div>
              <h2 className="text-2xl font-bold text-primary mb-3">You are all set!</h2>
              <p className="text-secondary text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                Your dashboard is ready. See who to call today to maximize cash collections.
              </p>
              <Button fullWidth onClick={() => router.push("/dashboard")} icon={<FiArrowRight size={15} />}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
