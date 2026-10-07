"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiLogOut, FiX, FiUser, FiSliders, FiCommand } from "react-icons/fi";
import { getUser, clearAuth } from "@/lib/api";
import { getSmartHiddenRoutes } from "@/lib/businessTypes";
import { getUserContext, getGrantedFeatures, ROUTE_TO_FEATURE, type FeatureKey } from "@/lib/featureGating";
import { CommandPalette, type SearchableRoute } from "./CommandPalette";
import { IdentityAvatar } from "@/components/identity/IdentityAvatar";
import { IdentityPicker } from "@/components/identity/IdentityPicker";
import { PRIMARY_NAV, OPERATE_NAV, SCAN_NAV, type PrimaryNavItem } from "@/lib/navigation";
import { listThreads, SCAN_THREADS_EVENT, type ScanThread } from "@/lib/scanStore";
import { IconTools, IconHelp } from "@/components/v32/icons";

/** Fire from anywhere to open the command palette. */
export const OPEN_COMMAND_EVENT = "starlane:open-command";
export const openCommandPalette = () => window.dispatchEvent(new Event(OPEN_COMMAND_EVENT));

// The business tools that predate the seven surfaces. Still real and
// reachable, grouped in one flyout so the rail stays about the surfaces.
const TOOL_GROUPS: { label: string; items: { href: string; label: string }[] }[] = [
  { label: "Business", items: [
    { href: "/today", label: "Today" },
    { href: "/business-state", label: "Business state" },
    { href: "/dashboard", label: "Overview" },
    { href: "/customers", label: "Customers" },
    { href: "/suppliers", label: "Suppliers" },
  ] },
  { label: "Money", items: [
    { href: "/collections", label: "Collections" },
    { href: "/invoice/new", label: "New invoice" },
    { href: "/bills", label: "GST invoices" },
    { href: "/bank", label: "Bank monitor" },
    { href: "/ledger", label: "Bank ledger" },
    { href: "/forecast", label: "Cash forecast" },
    { href: "/bad-debt", label: "Bad debt" },
    { href: "/khata", label: "Customer khata" },
  ] },
  { label: "Operations", items: [
    { href: "/sales", label: "Sales" },
    { href: "/purchases", label: "Purchases" },
    { href: "/orders", label: "Orders" },
    { href: "/inventory", label: "Inventory" },
    { href: "/scanner", label: "Invoice scanner" },
    { href: "/attendance", label: "Attendance" },
    { href: "/team", label: "Team" },
  ] },
  { label: "Automation", items: [
    { href: "/whatsapp", label: "WhatsApp" },
    { href: "/dunning", label: "Follow-ups" },
    { href: "/ai-actions", label: "Action center" },
    { href: "/brain", label: "Brain" },
    { href: "/ai-chat", label: "Advisor" },
    { href: "/ai-train", label: "Training" },
  ] },
  { label: "Insights", items: [
    { href: "/analytics", label: "Analytics" },
    { href: "/reports", label: "Reports" },
    { href: "/billing", label: "Billing" },
  ] },
];
const TOOL_HREFS = TOOL_GROUPS.flatMap((g) => g.items.map((i) => i.href));

const SHORTCUTS = [
  { keys: "Ctrl/⌘ K", desc: "Search and run commands" },
  { keys: "Ctrl/⌘ 1–7", desc: "Go to Bridge … Memory" },
  { keys: "↑ ↓  Enter", desc: "Move and open in lists" },
  { keys: "Esc", desc: "Close a panel or dialog" },
];

interface SidebarProps { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hiddenRoutes, setHiddenRoutes] = useState<Set<string>>(new Set());
  const [granted, setGranted] = useState<Set<FeatureKey>>(new Set());
  const [toolsOpen, setToolsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [recent, setRecent] = useState<ScanThread[]>([]);
  const accountRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsBtnRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) => {
    if (href === "/scan") return pathname === "/scan" || (pathname.startsWith("/scan/") && pathname !== "/scan/history");
    if (href === "/control") return pathname === "/control" || (pathname.startsWith("/control/") && !pathname.startsWith("/control/audit"));
    if (href === "/prepared") return pathname === "/prepared" || pathname.startsWith("/prepared/") || pathname.startsWith("/decisions");
    return pathname === href || pathname.startsWith(href + "/");
  };
  const toolsActive = TOOL_HREFS.some((h) => pathname === h || pathname.startsWith(h + "/"));

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (toolsOpen && toolsRef.current && !toolsRef.current.contains(e.target as Node) && !toolsBtnRef.current?.contains(e.target as Node)) setToolsOpen(false);
    }
    if (accountOpen || toolsOpen) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [accountOpen, toolsOpen]);

  useEffect(() => {
    const load = () => setRecent(listThreads().slice(0, 4));
    load();
    window.addEventListener(SCAN_THREADS_EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(SCAN_THREADS_EVENT, load); window.removeEventListener("storage", load); };
  }, []);

  // Ctrl/Cmd+K opens search; Ctrl/Cmd+1..7 jumps between the surfaces.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); return; }
      const item = PRIMARY_NAV.find((n) => n.key === e.key);
      if (item) { e.preventDefault(); router.push(item.href); }
    }
    const onOpen = () => setSearchOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_EVENT, onOpen);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_COMMAND_EVENT, onOpen); };
  }, [router]);

  useEffect(() => {
    if (!shortcutsOpen && !toolsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setShortcutsOpen(false); setToolsOpen(false); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcutsOpen, toolsOpen]);

  useEffect(() => {
    const load = () => {
      setHiddenRoutes(getSmartHiddenRoutes());
      try { setGranted(getGrantedFeatures(getUserContext())); } catch { /* all granted */ }
    };
    const u = getUser();
    if (u) {
      const emailName = u.email?.split("@")[0] || "";
      setUserName(emailName);
      setWorkspace(u.business_name || emailName);
      setIsAdmin(u.email === "ishantswami13@gmail.com");
    }
    load();
    window.addEventListener("storage", load);
    window.addEventListener("vantro:refresh", load);
    return () => { window.removeEventListener("storage", load); window.removeEventListener("vantro:refresh", load); };
  }, []);

  const handleLogout = () => {
    clearAuth();
    document.cookie = "vantro_token=; path=/; max-age=0";
    window.location.href = "/login";
  };

  const locked = (href: string) => {
    const key = ROUTE_TO_FEATURE[href];
    return key ? granted.size > 0 && !granted.has(key) : false;
  };

  const searchable: SearchableRoute[] = [
    ...PRIMARY_NAV.map((n) => ({ href: n.href, label: n.label, type: "Page" as const })),
    ...OPERATE_NAV.map((n) => ({ href: n.href, label: n.label, type: "Page" as const })),
    ...SCAN_NAV.map((n) => ({ href: n.href, label: n.label, type: "Page" as const, context: "Scan" })),
    { href: "/intelligence", label: "Intelligence", type: "Page" },
    ...TOOL_GROUPS.flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label, type: "Page" as const, context: g.label }))),
  ];

  const Row = ({ item, onClick }: { item: PrimaryNavItem; onClick?: () => void }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link href={item.href} onClick={onClick} aria-current={active ? "page" : undefined} className="sl-nav-item" title={item.key ? `${item.label}  (Ctrl ${item.key})` : item.label}>
        <Icon size={16} />
        <span className="flex-1 truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-20 lg:hidden sl-backdrop" onClick={onClose} />}

      <aside
        className={["sl-sidebar fixed top-0 left-0 z-30 h-full flex flex-col", "lg:translate-x-0 lg:static", open ? "translate-x-0" : "-translate-x-full"].join(" ")}
        aria-label="Starlane"
      >
        {/* Wordmark and workspace */}
        <div className="flex items-center justify-between shrink-0" style={{ padding: "2px 6px 14px" }}>
          <Link href="/bridge" onClick={onClose} aria-label="Starlane — Bridge" className="sl-wordmark">Starlane</Link>
          <button aria-label="Close menu" onClick={onClose} className="lg:hidden sl-icon-btn"><FiX size={14} /></button>
        </div>
        {workspace && (
          <div className="sl-workspace" title={workspace}>
            <span className="sl-workspace-mark" aria-hidden="true">{workspace.trim().charAt(0).toUpperCase()}</span>
            <span className="truncate">{workspace}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ margin: "0 -4px", padding: "0 4px" }}>
          <nav aria-label="Surfaces" className="flex flex-col" style={{ gap: 1 }}>
            {PRIMARY_NAV.map((n) => <Row key={n.href} item={n} onClick={onClose} />)}
          </nav>

          <p className="sl-section-label">Operate</p>
          <nav aria-label="Operate" className="flex flex-col" style={{ gap: 1 }}>
            {OPERATE_NAV.map((n) => <Row key={n.href} item={n} onClick={onClose} />)}
            <button
              ref={toolsBtnRef}
              onClick={() => setToolsOpen((v) => !v)}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
              aria-current={toolsActive ? "page" : undefined}
              className="sl-nav-item w-full text-left"
            >
              <IconTools size={16} />
              <span className="flex-1">Business tools</span>
            </button>
          </nav>

          {recent.length > 0 && (
            <>
              <p className="sl-section-label">Recent</p>
              <nav aria-label="Recent conversations" className="flex flex-col" style={{ gap: 1 }}>
                {recent.map((t) => {
                  const active = pathname === `/scan/${t.id}`;
                  return (
                    <Link key={t.id} href={`/scan/${t.id}`} onClick={onClose} aria-current={active ? "page" : undefined} title={t.title} className="sl-nav-item sl-nav-item--quiet truncate">
                      <span className="truncate">{t.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          {toolsOpen && (
            <div
              ref={toolsRef}
              role="menu"
              className="sl-flyout fixed pop-in"
              style={{
                left: typeof window !== "undefined" && window.innerWidth < 600 ? 12 : 236,
                top: Math.max(12, Math.min((toolsBtnRef.current?.getBoundingClientRect().top ?? 0) - 160, (typeof window !== "undefined" ? window.innerHeight : 800) - 560)),
              }}
            >
              {TOOL_GROUPS.map(({ label, items }) => {
                const visible = items.filter((n) => !(hiddenRoutes.size > 0 && hiddenRoutes.has(n.href)) && !locked(n.href));
                if (!visible.length) return null;
                return (
                  <div key={label} className="sl-flyout-group">
                    <p className="sl-flyout-label">{label}</p>
                    {visible.map(({ href, label: l }) => (
                      <Link key={href} href={href} role="menuitem" onClick={() => { setToolsOpen(false); onClose(); }} aria-current={isActive(href) ? "page" : undefined} className="sl-menu-item">
                        {l}
                      </Link>
                    ))}
                  </div>
                );
              })}
              {isAdmin && (
                <div className="sl-flyout-group">
                  <Link href="/admin" role="menuitem" onClick={() => { setToolsOpen(false); onClose(); }} className="sl-menu-item">Admin</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help and account */}
        <div ref={accountRef} className="relative shrink-0 sl-sidebar-foot">
          <button onClick={() => setShortcutsOpen(true)} className="sl-nav-item w-full text-left">
            <IconHelp size={16} />
            <span className="flex-1">Help and shortcuts</span>
          </button>
          <button onClick={() => setAccountOpen((v) => !v)} aria-expanded={accountOpen} className="sl-nav-item w-full text-left" style={{ marginTop: 2 }}>
            <IdentityAvatar name={userName || workspace || "?"} size={20} />
            <span className="flex-1 truncate">{userName || "Account"}</span>
          </button>

          {accountOpen && (
            <div className="absolute z-40 sl-flyout pop-in" style={{ left: 0, right: 0, bottom: 44, width: "auto", maxHeight: "none" }}>
              <div style={{ padding: 10, borderBottom: "1px solid var(--border-subtle)" }}>
                <IdentityPicker dark />
              </div>
              <div className="sl-flyout-group">
                {[
                  { href: "/settings?tab=profile", label: "Profile", Icon: FiUser },
                  { href: "/settings?tab=preferences", label: "Preferences", Icon: FiSliders },
                ].map(({ href, label, Icon }) => (
                  <Link key={href} href={href} onClick={() => { setAccountOpen(false); onClose(); }} className="sl-menu-item"><Icon size={13} /> {label}</Link>
                ))}
                <button onClick={() => { setAccountOpen(false); setShortcutsOpen(true); }} className="sl-menu-item w-full"><FiCommand size={13} /> Keyboard shortcuts</button>
                <button onClick={handleLogout} className="sl-menu-item w-full"><FiLogOut size={13} /> Sign out</button>
              </div>
            </div>
          )}
        </div>
      </aside>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} routes={searchable} />

      {shortcutsOpen && (
        <div className="fixed inset-0 flex items-center justify-center px-4 sl-layer-modal" onClick={() => setShortcutsOpen(false)}>
          <div className="fixed inset-0 sl-backdrop" />
          <div role="dialog" aria-modal="true" aria-label="Help and keyboard shortcuts" className="relative w-full sm:w-[400px] sl-dialog pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between sl-dialog-head">
              <p className="sl-dialog-title">Help and shortcuts</p>
              <button onClick={() => setShortcutsOpen(false)} aria-label="Close" className="sl-icon-btn"><FiX size={15} /></button>
            </div>
            <div style={{ padding: 16 }} className="space-y-2.5">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between gap-4">
                  <span style={{ fontSize: 13, color: "var(--text-body)" }}>{s.desc}</span>
                  <kbd className="sl-kbd">{s.keys}</kbd>
                </div>
              ))}
            </div>
            <div className="sl-dialog-foot">
              <span>Something wrong? Diagnostics shows versions, sync and recent errors.</span>
              <Link href="/settings?tab=diagnostics" onClick={() => setShortcutsOpen(false)} className="sl-link">Open diagnostics</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
