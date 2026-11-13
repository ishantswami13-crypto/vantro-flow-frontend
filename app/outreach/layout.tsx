import AppGate from "@/components/platform/AppGate";

// Part of the Sales application: the server says whether this organization has it on.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppGate app="sales" title="Outreach">{children}</AppGate>;
}
