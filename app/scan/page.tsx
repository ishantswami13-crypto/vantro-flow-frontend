"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChatStart } from "@/components/scan/ChatStart";

// The Assistant's start: the same chat start as Home. The assistant answers
// only from connected data, and its tools can read and draft but never mark
// payments or record orders.
export default function ScanPage() {
  return (
    <DashboardLayout pageTitle="Assistant">
      <ChatStart />
    </DashboardLayout>
  );
}
