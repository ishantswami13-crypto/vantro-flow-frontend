"use client";

// Return from an organization's single sign-on. The server put a 60-second
// single-use code in the URL fragment (never sent to any server or log); this
// page trades it for a session and removes it from the address bar.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveAuth } from "@/lib/api";
import { setActiveOrgId, takePendingInvite } from "@/lib/platform";
import { AuthShell, AuthHead, AuthError, Spinner } from "@/components/auth/AuthShell";

export default function SsoReturnPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const frag = new URLSearchParams(window.location.hash.slice(1));
    const id = frag.get("id"); const code = frag.get("code");
    window.history.replaceState(null, "", window.location.pathname);
    if (!id || !code) { setError("This sign-in link is not complete. Sign in again."); return; }
    api.auth.ssoExchange(id, code)
      .then(async (d) => {
        await saveAuth(d.token, d.user, true, d.csrf_token);
        setActiveOrgId(d.organizationId);
        router.replace(takePendingInvite() || "/bridge");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Single sign-on failed. Sign in again."));
  }, [router]);
  return (
    <AuthShell aside={<Link href="/login">Back to sign in</Link>}>
      <AuthHead title="Signing you in" lead="Finishing single sign-on with your company." />
      {error ? <><AuthError>{error}</AuthError><Link className="sl-btn" href="/login">Sign in again</Link></> : <p style={{ display: "flex", gap: 8, alignItems: "center" }}><Spinner /> One moment…</p>}
    </AuthShell>
  );
}
