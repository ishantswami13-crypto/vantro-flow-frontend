"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiZap, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("vantro_token", data.token || "demo");
      localStorage.setItem("vantro_user", JSON.stringify(data.user || { name: "User", business_name: "My Business" }));
      router.push("/dashboard");
    } catch {
      // Allow demo access
      localStorage.setItem("vantro_token", "demo");
      localStorage.setItem("vantro_user", JSON.stringify({ name: "Rajesh Kumar", business_name: "Kumar Traders" }));
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center">
            <FiZap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Vantro Flow</span>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <h1 className="text-xl font-bold text-primary mb-1">Sign in</h1>
          <p className="text-sm text-secondary mb-6">Access your collections dashboard.</p>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-danger-dim border border-danger/30 rounded text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              icon={<FiMail size={15} />}
              placeholder="rajesh@kumartraders.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary uppercase tracking-wider">Password</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-secondary"><FiLock size={15} /></span>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="w-full bg-surface-2 border border-border rounded-md text-sm text-primary placeholder-muted px-3 py-2.5 pl-9 pr-10 focus:outline-none focus:border-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 text-secondary hover:text-primary"
                  aria-label="Toggle password"
                >
                  {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth loading={loading} className="mt-2">
              Sign In
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-secondary">
              No account?{" "}
              <Link href="/signup" className="text-accent hover:underline font-medium">
                Start free trial
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="hover:text-secondary transition-colors">Vantro Flow</Link>
          {" "}&mdash; Collections OS for Indian MSMEs
        </p>
      </div>
    </div>
  );
}
