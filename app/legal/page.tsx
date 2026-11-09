import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { pageMetadata, breadcrumb } from "@/lib/site";
import { JsonLd } from "@/components/marketing/JsonLd";
import { HxShell } from "@/components/marketing/hx/Shell";
import { Hero } from "@/components/marketing/hx/Blocks";

export const metadata: Metadata = pageMetadata({
  path: "/legal",
  title: "Legal",
  description: "Starlane's terms, privacy policy and security disclosure, in one place.",
});

export const viewport: Viewport = { themeColor: "#0F0E0D" };

const DOCS: Array<[string, string, string]> = [
  ["/terms", "Terms of Service", "The agreement for using Starlane"],
  ["/privacy", "Privacy Policy", "What we collect, why, and your choices"],
  ["/security", "Security and Control", "Every control in place today, and what is absent"],
  ["/security#disclosure", "Vulnerability Disclosure", "How to report a security issue privately"],
];

export default function LegalPage() {
  return (
    <HxShell>
      <JsonLd data={breadcrumb("/legal", "Legal")} />
      <Hero variant="stack" kicker="Legal" title="Legal" lead="These documents govern how you use Starlane and how we handle your data." cta={null} />
      <section className="hx-s pt96 pb160" aria-label="Documents">
        <div className="hx-w hx-2">
          <h2 className="hx-h2 hx-r">Policies and Terms</h2>
          <ul className="hx-docs hx-r">
            {DOCS.map(([href, t, d]) => (
              <li key={href}><Link href={href}><span style={{ display: "grid", gap: 4 }}><b style={{ fontWeight: 500, color: "var(--fg)", fontSize: "calc(20px * var(--s))" }}>{t}</b><span>{d}</span></span><i aria-hidden>→</i></Link></li>
            ))}
          </ul>
        </div>
      </section>
    </HxShell>
  );
}
