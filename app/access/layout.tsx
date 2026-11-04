import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/access",
  title: "Request a pilot",
  description:
    "Apply for a private Starlane pilot in three short steps: your company, the systems you run, and what you want to change. You see an explained assessment straight away.",
});

export default function AccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
