import AppGate from "@/components/platform/AppGate";

// Part of the Procurement application: the server says whether this organization has it on.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppGate app="procurement" title="Supplier run">{children}</AppGate>;
}
