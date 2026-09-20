"use client";

import { packsByDimension } from "@/lib/atlas";
import { AtlasShell, PackCard, Grid, ProofLegend, SafetyNote } from "@/components/atlas/AtlasUI";

export default function IndustryPacksPage() {
  const packs = packsByDimension("industry");
  return (
    <AtlasShell
      title="Industry Packs"
      subtitle={`${packs.length} industry packs — industry-native agents and metrics layered on the core BusinessOS. Healthcare, education and future industries are preview/roadmap and cannot execute.`}
      active="/industry-packs"
    >
      <SafetyNote />
      <ProofLegend />
      <Grid>{packs.map((p) => <PackCard key={p.id} pack={p} />)}</Grid>
    </AtlasShell>
  );
}
