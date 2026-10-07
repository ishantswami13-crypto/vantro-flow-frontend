"use client";

// The desktop app opens /auth/desktop#id=..&code=.. in its own window to sign
// that window in. The code is single-use, lives 60 seconds and travels in the
// fragment, so it never reaches a server log. Nothing here is reachable
// without a code the signed-in app just asked for.
import { useEffect, useState } from "react";
import Link from "next/link";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { useRouter } from "next/navigation";
import { api, saveAuth } from "@/lib/api";

const ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
// Only paths inside the product, never another site.
const safeNext = (n: string | null) => (n && /^\/[A-Za-z0-9/_-]*$/.test(n) && !n.startsWith("//") ? n : "/bridge");

export default function DesktopSignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const id = params.get("id") || "";
    const code = params.get("code") || "";
    const next = safeNext(params.get("next"));
    // Drop the code from the address bar and history straight away.
    window.history.replaceState(null, "", window.location.pathname);
    if (!ID_RE.test(id) || !code) {
      // Opened without a code: an existing web session just carries on.
      if (localStorage.getItem("vantro_user")) router.replace(next);
      else setError("This sign-in link is not valid.");
      return;
    }
    api.auth.webExchange(id, code)
      .then((d) => saveAuth(d.token, d.user, true, d.csrf_token))
      .then(() => router.replace(next))
      .catch((e: unknown) => {
        if (localStorage.getItem("vantro_user")) { router.replace(next); return; }
        setError(e instanceof Error ? e.message : "Sign-in failed.");
      });
  }, [router]);

  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 24, background: "var(--bg)" }}>
      <div className="fade-once" style={{ display: "grid", justifyItems: "center", gap: 14, maxWidth: 380, textAlign: "center" }}>
        <StarlaneMark size={36} />
        {error ? (
          <>
            <p role="alert" style={{ margin: 0, fontSize: 15, color: "var(--ink)" }}>{error}</p>
            <Link href="/login" className="ui-btn ui-btn-primary">Sign in again</Link>
          </>
        ) : (
          <p role="status" aria-live="polite" className="flex items-center gap-2" style={{ margin: 0, fontSize: 14, color: "var(--ink-2)" }}>
            <span aria-hidden="true" className="w-3.5 h-3.5 border-[1.5px] border-current border-t-transparent rounded-full animate-spin" />
            Opening Starlane…
          </p>
        )}
      </div>
    </main>
  );
}
