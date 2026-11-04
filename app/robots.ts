import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { PROTECTED } from "../middleware";

// Crawl the public site; keep crawlers out of the signed-in product, auth
// callbacks, the API proxy and personal links (application status, downloads).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [...PROTECTED, "/api/", "/auth/", "/access/status", "/download", "/forgot-password"],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
