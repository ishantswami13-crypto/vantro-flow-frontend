"use client";

import { FiMenu, FiBell, FiSettings } from "react-icons/fi";
import Link from "next/link";

interface HeaderProps {
  onMenuToggle: () => void;
  pageTitle?: string;
}

export default function Header({ onMenuToggle, pageTitle }: HeaderProps) {
  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-secondary hover:text-primary focus-ring rounded p-1"
          aria-label="Open menu"
        >
          <FiMenu size={20} />
        </button>
        {pageTitle && (
          <h1 className="text-sm font-semibold text-primary hidden sm:block">{pageTitle}</h1>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button className="p-2 text-secondary hover:text-primary hover:bg-surface-2 rounded-md transition-colors focus-ring" aria-label="Notifications">
          <FiBell size={17} />
        </button>
        <Link
          href="/settings"
          className="p-2 text-secondary hover:text-primary hover:bg-surface-2 rounded-md transition-colors focus-ring"
          aria-label="Settings"
        >
          <FiSettings size={17} />
        </Link>
        <div className="ml-2 w-8 h-8 rounded-md bg-accent-dim border border-accent/30 flex items-center justify-center">
          <span className="text-xs font-semibold text-accent">R</span>
        </div>
      </div>
    </header>
  );
}
