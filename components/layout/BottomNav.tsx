"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiGrid, FiList, FiMessageSquare, FiPlus, FiCpu } from "react-icons/fi";

const TABS = [
  { href: "/dashboard",   icon: FiGrid,          label: "Home",    key: "home"    },
  { href: "/collections", icon: FiList,          label: "Karo",    key: "karo"    },
  { href: null,           icon: FiPlus,          label: "Add",     key: "add"     }, // center FAB
  { href: "/whatsapp",   icon: FiMessageSquare,  label: "Bhejo",   key: "bhejo"   },
  { href: "/ai-chat",    icon: FiCpu,            label: "AI",      key: "ai"      },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(13,15,20,0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-end px-2">
        {TABS.map(({ href, icon: Icon, label, key }) => {
          // ── Centre FAB — Add Invoice ─────────────────────────
          if (key === "add") {
            return (
              <div key="add" className="flex-1 flex justify-center">
                <Link
                  href="/invoice/new"
                  className="relative -top-4 flex flex-col items-center justify-center w-14 h-14 rounded-2xl text-white transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #FF6B35 0%, #F55A22 100%)",
                    boxShadow: "0 4px 20px rgba(255,107,53,0.55), 0 2px 8px rgba(0,0,0,0.4)",
                  }}
                >
                  <Icon size={22} strokeWidth={2.5} />
                </Link>
              </div>
            );
          }

          // ── Regular tab ──────────────────────────────────────
          const active = pathname === href || (href !== null && pathname.startsWith(href + "/"));
          return (
            <Link
              key={key}
              href={href!}
              className={[
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-all",
                active ? "text-accent" : "text-muted hover:text-secondary",
              ].join(" ")}
            >
              {/* Active top indicator */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-accent" />
              )}
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                className={active ? "drop-shadow-[0_0_8px_rgba(79,110,247,0.9)]" : ""}
              />
              <span className={`text-2xs font-bold ${active ? "text-accent" : "text-muted"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* iOS safe area */}
      <div style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
