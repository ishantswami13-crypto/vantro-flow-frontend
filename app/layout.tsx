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
    default: "Starlane | AI BusinessOS",
    template: "%s | Starlane",
  },
  description:
    "Starlane helps businesses connect data, understand operations, and run evidence-based, approval-gated workflows across finance, sales, purchases, inventory, customers, suppliers, and operations.",
  keywords: [
    "AI business operating system", "decision intelligence", "accounts receivable automation",
    "collections automation", "cash flow forecasting", "approval workflows",
    "finance operations software", "enterprise decision automation", "evidence-based AI",
    "receivables management", "B2B collections", "TallyPrime integration",
  ],
  authors: [{ name: "Starlane", url: APP_URL }],
  creator: "Starlane",
  publisher: "Starlane",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "Starlane",
    title: "Starlane — The operating layer every modern business runs on",
    description:
      "Starlane helps businesses connect data, understand operations, and run evidence-based, approval-gated workflows across finance, sales, purchases, inventory, customers, suppliers, and operations.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Starlane — the operating layer every modern business runs on",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Starlane — The operating layer every modern business runs on",
    description:
      "Starlane helps businesses connect data, understand operations, and run evidence-based, approval-gated workflows across finance, sales, purchases, inventory, customers, suppliers, and operations.",
    images: ["/opengraph-image"],
    creator: "@ishantswami13",
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
    <html lang="en">
      <head>
        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Starlane",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Starlane is AI business automation infrastructure for cashflow, collections, inventory, operations, risk, and intelligent decision-making.",
              url: APP_URL,
              inLanguage: ["en", "hi"],
              audience: {
                "@type": "Audience",
                audienceType: "Businesses of every size, from owner-led companies to enterprises",
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
