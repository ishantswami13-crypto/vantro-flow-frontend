import { redirect } from "next/navigation";

// Starlane V32 path fix: this page's real content lives at the correct
// nested route /control/approvals (STARLANE_FRONTEND_HANDOFF.md §1:
// ControlApprovals.dc.html → /control/approvals). Kept as a redirect so
// any bookmark, external link, or stale client cache pointing at the old
// /approvals path still lands somewhere real instead of 404ing — same
// pattern as /connections → /sources.
export default function ApprovalsRedirect() {
  redirect("/control/approvals");
}
