import "@/app/landing.css";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

// Frame for public (pre-account) pages: access application, status, download.
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="sl">
      <a className="sl-skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
