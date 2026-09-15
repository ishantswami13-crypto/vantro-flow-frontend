"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiGlobe, FiDatabase, FiShield, FiPlus, FiMenu } from "react-icons/fi";

// Mirrors the sidebar's own primary IA (Intelligence / Sources / Control)
// instead of the old Home/Karo/Bhejo/AI mobile-only navigation, which
// pointed at routes (dashboard, collections, whatsapp, ai-chat) that no
// longer match the product's real information architecture. "Menu" opens
// the same mobile sidebar drawer the header hamburger already opens —
// one source of truth for Recents/More/account, not a second copy of it.
const TABS = [
  { href: "/intelligence", icon: FiGlobe,    label: "Intelligence" },
  { href: "/connections",  icon: FiDatabase, label: "Sources" },
  { href: null,            icon: FiPlus,     label: "New" }, // center action
  { href: "/control",      icon: FiShield,   label: "Control" },
] as const;

interface BottomNavProps { onMenuToggle: () => void; }

export default function BottomNav({ onMenuToggle }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{ background: "#141414", borderTop: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-stretch px-1">
        {TABS.map(({ href, icon: Icon, label }) => {
          if (href === null) {
            return (
              <div key="new" className="flex-1 flex justify-center">
                <Link
                  href="/intelligence"
                  className="relative -top-3 flex flex-col items-center justify-center w-12 h-12 rounded-full transition-colors active:scale-95"
                  style={{ background: "#F7F7F4", color: "#171717" }}
                  aria-label="New investigation"
                >
                  <Icon size={20} strokeWidth={2.25} />
                </Link>
              </div>
            );
          }
          const active = pathname === href || pathname.startsWith(href + "/");
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
        })}
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
