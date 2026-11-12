"use client";

// Accept an invitation to an organization. The link carries a one-time
// token; the server shows the organization and role, and lets only the
// signed-in account with the invited, verified email accept. If nobody is
// signed in, the link is remembered so sign-in or sign-up returns here.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { platformApi, rememberPendingInvite, setActiveOrgId, PlatformError, type InvitationPreview } from "@/lib/platform";
import { getToken } from "@/lib/api";

const ROLE_TEXT: Record<string, string> = { admin: "an admin", member: "a member", viewer: "a viewer" };

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [inv, setInv] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const path = `/invite/${token}`;
    // Remembered before any call: an expired session sends the browser to sign in.
    rememberPendingInvite(path);
    if (!getToken() && !document.cookie.includes("vantro_csrf")) { setSignedOut(true); return; }
    platformApi.invitationByToken(token)
      .then((r) => { setInv(r.invitation); if (r.invitation.status !== "pending") rememberPendingInvite(null); })
      .catch((e) => setError(e instanceof PlatformError && e.status === 404 ? "This invitation link is not valid. Ask the person who invited you for a new one." : e instanceof Error ? e.message : "Could not open the invitation."));
  }, [token]);

  async function accept() {
    setBusy(true); setError(null);
    try {
      const r = await platformApi.acceptInvitation(token);
      rememberPendingInvite(null);
      setActiveOrgId(r.organizationId);
      router.push("/command");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept the invitation.");
    } finally { setBusy(false); }
  }

  const card: React.CSSProperties = { maxWidth: 460, margin: "12vh auto 0", padding: 28, background: "#fff", border: "1px solid #E4E1DA", borderRadius: 12 };
  return (
    <main style={{ minHeight: "100vh", background: "#F6F5F1", padding: "0 16px" }}>
      <div style={card}>
        <div style={{ fontFamily: "var(--font-serif, Georgia, serif)", fontSize: 24, color: "#191917", marginBottom: 6 }}>Starlane</div>
        {signedOut ? (
          <>
            <h1 style={{ fontSize: 18, fontWeight: 500, margin: "8px 0" }}>You have been invited to an organization</h1>
            <p style={{ fontSize: 13.5, color: "#43433F", lineHeight: 1.55 }}>Sign in, or create an account, with the email address the invitation was sent to. You will come back here to accept it.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Link href="/login" className="btn-primary-v32" style={{ padding: "8px 14px", borderRadius: 6, fontSize: 13 }}>Sign in</Link>
              <Link href="/signup" style={{ padding: "8px 14px", borderRadius: 6, fontSize: 13, border: "1px solid #E4E1DA" }}>Create an account</Link>
            </div>
          </>
        ) : inv ? (
          <>
            <h1 style={{ fontSize: 18, fontWeight: 500, margin: "8px 0" }}>Join {inv.organizationName || "this organization"}</h1>
            <p style={{ fontSize: 13.5, color: "#43433F", lineHeight: 1.55 }}>You are invited as {ROLE_TEXT[inv.role] || inv.role}.</p>
            {inv.status !== "pending" ? (
              <p role="alert" style={{ fontSize: 13, color: "#A64F4B" }}>This invitation {inv.status === "accepted" ? "was already used" : inv.status === "revoked" ? "was revoked" : "has expired"}. Ask for a new one.</p>
            ) : !inv.emailMatches ? (
              <p role="alert" style={{ fontSize: 13, color: "#A64F4B" }}>This invitation is for a different email address. Sign out and sign in with the invited email to accept it.</p>
            ) : !inv.emailVerified ? (
              <p role="alert" style={{ fontSize: 13, color: "#A64F4B" }}>Verify your email address first, then open this link again.</p>
            ) : (
              <button type="button" onClick={accept} disabled={busy} className="btn-primary-v32" style={{ padding: "8px 14px", borderRadius: 6, fontSize: 13, marginTop: 8 }}>{busy ? "Joining…" : "Accept and join"}</button>
            )}
          </>
        ) : !error ? <p style={{ fontSize: 13, color: "#8F8A81" }}>Opening the invitation…</p> : null}
        {error && <p role="alert" style={{ fontSize: 13, color: "#A64F4B", marginTop: 10 }}>{error}</p>}
      </div>
    </main>
  );
}
