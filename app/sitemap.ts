import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The public site only. Signed-in product pages are not listed and are
// disallowed in robots.ts.
const PAGES: Array<[string, number, MetadataRoute.Sitemap[number]["changeFrequency"]]> = [
  ["/", 1, "weekly"],
  ["/platform", 0.9, "monthly"],
  ["/integrations", 0.8, "monthly"],
  ["/security", 0.8, "monthly"],
  ["/pricing", 0.8, "monthly"],
  ["/company", 0.6, "monthly"],
  ["/solutions", 0.7, "monthly"],
  ["/pilots", 0.6, "monthly"],
  ["/access", 0.7, "monthly"],
  ["/product", 0.6, "monthly"],
  ["/product/bridge", 0.5, "monthly"],
  ["/product/scan", 0.5, "monthly"],
  ["/product/watch", 0.5, "monthly"],
  ["/product/missions", 0.5, "monthly"],
  ["/product/simulate", 0.5, "monthly"],
  ["/product/memory", 0.5, "monthly"],
  ["/product/prepared", 0.5, "monthly"],
  ["/resources", 0.6, "monthly"],
  ["/legal", 0.3, "yearly"],
  ...["agents", "command-center", "decisions", "vault", "memory", "connectors"].map((s) => [`/platform/${s}`, 0.7, "monthly"] as [string, number, "monthly"]),
  ...["finance-teams", "owners", "collections", "global-trade", "distribution", "manufacturing"].map((s) => [`/solutions/${s}`, 0.6, "monthly"] as [string, number, "monthly"]),
  ["/privacy", 0.3, "yearly"],
  ["/terms", 0.3, "yearly"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map(([path, priority, changeFrequency]) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
