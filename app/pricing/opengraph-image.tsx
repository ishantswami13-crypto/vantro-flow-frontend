import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Starlane pricing: start with a pilot, on your own books";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return ogImage({ kicker: "Pricing and pilots", title: "Start with a pilot,", italic: "on your own books." });
}
