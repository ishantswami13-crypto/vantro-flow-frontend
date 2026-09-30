import type { Metadata } from "next";
import { PublicShell } from "@/components/marketing/PublicShell";
import { GuideSidebar } from "@/components/marketing/product/Guide";

export const metadata: Metadata = {
  title: { default: "Product guide — Starlane", template: "%s — Starlane" },
  description: "Everything in Starlane, page by page: the Bridge, the owner briefing, decisions with evidence, agents, Watch, Discover, Simulate, sources, control, and the desktop and mobile apps — each with its real status.",
};

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicShell>
      <div className="sl-wrap sl-guide">
        <aside className="sl-guide-aside"><GuideSidebar /></aside>
        <div className="sl-guide-main">{children}</div>
      </div>
    </PublicShell>
  );
}
