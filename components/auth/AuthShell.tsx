import Link from "next/link";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { Texture } from "@/components/marketing/home2/Texture";
import { DecisionMock } from "@/components/marketing/hx/Mocks";
import "@/app/hx.css";
import "@/app/auth.css";

// Frame for sign in, sign up and password reset, in the public site's look:
// the form on paper on the left, a painted panel with a product view on the
// right (hidden on narrow screens), and a one-line footer.
export function AuthShell({
  aside,
  children,
}: {
  /** The link at the top right, e.g. "No account? Create one". */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="hx sl-auth">
      <a className="hx-skip" href="#main">Skip to content</a>
      <div className="sl-auth-l">
        <header className="sl-auth-top">
          <Link href="/" className="sl-auth-logo" aria-label="Starlane home">
            <StarlaneMark variant="glyph" size={22} />
            <span>Starlane</span>
          </Link>
          {aside && <div className="sl-auth-aside">{aside}</div>}
        </header>
        <main id="main" className="sl-auth-main">
          <div className="sl-auth-col">{children}</div>
        </main>
        <footer className="sl-auth-foot">
          <span>© {new Date().getFullYear()} Starlane</span>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/security">Security</Link>
          </nav>
        </footer>
      </div>
      <aside className="sl-auth-r" aria-hidden>
        <Texture id="auth-paint" tone="moss" seed={5} />
        <div className="sl-auth-r-in">
          <DecisionMock className="sl-auth-mock" />
          <blockquote>
            <p>Agents prepare the work. A person approves it, and the approval is recorded.</p>
            <footer>Starlane operating principle</footer>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}

/** Serif title and a one-line lead, as on the rest of the site. */
export function AuthHead({ title, lead, step }: { title: React.ReactNode; lead?: React.ReactNode; step?: string }) {
  return (
    <div className="sl-auth-head">
      {step && <p className="sl-auth-step">{step}</p>}
      <h1>{title}</h1>
      {lead && <p className="sl-auth-lead">{lead}</p>}
    </div>
  );
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return <div className="sl-auth-err" role="alert">{children}</div>;
}

export function Spinner() {
  return <span className="sl-auth-spin" aria-hidden />;
}
