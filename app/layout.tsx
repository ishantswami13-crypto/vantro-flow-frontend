import type { Metadata, Viewport } from "next";
import { Geist, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./tokens.css";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { Analytics } from "@vercel/analytics/next";
import CookieBanner from "@/components/CookieBanner";
import AuthenticatedRequestBridge from "@/components/providers/AuthenticatedRequestBridge";
import { ToastProvider } from "@/components/ui/Toast";

const APP_URL = "https://vantro-flow-frontend.vercel.app";

// One font system, self-hosted by Next: Geist for the interface and every
// label, Fraunces for page titles, IBM Plex Mono for figures that must align.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

// Runs before first paint so the saved theme never flashes. Dark unless the
// person picked light in Settings (a per-browser preference).
const THEME_BOOT = `try{var t=localStorage.getItem("starlane_theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light")}catch(e){}`;

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
  authors: [{ name: "Starlane", url: APP_URL }],
  creator: "Starlane",
  publisher: "Starlane",

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

export const viewport: Viewport = { themeColor: "#0E0E0D", colorScheme: "dark light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-theme="light" className={`${geist.variable} ${fraunces.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {/* Structured data — Indian SaaS product */}
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
                audienceType: "Indian MSMEs, distributors, traders, manufacturers",
              },
            }),
          }}
        />
      </head>
      <body>
        <AuthenticatedRequestBridge />
        <PostHogProvider>
          <ReactQueryProvider><ToastProvider>{children}</ToastProvider></ReactQueryProvider>
        </PostHogProvider>
        <CookieBanner />
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
