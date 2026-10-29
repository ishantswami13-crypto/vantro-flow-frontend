import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import "./atlas.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "@/components/CookieBanner";
import AuthenticatedRequestBridge from "@/components/providers/AuthenticatedRequestBridge";
import { SITE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} · ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.legalName, url: SITE_URL }],
  creator: SITE.legalName,
  publisher: SITE.legalName,
  formatDetection: { telephone: false, email: false, address: false },

  // Pages that set their own Open Graph data replace this; it covers the rest.
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE_URL,
    siteName: SITE.name,
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
    creator: SITE.twitter,
    site: SITE.twitter,
  },

  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/branding/starlane-icon-light-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/branding/starlane-icon-light-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icon.svg",
  },

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE.name,
  },

  other: {
    "mobile-web-app-capable": "yes",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = { themeColor: "#FAFAF9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthenticatedRequestBridge />
        <PostHogProvider>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </PostHogProvider>
        <CookieBanner />
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
