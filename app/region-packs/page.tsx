"use client";

import { packsByDimension } from "@/lib/atlas";
import { AtlasShell, PackCard, Grid, ProofLegend, SafetyNote } from "@/components/atlas/AtlasUI";

export default function RegionPacksPage() {
  const packs = packsByDimension("region");
  return (
    <AtlasShell
      title="Region Packs"
      subtitle={`${packs.length} region packs — jurisdiction-specific tax, compliance and language. India and Global read live; other regions are preview until their jurisdiction layer is built.`}
      active="/region-packs"
    >
      <SafetyNote />
      <ProofLegend />
      <Grid>{packs.map((p) => <PackCard key={p.id} pack={p} />)}</Grid>
    </AtlasShell>
  );
}
