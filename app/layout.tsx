import type { Metadata } from "next";
import "./globals.css";
import "./atlas.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "@/components/CookieBanner";

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
    "business automation India", "MSME automation software", "collections automation India",
    "WhatsApp business automation", "invoice automation India", "Hinglish WhatsApp reminders",
    "Tally ERP sync", "cash flow automation India", "Indian business OS",
    "autopilot business software", "distributor automation India", "vyapar alternative",
    "receivables management India", "B2B collections India",
  ],
  authors: [{ name: "Atlax", url: APP_URL }],
  creator: "Atlax",
  publisher: "Atlax",

  openGraph: {
    type: "website",
    locale: "en_IN",
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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon-192.png",
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
    "theme-color": "#050B1A",
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
              name: "Starlane by Atlax",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android, iOS",
              offers: {
                "@type": "Offer",
                price: "1999",
                priceCurrency: "INR",
                priceValidUntil: "2026-12-31",
              },
              description:
                "Starlane by Atlax is AI business automation infrastructure for cashflow, collections, inventory, operations, risk, and intelligent decision-making.",
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
        <PostHogProvider>{children}</PostHogProvider>
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}
