import { redirect } from "next/navigation";

// Starlane V32 rename: this page's real content moved to /sources (the
// nav has always labelled it "Sources" — see STARLANE_FRONTEND_HANDOFF.md
// §1/§17). Kept as a redirect so any bookmark, external link, or stale
// client cache pointing at the old /connections path still lands
// somewhere real instead of 404ing.
export default function ConnectionsRedirect() {
  redirect("/sources");
}
