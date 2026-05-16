"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiZap, FiMail, FiShield, FiLock } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep]       = useState<"email" | "otp" | "done">("email");
  const [email, setEmail]     = useState("");
  const [otp, setOtp]         = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [msg, setMsg]         = useState("");

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message || "OTP sent to your email.");
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center">
            <FiZap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Vantro Flow</span>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          {step === "email" && (
            <>
              <h1 className="text-xl font-bold text-primary mb-1">Forgot Password?</h1>
              <p className="text-sm text-secondary mb-6">Enter your email — we will send you a 6-digit OTP.</p>
              {error && <div className="mb-4 px-3 py-2.5 bg-danger-dim border border-danger/30 rounded text-sm text-danger">{error}</div>}
              <form onSubmit={sendOtp} className="space-y-4">
                <Input label="Email" type="email" icon={<FiMail size={15} />}
                  placeholder="rajesh@kumartraders.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
                <Button type="submit" fullWidth loading={loading}>Send OTP</Button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h1 className="text-xl font-bold text-primary mb-1">Enter OTP</h1>
              <p className="text-sm text-secondary mb-6">{msg} Check your inbox (and spam folder).</p>
              {error && <div className="mb-4 px-3 py-2.5 bg-danger-dim border border-danger/30 rounded text-sm text-danger">{error}</div>}
              <form onSubmit={resetPassword} className="space-y-4">
                <Input label="6-Digit OTP" type="text" icon={<FiShield size={15} />}
                  placeholder="123456" maxLength={6}
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} required />
                <Input label="New Password" type="password" icon={<FiLock size={15} />}
                  placeholder="Min 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <Button type="submit" fullWidth loading={loading}>Reset Password</Button>
              </form>
              <button onClick={() => setStep("email")} className="mt-3 text-xs text-muted hover:text-primary block text-center">
                ← Back
              </button>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-success-dim border border-success/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FiShield size={24} className="text-success" />
              </div>
              <h2 className="text-xl font-bold text-primary mb-2">Password Reset!</h2>
              <p className="text-sm text-secondary mb-6">You can now log in with your new password.</p>
              <Button fullWidth onClick={() => router.push("/login")}>Go to Login</Button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-secondary">
              Remembered it?{" "}
              <Link href="/login" className="text-accent hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
