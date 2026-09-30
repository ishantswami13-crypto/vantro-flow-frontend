import { loadManifest } from "@/lib/desktopRelease";

// GET /download/latest.json — the public release manifest: version, platform,
// architecture, download URL, SHA-256 and publish time of the current build.
// 404 with a JSON error when nothing is published.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const channel = new URL(req.url).searchParams.get("channel") === "beta" ? "beta" : "stable";
  const m = await loadManifest(channel);
  if (!m) {
    return Response.json({ published: false, error: "No Starlane desktop release is published yet." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ published: true, ...m }, { headers: { "Cache-Control": "public, max-age=60" } });
}
