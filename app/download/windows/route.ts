import { loadManifest } from "@/lib/desktopRelease";

// GET /download/windows — the stable public download for Starlane on Windows.
// Redirects to the current installer binary (never to a page). When no valid
// release is published it says so with a 503, so the download health check
// fails loudly instead of the site pretending.
//   ?type=msi        the .msi instead of the .exe
//   ?channel=beta    the beta build, if one is published

export const dynamic = "force-dynamic";

function notPublished() {
  return new Response("Starlane for Windows is not published yet. Please try again later.\n", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "600" },
  });
}

async function handle(req: Request) {
  const q = new URL(req.url).searchParams;
  const channel = q.get("channel") === "beta" ? "beta" : "stable";
  const type = q.get("type") === "msi" ? "msi" : "installer";
  const m = await loadManifest(channel);
  const asset = m?.platforms.windows?.x64?.[type];
  if (!m || !asset) return notPublished();
  // Funnel: one structured line per download request (no IP, no user agent).
  console.log(JSON.stringify({ event: "desktop_download_requested", platform: "windows", arch: "x64", type, channel, version: m.version }));
  return new Response(null, {
    status: 302,
    headers: {
      Location: asset.url,
      "Cache-Control": "no-store",
      "X-Starlane-Version": m.version,
      "X-Content-SHA256": asset.sha256,
    },
  });
}

export const GET = handle;
export const HEAD = handle;
