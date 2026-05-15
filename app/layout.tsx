import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vantro Flow | Collections OS for Indian MSMEs",
  description: "Get paid faster. AI-powered receivables and collections management for Indian businesses.",
  icons: { icon: "/favicon.ico" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vantro Flow",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
