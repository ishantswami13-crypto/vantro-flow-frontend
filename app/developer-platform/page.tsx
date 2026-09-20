"use client";

import { ATLAS_AGENTS, getPack } from "@/lib/atlas";
import { AtlasShell, AgentCard, PackCard, Grid, ProofLegend, SafetyNote } from "@/components/atlas/AtlasUI";

export default function DeveloperPlatformPage() {
  const devAgents = ATLAS_AGENTS.filter((a) => a.domain === "Developer/API");
  const platformPack = getPack("ent.developer_platform");
  const meshPack = getPack("ent.private_mesh");

  return (
    <AtlasShell
      title="Developer / API Platform"
      subtitle="Build on Atlas: browse the public agent registry, design connectors and webhooks, and run a private agent mesh. The registry listing is live (flag-gated); build/deploy surfaces are preview / custom."
      active="/developer-platform"
    >
      <SafetyNote />
      <Grid>
        {platformPack && <PackCard pack={platformPack} />}
        {meshPack && <PackCard pack={meshPack} />}
      </Grid>
      <ProofLegend />
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, margin: "8px 0 12px" }}>Platform agents</h2>
      <Grid>{devAgents.map((a) => <AgentCard key={a.id} agent={a} />)}</Grid>
    </AtlasShell>
  );
}
