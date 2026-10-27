"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChatStart } from "@/components/scan/ChatStart";

// Home is a chat start, as in ChatGPT or Harvey: a greeting and one box, and
// nothing else until the person asks. It makes no data request on load, so it
// opens instantly. Monitors, Approvals and Tasks carry the standing views.
export default function HomePage() {
  return (
    <DashboardLayout pageTitle="Home">
      <ChatStart />
    </DashboardLayout>
  );
}
