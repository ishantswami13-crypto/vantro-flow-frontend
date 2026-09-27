"use client";
import { useEffect, useState } from "react";
import { accessApi, type Platforms } from "@/lib/access";

// Names only the Starlane apps that have a real, published build — as reported
// by the backend, which knows only when a signed download is configured.
// Renders nothing otherwise: the site never implies an app exists before it does.
const LABEL: Record<keyof Platforms, string> = { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android", ios: "iPhone" };

export function PlatformAvailability({ className }: { className?: string }) {
  const [platforms, setPlatforms] = useState<Platforms | null>(null);
  useEffect(() => {
    accessApi.platforms().then(({ body }) => setPlatforms(body.platforms || null)).catch(() => setPlatforms(null));
  }, []);
  const live = (Object.keys(LABEL) as Array<keyof Platforms>).filter((k) => platforms?.[k]);
  if (!live.length) return null;
  return (
    <p className={className} style={{ fontSize: 13, color: "var(--sl-ink-faint)", marginTop: 14 }}>
      Apps for {live.map((k) => LABEL[k]).join(", ")} · in the browser everywhere
    </p>
  );
}
