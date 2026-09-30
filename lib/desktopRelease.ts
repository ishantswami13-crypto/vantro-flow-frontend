// The one place the website learns which Starlane desktop build is current.
//
// The release workflow (.github/workflows/desktop.yml) publishes every desktop
// release to GitHub Releases with fixed asset names and a manifest,
// starlane-release.json. "releases/latest/download/<asset>" always resolves to
// the newest non-draft, non-prerelease release, so the site never needs a
// version-specific filename:
//
//   /download/windows            -> 302 to the current signed-or-unsigned .exe
//   /download/windows?type=msi   -> 302 to the current .msi
//   /download/latest.json        -> the manifest (version, SHA-256, URLs)
//
// Where releases live is configuration, not code:
//   STARLANE_RELEASES_REPO          owner/repo that holds the releases
//   STARLANE_RELEASE_MANIFEST_URL   full manifest URL (overrides the repo)
// so moving to a CDN or another repository is an environment change.

export type DesktopAsset = { filename: string; url: string; sha256: string; size: number; type: "nsis" | "msi" };
export type ReleaseManifest = {
  schema: 1;
  product: "Starlane";
  version: string;
  channel: "stable" | "beta";
  label: string;
  published_at: string;
  git_sha?: string;
  signed: boolean;
  updater: boolean;
  platforms: { windows?: { x64?: { installer?: DesktopAsset; msi?: DesktopAsset } } };
};

const DEFAULT_REPO = "ishantswami13-crypto/vantro-flow-frontend";

export function manifestUrl(channel: "stable" | "beta" = "stable"): string {
  const explicit = (process.env.STARLANE_RELEASE_MANIFEST_URL || "").trim();
  if (explicit && channel === "stable") return explicit;
  const repo = (process.env.STARLANE_RELEASES_REPO || DEFAULT_REPO).trim();
  return channel === "beta"
    ? `https://github.com/${repo}/releases/download/desktop-beta/starlane-release.json`
    : `https://github.com/${repo}/releases/latest/download/starlane-release.json`;
}

// Installer URLs must be HTTPS. Plain http is accepted only for a loopback
// manifest (local tests of this route), never for a public host.
function acceptableUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const u = new URL(raw);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost");
  } catch {
    return false;
  }
}

function validAsset(a: unknown, ext: string): a is DesktopAsset {
  const x = a as DesktopAsset | undefined;
  return !!x && acceptableUrl(x.url) && typeof x.filename === "string" && x.filename.toLowerCase().endsWith(ext)
    && /^[a-f0-9]{64}$/.test(x.sha256 || "") && Number.isFinite(x.size) && x.size > 0;
}

/** Reads and validates the manifest. Returns null when nothing valid is published. */
export async function loadManifest(channel: "stable" | "beta" = "stable"): Promise<ReleaseManifest | null> {
  const url = manifestUrl(channel);
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8000), next: { revalidate: 120 } });
    if (!res.ok) return null;
    const m = (await res.json()) as ReleaseManifest;
    if (m?.schema !== 1 || m.product !== "Starlane" || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(m.version || "")) return null;
    const win = m.platforms?.windows?.x64;
    if (!win || !validAsset(win.installer, ".exe")) return null;
    if (win.msi && !validAsset(win.msi, ".msi")) delete win.msi;
    return m;
  } catch {
    return null;
  }
}
