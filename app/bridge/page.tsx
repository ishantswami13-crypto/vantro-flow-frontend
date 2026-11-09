"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChatStart } from "@/components/scan/ChatStart";

// Home is a chat start, as in Harvey: a greeting and one box first, then the
// workspace under it (ready questions, what is waiting, Vault folders and
// agents), loaded after the box is usable so it still opens instantly.
export default function HomePage() {
  return (
    <DashboardLayout pageTitle="Home">
      <ChatStart workspace />
    </DashboardLayout>
  );
}
