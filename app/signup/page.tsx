"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff, FiRefreshCw, FiCheckCircle, FiArrowRight } from "react-icons/fi";
import { saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { INDUSTRY_OPTIONS } from "@/lib/businessTypes";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

const businessTypes = [{ value: "", label: "Select type" }, ...INDUSTRY_OPTIONS];

function StarlaneMark({ size = 26 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        backgroundImage: 'url("/brand/starlane-icon.jpeg")',
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
        borderRadius: Math.max(4, Math.round(size * 0.18)),
        flexShrink: 0,
      }}
    />
  );
}

const iBase = { background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.10)", borderRadius:"6px", padding:"13px 16px", fontFamily:"'Hanken Grotesk',system-ui", fontSize:"15px", color:"#fff", outline:"none", width:"100%", transition:"border-color .2s,background .2s", WebkitAppearance:"none" as const };
const iFocus = { ...iBase, borderColor:"rgba(255,255,255,.38)", background:"rgba(255,255,255,.07)" };

function FocusInput(p: React.InputHTMLAttributes<HTMLInputElement>) {
  const [f, setF] = useState(false);
  return <input {...p} style={f?iFocus:iBase} onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>;
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
    try { await fetch(`${BASE}/api/auth/resend-otp`,{method:"POST",headers:{Authorization:`Bearer ${preToken}`}}); setResent(true); setCountdown(30); setOtp(["","","","","",""]); inputs.current[0]?.focus(); }
    catch { setError("Could not resend."); }
    finally { setResending(false); }
  }

  return (
    <div>
      <div className="step-head">
        <div className="step-num">Step 3 of 3</div>
        <h2>Check your phone</h2>
        <p>6-digit code sent to{maskedPhone&&<> <strong style={{color:"#fff"}}>{maskedPhone}</strong></>}{maskedPhone&&maskedEmail&&" and"}{maskedEmail&&<> <strong style={{color:"#fff"}}>{maskedEmail}</strong></>}</p>
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:"10px",marginBottom:"24px"}} onPaste={handlePaste}>
        {otp.map((d,i)=>(
          <input key={i} ref={el=>{inputs.current[i]=el;}} type="tel" inputMode="numeric" maxLength={1}
            value={d} autoFocus={i===0}
            onChange={e=>handleDigit(i,e.target.value)} onKeyDown={e=>handleKeyDown(i,e)}
            style={{width:"44px",height:"52px",textAlign:"center",fontSize:"20px",fontWeight:700,background:d?"rgba(255,255,255,.08)":"rgba(255,255,255,.04)",border:`1px solid ${d?"rgba(255,255,255,.35)":"rgba(255,255,255,.1)"}`,borderRadius:"6px",color:"#fff",outline:"none",opacity:loading?.5:1,fontFamily:"'Space Grotesk',system-ui"}}
          />
        ))}
      </div>
      {error&&<p style={{textAlign:"center",fontSize:"12px",color:"rgba(255,100,100,.9)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"16px"}}>{error}</p>}
      {resent&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",fontSize:"12px",color:"#10D98A",marginBottom:"16px"}}><FiCheckCircle size={13}/> New code sent</div>}
      <button disabled={loading||otp.join("").length<6} onClick={()=>handleVerify()}
        className="btn-main" style={{opacity:loading||otp.join("").length<6?.4:1}}>
        {loading?<><div style={{width:"16px",height:"16px",border:"2px solid rgba(0,0,0,.2)",borderTop:"2px solid #000",borderRadius:"50%",animation:"sspin .7s linear infinite",marginRight:"8px"}}/> Verifying…</>:<><span className="btn-txt">Verify &amp; continue</span><FiArrowRight size={16}/></>}
      </button>
      <div style={{textAlign:"center",marginTop:"20px"}}>
        {countdown>0
          ? <p style={{fontSize:"11px",color:"rgba(255,255,255,.25)",fontFamily:"'JetBrains Mono',monospace"}}>Resend in {countdown}s</p>
          : <button onClick={handleResend} disabled={resending} style={{fontSize:"12px",color:"rgba(255,255,255,.45)",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
              {resending?<><FiRefreshCw size={11} style={{display:"inline",marginRight:"4px",animation:"sspin .7s linear infinite"}}/>Sending…</>:"Resend code"}
            </button>}
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
  const [form, setForm] = useState({ name:"", phone:"", email:"", business_name:"", business_type:"", amount_stuck:"", password:"", confirm_password:"" });
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
      else { saveAuth(data.token,data.user,true,data.csrf_token); posthog.identify(data.user.id,{email:data.user.email,plan:data.user.plan}); router.push("/dashboard"); }
    } catch (err: unknown) { setError(err instanceof Error?err.message:"Signup failed"); }
    finally { setLoading(false); }
  }

  const handleOTPVerified = (token: string, user: any, csrfToken?: string|null) => {
    saveAuth(token,user,true,csrfToken);
    posthog.identify(user.id,{email:user.email,name:user.business_name,plan:user.plan});
    posthog.capture("user_signed_up",{business_type:form.business_type});
    router.push("/dashboard");
  };

  if (otpStep && preToken && verifiedUser)
    return <OTPStep preToken={preToken} userEmail={verifiedUser.email} userPhone={verifiedUser.phone} onVerified={handleOTPVerified}/>;

  return (
    <div>
      {/* Progress dots */}
      <div className="progress">
        {[1,2].map(n=>(
          <>
            <div key={`d${n}`} className={`p-dot${step>=n?" active":""}${step>n?" done":""}`}/>
            {n<2&&<div key={`l${n}`} className="p-line"/>}
          </>
        ))}
      </div>

      {error&&<div style={{marginBottom:"16px",padding:"12px 16px",borderRadius:"6px",background:"rgba(255,80,80,.08)",border:"1px solid rgba(255,80,80,.2)",fontSize:"13px",color:"rgba(255,100,100,.9)",fontFamily:"'JetBrains Mono',monospace"}}>{error}</div>}
      {referredBy&&step===1&&<div style={{marginBottom:"16px",padding:"12px 16px",borderRadius:"6px",background:"rgba(16,217,138,.08)",border:"1px solid rgba(16,217,138,.2)",fontSize:"12px",color:"#10D98A"}}>🎉 You were invited — join free</div>}

      {/* Step 1 */}
      {step===1&&(
        <form onSubmit={goStep2}>
          <div className="step-head">
            <div className="step-num">Step 1 of 2</div>
            <h2>Create your<br/>free account.</h2>
            <p>No credit card required. Up and running in 8 minutes.</p>
          </div>
          <div className="form-grid" style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            <div className="row-2">
              <div className="field"><label>First name</label><FocusInput type="text" placeholder="Rahul" value={form.name} onChange={set("name")} required/></div>
              <div className="field"><label>Company name</label><FocusInput type="text" placeholder="Kumar Traders" value={form.business_name} onChange={set("business_name")} required/></div>
            </div>
            <div className="field"><label>Work email</label><FocusInput type="email" placeholder="you@company.com" value={form.email} onChange={set("email")} required autoComplete="email"/></div>
            <div className="field">
              <label>Business type</label>
              <select value={form.business_type} onChange={set("business_type")}
                style={{...iBase,backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center",paddingRight:"38px",cursor:"pointer",color:form.business_type?"#fff":"rgba(255,255,255,.22)"}}>
                {businessTypes.map(o=><option key={o.value} value={o.value} style={{background:"#111",color:"#fff"}}>{o.label}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-main">
              <span className="btn-txt">Continue</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
          </div>
          <div className="trust">
            <div className="trust-item">Free forever plan</div>
            <div className="trust-item">No credit card</div>
            <div className="trust-item">Cancel anytime</div>
          </div>
          <div className="auth-foot" style={{marginTop:"24px"}}>Already have an account? <Link href="/login">Log in</Link></div>
        </form>
      )}

      {/* Step 2 */}
      {step===2&&(
        <form onSubmit={handleSubmit}>
          <div className="step-head">
            <div className="step-num">Step 2 of 2</div>
            <h2>Set your password<br/>&amp; go live.</h2>
            <p>Starlane adapts to your business from day one.</p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
            {/* Phone */}
            <div className="field">
              <label>Phone (WhatsApp — OTP sent here)</label>
              <div style={{display:"flex"}}>
                <span style={{display:"flex",alignItems:"center",padding:"0 14px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRight:"none",borderRadius:"6px 0 0 6px",fontSize:"13px",fontFamily:"'JetBrains Mono',monospace",color:"rgba(255,255,255,.45)",flexShrink:0}}>+91</span>
                <FocusInput type="tel" placeholder="9876543210" value={form.phone} onChange={set("phone")} required maxLength={10} pattern="\d{10}" style={{borderRadius:"0 6px 6px 0"} as React.CSSProperties}/>
              </div>
            </div>
            {/* Amount */}
            <div className="field">
              <label>Amount stuck in receivables (approx)</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",fontSize:"13px",fontFamily:"'JetBrains Mono',monospace",color:"rgba(255,255,255,.35)"}}>₹</span>
                <FocusInput type="number" placeholder="2500000" value={form.amount_stuck} onChange={set("amount_stuck")} required style={{paddingLeft:"28px"} as React.CSSProperties}/>
              </div>
            </div>
            {/* Password */}
            <div className="field">
              <label>Password</label>
              <div style={{position:"relative"}}>
                <FocusInput type={showPassword?"text":"password"} placeholder="Min 8 characters" value={form.password} onChange={set("password")} required minLength={8} style={{paddingRight:"44px"} as React.CSSProperties}/>
                <button type="button" onClick={()=>setShowPassword(v=>!v)} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.3)"}}>{showPassword?<FiEyeOff size={14}/>:<FiEye size={14}/>}</button>
              </div>
              {form.password.length>0&&form.password.length<8&&<p style={{fontSize:"10px",marginTop:"4px",color:"rgba(255,80,80,.8)",fontFamily:"'JetBrains Mono',monospace"}}>At least 8 characters</p>}
            </div>
            {/* Confirm */}
            <div className="field">
              <label>Confirm password</label>
              <div style={{position:"relative"}}>
                <FocusInput type={showConfirm?"text":"password"} placeholder="Re-enter password" value={form.confirm_password} onChange={set("confirm_password")} required style={{paddingRight:"44px"} as React.CSSProperties}/>
                <button type="button" onClick={()=>setShowConfirm(v=>!v)} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.3)"}}>{showConfirm?<FiEyeOff size={14}/>:<FiEye size={14}/>}</button>
              </div>
              {form.confirm_password.length>0&&form.password!==form.confirm_password&&<p style={{fontSize:"10px",marginTop:"4px",color:"rgba(255,80,80,.8)",fontFamily:"'JetBrains Mono',monospace"}}>Passwords do not match</p>}
              {form.confirm_password.length>0&&form.password===form.confirm_password&&form.password.length>=8&&<p style={{fontSize:"10px",marginTop:"4px",color:"#10D98A",fontFamily:"'JetBrains Mono',monospace"}}>✓ Looks good</p>}
            </div>
            <div className="btn-row">
              <button type="button" className="btn-back" onClick={()=>{setStep(1);setError("");}}>Back</button>
              <button type="submit" className="btn-main" disabled={loading} style={{opacity:loading?.6:1,position:"relative"}}>
                {loading?<><div style={{width:"16px",height:"16px",border:"2px solid rgba(0,0,0,.2)",borderTop:"2px solid #000",borderRadius:"50%",animation:"sspin .7s linear infinite",marginRight:"8px"}}/> Creating account…</>:<><span className="btn-txt">Create free account</span><FiArrowRight size={16}/></>}
              </button>
            </div>
            <p style={{marginTop:"8px",fontSize:"12px",color:"rgba(255,255,255,.28)",textAlign:"center",lineHeight:1.6}}>
              By creating an account you agree to our <Link href="/terms" style={{color:"rgba(255,255,255,.55)"}}>Terms</Link> and <Link href="/privacy" style={{color:"rgba(255,255,255,.55)"}}>Privacy Policy</Link>.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="atlas-page auth-page">
      <header className="topbar">
        <Link href="/" style={{display:"flex",alignItems:"center",gap:"10px",textDecoration:"none",color:"#fff"}}>
          <StarlaneMark size={26}/>
          <span className="brand-wm">Starlane</span>
        </Link>
        <div className="topbar-right">Already have an account? <Link href="/login">Log in</Link></div>
      </header>
      <main className="center">
        <Suspense fallback={null}><SignupForm/></Suspense>
      </main>
      <footer className="page-foot">
        <span>&copy; 2026 Atlax</span>
        <div style={{display:"flex",gap:"24px"}}>
          <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/security">Security</Link>
        </div>
      </footer>
      <style>{`@keyframes sspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
