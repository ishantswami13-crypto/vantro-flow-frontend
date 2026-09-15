"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiPlus, FiMenu } from "react-icons/fi";
import { PRIMARY_NAV, isPrimaryNavActive } from "@/lib/navigation";

// Mirrors the sidebar's own primary IA — both render from the same
// PRIMARY_NAV array (lib/navigation.ts) so they cannot drift out of sync
// again, which is exactly how the old BottomNav ended up pointing at
// routes (dashboard, collections, whatsapp, ai-chat) that no longer
// existed in the product's real navigation. The center slot is a "New
// investigation" action, not a nav item, and is inserted between the
// first and second primary items (Intelligence / Sources) rather than
// being part of the shared array. "Menu" opens the same mobile sidebar
// drawer the header hamburger already opens — one source of truth for
// Recents/More/account, not a second copy of it.
interface BottomNavProps { onMenuToggle: () => void; }

export default function BottomNav({ onMenuToggle }: BottomNavProps) {
  const pathname = usePathname();
  const [first, ...rest] = PRIMARY_NAV;

  function renderTab({ href, icon: Icon, label }: (typeof PRIMARY_NAV)[number]) {
    const active = isPrimaryNavActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors active:scale-95"
        style={{ color: active ? "#F7F7F5" : "#8A8A86" }}
      >
        <Icon size={19} strokeWidth={active ? 2.25 : 1.75} />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    );
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{ background: "#141414", borderTop: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-stretch px-1">
        {renderTab(first)}
        <div className="flex-1 flex justify-center">
          <Link
            href="/intelligence"
            className="relative -top-3 flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors active:scale-95"
            style={{ background: "#F7F7F4", color: "#171717" }}
            aria-label="New investigation"
          >
            <FiPlus size={20} strokeWidth={2.25} />
          </Link>
        </div>
        {rest.map(renderTab)}
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors active:scale-95"
          style={{ color: "#8A8A86" }}
          aria-label="Open menu"
        >
          <FiMenu size={19} strokeWidth={1.75} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
      {/* iOS safe area */}
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
