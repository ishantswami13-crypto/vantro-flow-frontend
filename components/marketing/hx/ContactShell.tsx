import "@/app/landing.css";
import "@/app/hx.css";
import Link from "next/link";
import StarlaneMark from "@/components/brand/StarlaneMark";

// Frame for the pilot request flow, laid out like the reference contact page:
// a bare header with a way back, a serif headline, then the form in a white
// card on a plain light band, and a one-line footer.
export function ContactShell({ title, lead, children, wide }: { title: React.ReactNode; lead: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="hx hx-contact">
      <a className="hx-skip" href="#main">Skip to content</a>
      <header className="hx-c-top">
        <Link href="/" className="hx-c-logo" aria-label="Starlane home"><StarlaneMark variant="glyph" size={26} /><span>Starlane</span></Link>
        <Link href="/" className="hx-c-back">Back to full website</Link>
      </header>
      <main id="main">
        <section className="hx-c-hero">
          <h1 className="hx-c-h1">{title}</h1>
          <p className="hx-c-lead">{lead}</p>
        </section>
        <section className="hx-c-band">
          <div className={"hx-c-card" + (wide ? " wide" : "")}>{children}</div>
        </section>
      </main>
      <footer className="hx-c-foot">
        <Link href="/security">Security</Link>
        <Link href="/legal">Legal</Link>
        <span>© {new Date().getFullYear()} Vantro Technologies</span>
      </footer>
    </div>
  );
}
