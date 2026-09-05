"use client";

import type React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Alert } from "@/components/ui/Alert";
import { Drawer } from "@/components/ui/Drawer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { OverallStateBand } from "@/components/business-state/OverallStateBand";
import { BusinessSummarySection } from "@/components/business-state/BusinessSummarySection";
import { MoneySection } from "@/components/business-state/MoneySection";
import { RiskSection } from "@/components/business-state/RiskSection";
import { SignalsSection } from "@/components/business-state/SignalsSection";
import { RecommendedActionsSection } from "@/components/business-state/RecommendedActionsSection";
import { CustomerDrawerView } from "@/components/business-state/DrawerViews/CustomerDrawerView";
import { InvoiceDrawerView } from "@/components/business-state/DrawerViews/InvoiceDrawerView";
import { TransactionDrawerView } from "@/components/business-state/DrawerViews/TransactionDrawerView";
import { SupplierDrawerView } from "@/components/business-state/DrawerViews/SupplierDrawerView";
import { PurchaseDrawerView } from "@/components/business-state/DrawerViews/PurchaseDrawerView";
import { api, type BusinessStateResponse, type RankedAction } from "@/lib/api";

// Drawer navigation stack — local React state, NOT URL-encoded (explicit,
// approved decision, see implementation plan §8). Opening pushes; a
// breadcrumb click truncates to that index; closing clears the stack.
type DrawerView =
  | { type: "customer"; name: string; phone?: string; label: string }
  | { type: "invoice"; invoiceId: string; label: string }
  | { type: "transaction"; transactionId: string; label: string }
  | { type: "supplier"; supplierName: string; label: string }
  | { type: "purchase"; purchaseId: string; label: string };

function fmtFreshness(iso: string): string {
  try {
    return `As of ${new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "";
  }
}

const STALE_AFTER_MS = 2 * 60 * 1000; // §10 — "stale if >2min old" heuristic

// Mobile is reordered by "what needs attention now" (plan §5): Signals and
// Risk move ahead of Business Summary/Money, which drop to last. `order`
// utilities only affect layout within a flex container, so the page body
// below is a flex-col on mobile and resets to normal document order at `lg`.
function Section({ title, children, order }: { title: string; children: React.ReactNode; order: string }) {
  return (
    <section className={["mt-6", order].join(" ")}>
      <h2 className="text-sm font-bold text-primary mb-2">{title}</h2>
      {children}
    </section>
  );
}

// Payables-side RankedAction titles are generated as
// "Pay {supplier_name} by {due_date} — ..." (rules.service.js) — there is no
// dedicated `supplier_name` field on RankedAction (§3.1 contract), so the
// Payables Risk → Supplier drawer leaf extracts it from the title.
function extractSupplierName(action: RankedAction): string | null {
  const m = /^Pay (.+?) by /.exec(action.title);
  return m ? m[1] : null;
}

export default function BusinessStatePage() {
  const { data, isLoading, isError, refetch } = useQuery<BusinessStateResponse>({
    queryKey: ["business-state"],
    queryFn: () => api.businessState(),
    staleTime: 25_000, // just under the backend's own 30s cache TTL
  });

  const businessState = data?.businessState;
  const isStale = businessState ? Date.now() - new Date(businessState.generatedAt).getTime() > STALE_AFTER_MS : false;

  const [drawerStack, setDrawerStack] = useState<DrawerView[]>([]);
  const currentView = drawerStack[drawerStack.length - 1];

  function pushView(view: DrawerView) {
    setDrawerStack(prev => [...prev, view]);
  }
  function popView() {
    setDrawerStack(prev => (prev.length <= 1 ? [] : prev.slice(0, -1)));
  }
  function closeDrawer() {
    setDrawerStack([]);
  }
  function truncateTo(index: number) {
    setDrawerStack(prev => prev.slice(0, index + 1));
  }

  return (
    <DashboardLayout pageTitle="Business State">
      <PageHeader
        title="Business State"
        subtitle="How your business is doing right now"
        freshness={businessState ? fmtFreshness(businessState.generatedAt) : undefined}
      />

      {isLoading && <LoadingState label="Loading business state" rows={3} />}

      {isError && (
        <ErrorState
          title="Couldn't load your business state"
          message="Check your connection and try again."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && businessState && (
        <div className="flex flex-col lg:block">
          {isStale && (
            <Alert variant="warning" className="mb-4 order-1 lg:order-none">
              Data may be out of date — retrying automatically.
            </Alert>
          )}

          <div className="order-2 lg:order-none">
            <OverallStateBand overallState={businessState.overallState} />
          </div>

          <Section title="Business Summary" order="order-6 lg:order-none">
            <BusinessSummarySection brain={businessState.brain} brainSection={businessState.sections?.brain} />
          </Section>

          <Section title="Money" order="order-7 lg:order-none">
            <MoneySection brain={businessState.brain} />
          </Section>

          <Section title="Risk" order="order-4 lg:order-none">
            <RiskSection
              receivablesRisk={businessState.receivablesRisk}
              payablesRisk={businessState.payablesRisk}
              onSelectCustomer={(_customerId, name, phone) =>
                pushView({ type: "customer", name, phone, label: name })
              }
              onSelectSupplier={action => {
                const supplierName = extractSupplierName(action);
                if (supplierName) {
                  pushView({ type: "supplier", supplierName, label: supplierName });
                } else if (action.related_entity_id) {
                  // Fall back to opening the bill directly if the supplier
                  // name couldn't be parsed from the title.
                  pushView({ type: "purchase", purchaseId: action.related_entity_id, label: action.title });
                }
              }}
            />
          </Section>

          <Section title="Signals" order="order-3 lg:order-none">
            <SignalsSection rankedActions={businessState.rankedActions} />
          </Section>

          <Section title="Recommended Actions" order="order-5 lg:order-none">
            <RecommendedActionsSection
              rankedActions={businessState.rankedActions}
              onOpenCustomer={(_customerId, name, phone) =>
                pushView({ type: "customer", name, phone, label: name })
              }
            />
          </Section>
        </div>
      )}

      {currentView && (
        <Drawer
          titleId="business-state-drawer-title"
          title={currentView.label}
          onClose={closeDrawer}
          onBack={drawerStack.length > 1 ? popView : undefined}
          breadcrumb={
            <Breadcrumb
              segments={drawerStack.map((v, i) => ({
                label: v.label,
                onClick: i === drawerStack.length - 1 ? undefined : () => truncateTo(i),
              }))}
            />
          }
        >
          {currentView.type === "customer" && (
            <CustomerDrawerView
              name={currentView.name}
              phone={currentView.phone}
              onOpenInvoice={(invoiceId, label) => pushView({ type: "invoice", invoiceId, label })}
            />
          )}
          {currentView.type === "invoice" && (
            <InvoiceDrawerView
              invoiceId={currentView.invoiceId}
              onOpenTransaction={(transactionId, label) => pushView({ type: "transaction", transactionId, label })}
            />
          )}
          {currentView.type === "transaction" && <TransactionDrawerView transactionId={currentView.transactionId} />}
          {currentView.type === "supplier" && (
            <SupplierDrawerView
              supplierName={currentView.supplierName}
              onOpenPurchase={(purchaseId, label) => pushView({ type: "purchase", purchaseId, label })}
            />
          )}
          {currentView.type === "purchase" && (
            <PurchaseDrawerView
              purchaseId={currentView.purchaseId}
              onOpenTransaction={(transactionId, label) => pushView({ type: "transaction", transactionId, label })}
            />
          )}
        </Drawer>
      )}
    </DashboardLayout>
  );
}
