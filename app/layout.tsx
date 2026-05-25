import type { Metadata } from "next";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { Analytics } from "@vercel/analytics/next";

const APP_URL = "https://vantro-flow-frontend.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Vantro — AI-powered Business OS for Indian MSMEs",
    template: "%s | Vantro",
  },
  description:
    "Stop chasing payments. Vantro is an AI-powered Collections OS for Indian MSMEs — WhatsApp follow-ups in Hinglish, UPI payment links, cash flow forecasting, and Tally sync. Get paid faster.",
  keywords: [
    "collections software India", "receivables management India", "MSME collections",
    "WhatsApp payment reminder", "Hinglish collection", "Tally ERP collections",
    "Indian business software", "B2B collections India", "invoice follow-up software",
    "cash flow forecast India", "distributor software India", "vyapar alternative",
  ],
  authors: [{ name: "Vantro Technologies", url: APP_URL }],
  creator: "Vantro Technologies",
  publisher: "Vantro Technologies",

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: APP_URL,
    siteName: "Vantro",
    title: "Vantro — Stop Chasing Payments. Start Collecting.",
    description:
      "AI-powered Collections OS for Indian MSMEs. WhatsApp Hinglish reminders, UPI payment links, cash flow forecasting. 200+ MSMEs trust Vantro.",
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
    title: "Vantro — Stop Chasing Payments. Start Collecting.",
    description:
      "AI-powered Collections OS for Indian MSMEs. WhatsApp Hinglish reminders, UPI payment links, cash flow forecasting.",
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
              name: "Vantro",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Android, iOS",
              offers: {
                "@type": "Offer",
                price: "1999",
                priceCurrency: "INR",
                priceValidUntil: "2026-12-31",
              },
              description:
                "AI-powered collections and cash flow OS for Indian MSMEs. WhatsApp follow-ups, payment links, Tally sync.",
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
        <Analytics />
      </body>
    </html>
  );
}
