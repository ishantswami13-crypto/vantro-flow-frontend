"use client";
import { posthog } from "@/lib/posthog";

// The primary download control. A plain link to /download/windows, which
// redirects straight to the installer binary — no intermediate page, no
// client-side routing (so Next never intercepts it). The click is counted
// without any personal data.
export function DownloadButton({ className = "sl-btn sl-btn-solid", label = "Download Starlane for Windows", where = "hero" }: { className?: string; label?: string; where?: string }) {
  return (
    <a
      href="/download/windows"
      className={className}
      onClick={() => { try { if (posthog.__loaded) posthog.capture("landing_download_click", { platform: "windows", where }); } catch { /* analytics never blocks the download */ } }}
    >
      {label}
    </a>
  );
}
