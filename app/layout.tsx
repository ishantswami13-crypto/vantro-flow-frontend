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
    default: "Atlas by Vantro | AI Business Automation Infrastructure",
    template: "%s | Atlas",
  },
  description:
    "Atlas by Vantro is AI business automation infrastructure for cashflow, collections, inventory, operations, risk, and intelligent decision-making.",
  keywords: [
    "business automation India", "MSME automation software", "collections automation India",
    "WhatsApp business automation", "invoice automation India", "Hinglish WhatsApp reminders",
    "Tally ERP sync", "cash flow automation India", "Indian business OS",
    "autopilot business software", "distributor automation India", "vyapar alternative",
    "receivables management India", "B2B collections India",
  ],
  authors: [{ name: "Vantro Technologies", url: APP_URL }],
  creator: "Vantro Technologies",
  publisher: "Vantro Technologies",

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: APP_URL,
    siteName: "Atlas",
    title: "Atlas by Vantro | AI Business Automation Infrastructure",
    description:
      "Atlas by Vantro is AI business automation infrastructure for cashflow, collections, inventory, operations, risk, and intelligent decision-making.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Vantro — AI-powered Business OS for Indian MSMEs",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Atlas by Vantro | AI Business Automation Infrastructure",
    description:
      "Atlas by Vantro is AI business automation infrastructure for cashflow, collections, inventory, operations, risk, and intelligent decision-making.",
    images: ["/opengraph-image"],
    creator: "@vantro_in",
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
    title: "Vantro",
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
              name: "Atlas by Vantro",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android, iOS",
              offers: {
                "@type": "Offer",
                price: "1999",
                priceCurrency: "INR",
                priceValidUntil: "2026-12-31",
              },
              description:
                "Atlas by Vantro is AI business automation infrastructure for cashflow, collections, inventory, operations, risk, and intelligent decision-making.",
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
