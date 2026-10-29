import { HeroBrief } from "@/components/marketing/site/HeroBrief";
import { ApprovalPhone } from "@/components/marketing/site/ApprovalPhone";

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
