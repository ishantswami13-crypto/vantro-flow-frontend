"use client";

// The switch between the two views from the public site's home cards, shown
// beside each one's title. Opening either one remembers it, so the next
// sign-in starts there.

import { useEffect } from "react";
import Link from "next/link";
import { DASHBOARDS, rememberDashboard, type DashboardKind } from "@/lib/dashboardChoice";

export default function DashboardSwitch({ current }: { current: DashboardKind }) {
  useEffect(() => { rememberDashboard(current); }, [current]);
  return (
    <nav aria-label="Choose your view" className="db-switch">
      {(Object.keys(DASHBOARDS) as DashboardKind[]).map((k) => (
        <Link key={k} href={DASHBOARDS[k].href} aria-current={k === current ? "page" : undefined} className={`db-switch-o ${k === current ? "is-on" : ""}`}>
          {DASHBOARDS[k].label}
        </Link>
      ))}
    </nav>
  );
}
