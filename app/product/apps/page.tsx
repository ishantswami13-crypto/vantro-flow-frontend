import type { Metadata } from "next";
import { PlatformAvailability } from "@/components/marketing/PlatformAvailability";
import { Facts, GuidePage, Note, Section } from "@/components/marketing/product/Guide";

export const metadata: Metadata = { title: "Desktop & mobile" };

export default function AppsPage() {
  return (
    <GuidePage
      eyebrow="Apps"
      title="Starlane for desktop and phone"
      status="in_testing"
      lede="Two native apps built for how an owner actually works: a Windows app that sits on the computer running Tally and keeps it in sync, and a phone app for deciding away from the desk."
    >
      <Section title="Starlane for Windows">
        <Facts items={[
          ["Tally, built in", "Finds TallyPrime on the computer, lists the open companies, and syncs every 15 minutes — including while the window is closed and Starlane sits in the tray."],
          ["The daily surfaces", "Now, decisions with evidence, sources, Watch, Discover, Simulate, Ask Starlane, inbox and settings."],
          ["Notifications", "A Windows notification when an approval is waiting, an action finishes, or Tally stops syncing."],
          ["Secure by default", "Your session and the Tally credential are kept in Windows Credential Manager, never in a file."],
          ["Updates", "Signed updates on a stable or beta channel."],
        ]} />
      </Section>
      <Section title="Starlane for iPhone and Android">
        <Facts items={[
          ["Today", "The Bridge for your pocket: what needs you, receivables, what changed."],
          ["Approvals", "Every action with its evidence. High-risk approvals ask for Face ID, fingerprint or your passcode."],
          ["Push notifications", "Tap one and it opens the exact item."],
          ["Also", "Discover, Ask Starlane, Watch, inbox, and the list of your signed-in devices."],
        ]} />
      </Section>
      <Note>Both apps are built and in testing. They appear here and on your setup page for download once a signed build is published.</Note>
      <PlatformAvailability />
    </GuidePage>
  );
}
