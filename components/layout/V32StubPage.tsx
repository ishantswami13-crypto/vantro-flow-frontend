"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";

interface V32StubPageProps {
  pageTitle: string;
  description: string;
}

// Honest empty-state stub for a Starlane Version 32 route whose real page
// content is Phase 3/4 work (out of scope for the current redesign pass —
// see STARLANE_FRONTEND_HANDOFF.md §8 for the empty-state copy pattern
// this follows: plain sentence-case explanation, no fabricated numbers or
// placeholder data). Exists only so the V32 sidebar nav is fully clickable
// today instead of 404ing; every route using this component should be
// replaced with its real implementation in a future phase.
export default function V32StubPage({ pageTitle, description }: V32StubPageProps) {
  return (
    <DashboardLayout pageTitle={pageTitle}>
      <div className="max-w-xl mx-auto mt-16 text-center px-4">
        <h1 className="v32-page-title mb-3">{pageTitle}</h1>
        <p className="v32-body">{description}</p>
      </div>
    </DashboardLayout>
  );
}
