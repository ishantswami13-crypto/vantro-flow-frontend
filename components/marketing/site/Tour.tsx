import Link from "next/link";
import { HeroBrief } from "@/components/marketing/site/HeroBrief";
import { ApprovalPhone } from "@/components/marketing/site/ApprovalPhone";
import { WatchRoom, SimulationRoom, VerificationRecord } from "@/components/marketing/home/Rooms";
import { EvidenceStack } from "@/components/marketing/home/Plates";

// A row of the product's real screens, each drawn at full size and scaled
// into a card. Where the browser supports scroll-driven animation the cards
// turn in 3D as they cross the row, like pages being leafed through; at rest
// otherwise. The screens are decorative here: each card's caption says what
// it shows, and the page it links to covers it properly.

const SCREENS = [
  { k: "Brief", t: "The morning brief", b: "Four changes, the evidence, and what waits for you.", href: "/platform#watch", tone: "dark", el: <HeroBrief /> },
  { k: "Watch", t: "What changed overnight", b: "Each change with its exposure and the records behind it.", href: "/platform#watch", tone: "dark", el: <WatchRoom /> },
  { k: "Evidence", t: "Every number shows its working", b: "Fact, calculation, assumption, estimate.", href: "/platform#decide", tone: "light", el: <EvidenceStack /> },
  { k: "Simulate", t: "Compare before committing", b: "Options as ranges, with assumptions you can change.", href: "/platform#decide", tone: "dark", el: <SimulationRoom /> },
  { k: "Approve", t: "You approve, then it sends", b: "The draft waits on your phone.", href: "/security", tone: "dark", el: <ApprovalPhone />, narrow: true },
  { k: "Verify", t: "What happened next", b: "The books, checked after the action.", href: "/platform#verify", tone: "light", el: <VerificationRecord /> },
] as const;

export function Tour() {
  return (
    <div className="tr" tabIndex={0} role="region" aria-label="Product screens">
      <ol className="tr-row">
        {SCREENS.map((s) => (
          <li key={s.k} className="tr-card">
            <Link href={s.href} className="tr-link">
              <div className={`tr-frame f-${s.tone}${"narrow" in s ? " tr-narrow" : ""}`} aria-hidden inert>
                <div className="tr-screen">{s.el}</div>
              </div>
              <p className="tr-k">{s.k}</p>
              <p className="tr-t">{s.t}</p>
              <p className="tr-b">{s.b}</p>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

// The hero's composed scene: the brief on the desk, the approval on a phone
// standing in front of it.
export function HeroScene() {
  return (
    <div className="hs3">
      <div className="hs3-desk"><HeroBrief /></div>
      <div className="hs3-phone" aria-hidden inert><ApprovalPhone /></div>
    </div>
  );
}
