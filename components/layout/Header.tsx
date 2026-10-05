"use client";

import { FiMenu } from "react-icons/fi";
import Link from "next/link";

interface HeaderProps { onMenuToggle: () => void; pageTitle?: string; }

// Version 32 has no top bar: the page title lives in the page. On phones
// and small tablets this slim strip carries the menu button that opens the
// sidebar drawer, the wordmark and the page name; on desktop it is hidden.
export default function Header({ onMenuToggle, pageTitle }: HeaderProps) {
  return (
    <header
      className="lg:hidden relative flex items-center gap-3 px-4 shrink-0 z-10"
      style={{ height: 52, background: "#F7F7F4", borderBottom: "1px solid #EBEAE6" }}
    >
      <button
        onClick={onMenuToggle}
        className="hover-dim w-8 h-8 -ml-1.5 flex items-center justify-center rounded-md shrink-0"
        style={{ color: "#43433F" }}
        aria-label="Open menu"
      >
        <FiMenu size={17} />
      </button>
      <Link href="/bridge" style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, color: "#191917", letterSpacing: "-0.3px" }}>Starlane</Link>
      {pageTitle && <span className="truncate" style={{ fontSize: 13, color: "#8A8A86" }}>{pageTitle}</span>}
    </header>
  );
}
