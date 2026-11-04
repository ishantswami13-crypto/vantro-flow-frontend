import type { Metadata } from "next";

// Download links are personal (a token in the URL fragment), so the page is
// kept out of search results.
export const metadata: Metadata = { title: "Download", robots: { index: false, follow: false } };

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
