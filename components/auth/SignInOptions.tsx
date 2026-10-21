"use client";

// Google, Apple and phone sign-in for the website. Each option lights up only
// once the server has its key (GET /api/auth/providers); until then it is not
// shown at all. Email and password stay below as the
// Starlane ID.
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/api";

type Session = { token: string; csrf_token?: string | null; user: User };
type Providers = { google: { clientId: string } | null; apple: { clientId: string } | null; phone: boolean };

declare global {
  interface Window {
    google?: any;
    AppleID?: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("This sign-in option didn't load. Check your connection and try again."));
    document.head.appendChild(s);
  });
}

const AppleLogo = () => (
  <svg width="16" height="18" viewBox="0 0 814 1000" aria-hidden="true" fill="currentColor">
    <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-167 41s-106-58-156-128C44 790 0 669 0 554c0-185 120-283 239-283 63 0 115 41 155 41 38 0 97-44 169-44 27 0 125 2 190 95zM554 168c30-35 51-84 51-133 0-7-1-14-2-19-48 2-106 32-140 72-27 31-53 80-53 130 0 8 1 15 2 18 3 1 8 1 13 1 43 0 98-29 129-69z"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>
  </svg>
);

export function SignInOptions({ onSession, onError, disabled }: { onSession: (s: Session) => void; onError: (msg: string) => void; disabled?: boolean }) {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [busy, setBusy] = useState<"" | "google" | "apple" | "phone">("");
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [note, setNote] = useState("");
  const googleBox = useRef<HTMLDivElement>(null);
  const onSessionRef = useRef(onSession); onSessionRef.current = onSession;
  const onErrorRef = useRef(onError); onErrorRef.current = onError;

  useEffect(() => {
    api.auth.providers().then(setProviders).catch(() => setProviders({ google: null, apple: null, phone: false }));
  }, []);

  // Google draws its own button once a client id is set.
  useEffect(() => {
    const clientId = providers?.google?.clientId;
    if (!clientId || !googleBox.current) return;
    let cancelled = false;
    loadScript("https://accounts.google.com/gsi/client").then(() => {
      if (cancelled || !window.google || !googleBox.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }: { credential: string }) => {
          setBusy("google");
          try { onSessionRef.current(await api.auth.oauth("google", { credential })); }
          catch (e) { onErrorRef.current(e instanceof Error && !(e instanceof TypeError) ? e.message : "Google sign-in didn't finish. Try again."); }
          finally { setBusy(""); }
        },
      });
      window.google.accounts.id.renderButton(googleBox.current, { type: "standard", theme: "filled_black", size: "large", shape: "pill", text: "continue_with", width: googleBox.current.offsetWidth || 320 });
    }).catch((e) => onErrorRef.current(e.message));
    return () => { cancelled = true; };
  }, [providers?.google?.clientId]);

  const apple = async () => {
    if (!providers?.apple) return;
    setBusy("apple");
    try {
      await loadScript("https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js");
      window.AppleID.auth.init({ clientId: providers.apple.clientId, scope: "name email", redirectURI: `${window.location.origin}/login`, usePopup: true });
      const r = await window.AppleID.auth.signIn();
      const n = r?.user?.name;
      const name = n ? [n.firstName, n.lastName].filter(Boolean).join(" ") : undefined;
      onSession(await api.auth.oauth("apple", { credential: r.authorization.id_token, name }));
    } catch (e: any) {
      if (e?.error !== "popup_closed_by_user") onError(e instanceof Error && !(e instanceof TypeError) ? e.message : "Apple sign-in didn't finish. Try again.");
    } finally { setBusy(""); }
  };

  const sendCode = async (ev: React.FormEvent) => {
    ev.preventDefault(); setBusy("phone"); setNote("");
    try { const r = await api.auth.phoneStart(phone); setCodeSent(true); setNote(r.message); }
    catch (e) { onError(e instanceof Error && !(e instanceof TypeError) ? e.message : "The code wasn't sent. Check the number and try again."); }
    finally { setBusy(""); }
  };
  const verifyCode = async (ev: React.FormEvent) => {
    ev.preventDefault(); setBusy("phone");
    try { onSession(await api.auth.phoneVerify(phone, code)); }
    catch (e) { onError(e instanceof Error && !(e instanceof TypeError) ? e.message : "That code didn't work. Check the digits or ask for a new one."); }
    finally { setBusy(""); }
  };

  // Only ways that work are shown: a disabled "Soon" button is a promise,
  // not an option. With none configured, the email form stands alone.
  if (!providers || (!providers.google && !providers.apple && !providers.phone)) return null;
  return (
    <div className="signin-options" aria-busy={!!busy}>
      {providers.google && (
        // Google's own button (their brand rules), in its dark pill style.
        <div ref={googleBox} className="so-google" />
      )}
      {providers.apple && (
        <button type="button" className="so-btn" onClick={apple} disabled={!!busy || disabled}>
          <AppleLogo /><span>{busy === "apple" ? "Opening Apple…" : "Continue with Apple"}</span>
        </button>
      )}
      {providers.phone && (
        <button type="button" className="so-btn" onClick={() => setPhoneOpen((o) => !o)} disabled={disabled} aria-expanded={phoneOpen}>
          <PhoneIcon /><span>Continue with phone number</span>
        </button>
      )}

      {phoneOpen && providers?.phone && (
        <form className="so-phone" onSubmit={codeSent ? verifyCode : sendCode}>
          {!codeSent ? (
            <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
          ) : (
            <input inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
          )}
          <button type="submit" className="so-go" disabled={busy === "phone" || (codeSent ? code.length !== 6 : phone.replace(/\D/g, "").length < 10)}>
            {busy === "phone" ? "…" : codeSent ? "Verify" : "Send code"}
          </button>
          {note && <p className="so-note">{note} <button type="button" onClick={() => { setCodeSent(false); setCode(""); setNote(""); }}>Use another number</button></p>}
        </form>
      )}

      <div className="so-divider"><span>or use your Starlane ID</span></div>
    </div>
  );
}
