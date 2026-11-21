"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff, FiRefreshCw, FiCheckCircle, FiArrowRight } from "react-icons/fi";
import { saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { takePendingInvite } from "@/lib/platform";
import { INDUSTRY_OPTIONS } from "@/lib/businessTypes";
import { AuthShell, AuthHead, AuthError, Spinner } from "@/components/auth/AuthShell";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const businessTypes = [{ value: "", label: "Select type" }, ...INDUSTRY_OPTIONS];

function FocusInput({ className = "", ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`sl-input ${className}`.trim()} />;
}

/* ── OTP Step ─────────────────────────────────────────────────── */
function OTPStep({ preToken, userEmail, userPhone, onVerified }: {
  preToken: string; userEmail: string; userPhone: string;
  onVerified: (token: string, user: object, csrfToken?: string | null) => void;
}) {
  const [otp, setOtp] = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<(HTMLInputElement|null)[]>([]);

  useEffect(() => { if (countdown <= 0) return; const t = setTimeout(() => setCountdown(c=>c-1), 1000); return () => clearTimeout(t); }, [countdown]);

  const maskedPhone = userPhone ? "+91 " + userPhone.replace(/\D/g,"").slice(-10).replace(/(\d{2})(\d{4})(\d{4})/,"$1XXXX$3") : "";
  const maskedEmail = userEmail ? userEmail.replace(/(.{2})(.*)(@.*)/,"$1****$3") : "";

  function handleDigit(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next=[...otp]; next[i]=val; setOtp(next);
    if (val && i < 5) inputs.current[i+1]?.focus();
    if (next.every(d=>d!=="")) handleVerify(next.join(""));
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent) { if (e.key==="Backspace"&&!otp[i]&&i>0) inputs.current[i-1]?.focus(); }
  function handlePaste(e: React.ClipboardEvent) { e.preventDefault(); const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6); if (p.length===6) { setOtp(p.split("")); handleVerify(p); } }

  async function handleVerify(code?: string) {
    const fc = code ?? otp.join(""); if (fc.length < 6) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`${BASE}/api/auth/verify-otp`, { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${preToken}`}, credentials:"include", body:JSON.stringify({otp:fc}) });
      const d = await r.json();
      if (d.success) onVerified(d.token, d.user, d.csrf_token);
      else { setError(d.error||"Wrong OTP"); setOtp(["","","","","",""]); inputs.current[0]?.focus(); }
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleResend() {
    setResending(true); setError(""); setResent(false);
    try { await fetch(`${BASE}/api/auth/resend-otp`,{method:"POST",headers:{Authorization:`Bearer ${preToken}`}, credentials:"include"}); setResent(true); setCountdown(30); setOtp(["","","","","",""]); inputs.current[0]?.focus(); }
    catch { setError("Could not resend."); }
    finally { setResending(false); }
  }

  return (
    <div>
      <AuthHead step="Last step" title="Check your phone"
        lead={<>We sent a 6-digit code to{maskedPhone&&<> <strong>{maskedPhone}</strong></>}{maskedPhone&&maskedEmail&&" and"}{maskedEmail&&<> <strong>{maskedEmail}</strong></>}.</>} />
      {error&&<AuthError>{error}</AuthError>}
      {resent&&<div className="sl-auth-note good"><FiCheckCircle size={13} style={{display:"inline",verticalAlign:"-2px",marginRight:6}}/>New code sent</div>}
      <div className="sl-auth-form">
        <div className="sl-otp" onPaste={handlePaste}>
          {otp.map((d,i)=>(
            <input key={i} ref={el=>{inputs.current[i]=el;}} type="tel" inputMode="numeric" maxLength={1} aria-label={`Digit ${i+1}`}
              value={d} autoFocus={i===0} disabled={loading} className={d?"filled":""}
              onChange={e=>handleDigit(i,e.target.value)} onKeyDown={e=>handleKeyDown(i,e)}
            />
          ))}
        </div>
        <div className="sl-otp-meta">
          <span>Didn&apos;t get it?</span>
          {countdown>0
            ? <span>Resend in {countdown}s</span>
            : <button type="button" className="sl-link-btn" onClick={handleResend} disabled={resending}>
                {resending?<><FiRefreshCw size={11} style={{display:"inline",marginRight:4}}/>Sending…</>:"Resend code"}
              </button>}
        </div>
        <button type="button" className="sl-btn" disabled={loading||otp.join("").length<6} onClick={()=>handleVerify()}>
          {loading?<><Spinner/> Verifying…</>:<>Verify and continue <FiArrowRight size={16}/></>}
        </button>
      </div>
    </div>
  );
}

/* ── Signup Form ──────────────────────────────────────────────── */
function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const referredBy = params.get("ref") || "";
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [otpStep, setOtpStep]   = useState(false);
  const [preToken, setPreToken] = useState("");
  const [verifiedUser, setVerifiedUser] = useState<{email:string;phone:string}|null>(null);
  const [form, setForm] = useState({ name:"", phone:"", email:"", business_name:"", business_type:"", password:"", confirm_password:"" });
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(f=>({...f,[key]:e.target.value}));

  function goStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()||!form.email.trim()||!form.business_name.trim()) { setError("Please fill all fields"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Enter a valid email"); return; }
    setError(""); setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirm_password) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/signup`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:form.email, phone:form.phone, business_name:form.business_name, password:form.password, ...(referredBy?{referred_by:referredBy}:{}) }) });
      const data = await res.json();
      if (!res.ok||!data.success) throw new Error(data.error||"Signup failed");
      if (data.needs_otp) { setPreToken(data.pre_token); setVerifiedUser({email:data.user.email,phone:data.user.phone}); setOtpStep(true); }
      else { await saveAuth(data.token,data.user,true,data.csrf_token); posthog.identify(data.user.id,{email:data.user.email,plan:data.user.plan}); router.push(takePendingInvite() || "/onboarding"); }
    } catch (err: unknown) { setError(err instanceof Error?err.message:"Signup failed"); }
    finally { setLoading(false); }
  }

  const handleOTPVerified = async (token: string, user: any, csrfToken?: string|null) => {
    await saveAuth(token,user,true,csrfToken);
    posthog.identify(user.id,{email:user.email,name:user.business_name,plan:user.plan});
    posthog.capture("user_signed_up",{business_type:form.business_type});
    // New signups go through onboarding — /onboarding itself checks
    // onboarding_done/hasBusinessData and bounces straight to /dashboard
    // for any account that shouldn't see it (defense in depth if this
    // redirect target ever changes).
    router.push(takePendingInvite() || "/onboarding");
  };

  if (otpStep && preToken && verifiedUser)
    return <OTPStep preToken={preToken} userEmail={verifiedUser.email} userPhone={verifiedUser.phone} onVerified={handleOTPVerified}/>;

  return (
    <div>
      {step===1&&(
        <form onSubmit={goStep2} noValidate>
          <AuthHead step="Step 1 of 2" title="Create your account" lead="No credit card required. You can be set up in a few minutes." />
          {error&&<AuthError>{error}</AuthError>}
          {referredBy&&<div className="sl-auth-note good">You were invited. Your account is free.</div>}
          <div className="sl-auth-form">
            <div className="sl-row-2">
              <div className="sl-field"><label htmlFor="su-name">First name</label><FocusInput id="su-name" type="text" placeholder="Rahul" value={form.name} onChange={set("name")} required autoComplete="given-name"/></div>
              <div className="sl-field"><label htmlFor="su-co">Company name</label><FocusInput id="su-co" type="text" placeholder="Kumar Traders" value={form.business_name} onChange={set("business_name")} required autoComplete="organization"/></div>
            </div>
            <div className="sl-field"><label htmlFor="su-email">Work email</label><FocusInput id="su-email" type="email" placeholder="you@company.com" value={form.email} onChange={set("email")} required autoComplete="email"/></div>
            <div className="sl-field">
              <label htmlFor="su-type">Business type</label>
              <select id="su-type" className="sl-input" value={form.business_type} onChange={set("business_type")} style={{color:form.business_type?undefined:"var(--mute)"}}>
                {businessTypes.map(o=><option key={o.value} value={o.value} style={{color:"#0F0E0D"}}>{o.label}</option>)}
              </select>
            </div>
            <button type="submit" className="sl-btn">Continue <FiArrowRight size={16}/></button>
          </div>
          <p className="sl-auth-alt">Already have an account? <Link href="/login">Sign in</Link></p>
        </form>
      )}

      {step===2&&(
        <form onSubmit={handleSubmit}>
          <AuthHead step="Step 2 of 2" title="Secure your workspace" lead="Starlane learns how your business works once you're inside." />
          {error&&<AuthError>{error}</AuthError>}
          <div className="sl-auth-form">
            <div className="sl-field">
              <label htmlFor="su-phone">Phone number</label>
              <div className="sl-input-wrap">
                <span className="sl-prefix">+91</span>
                <FocusInput id="su-phone" type="tel" placeholder="9876543210" value={form.phone} onChange={set("phone")} required maxLength={10} pattern="\d{10}" autoComplete="tel"/>
              </div>
              <p className="sl-hint">For payment alerts on WhatsApp.</p>
            </div>
            <div className="sl-field">
              <label htmlFor="su-pass">Password</label>
              <div className="sl-input-wrap">
                <FocusInput id="su-pass" className="has-btn" type={showPassword?"text":"password"} placeholder="At least 8 characters" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password"/>
                <button type="button" className="sl-eye" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<FiEyeOff size={15}/>:<FiEye size={15}/>}</button>
              </div>
              {form.password.length>0&&form.password.length<8&&<p className="sl-hint bad">At least 8 characters</p>}
            </div>
            <div className="sl-field">
              <label htmlFor="su-conf">Confirm password</label>
              <div className="sl-input-wrap">
                <FocusInput id="su-conf" className="has-btn" type={showConfirm?"text":"password"} placeholder="Type it again" value={form.confirm_password} onChange={set("confirm_password")} required autoComplete="new-password"/>
                <button type="button" className="sl-eye" onClick={()=>setShowConfirm(v=>!v)} aria-label={showConfirm?"Hide password":"Show password"}>{showConfirm?<FiEyeOff size={15}/>:<FiEye size={15}/>}</button>
              </div>
              {form.confirm_password.length>0&&form.password!==form.confirm_password&&<p className="sl-hint bad">Passwords do not match</p>}
              {form.confirm_password.length>0&&form.password===form.confirm_password&&form.password.length>=8&&<p className="sl-hint good">Passwords match</p>}
            </div>
            <div className="sl-btn-row">
              <button type="button" className="sl-btn ghost" onClick={()=>{setStep(1);setError("");}}>Back</button>
              <button type="submit" className="sl-btn" disabled={loading}>
                {loading?<><Spinner/> Creating…</>:<>Create workspace <FiArrowRight size={16}/></>}
              </button>
            </div>
          </div>
          <p className="sl-auth-legal">
            By creating an account you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </form>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthShell aside={<>Have an account? <Link href="/login">Sign in</Link></>}>
      <Suspense fallback={null}><SignupForm/></Suspense>
    </AuthShell>
  );
}
