import type { Metadata } from "next";

// The public site's identity and the one helper every marketing page uses for
// its metadata, so titles, canonicals and social cards stay consistent.
// NEXT_PUBLIC_SITE_URL sets the canonical origin when a custom domain is live.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://vantro-flow-frontend.vercel.app").replace(/\/+$/, "");

export const SITE = {
  name: "Starlane",
  legalName: "Vantro Technologies",
  tagline: "Know what changed before it costs you",
  description:
    "Starlane reads the systems your business already runs, raises the few changes that matter each morning with the evidence behind every figure, and leaves every decision to a person.",
  twitter: "@ishantswami13",
  locale: "en_US",
  /** Where the company is based. */
  location: "New York, NY",
};

// Legal identity used by /terms and /privacy. Edit these in one place.
// ASSUMED values (set 2026-11-03, pending the company's confirmed details):
// entityName, address and governingLaw/venue. dataLocation is left null so
// the privacy policy does not state a server region nobody has confirmed;
// set it (e.g. "the United States") once the hosting region is known.
export const LEGAL = {
  entityName: "Starlane, Inc.",
  address: "New York, NY, USA",
  governingLaw: "the State of New York, USA",
  venue: "the state and federal courts located in New York County, New York",
  email: "ishantswami13@gmail.com",
  dataLocation: null as string | null,
  lastUpdated: "3 November 2026",
};

export function pageMetadata({ path, title, description, absoluteTitle }: {
  /** Route path, e.g. "/pricing". */
  path: string;
  /** Page title; the layout template appends " · Starlane". */
  title: string;
  description: string;
  /** Use the title as written, without the template (the homepage). */
  absoluteTitle?: boolean;
}): Metadata {
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  const social = absoluteTitle ? title : `${title} · ${SITE.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    // Images come from each route's opengraph-image file.
    openGraph: { type: "website", url, siteName: SITE.name, locale: SITE.locale, title: social, description },
    twitter: { card: "summary_large_image", title: social, description, creator: SITE.twitter, site: SITE.twitter },
  };
}

/** JSON-LD breadcrumb for an inner page. */
export function breadcrumb(path: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE.name, item: SITE_URL },
      { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };
}
