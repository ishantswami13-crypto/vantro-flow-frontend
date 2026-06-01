"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff, FiArrowRight, FiCheck } from "react-icons/fi";
import { api, saveAuth } from "@/lib/api";
import { posthog } from "@/lib/posthog";

function AtlasMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <path fill="white" fillRule="evenodd" className="atlas-mark-spin"
        d="M 50 8 L 4 92 L 96 92 Z M 50 78 L 38 92 L 62 92 Z M 26 59 L 74 59 L 74 68 L 26 68 Z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [step, setStep]             = useState<"email"|"password">("email");
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm]             = useState({ email: "", password: "" });
  const [emailValid, setEmailValid] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vantro_saved_email");
    if (saved) { setForm(f => ({ ...f, email: saved })); setEmailValid(true); }
  }, []);
  useEffect(() => { if (step === "password") setTimeout(() => passRef.current?.focus(), 150); }, [step]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailNext = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateEmail(form.email)) { setError("Enter a valid email address"); return; }
    setError(""); setStep("password");
  };

  const handleLogin = async (ev: React.FormEvent) => {
    ev.preventDefault(); setError(""); setLoading(true);
    try {
      const data = await api.auth.login(form);
      if (rememberMe) { localStorage.setItem("vantro_saved_email", form.email); localStorage.setItem("vantro_remember", "1"); }
      else { localStorage.removeItem("vantro_saved_email"); localStorage.removeItem("vantro_remember"); }
      saveAuth(data.token, data.user, rememberMe, data.csrf_token);
      posthog.identify(data.user.id, { email: data.user.email, name: data.user.business_name, plan: data.user.plan });
      posthog.capture("user_logged_in");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally { setLoading(false); }
  };

  const iBase = { background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.10)", borderRadius:"6px", padding:"13px 16px", fontFamily:"'Hanken Grotesk',system-ui", fontSize:"15px", color:"#fff", outline:"none", width:"100%", transition:"border-color .2s,background .2s" };
  const iFocus = { ...iBase, borderColor:"rgba(255,255,255,.38)", background:"rgba(255,255,255,.07)" };

  return (
    <div className="atlas-page auth-page">
      <header className="topbar">
        <Link href="/" style={{display:"flex",alignItems:"center",gap:"10px",textDecoration:"none",color:"#fff"}}>
          <AtlasMark size={26}/>
          <span className="brand-wm">Atlas</span>
        </Link>
        <div className="topbar-right">No account? <Link href="/signup">Start free</Link></div>
      </header>

      <main className="center">
        <div className="auth-head">
          <h1>Welcome back.</h1>
          <p style={{fontFamily:"'Hanken Grotesk',system-ui"}}>{step === "email" ? "Sign in to your Atlas workspace." : form.email}</p>
        </div>

        {error && (
          <div style={{marginBottom:"16px",padding:"12px 16px",borderRadius:"6px",background:"rgba(255,80,80,.08)",border:"1px solid rgba(255,80,80,.2)",fontSize:"13px",color:"rgba(255,100,100,.9)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:".04em"}}>
            {error}
          </div>
        )}

        {step === "email" && (
          <form className="auth-form" onSubmit={handleEmailNext} noValidate>
            <div className="field">
              <label htmlFor="email">Work Email</label>
              <div style={{position:"relative"}}>
                <input id="email" type="email" autoFocus autoComplete="email" placeholder="you@company.com"
                  value={form.email}
                  onChange={e=>{setForm(f=>({...f,email:e.target.value}));setEmailValid(validateEmail(e.target.value));setError("");}}
                  onFocus={()=>setEmailFocused(true)} onBlur={()=>setEmailFocused(false)}
                  style={emailFocused?iFocus:iBase}
                />
                {emailValid&&<div style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",width:"20px",height:"20px",borderRadius:"50%",background:"rgba(16,217,138,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}><FiCheck size={11} style={{color:"#10D98A"}}/></div>}
              </div>
            </div>
            <button type="submit" className="btn-login" disabled={!emailValid} style={{marginTop:"8px",opacity:emailValid?1:0.4}}>
              <span className="btn-txt">Continue</span>
              <FiArrowRight size={16}/>
            </button>
          </form>
        )}

        {step === "password" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:"6px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)"}}>
              <span style={{fontSize:"13px",color:"rgba(255,255,255,.7)"}}>{form.email}</span>
              <button type="button" onClick={()=>{setStep("email");setForm(f=>({...f,password:""}));setError("");}}
                style={{fontSize:"12px",color:"rgba(255,255,255,.4)",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>Change</button>
            </div>
            <div className="field">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"8px"}}>
                <label htmlFor="password">Password</label>
                <Link href="/forgot-password" style={{fontSize:"12px",color:"rgba(255,255,255,.32)",textDecoration:"none"}}>Forgot password?</Link>
              </div>
              <div style={{position:"relative"}}>
                <input ref={passRef} id="password" type={showPass?"text":"password"} placeholder="••••••••••••"
                  value={form.password} onChange={e=>{setForm(f=>({...f,password:e.target.value}));setError("");}}
                  onFocus={()=>setPassFocused(true)} onBlur={()=>setPassFocused(false)}
                  autoComplete="current-password" required style={{...(passFocused?iFocus:iBase),paddingRight:"44px"}}
                />
                <button type="button" onClick={()=>setShowPass(!showPass)}
                  style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.3)"}}>
                  {showPass?<FiEyeOff size={14}/>:<FiEye size={14}/>}
                </button>
              </div>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:"12px",cursor:"pointer"}}>
              <div onClick={()=>setRememberMe(r=>!r)} style={{width:"36px",height:"20px",borderRadius:"10px",background:rememberMe?"rgba(255,255,255,.9)":"rgba(255,255,255,.1)",position:"relative",transition:"background .2s",cursor:"pointer",flexShrink:0}}>
                <div style={{position:"absolute",top:"2px",width:"16px",height:"16px",background:"#000",borderRadius:"50%",transition:"transform .2s",transform:rememberMe?"translateX(18px)":"translateX(2px)"}}/>
              </div>
              <span style={{fontSize:"13px",color:"rgba(255,255,255,.45)"}}>Stay signed in for 30 days</span>
            </label>
            <button type="submit" className="btn-login" disabled={loading||!form.password} style={{marginTop:"8px",opacity:loading||!form.password?0.4:1,position:"relative"}}>
              {loading
                ? <><div style={{width:"16px",height:"16px",border:"2px solid rgba(0,0,0,.2)",borderTop:"2px solid #000",borderRadius:"50%",animation:"lspin .7s linear infinite"}}/> Signing in…</>
                : <><span className="btn-txt">Sign in</span><FiArrowRight size={16}/></>}
            </button>
          </form>
        )}

        <div className="auth-foot" style={{marginTop:"36px"}}>
          By signing in, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
        </div>
      </main>

      <footer className="page-foot">
        <span>&copy; 2026 Vantro Technologies</span>
        <div style={{display:"flex",gap:"24px"}}>
          <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/security">Security</Link>
        </div>
      </footer>
      <style>{`@keyframes lspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
