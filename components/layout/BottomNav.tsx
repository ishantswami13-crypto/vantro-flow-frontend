"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiGrid, FiList, FiCpu, FiUsers, FiZap } from "react-icons/fi";

const TABS = [
  { href: "/dashboard",   icon: FiGrid,   label: "Home"     },
  { href: "/collections", icon: FiList,   label: "Collect"  },
  { href: "/ai-chat",     icon: FiCpu,    label: "AI"       },
  { href: "/network",     icon: FiUsers,  label: "Network"  },
  { href: "/my-id",       icon: FiZap,    label: "My ID"    },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/5"
      style={{ background: "rgba(6,13,26,0.96)", backdropFilter: "blur(20px)" }}>
      <div className="flex items-stretch">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={[
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-all",
                active ? "text-accent" : "text-muted hover:text-secondary",
              ].join(" ")}>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-b-full" />
              )}
              <Icon size={19} className={active ? "drop-shadow-[0_0_8px_rgba(0,102,255,0.8)]" : ""} />
              <span className="text-2xs font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
      {/* iOS safe area */}
      <div className="h-safe-bottom" style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
