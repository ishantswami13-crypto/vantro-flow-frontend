import AppGate from "@/components/platform/AppGate";

// Part of the Finance application: the server says whether this organization has it on.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppGate app="finance" title="Monitors">{children}</AppGate>;
}
