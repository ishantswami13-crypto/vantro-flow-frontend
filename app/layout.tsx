import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./atlas.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "@/components/CookieBanner";
import AuthenticatedRequestBridge from "@/components/providers/AuthenticatedRequestBridge";

const APP_URL = "https://vantro-flow-frontend.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Starlane | Know what happens next.",
    template: "%s | Starlane",
  },
  description:
    "Starlane connects your business to the world around it, traces consequences, and helps you act with evidence.",
  keywords: ["Starlane", "business intelligence", "supply chain intelligence", "evidence-based decisions"],
  authors: [{ name: "Vantro Technologies", url: APP_URL }],
  creator: "Vantro Technologies",
  publisher: "Vantro Technologies",

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: APP_URL,
    siteName: "Starlane",
    title: "Starlane | Know what happens next.",
    description:
      "Starlane connects your business to the world around it, traces consequences, and helps you act with evidence.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Starlane — Know what happens next.",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Starlane | Know what happens next.",
    description:
      "Starlane connects your business to the world around it, traces consequences, and helps you act with evidence.",
    images: ["/opengraph-image"],
  },

  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/branding/starlane-icon-light-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/branding/starlane-icon-light-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icon.svg",
  },

  manifest: "/manifest.json",

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Starlane",
  },

  other: {
    "mobile-web-app-capable": "yes",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  alternates: {
    canonical: APP_URL,
  },
};

export const viewport: Viewport = { themeColor: "#FAFAF9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        {/* Structured data — Indian SaaS product */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Starlane by Vantro",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Starlane connects your business to the world around it, traces consequences, and helps you act with evidence.",
              url: APP_URL,
              inLanguage: ["en", "hi"],
              audience: {
                "@type": "Audience",
                audienceType: "Indian MSMEs, distributors, traders, manufacturers",
              },
            }),
          }}
        />
      </head>
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
